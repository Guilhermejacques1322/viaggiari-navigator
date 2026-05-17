import { createFileRoute } from "@tanstack/react-router";
import { useMyTrip } from "@/hooks/use-my-trip";
import { Skeleton } from "@/components/ui/skeleton";
import { TripMap } from "@/components/map/trip-map";

export const Route = createFileRoute("/minha-viagem/mapa")({
  component: MapaPage,
});

function MapaPage() {
  const { data, loading } = useMyTrip();

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!data?.trip) return <p className="text-muted-foreground">Nenhuma viagem disponível.</p>;

  return (
    <div className="space-y-6">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Mapa</p>
        <h1 className="font-display text-2xl md:text-3xl font-light">Onde você vai estar</h1>
        <p className="text-sm text-muted-foreground mt-1">Selecione um dia para ver os locais na ordem.</p>
      </div>

      <TripMap days={data.days} />
    </div>
  );
}
