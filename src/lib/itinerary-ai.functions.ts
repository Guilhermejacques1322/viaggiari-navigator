import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Acesso restrito a administradores");
}

const SuggestionsSchema = z.object({
  days: z.array(
    z.object({
      day_label: z.string(),
      suggested_day_number: z.number().int().min(1),
      activities: z.array(
        z.object({
          title: z.string(),
          time: z.string().nullable().optional(),
          address: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
        }),
      ),
    }),
  ),
});

export type ItinerarySuggestions = z.infer<typeof SuggestionsSchema>;

export const generateItinerarySuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      tripId: z.string().uuid(),
      prompt: z.string().min(3).max(4000),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY não configurada");

    const { data: trip } = await supabase
      .from("trips")
      .select("id, title, destinations, start_date, end_date")
      .eq("id", data.tripId)
      .maybeSingle();
    if (!trip) throw new Error("Viagem não encontrada");

    const { data: days } = await supabase
      .from("itinerary_days")
      .select("id, day_number, title, date")
      .eq("trip_id", data.tripId)
      .order("day_number");

    const dayCount = days?.length ?? 0;
    const destination = Array.isArray(trip.destinations) && trip.destinations.length
      ? trip.destinations.join(", ")
      : "não informado";

    const system = `Você é um especialista em planejamento de viagens. Gere um roteiro detalhado em português com base no pedido do usuário.

Contexto da viagem:
- Destino: ${trip.destination ?? "não informado"}
- Datas: ${trip.start_date ?? "?"} a ${trip.end_date ?? "?"}
- Dias disponíveis no roteiro: ${dayCount}

Regras:
- Sugira atividades agrupadas logicamente por região para minimizar deslocamentos.
- Sugira horários realistas (formato HH:MM) considerando tempo de visita.
- Endereço: use nome do local + cidade (ex: "Coliseu, Roma"). Não invente número exato.
- Descrição curta (1-2 frases).
- Tente respeitar o número de dias disponíveis (${dayCount}), mas pode sugerir mais se o pedido pedir.
- Responda APENAS com JSON válido no formato:

{
  "days": [
    {
      "day_label": "Dia 1 — Centro histórico",
      "suggested_day_number": 1,
      "activities": [
        { "title": "...", "time": "09:00", "address": "...", "description": "..." }
      ]
    }
  ]
}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      if (res.status === 402) throw new Error("Créditos de IA esgotados — adicione créditos no workspace");
      if (res.status === 429) throw new Error("Limite de requisições atingido, tente novamente em alguns minutos");
      throw new Error(`IA falhou (${res.status}): ${txt.slice(0, 200)}`);
    }

    const payload = await res.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Resposta da IA vazia");

    let parsed: unknown;
    try {
      parsed = typeof content === "string" ? JSON.parse(content) : content;
    } catch {
      throw new Error("IA retornou JSON inválido");
    }

    const result = SuggestionsSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error("IA retornou formato inesperado");
    }
    return result.data;
  });

export const applyItinerarySuggestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      tripId: z.string().uuid(),
      items: z.array(
        z.object({
          day_id: z.string().uuid(),
          title: z.string().min(1),
          time: z.string().nullable().optional(),
          address: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
        }),
      ).min(1),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    const dayIds = Array.from(new Set(data.items.map((i) => i.day_id)));
    const { data: validDays, error: vErr } = await supabase
      .from("itinerary_days")
      .select("id, trip_id")
      .in("id", dayIds);
    if (vErr) throw vErr;
    if (!validDays || validDays.some((d) => d.trip_id !== data.tripId)) {
      throw new Error("Dia inválido para esta viagem");
    }

    const positionsByDay: Record<string, number> = {};
    for (const dayId of dayIds) {
      const { data: maxRow } = await supabase
        .from("itinerary_activities")
        .select("position")
        .eq("day_id", dayId)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle();
      positionsByDay[dayId] = (maxRow?.position ?? -1) + 1;
    }

    const rows = data.items.map((item) => {
      const pos = positionsByDay[item.day_id]++;
      const time = item.time && /^\d{1,2}:\d{2}/.test(item.time) ? item.time.slice(0, 5) : null;
      return {
        day_id: item.day_id,
        name: item.title,
        time,
        address: item.address || null,
        description: item.description || null,
        position: pos,
        in_preroteiro: false,
      };
    });

    const { error } = await supabase.from("itinerary_activities").insert(rows);
    if (error) throw error;
    return { inserted: rows.length };
  });
