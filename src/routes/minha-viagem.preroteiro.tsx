import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X, MapPin, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useMyTrip, type Activity } from "@/hooks/use-my-trip";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/minha-viagem/preroteiro")({
  component: PreRoteiro,
});

function PreRoteiro() {
  const { data, loading, refetch } = useMyTrip();
  const [pending, setPending] = useState<string | null>(null);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!data?.trip) return <p className="text-muted-foreground">Nenhuma viagem.</p>;

  if (!data.trip.preroteiro_mode) {
    return (
      <Card className="p-8 text-center text-muted-foreground border-dashed">
        Seu roteiro já está fechado — confira em <strong>Roteiro</strong>.
      </Card>
    );
  }

  const items = data.days.flatMap((d) =>
    d.activities
      .filter((a) => a.in_preroteiro)
      .map((a) => ({ activity: a, dayNumber: d.day_number, dayTitle: d.title }))
  );

  const decided = items.filter((i) => i.activity.client_response).length;

  async function respond(activityId: string, response: "want" | "skip") {
    setPending(activityId);
    const { error } = await supabase
      .from("itinerary_activities")
      .update({ client_response: response })
      .eq("id", activityId);
    setPending(null);
    if (error) { toast.error(error.message); return; }
    refetch();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Pré-roteiro</p>
        <h1 className="font-display text-2xl md:text-3xl font-light">Você decide</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Separamos estas sugestões para sua viagem - Marque o que tem fit com você,
          isso vai nos ajudar a fechar o roteiro final.
        </p>
        <p className="text-xs text-muted-foreground mt-3">
          {decided} de {items.length} decididas
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          Nenhuma sugestão por enquanto.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map(({ activity, dayNumber, dayTitle }) => (
            <Card key={activity.id} className={cn(
              "p-4 transition-opacity",
              activity.client_response === "skip" && "opacity-60"
            )}>
              <div className="flex items-start gap-3">
                <div className="size-9 rounded-full bg-primary/10 grid place-items-center text-primary font-display text-xs font-medium shrink-0">
                  D{dayNumber}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{activity.name}</p>
                  {dayTitle && <p className="text-xs text-muted-foreground">{dayTitle}</p>}
                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-2">{activity.description}</p>
                  )}
                  {activity.address && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <MapPin className="size-3" /> {activity.address}
                    </p>
                  )}
                  {activity.maps_url && (
                    <a href={activity.maps_url} target="_blank" rel="noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1">
                      <ExternalLink className="size-3" /> Ver no mapa
                    </a>
                  )}
                </div>
              </div>
              <Decision a={activity} disabled={pending === activity.id} onPick={(r) => respond(activity.id, r)} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Decision({
  a, disabled, onPick,
}: { a: Activity; disabled: boolean; onPick: (r: "want" | "skip") => void }) {
  return (
    <div className="flex gap-2 mt-3">
      <Button
        size="sm"
        variant={a.client_response === "want" ? "default" : "outline"}
        className="flex-1"
        disabled={disabled}
        onClick={() => onPick("want")}
      >
        <Check className="size-4" /> Quero
      </Button>
      <Button
        size="sm"
        variant={a.client_response === "skip" ? "secondary" : "outline"}
        className="flex-1"
        disabled={disabled}
        onClick={() => onPick("skip")}
      >
        <X className="size-4" /> Pulo
      </Button>
    </div>
  );
}
