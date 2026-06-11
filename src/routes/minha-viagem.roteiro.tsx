import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown, MapPin, Clock, Ticket, ExternalLink, Star, Paperclip, Download, Plane, Train, Hotel, File, Sparkles, Users as UsersIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMyTrip, type Activity, type Document, type ActivityPartner, type ActivityRoute } from "@/hooks/use-my-trip";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { RouteConnector } from "@/components/route-connector";
import { computeDayRoutes } from "@/lib/routes.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/minha-viagem/roteiro")({
  component: Roteiro,
});

function Roteiro() {
  const { data, loading, refetch } = useMyTrip();
  const { isAdmin } = useAuth();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState<Activity | null>(null);
  const [computing, setComputing] = useState<string | null>(null);
  const compute = useServerFn(computeDayRoutes);

  async function handleCompute(dayId: string) {
    setComputing(dayId);
    try {
      const res = await compute({ data: { dayId } });
      if ((res.withoutCoords ?? 0) > 0) {
        toast.warning(`${res.withoutCoords} ponto(s) sem coordenadas foram ignorados`);
      }
      toast.success(`${res.computed} rota(s) calculada(s)`);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setComputing(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }
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
                <div className="px-4 pb-4 space-y-1 border-t border-border pt-4">
                  {day.description && (
                    <p className="text-sm text-muted-foreground italic mb-2">{day.description}</p>
                  )}
                  {isAdmin && visible.length >= 2 && (
                    <div className="flex justify-end pb-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={computing === day.id}
                        onClick={() => handleCompute(day.id)}
                        className="h-7 text-xs gap-1"
                      >
                        <RefreshCw className={cn("size-3", computing === day.id && "animate-spin")} />
                        Calcular rotas
                      </Button>
                    </div>
                  )}
                  {visible.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Sem atividades programadas
                    </p>
                  ) : (
                    visible.map((a, idx) => {
                      const docs = (data.documents ?? []).filter((d) => d.activity_id === a.id);
                      const next = visible[idx + 1];
                      const route = next
                        ? (data.routes ?? []).find((r) => r.from_activity_id === a.id && r.to_activity_id === next.id) ?? null
                        : null;
                      const segMode = (a.transport_mode_to_next ?? data.trip!.default_transport_mode) as "driving" | "transit" | "walking" | "hidden";
                      return (
                        <div key={a.id} className="space-y-1">
                          <ActivityCard a={a} docs={docs} onReview={() => setReviewing(a)} />
                          {next && (
                            <RouteConnector
                              fromActivityId={a.id}
                              fromName={a.name}
                              toName={next.name}
                              route={route}
                              currentMode={segMode}
                              tripId={data.trip!.id}
                              isAdmin={isAdmin}
                              onChanged={refetch}
                            />
                          )}
                        </div>
                      );
                    })
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

const DOC_ICONS = {
  flight: Plane, train: Train, hotel: Hotel, ticket: Ticket, other: File,
} as const;

function ActivityCard({ a, docs, onReview }: { a: Activity & { partners?: ActivityPartner[] }; docs: Document[]; onReview: () => void }) {
  const [docsOpen, setDocsOpen] = useState(false);
  const [showCuriosities, setShowCuriosities] = useState(false);
  const partners = a.partners ?? [];
  return (
    <div className="rounded-lg border border-border bg-surface overflow-hidden">
      {a.image_url && (
        <div className="aspect-video bg-muted overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={a.image_url}
            alt={a.name}
            loading="lazy"
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }}
          />
        </div>
      )}
      <div className="p-3">
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

            {partners.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {partners.map((p) => (
                  <span key={p.id}
                    className="text-[11px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/8 text-primary border border-primary/15">
                    <UsersIcon className="size-3" />
                    {p.role ? `${p.role}: ` : ""}{p.name}
                    {p.included_in_package
                      ? <span className="text-emerald-700 dark:text-emerald-400 ml-1">(incluso)</span>
                      : Number(p.cost) > 0
                        ? <span className="ml-1">+{Number(p.cost).toLocaleString("pt-BR", { style: "currency", currency: p.currency ?? "BRL" })}</span>
                        : null}
                  </span>
                ))}
              </div>
            )}

            {a.curiosities && (
              <button
                onClick={() => setShowCuriosities((v) => !v)}
                className="mt-2 text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <Sparkles className="size-3" />
                {showCuriosities ? "Ocultar curiosidades" : "Curiosidades e recomendações"}
              </button>
            )}
            {showCuriosities && a.curiosities && (
              <div className="mt-2 p-3 rounded-md bg-primary/5 border border-primary/10 text-xs text-foreground/80 whitespace-pre-line">
                {a.curiosities}
              </div>
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
              {docs.length > 0 && (
                <button
                  onClick={() => setDocsOpen(true)}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >
                  <Paperclip className="size-3" /> {docs.length} doc{docs.length > 1 ? "s" : ""}
                </button>
              )}
              <button onClick={onReview} className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 ml-auto">
                <Star className="size-3" /> Avaliar
              </button>
            </div>

            {docs.length > 0 && (
              <ActivityDocsDialog
                open={docsOpen}
                onOpenChange={setDocsOpen}
                activityName={a.name}
                docs={docs}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityDocsDialog({
  open, onOpenChange, activityName, docs,
}: { open: boolean; onOpenChange: (v: boolean) => void; activityName: string; docs: Document[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function openDoc(d: Document) {
    setLoadingId(d.id);
    const { data, error } = await supabase.storage
      .from("trip-documents")
      .createSignedUrl(d.storage_path, 300);
    setLoadingId(null);
    if (error || !data) { toast.error("Não foi possível abrir o documento"); return; }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Documentos</DialogTitle>
          <DialogDescription className="text-xs">{activityName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {docs.map((d) => {
            const Icon = DOC_ICONS[d.category] ?? File;
            return (
              <button
                key={d.id}
                onClick={() => openDoc(d)}
                disabled={loadingId === d.id}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-accent/30 transition-colors text-left disabled:opacity-50"
              >
                <div className="size-9 rounded-lg bg-primary/10 grid place-items-center text-primary shrink-0">
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{d.name}</p>
                  {d.event_date && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(d.event_date).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                  {d.notes && <p className="text-xs text-muted-foreground truncate">{d.notes}</p>}
                </div>
                <Download className="size-4 text-muted-foreground shrink-0" />
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
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
