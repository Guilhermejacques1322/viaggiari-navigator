import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, MapPin, Clock, Ticket, ExternalLink, Star, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { useMyTrip, type Activity } from "@/hooks/use-my-trip";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/minha-viagem/roteiro")({
  component: Roteiro,
});

function Roteiro() {
  const { data, loading, refetch } = useMyTrip();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<Activity | null>(null);

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (!data?.trip) {
    return <p className="text-muted-foreground">Nenhuma viagem disponível.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Roteiro</p>
        <h1 className="font-display text-2xl md:text-3xl font-light">Dia a dia</h1>
        <p className="text-sm text-muted-foreground mt-1">{data.trip.title}</p>
      </div>

      {data.days.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground border-dashed">
          O roteiro está sendo preparado.
        </Card>
      )}

      <div className="space-y-3">
        {data.days.map((day) => {
          const expanded = openDay === day.id;
          const visible = day.activities.filter((a) => !a.in_preroteiro || a.client_response === "want");
          return (
            <Card key={day.id} className="overflow-hidden">
              <button
                onClick={() => setOpenDay(expanded ? null : day.id)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-accent/50 transition-colors"
              >
                <div className="size-11 rounded-full bg-primary/10 grid place-items-center text-primary font-display font-medium">
                  {day.day_number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-display font-medium truncate">{day.title ?? `Dia ${day.day_number}`}</p>
                  <p className="text-xs text-muted-foreground">
                    {day.date && formatDate(day.date)}
                    {day.date && visible.length > 0 && " • "}
                    {visible.length > 0 && `${visible.length} atividades`}
                  </p>
                </div>
                <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
              </button>

              {expanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-4">
                  {day.description && (
                    <p className="text-sm text-muted-foreground italic">{day.description}</p>
                  )}
                  {visible.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sem atividades programadas
                    </p>
                  ) : (
                    visible.map((a) => (
                      <ActivityCard key={a.id} a={a} onReview={() => setReviewing(a)} />
                    ))
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <ReviewDialog
        activity={reviewing}
        tripId={data.trip.id}
        onClose={() => setReviewing(null)}
        onSaved={() => { setReviewing(null); refetch(); toast.success("Avaliação enviada!"); }}
      />
    </div>
  );
}

function ActivityCard({ a, onReview }: { a: Activity; onReview: () => void }) {
  return (
    <div className="rounded-lg border border-border p-3 bg-surface">
      <div className="flex items-start gap-3">
        {a.time && (
          <div className="text-xs text-primary font-medium whitespace-nowrap pt-0.5 flex items-center gap-1">
            <Clock className="size-3" /> {a.time.slice(0, 5)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{a.name}</p>
          {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
          {a.address && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="size-3" /> {a.address}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {a.maps_url && (
              <a href={a.maps_url} target="_blank" rel="noreferrer"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <ExternalLink className="size-3" /> Maps
              </a>
            )}
            {a.has_ticket && (
              <span className="text-xs text-primary inline-flex items-center gap-1">
                <Ticket className="size-3" /> Ingresso
              </span>
            )}
            <button onClick={onReview} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 ml-auto">
              <Star className="size-3" /> Avaliar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewDialog({
  activity, tripId, onClose, onSaved,
}: { activity: Activity | null; tripId: string; onClose: () => void; onSaved: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!activity || rating === 0) return;
    setSaving(true);
    const { error } = await supabase.from("reviews").insert({
      trip_id: tripId,
      activity_id: activity.id,
      rating,
      comment: comment || null,
      location_name: activity.name,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setRating(0); setComment("");
    onSaved();
  }

  return (
    <Dialog open={!!activity} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avaliar: {activity?.name}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 justify-center py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => setRating(n)} className="p-1">
              <Star className={cn("size-8", n <= rating ? "fill-primary text-primary" : "text-muted-foreground")} />
            </button>
          ))}
        </div>
        <Textarea
          placeholder="Conte como foi (opcional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={rating === 0 || saving}>Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}
