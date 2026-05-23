import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { sendPushTo } from "@/lib/push-send";

// Cron-triggered endpoint: dispatches due rows from the `notifications` table.
// Sends push to the trip owner's subscriptions and marks the row as sent.

export const Route = createFileRoute("/api/public/hooks/dispatch-notifications")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!apiKey || !expected || apiKey !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );

        const nowIso = new Date().toISOString();
        const { data: notifications, error } = await supabase
          .from("notifications")
          .select(
            `id, title, body, scheduled_for, trip_id,
             trips!inner ( id, title, visible_to_client,
               contacts!inner ( id, user_id ) )`,
          )
          .eq("sent", false)
          .lte("scheduled_for", nowIso)
          .order("scheduled_for", { ascending: true })
          .limit(100);

        if (error) {
          console.error("dispatch-notifications: query failed", error);
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const results = { processed: 0, sent: 0, errors: [] as string[] };

        for (const item of notifications ?? []) {
          results.processed++;
          const trip: any = (item as any).trips;
          const contact: any = trip?.contacts;
          const userTarget: string | undefined = contact?.user_id;

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
              const r = await sendPushTo(sub, payload);
              if (r.ok) {
                results.sent++;
              } else if (r.status === 404 || r.status === 410) {
                await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              } else {
                results.errors.push(`sub ${sub.id}: ${r.status ?? "?"} ${r.error ?? ""}`);
              }
            }
          }

          await supabase.from("notifications").update({ sent: true }).eq("id", item.id);
        }

        return new Response(
          JSON.stringify({ ...results, errors: results.errors.slice(0, 5) }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
