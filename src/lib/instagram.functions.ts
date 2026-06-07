import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const APIFY_BASE = "https://api.apify.com/v2/acts";

function normalizeUsername(u: string) {
  return u.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "").toLowerCase();
}

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error || !data) throw new Error("Acesso restrito a administradores");
}

function mapMediaType(t: string | undefined): "photo" | "video" | "carousel" | "reel" {
  const v = (t ?? "").toLowerCase();
  if (v.includes("sidecar") || v.includes("carousel")) return "carousel";
  if (v.includes("reel") || v === "clip") return "reel";
  if (v.includes("video")) return "video";
  return "photo";
}

async function callApify(actorId: string, input: unknown): Promise<any[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN não configurado");
  const url = `${APIFY_BASE}/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=120`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    if (res.status === 402) throw new Error("Apify: créditos insuficientes na sua conta");
    if (res.status === 429) throw new Error("Apify: limite de requisições atingido, tente novamente em alguns minutos");
    throw new Error(`Apify falhou (${res.status}): ${txt.slice(0, 200)}`);
  }
  return (await res.json()) as any[];
}

async function scrapeProfileInternal(supabase: any, profileId: string, username: string) {
  // 1) Perfil
  const profileData = await callApify("apify~instagram-profile-scraper", {
    usernames: [username],
  });
  const p = profileData[0];
  if (!p) throw new Error(`Perfil @${username} não encontrado`);

  await supabase.from("instagram_profiles").update({
    display_name: p.fullName ?? p.full_name ?? null,
    bio: p.biography ?? null,
    profile_pic_url: p.profilePicUrl ?? p.profilePicUrlHD ?? null,
    followers: p.followersCount ?? null,
    posts_count: p.postsCount ?? null,
    is_private: !!p.private,
    last_scraped_at: new Date().toISOString(),
  }).eq("id", profileId);

  if (p.private) {
    throw new Error(`@${username} é privado — não é possível coletar posts`);
  }

  // 2) Posts (últimos 12)
  const posts = await callApify("apify~instagram-scraper", {
    directUrls: [`https://www.instagram.com/${username}/`],
    resultsType: "posts",
    resultsLimit: 12,
    addParentData: false,
  });

  if (!posts.length) return { posts: 0 };

  const rows = posts.slice(0, 12).map((post: any) => ({
    profile_id: profileId,
    external_id: String(post.id ?? post.shortCode ?? post.url),
    posted_at: post.timestamp ?? null,
    media_type: mapMediaType(post.type ?? post.productType),
    caption: post.caption ?? null,
    thumbnail_url: post.displayUrl ?? post.thumbnailUrl ?? null,
    permalink: post.url ?? (post.shortCode ? `https://www.instagram.com/p/${post.shortCode}/` : null),
    likes: post.likesCount ?? 0,
    comments: post.commentsCount ?? 0,
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
  }));

  await supabase.from("instagram_posts").upsert(rows, { onConflict: "profile_id,external_id" });
  return { posts: rows.length };
}

export const addProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { username: string; niche_note?: string }) =>
    z.object({ username: z.string().min(1).max(100), niche_note: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const username = normalizeUsername(data.username);
    const { data: inserted, error } = await context.supabase
      .from("instagram_profiles")
      .insert({ username, niche_note: data.niche_note ?? null })
      .select("id, username")
      .single();
    if (error) throw new Error(error.message);
    try {
      await scrapeProfileInternal(context.supabase, inserted.id, username);
    } catch (e) {
      // rollback profile if scrape failed
      await context.supabase.from("instagram_profiles").delete().eq("id", inserted.id);
      throw e;
    }
    return { id: inserted.id, username: inserted.username };
  });

export const scrapeProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { profileId: string }) => z.object({ profileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: prof, error } = await context.supabase
      .from("instagram_profiles").select("id, username").eq("id", data.profileId).single();
    if (error || !prof) throw new Error("Perfil não encontrado");
    return await scrapeProfileInternal(context.supabase, prof.id, prof.username);
  });

export const removeProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { profileId: string }) => z.object({ profileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("instagram_profiles").delete().eq("id", data.profileId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- IA ---

async function callLovableAI(messages: any[], schema?: any) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");
  const body: any = {
    model: "google/gemini-3-flash-preview",
    messages,
  };
  if (schema) {
    body.tools = [{ type: "function", function: schema }];
    body.tool_choice = { type: "function", function: { name: schema.name } };
  }
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("IA: limite de requisições. Tente novamente em instantes.");
  if (res.status === 402) throw new Error("IA: créditos esgotados no workspace Lovable.");
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`IA falhou (${res.status}): ${t.slice(0, 200)}`);
  }
  const j: any = await res.json();
  const msg = j.choices?.[0]?.message;
  if (schema) {
    const call = msg?.tool_calls?.[0];
    if (!call) throw new Error("IA não retornou estrutura esperada");
    return JSON.parse(call.function.arguments);
  }
  return msg?.content ?? "";
}

