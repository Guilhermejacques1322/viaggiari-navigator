import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { sendPushTo } from "@/lib/push-send";


// Cron-triggered endpoint: scans upcoming activities, sends 24h and 1h reminders,
// marks them as sent, and prunes dead subscriptions.

const WINDOW_MINUTES = 15; // run cron every ~5min; allow ±15min tolerance

export const Route = createFileRoute("/api/public/hooks/send-push-reminders")({
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


        // Pull all activities that could be relevant: visible trips, future, with a time
        // and at least one reminder still pending.
        const { data: activities, error } = await supabase
          .from("itinerary_activities")
          .select(
            `id, name, time, reminder_24h_sent_at, reminder_1h_sent_at,
             itinerary_days!inner ( id, date, trip_id,
               trips!inner ( id, visible_to_client, contact_id,
                 contacts!inner ( id, user_id ) ) )`,
          )
          .or("reminder_24h_sent_at.is.null,reminder_1h_sent_at.is.null");

        if (error) {
          console.error("send-push-reminders: query failed", error);
          return new Response(JSON.stringify({ error: error.message }), { status: 500 });
        }

        const now = new Date();
        const results = { processed: 0, sent: 0, marked: 0, errors: [] as string[] };

        for (const a of activities ?? []) {
          const day = (a as any).itinerary_days;
          const trip = day?.trips;
          const contact = trip?.contacts;
          if (!day?.date || !a.time || !trip?.visible_to_client || !contact?.user_id) continue;

          // Construct the activity start as local-ish: date + time. We treat it as UTC-naive
          // and rely on the date stored in DB matching the traveler's actual day. This is a
          // reasonable simplification; for precise timezone handling we'd need a trip TZ.
          const start = new Date(`${day.date}T${a.time}`);
          if (isNaN(start.getTime())) continue;

          const diffMs = start.getTime() - now.getTime();
          const diffMin = diffMs / 60000;

          const fire24 =
            !a.reminder_24h_sent_at && Math.abs(diffMin - 24 * 60) <= WINDOW_MINUTES;
          const fire1 = !a.reminder_1h_sent_at && Math.abs(diffMin - 60) <= WINDOW_MINUTES;

          if (!fire24 && !fire1) continue;
          results.processed++;

          // Fetch subscriptions for this user
          const { data: subs } = await supabase
            .from("push_subscriptions")
            .select("id,endpoint,p256dh,auth")
            .eq("user_id", contact.user_id);

          if (subs && subs.length > 0) {
            const which = fire24 ? "Amanhã" : "Em 1 hora";
            const payload = JSON.stringify({
              title: `${which}: ${a.name}`,
              body: a.time
                ? `${which.toLowerCase()} às ${a.time.slice(0, 5)}`
                : which,
              url: "/minha-viagem/roteiro",
              tag: `act-${a.id}-${fire24 ? "24" : "1"}`,
            });

            for (const s of subs) {
              const r = await sendPushTo(s, payload);
              if (r.ok) {
                results.sent++;
              } else if (r.status === 404 || r.status === 410) {
                await supabase.from("push_subscriptions").delete().eq("id", s.id);
              } else {
                results.errors.push(`sub ${s.id}: ${r.status ?? "?"} ${r.error ?? ""}`);
              }
            }
          }

          // Mark as sent regardless of subscription count (avoid retrying every cron)
          const update: Record<string, string> = {};
          if (fire24) update.reminder_24h_sent_at = now.toISOString();
          if (fire1) update.reminder_1h_sent_at = now.toISOString();
          const { error: upErr } = await supabase
            .from("itinerary_activities")
            .update(update)
            .eq("id", a.id);
          if (!upErr) results.marked++;
        }

        return new Response(JSON.stringify(results), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
