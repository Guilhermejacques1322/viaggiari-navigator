import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getMapboxToken = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env.MAPBOX_PUBLIC_TOKEN;
  if (!token) throw new Error("Mapbox não configurado");
  return { token };
});

const geocodeSchema = z.object({
  address: z.string().min(2).max(500),
  country: z.string().length(2).optional(), // ISO 3166-1 alpha-2, ex: "cl"
  proximity: z.tuple([z.number(), z.number()]).optional(), // [lng, lat]
});

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((input) => geocodeSchema.parse(input))
  .handler(async ({ data }) => {
    const token = process.env.MAPBOX_PUBLIC_TOKEN;
    if (!token) throw new Error("Mapbox não configurado");
    const params = new URLSearchParams({ limit: "5", access_token: token });
    if (data.country) params.set("country", data.country.toLowerCase());
    if (data.proximity) params.set("proximity", `${data.proximity[0]},${data.proximity[1]}`);

    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(data.address)}.json?${params.toString()}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding falhou (${res.status})`);
    const json = (await res.json()) as {
      features?: Array<{
        center?: [number, number];
        place_name?: string;
        relevance?: number;
        context?: Array<{ id: string; short_code?: string; text?: string }>;
      }>;
    };
    const candidates = (json.features ?? [])
      .filter((f) => f.center)
      .map((f) => ({
        latitude: f.center![1],
        longitude: f.center![0],
        place_name: f.place_name ?? null,
        relevance: f.relevance ?? 0,
        country: f.context?.find((c) => c.id.startsWith("country"))?.short_code ?? null,
      }));
    const best = candidates[0] ?? null;
    return {
      // legado: campos achatados do melhor resultado
      latitude: best?.latitude ?? null,
      longitude: best?.longitude ?? null,
      place_name: best?.place_name ?? null,
      candidates,
    };
  });

const regeocodeSchema = z.object({
  tripId: z.string().uuid(),
  onlyMissing: z.boolean().default(false),
});

export const regeocodeTripActivities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => regeocodeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const token = process.env.MAPBOX_PUBLIC_TOKEN;
    if (!token) throw new Error("Mapbox não configurado");
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Apenas admins podem re-geocodificar");

    const { data: days, error: dErr } = await supabase
      .from("itinerary_days").select("id").eq("trip_id", data.tripId);
    if (dErr) throw new Error(dErr.message);
    const dayIds = (days ?? []).map((d) => d.id);
    if (!dayIds.length) return { updated: 0, skipped: 0, total: 0 };

    const { data: acts, error: aErr } = await supabase
      .from("itinerary_activities")
      .select("id, address, latitude, longitude")
      .in("day_id", dayIds);
    if (aErr) throw new Error(aErr.message);

    const targets = (acts ?? []).filter((a) =>
      a.address && a.address.trim().length >= 3 &&
      (!data.onlyMissing || a.latitude == null || a.longitude == null),
    );

    // viés por proximidade: média das coords já válidas
    const valid = (acts ?? []).filter((a) => a.latitude != null && a.longitude != null);
    let proximity: string | null = null;
    if (valid.length) {
      const avgLng = valid.reduce((s, a) => s + Number(a.longitude), 0) / valid.length;
      const avgLat = valid.reduce((s, a) => s + Number(a.latitude), 0) / valid.length;
      proximity = `${avgLng},${avgLat}`;
    }

    let updated = 0;
    let skipped = 0;
    for (const a of targets) {
      const params = new URLSearchParams({ limit: "1", access_token: token });
      if (proximity) params.set("proximity", proximity);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(a.address!)}.json?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) { skipped++; continue; }
      const json = (await res.json()) as { features?: Array<{ center?: [number, number] }> };
      const center = json.features?.[0]?.center;
      if (!center) { skipped++; continue; }
      const { error } = await supabase
        .from("itinerary_activities")
        .update({ latitude: center[1], longitude: center[0] })
        .eq("id", a.id);
      if (error) { skipped++; continue; }
      updated++;
    }
    return { updated, skipped, total: targets.length };
  });

