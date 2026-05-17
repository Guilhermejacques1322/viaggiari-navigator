import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getMapboxToken = createServerFn({ method: "GET" }).handler(async () => {
  const token = process.env.MAPBOX_PUBLIC_TOKEN;
  if (!token) throw new Error("Mapbox não configurado");
  return { token };
});

const geocodeSchema = z.object({ address: z.string().min(2).max(500) });

export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((input) => {
    const r = geocodeSchema.safeParse(input);
    if (!r.success) throw new Error("Endereço inválido");
    return r.data;
  })
  .handler(async ({ data }) => {
    const token = process.env.MAPBOX_PUBLIC_TOKEN;
    if (!token) throw new Error("Mapbox não configurado");
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(data.address)}.json?limit=1&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Geocoding falhou (${res.status})`);
    const json = (await res.json()) as { features?: Array<{ center?: [number, number]; place_name?: string }> };
    const feat = json.features?.[0];
    if (!feat?.center) return { latitude: null, longitude: null, place_name: null };
    return {
      longitude: feat.center[0],
      latitude: feat.center[1],
      place_name: feat.place_name ?? null,
    };
  });
