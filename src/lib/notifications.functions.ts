import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendPushTo } from "@/lib/push-send";

export const dispatchDueNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) throw new Error("Apenas admins podem enviar notificações.");

    const nowIso = new Date().toISOString();
    const { data: notifications, error } = await supabase
      .from("notifications")
      .select("id, title, body, scheduled_for, trip_id, trips!inner(id, title, visible_to_client, contacts!inner(id, user_id, full_name))")
      .eq("sent", false)
      .lte("scheduled_for", nowIso)
      .order("scheduled_for", { ascending: true })
      .limit(50);

    if (error) throw new Error(error.message);

    const results = { processed: 0, sent: 0, errors: [] as string[] };

    for (const item of notifications ?? []) {
      results.processed++;

      const trip = Array.isArray((item as any).trips) ? (item as any).trips[0] : (item as any).trips;
      const contact = Array.isArray(trip?.contacts) ? trip?.contacts[0] : trip?.contacts;
      const userTarget = contact?.user_id as string | undefined;

      if (trip?.visible_to_client && userTarget) {
        const { data: subs } = await supabase
          .from("push_subscriptions")
          .select("id, endpoint, p256dh, auth")
          .eq("user_id", userTarget);

        for (const sub of subs ?? []) {
          const payload = JSON.stringify({
            title: item.title,
            body: item.body ?? trip?.title ?? "Você tem uma nova notificação.",
            url: "/minha-viagem",
            tag: `notification-${item.id}`,
          });

          const response = await sendPushTo(sub, payload);
          if (response.ok) {
            results.sent++;
          } else {
            results.errors.push(`${item.id}: ${response.status ?? "?"} ${response.error ?? "falha no push"}`);
          }
        }
      }

      await supabase.from("notifications").update({ sent: true }).eq("id", item.id);
    }

    return { ...results, errors: results.errors.slice(0, 5) };
  });