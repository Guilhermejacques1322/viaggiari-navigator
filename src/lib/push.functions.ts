import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendPushTo, getVapidPublicKey as readVapidPublicKey } from "@/lib/push-send";
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { key: readVapidPublicKey() };
});

const subscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
  user_agent: z.string().max(500).optional(),
});

export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => subscribeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: data.endpoint,
          p256dh: data.keys.p256dh,
          auth: data.keys.auth,
          user_agent: data.user_agent ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ endpoint: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendTestPushToSelf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .eq("user_id", userId);
    if (!subs || subs.length === 0) return { sent: 0 };

    const body = JSON.stringify({
      title: "Notificações ativadas ✈️",
      body: "Você receberá lembretes 1 dia e 1 hora antes de cada atividade.",
      url: "/minha-viagem",
      tag: "test-notification",
    });

    let sent = 0;
    for (const s of subs) {
      const r = await sendPushTo(s, body);
      if (r.ok) sent++;
      else console.error("[push self] falha", s.endpoint.slice(0, 60), r.status, r.error);
    }
    return { sent };
  });

export const broadcastTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Apenas admins podem enviar broadcast.");

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id,endpoint,p256dh,auth");
    if (!subs || subs.length === 0) return { sent: 0, total: 0, removed: 0 };

    const payload = JSON.stringify({
      title: "Viaggiari ✈️",
      body: "Esse é um teste do sistema Viaggiari, estamos trabalhando para melhorar cada vez mais pensando em vocês. Obrigado!",
      url: "/minha-viagem",
      tag: "broadcast-test",
    });

    let sent = 0;
    const deadIds: string[] = [];
    const errors: string[] = [];
    for (const s of subs) {
      const r = await sendPushTo(s, payload);
      if (r.ok) {
        sent++;
      } else if (r.status === 404 || r.status === 410) {
        deadIds.push(s.id);
      } else {
        errors.push(`${r.status ?? "?"}: ${r.error ?? ""}`);
      }
    }
    if (deadIds.length > 0) {
      await supabase.from("push_subscriptions").delete().in("id", deadIds);
    }
    if (errors.length > 0) console.error("[push broadcast] erros:", errors);
    return { sent, total: subs.length, removed: deadIds.length, errors: errors.slice(0, 3) };
  });

