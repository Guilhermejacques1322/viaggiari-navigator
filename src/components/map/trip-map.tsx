import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as MapboxNS from "mapbox-gl";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMapboxToken } from "@/lib/mapbox.functions";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MapPin, ExternalLink } from "lucide-react";


export interface MapActivity {
  id: string;
  name: string;
  time?: string | null;
  address?: string | null;
  maps_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}
export interface MapDay {
  id: string;
  day_number: number;
  title?: string | null;
  date?: string | null;
  activities: MapActivity[];
}

interface Props {
  days: MapDay[];
  className?: string;
}

const DAY_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

export const TripMap = memo(function TripMap({ days, className }: Props) {
  const tokenFn = useServerFn(getMapboxToken);
  const { data: tokenData, isLoading: tokenLoading, isError: tokenError, error: tokenErr, refetch: refetchToken } = useQuery({
    queryKey: ["mapbox-token"],
    queryFn: () => tokenFn(),
    staleTime: 10 * 60_000,
    retry: 1,
  });
  useEffect(() => { if (tokenErr) console.error("[TripMap] token error", tokenErr); }, [tokenErr]);


  const daysWithCoords = useMemo(
    () => days.map((d) => ({
      ...d,
      activities: d.activities.filter(
        (a) => typeof a.latitude === "number" && typeof a.longitude === "number"
      ),
    })),
    [days]
  );

  const [selectedDay, setSelectedDay] = useState<string | "all">(() => {
    const first = daysWithCoords.find((d) => d.activities.length > 0);
    return first?.id ?? "all";
  });
  const selectAll = useCallback(() => setSelectedDay("all"), []);
  const selectDay = useCallback((id: string) => setSelectedDay(id), []);

  const mapRef = useRef<MapboxNS.Map | null>(null);
  const mapboxRef = useRef<typeof MapboxNS | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<MapboxNS.Marker[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Init map (lazy import to avoid SSR window errors)
  useEffect(() => {
    if (!tokenData?.token || !containerRef.current || mapRef.current) return;
    let disposed = false;

    const initWhenSized = async () => {
      const el = containerRef.current;
      if (!el) return;
      // Aguarda o container ter tamanho > 0 (evita init em aba oculta).
      const rect = el.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) {
        await new Promise<void>((resolve) => {
          const ro = new ResizeObserver(() => {
            const r = el.getBoundingClientRect();
            if (r.width >= 10 && r.height >= 10) { ro.disconnect(); resolve(); }
          });
          ro.observe(el);
          // Timeout de segurança
          setTimeout(() => { ro.disconnect(); resolve(); }, 3000);
        });
      }
      if (disposed || !containerRef.current) return;
      try {
        // CSS + JS lazy juntos — evita SSR quebrar e garante ordem.
        await import("mapbox-gl/dist/mapbox-gl.css");
        const mod = await import("mapbox-gl");
        if (disposed || !containerRef.current) return;
        const mapboxgl = mod.default;
        mapboxRef.current = mapboxgl as unknown as typeof MapboxNS;
        mapboxgl.accessToken = tokenData.token;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [-46.6333, -23.5505],
          zoom: 10,
        });
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        mapRef.current = map;
        setMapReady(true);
      } catch (err) {
        if (!disposed) {
          console.error("[TripMap] failed to load mapbox", err);
          setMapError((err as Error)?.message ?? "Falha ao carregar biblioteca do mapa");
        }
      }
    };

    void initWhenSized();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, [tokenData?.token]);


  // Resize map when container size changes (tabs, sidebars, window resize).
  useEffect(() => {
    const map = mapRef.current;
    const el = containerRef.current;
    if (!map || !el || !mapReady) return;
    const ro = new ResizeObserver(() => {
      try { map.resize(); } catch { /* noop */ }
    });
    ro.observe(el);
    // Also resize once right after ready, for late layout.
    const raf = requestAnimationFrame(() => { try { map.resize(); } catch { /* noop */ } });
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [mapReady]);

  // Render markers + route line for selected day(s)
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl || !mapReady) return;

    const apply = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      const style = map.getStyle();
      for (const layer of style?.layers ?? []) {
        if (layer.id.startsWith("route-line-")) {
          try { map.removeLayer(layer.id); } catch {}
        }
      }
      for (const id of Object.keys(style?.sources ?? {})) {
        if (id.startsWith("route-")) {
          try { map.removeSource(id); } catch {}
        }
      }

      const daysToShow =
        selectedDay === "all" ? daysWithCoords : daysWithCoords.filter((d) => d.id === selectedDay);

      const bounds = new mapboxgl.LngLatBounds();
      let hasPoints = false;

      daysToShow.forEach((day) => {
        const colorIdx = daysWithCoords.findIndex((d) => d.id === day.id);
        const color = DAY_COLORS[colorIdx % DAY_COLORS.length];
        const coords: [number, number][] = [];

        day.activities.forEach((a, idx) => {
          const lng = a.longitude as number;
          const lat = a.latitude as number;
          coords.push([lng, lat]);
          bounds.extend([lng, lat]);
          hasPoints = true;

          const el = document.createElement("div");
          el.style.cssText = `width:28px;height:28px;border-radius:50%;background:${color};color:white;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer;`;
          el.innerText = String(idx + 1);

          const popup = new mapboxgl.Popup({ offset: 18, closeButton: false }).setHTML(`
            <div style="font-family:system-ui;min-width:200px">
              <div style="font-size:11px;color:#666;margin-bottom:4px">Dia ${day.day_number}${a.time ? " · " + a.time.slice(0, 5) : ""}</div>
              <div style="font-weight:600;font-size:14px;margin-bottom:4px">${escapeHtml(a.name)}</div>
              ${a.address ? `<div style="font-size:12px;color:#555;margin-bottom:6px">${escapeHtml(a.address)}</div>` : ""}
              ${a.maps_url ? `<a href="${a.maps_url}" target="_blank" rel="noreferrer" style="font-size:12px;color:${color};text-decoration:none">Abrir no Maps →</a>` : ""}
            </div>
          `);

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat([lng, lat])
            .setPopup(popup)
            .addTo(map);
          markersRef.current.push(marker);
        });

        if (coords.length >= 2) {
          const srcId = `route-${day.id}`;
          map.addSource(srcId, {
            type: "geojson",
            data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: coords } },
          });
          map.addLayer({
            id: `route-line-${day.id}`,
            type: "line",
            source: srcId,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": color, "line-width": 3, "line-dasharray": [2, 2], "line-opacity": 0.7 },
          });
        }
      });

      if (hasPoints && !bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 600 });
      }
    };

    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
  }, [selectedDay, daysWithCoords, mapReady]);

  if (tokenLoading) return <Skeleton className="h-96 w-full" />;
  if (tokenError || mapError) {
    return (
      <Card className="p-8 text-center border-dashed">
        <MapPin className="size-8 mx-auto mb-3 opacity-40" />
        <p className="font-medium text-foreground mb-1">Não foi possível carregar o mapa</p>
        <p className="text-sm text-muted-foreground mb-4">
          {mapError ?? (tokenErr as Error | undefined)?.message ?? "Falha ao obter o token do mapa. Verifique a conexão e tente novamente."}
        </p>

        <Button
          size="sm"
          variant="outline"
          onClick={() => { setMapError(null); refetchToken(); }}
        >
          Tentar novamente
        </Button>
      </Card>
    );
  }

  const totalWithCoords = daysWithCoords.reduce((s, d) => s + d.activities.length, 0);
  if (totalWithCoords === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground border-dashed">
        <MapPin className="size-8 mx-auto mb-3 opacity-40" />
        <p className="font-medium text-foreground mb-1">Sem locais no mapa ainda</p>
        <p className="text-sm">As atividades precisam ter coordenadas. No admin, edite a atividade e clique em "Buscar" ao lado do endereço.</p>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={selectedDay === "all" ? "default" : "outline"}
          onClick={selectAll}
        >
          Toda a viagem
        </Button>
        {daysWithCoords.map((d, i) => {
          const color = DAY_COLORS[i % DAY_COLORS.length];
          const active = selectedDay === d.id;
          return (
            <Button
              key={d.id}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => selectDay(d.id)}
              disabled={d.activities.length === 0}
              className="gap-1.5"
              style={active ? { backgroundColor: color, borderColor: color, color: "white" } : undefined}
            >
              <span className="inline-block size-2 rounded-full" style={{ backgroundColor: active ? "white" : color }} />
              Dia {d.day_number}
              <span className="text-[10px] opacity-70">({d.activities.length})</span>
            </Button>
          );
        })}
      </div>

      <div ref={containerRef} className="w-full h-[60vh] min-h-[400px] rounded-lg overflow-hidden border border-border" />

      {selectedDay !== "all" && (
        <ActivityList day={daysWithCoords.find((d) => d.id === selectedDay)!} />
      )}
    </div>
  );
});

function ActivityList({ day }: { day: MapDay }) {
  if (day.activities.length === 0) return null;
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
        Dia {day.day_number} · {day.activities.length} {day.activities.length === 1 ? "local" : "locais"}
      </p>
      <ol className="space-y-2">
        {day.activities.map((a, i) => (
          <li key={a.id} className="flex items-start gap-3 text-sm">
            <span className="size-6 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold shrink-0">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{a.name}{a.time ? <span className="text-xs text-muted-foreground ml-2">{a.time.slice(0, 5)}</span> : null}</p>
              {a.address && <p className="text-xs text-muted-foreground truncate">{a.address}</p>}
            </div>
            {a.maps_url && (
              <a href={a.maps_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 shrink-0">
                <ExternalLink className="size-3" /> Maps
              </a>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
