import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Wrench } from "lucide-react";
import { useMyTrip, type TripUtility, type TripUtilitySection } from "@/hooks/use-my-trip";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/minha-viagem/utilidades")({
  component: UtilidadesPage,
  errorComponent: ({ error, reset }) => (
    <div className="p-6 text-center space-y-3">
      <p className="text-sm text-muted-foreground">Não foi possível carregar as utilidades.</p>
      <p className="text-xs text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="text-sm text-primary hover:underline">Tentar novamente</button>
    </div>
  ),
});

function mapsHref(u: { maps_url: string | null; address: string | null; name: string }) {
  if (u.maps_url) return u.maps_url;
  const q = encodeURIComponent(u.address ?? u.name);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function UtilityItem({ u }: { u: TripUtility }) {
  return (
    <li>
      <Card className="p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
            {u.kind}
          </span>
          <p className="font-medium text-sm mt-1.5">{u.name}</p>
          {u.address && <p className="text-xs text-muted-foreground mt-0.5">{u.address}</p>}
        </div>
        <a
          href={mapsHref(u)}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
        >
          <ExternalLink className="size-3" /> Maps
        </a>
      </Card>
    </li>
  );
}

function UtilidadesPage() {
  const { data, loading } = useMyTrip();

  if (loading) return <Skeleton className="h-64 w-full" />;
  if (!data?.trip) return <p className="text-muted-foreground">Nenhuma viagem disponível.</p>;

  const items = data.utilities ?? [];
  const sections = data.utilitySections ?? [];

  const bySection = (id: string | null) =>
    items.filter((u) => (u.section_id ?? null) === id);

  const groups: { section: TripUtilitySection | null; items: TripUtility[] }[] = [
    ...sections.map((s) => ({ section: s, items: bySection(s.id) })),
  ];
  const unassigned = bySection(null);
  if (unassigned.length > 0) groups.push({ section: null, items: unassigned });

  return (
    <div className="space-y-6">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Utilidades</p>
        <h1 className="font-display text-2xl md:text-3xl font-light">Conveniências úteis</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Farmácias, mercados, correios e outros lugares práticos para caso precisar durante a viagem.
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          <Wrench className="size-8 mx-auto mb-3 opacity-40" />
          <p>Nenhuma utilidade cadastrada para esta viagem ainda.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            g.items.length === 0 ? null : (
              <section key={g.section?.id ?? "none"} className="space-y-2">
                <h2 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {g.section ? g.section.title : "Outros"}
                </h2>
                <ul className="space-y-2">
                  {g.items.map((u) => <UtilityItem key={u.id} u={u} />)}
                </ul>
              </section>
            )
          ))}
        </div>
      )}
    </div>
  );
}
