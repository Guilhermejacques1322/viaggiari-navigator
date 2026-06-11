import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type TransportMode = "driving" | "transit" | "walking" | "hidden";

const dayIdSchema = z.object({ dayId: z.string().uuid() });
const setSegmentSchema = z.object({
  fromActivityId: z.string().uuid(),
  mode: z.enum(["driving", "transit", "walking", "hidden"]),
});
const setTripDefaultSchema = z.object({
  tripId: z.string().uuid(),
  mode: z.enum(["driving", "transit", "walking", "hidden"]),
});

async function mapboxDirections(
  profile: "driving-traffic" | "walking",
  from: { lat: number; lon: number },
  to: { lat: number; lon: number },
  token: string,
): Promise<{ duration_sec: number; distance_m: number } | null> {
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${from.lon},${from.lat};${to.lon},${to.lat}?geometries=geojson&overview=false&access_token=${token}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = (await res.json()) as { routes?: Array<{ duration: number; distance: number }> };
  const r = json.routes?.[0];
  if (!r) return null;
  return { duration_sec: Math.round(r.duration), distance_m: Math.round(r.distance) };
}

export const computeDayRoutes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => dayIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const token = process.env.MAPBOX_PUBLIC_TOKEN;
    if (!token) throw new Error("Mapbox não configurado");
    const { supabase } = context;

    const { data: activities, error } = await supabase
      .from("itinerary_activities")
      .select("id, position, latitude, longitude, name")
      .eq("day_id", data.dayId)
      .order("position");
    if (error) throw new Error(error.message);

    const points = (activities ?? []).filter(
      (a) => a.latitude !== null && a.longitude !== null,
    );
    if (points.length < 2) return { computed: 0, skipped: 0 };

    let computed = 0;
    let skipped = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      const fp = { lat: Number(from.latitude), lon: Number(from.longitude) };
      const tp = { lat: Number(to.latitude), lon: Number(to.longitude) };

      const [drive, walk] = await Promise.all([
        mapboxDirections("driving-traffic", fp, tp, token),
        mapboxDirections("walking", fp, tp, token),
      ]);

      if (!drive && !walk) {
        skipped++;
        continue;
      }

      // Transit: estimativa baseada em driving (~1.6x duração)
      const transit = drive
        ? {
            duration_sec: Math.round(drive.duration_sec * 1.6),
            distance_m: drive.distance_m,
          }
        : null;

      const { error: upErr } = await supabase
        .from("activity_routes")
        .upsert(
          {
            from_activity_id: from.id,
            to_activity_id: to.id,
            driving_duration_sec: drive?.duration_sec ?? null,
            driving_distance_m: drive?.distance_m ?? null,
            transit_duration_sec: transit?.duration_sec ?? null,
            transit_distance_m: transit?.distance_m ?? null,
            transit_is_estimate: true,
            walking_duration_sec: walk?.duration_sec ?? null,
            walking_distance_m: walk?.distance_m ?? null,
            computed_at: new Date().toISOString(),
          },
          { onConflict: "from_activity_id,to_activity_id" },
        );
      if (upErr) throw new Error(upErr.message);
      computed++;
    }

    return { computed, skipped, totalPairs: points.length - 1, withoutCoords: (activities?.length ?? 0) - points.length };
  });

export const setSegmentTransport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setSegmentSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("itinerary_activities")
      .update({ transport_mode_to_next: data.mode as TransportMode })
      .eq("id", data.fromActivityId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTripDefaultTransport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => setTripDefaultSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("trips")
      .update({ default_transport_mode: data.mode as TransportMode })
      .eq("id", data.tripId);
    if (error) throw new Error(error.message);

    // Limpa overrides por trecho das atividades dessa viagem
    const { data: days } = await supabase
      .from("itinerary_days")
      .select("id")
      .eq("trip_id", data.tripId);
    const dayIds = (days ?? []).map((d) => d.id);
    if (dayIds.length) {
      await supabase
        .from("itinerary_activities")
        .update({ transport_mode_to_next: null })
        .in("day_id", dayIds);
    }
    return { ok: true };
  });