export const analyzeProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { profileId: string }) => z.object({ profileId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: prof } = await context.supabase
      .from("instagram_profiles").select("*").eq("id", data.profileId).single();
    if (!prof) throw new Error("Perfil não encontrado");
    const { data: posts } = await context.supabase
      .from("instagram_posts").select("*").eq("profile_id", data.profileId).order("posted_at", { ascending: false }).limit(12);
    if (!posts?.length) throw new Error("Sem posts para analisar. Atualize o perfil primeiro.");

    const summarized = posts.map((p: any) => ({
      data: p.posted_at,
      tipo: p.media_type,
      legenda: (p.caption ?? "").slice(0, 400),
      likes: p.likes,
      comments: p.comments,
      hashtags: p.hashtags?.slice(0, 10) ?? [],
    }));

    const result = await callLovableAI(
      [
        {
          role: "system",
          content: "Você é um estrategista de marketing para a Viaggiari (agência de viagens premium brasileira). Analise perfis do Instagram e gere insights acionáveis em português do Brasil. Seja específico, evite genéricos.",
        },
        {
          role: "user",
          content: `Analise o perfil @${prof.username} (bio: ${prof.bio ?? "—"}).\nÚltimos posts:\n${JSON.stringify(summarized, null, 2)}\n\nGere:\n1. Resumo de estilo em markdown (tom de voz, temas, formatos preferidos, hashtags recorrentes, frequência semanal aproximada, melhores horários aparentes).\n2. Cinco ideias de postagem adaptadas para Viaggiari, inspiradas (não copiadas) nesse perfil.`,
        },
      ],
      {
        name: "deliver_analysis",
        description: "Retorna análise de estilo e ideias de postagem",
        parameters: {
          type: "object",
          properties: {
            style_summary: { type: "string", description: "Resumo em markdown" },
            ideas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                  suggested_media_type: { type: "string", enum: ["photo", "video", "carousel", "reel"] },
                  suggested_networks: {
                    type: "array",
                    items: { type: "string", enum: ["instagram", "tiktok", "facebook", "linkedin", "youtube"] },
                  },
                },
                required: ["title", "body", "suggested_media_type", "suggested_networks"],
              },
            },
          },
          required: ["style_summary", "ideas"],
        },
      },
    );

    await context.supabase.from("instagram_profiles").update({
      last_ai_summary: result.style_summary,
      last_ai_summary_at: new Date().toISOString(),
    }).eq("id", data.profileId);

    // remove ideias antigas desse perfil e insere novas
    await context.supabase.from("instagram_ai_ideas").delete().eq("profile_id", data.profileId).eq("is_cross_trend", false);
    if (Array.isArray(result.ideas) && result.ideas.length) {
      await context.supabase.from("instagram_ai_ideas").insert(
        result.ideas.slice(0, 5).map((i: any) => ({
          profile_id: data.profileId,
          title: i.title,
          body: i.body,
          suggested_media_type: i.suggested_media_type,
          suggested_networks: i.suggested_networks ?? ["instagram"],
        })),
      );
    }
    return { ok: true };
  });

export const analyzeCrossTrends = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: profiles } = await context.supabase
      .from("instagram_profiles")
      .select("username, last_ai_summary")
      .not("last_ai_summary", "is", null);
    if (!profiles || profiles.length < 3) throw new Error("Analise individualmente ao menos 3 perfis primeiro");

    const result = await callLovableAI(
      [
        { role: "system", content: "Você é estrategista de marketing da Viaggiari (agência de viagens premium). Português do Brasil, específico." },
        {
          role: "user",
          content: `Aqui estão resumos de estilo de ${profiles.length} perfis de inspiração. Identifique tendências cruzadas (temas, formatos e abordagens em alta entre eles) e gere 5 ideias de postagem para a Viaggiari aproveitando essas tendências.\n\n${profiles.map((p: any) => `### @${p.username}\n${p.last_ai_summary}`).join("\n\n")}`,
        },
      ],
      {
        name: "deliver_cross_trends",
        description: "Retorna tendências cruzadas e ideias",
        parameters: {
          type: "object",
          properties: {
            trends_summary: { type: "string" },
            ideas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                  suggested_media_type: { type: "string", enum: ["photo", "video", "carousel", "reel"] },
                  suggested_networks: { type: "array", items: { type: "string", enum: ["instagram", "tiktok", "facebook", "linkedin", "youtube"] } },
                },
                required: ["title", "body", "suggested_media_type", "suggested_networks"],
              },
            },
          },
          required: ["trends_summary", "ideas"],
        },
      },
    );

    // limpa cross-trend anteriores e insere novas (profile_id null marca como cruzada)
    await context.supabase.from("instagram_ai_ideas").delete().eq("is_cross_trend", true);
    if (Array.isArray(result.ideas) && result.ideas.length) {
      await context.supabase.from("instagram_ai_ideas").insert(
        result.ideas.slice(0, 5).map((i: any) => ({
          profile_id: null,
          is_cross_trend: true,
          title: i.title,
          body: i.body,
          suggested_media_type: i.suggested_media_type,
          suggested_networks: i.suggested_networks ?? ["instagram"],
        })),
      );
    }
    return { summary: result.trends_summary };
  });

export const convertIdeaToPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { ideaId: string; publishAt: string; networks?: string[] }) =>
    z.object({
      ideaId: z.string().uuid(),
      publishAt: z.string().min(1),
      networks: z.array(z.string()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: idea, error } = await context.supabase.from("instagram_ai_ideas").select("*").eq("id", data.ideaId).single();
    if (error || !idea) throw new Error("Ideia não encontrada");

    const mediaTypeForPost = idea.suggested_media_type === "video" || idea.suggested_media_type === "reel" ? "video" : "photo";

    const { data: post, error: insErr } = await context.supabase.from("marketing_posts").insert({
      title: idea.title,
      caption: idea.body,
      media_type: mediaTypeForPost,
      networks: data.networks?.length ? data.networks : (idea.suggested_networks ?? ["instagram"]),
      publish_at: new Date(data.publishAt).toISOString(),
    }).select("id").single();
    if (insErr) throw new Error(insErr.message);

    await context.supabase.from("instagram_ai_ideas").update({ used_post_id: post.id }).eq("id", data.ideaId);
    return { postId: post.id };
  });
