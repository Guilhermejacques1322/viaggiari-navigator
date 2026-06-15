import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { memo, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Eye, EyeOff, ListChecks, Trash2, Plus, Upload, FileText,
  CalendarDays, GripVertical, ExternalLink, UserCheck, Paperclip, BookmarkPlus, MapPin,
} from "lucide-react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, closestCenter, useDroppable,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { CreateAccessButton } from "./admin.crm.$contactId";
import { TripMap } from "@/components/map/trip-map";
import { geocodeAddress, regeocodeTripActivities } from "@/lib/mapbox.functions";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TripChecklistAdmin } from "@/components/trip-checklist-admin";
import { TRIP_STATUS_LABEL } from "./admin.viagens";
import { confirmAction } from "@/lib/confirm";
import type { Database } from "@/integrations/supabase/types";

type Trip = Database["public"]["Tables"]["trips"]["Row"];
type Day = Database["public"]["Tables"]["itinerary_days"]["Row"];
type Activity = Database["public"]["Tables"]["itinerary_activities"]["Row"];
type Document = Database["public"]["Tables"]["documents"]["Row"];
type DocCategory = Database["public"]["Enums"]["document_category"];

export const Route = createFileRoute("/admin/viagens/$tripId")({
  component: TripDetail,
});

function TripDetail() {
  const { tripId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("*, contacts(full_name, email, user_id)")
        .eq("id", tripId).single();
      if (error) throw error;
      return data;
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const [tab, setTab] = useState("info");

  if (isLoading || !trip) return <Skeleton className="h-96" />;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["trip", tripId] });
  const handleAiApplied = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["trip", tripId] }),
      qc.invalidateQueries({ queryKey: ["trip-days", tripId], refetchType: "all" }),
    ]);
    setTab("roteiro");
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Link to="/admin/viagens" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <TripHeader trip={trip} onSaved={invalidate} onDeleted={() => { qc.invalidateQueries({ queryKey: ["trips"] }); navigate({ to: "/admin/viagens" }); }} />

      {!trip.contacts?.user_id && (
        <Card className="p-4 border-amber-500/40 bg-amber-500/5 flex items-start gap-3">
          <UserCheck className="size-5 text-amber-600 shrink-0" />
          <div className="text-sm flex-1">
            <p className="font-medium text-amber-700 dark:text-amber-300">Cliente ainda sem login</p>
            <p className="text-muted-foreground mt-1">
              Crie um acesso para <strong>{trip.contacts?.full_name}</strong> usando o e-mail{" "}
              <strong>{trip.contacts?.email}</strong>. Login e senha ficam salvos no CRM dele.
            </p>
            <div className="mt-3">
              <CreateAccessButton
                contactId={trip.contact_id}
                email={trip.contacts?.email ?? ""}
              />
            </div>
          </div>
        </Card>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="info">Info</TabsTrigger>
          <TabsTrigger value="roteiro">Roteiro</TabsTrigger>
          <TabsTrigger value="ai">Criação por IA</TabsTrigger>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-4"><InfoTab trip={trip} onSaved={invalidate} /></TabsContent>
        <TabsContent value="roteiro" className="mt-4"><RoteiroTab tripId={tripId} preroteiroMode={!!trip.preroteiro_mode} /></TabsContent>
        <TabsContent value="ai" className="mt-4"><AiCreationTab tripId={tripId} onApplied={handleAiApplied} /></TabsContent>
        <TabsContent value="mapa" className="mt-4"><MapaTab tripId={tripId} /></TabsContent>
        <TabsContent value="documentos" className="mt-4"><DocsTab tripId={tripId} /></TabsContent>
        <TabsContent value="checklist" className="mt-4"><TripChecklistAdmin tripId={tripId} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================== HEADER ============================== */
function TripHeader({ trip, onSaved, onDeleted }: { trip: any; onSaved: () => void; onDeleted: () => void }) {
  const toggleVisible = async () => {
    const { error } = await supabase.from("trips").update({ visible_to_client: !trip.visible_to_client }).eq("id", trip.id);
    if (error) return toast.error(error.message);
    toast.success(trip.visible_to_client ? "Viagem oculta do cliente" : "Cliente já pode acessar!");
    onSaved();
  };
  const togglePreroteiro = async () => {
    const { error } = await supabase.from("trips").update({ preroteiro_mode: !trip.preroteiro_mode }).eq("id", trip.id);
    if (error) return toast.error(error.message);
    onSaved();
  };
  const remove = async () => {
    if (!(await confirmAction(`Excluir a viagem "${trip.title}"?`, { description: "Isso apaga roteiro, documentos e pagamentos.", confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("trips").delete().eq("id", trip.id);
    if (error) return toast.error(error.message);
    toast.success("Viagem excluída");
    onDeleted();
  };

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Viagem</p>
        <h1 className="font-display text-2xl md:text-3xl">{trip.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cliente: <Link to="/admin/crm/$contactId" params={{ contactId: trip.contact_id }} className="text-primary hover:underline">
            {trip.contacts?.full_name}
          </Link>
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={togglePreroteiro}>
          <ListChecks className="size-4" />
          {trip.preroteiro_mode ? "Pré-roteiro ON" : "Pré-roteiro OFF"}
        </Button>
        <Button variant={trip.visible_to_client ? "default" : "outline"} size="sm" onClick={toggleVisible}>
          {trip.visible_to_client ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          {trip.visible_to_client ? "Visível" : "Oculta"}
        </Button>
        <Button variant="ghost" size="sm" onClick={remove} className="text-destructive hover:text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}


/* ============================== INFO TAB ============================== */
function InfoTab({ trip, onSaved }: { trip: any; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Trip>>({});
  useEffect(() => { setForm(trip); }, [trip]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("trips").update({
        title: form.title,
        service_type: form.service_type,
        status: form.status,
        start_date: form.start_date,
        end_date: form.end_date,
        destinations: form.destinations,
        total_value: form.total_value,
        is_international: form.is_international,
        notes: form.notes,
      }).eq("id", trip.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Salvo"); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="p-5 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div><Label>Título</Label>
          <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div><Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TRIP_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Tipo de serviço</Label>
          <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="package">Pacote</SelectItem>
              <SelectItem value="assessoria">Assessoria</SelectItem>
              <SelectItem value="consultoria">Consultoria</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div><Label>Valor total (R$)</Label>
          <Input type="number" step="0.01" value={form.total_value ?? ""}
            onChange={(e) => setForm({ ...form, total_value: e.target.value ? Number(e.target.value) : null })} />
        </div>
        <div><Label>Início</Label>
          <Input type="date" value={form.start_date ?? ""} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
        </div>
        <div><Label>Fim</Label>
          <Input type="date" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
        </div>
        <div className="md:col-span-2"><Label>Destinos (separados por vírgula)</Label>
          <Input value={form.destinations?.join(", ") ?? ""}
            onChange={(e) => setForm({ ...form, destinations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
        </div>
        <div className="md:col-span-2"><Label>Notas internas</Label>
          <Textarea rows={4} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={!!form.is_international}
            onCheckedChange={(v) => setForm({ ...form, is_international: v })} />
          <Label>Viagem internacional</Label>
        </div>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="size-4" />Salvar</Button>
    </Card>
  );
}

/* ============================== ROTEIRO TAB ============================== */
type DayWithActs = Day & { activities: (Activity & { doc_count?: number })[] };

function RoteiroTab({ tripId, preroteiroMode }: { tripId: string; preroteiroMode: boolean }) {
  const qc = useQueryClient();
  const queryKey = ["trip-days", tripId];
  const { data: days, isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: ds, error } = await supabase.from("itinerary_days").select("*").eq("trip_id", tripId).order("day_number");
      if (error) throw error;
      const ids = (ds ?? []).map((d) => d.id);
      const { data: acts } = ids.length
        ? await supabase.from("itinerary_activities").select("*").in("day_id", ids).order("position")
        : { data: [] as Activity[] };
      const { data: docs } = await supabase.from("documents").select("id, activity_id").eq("trip_id", tripId);
      return (ds ?? []).map((d) => ({
        ...d,
        activities: (acts ?? []).filter((a) => a.day_id === d.id).map((a) => ({
          ...a,
          doc_count: (docs ?? []).filter((doc) => doc.activity_id === a.id).length,
        })),
      })) as DayWithActs[];
    },
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey });

  const addDay = async () => {
    const nextNum = (days?.length ?? 0) + 1;
    const { error } = await supabase.from("itinerary_days").insert({
      trip_id: tripId, day_number: nextNum, title: `Dia ${nextNum}`,
    });
    if (error) return toast.error(error.message);
    invalidate();
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const [activeAct, setActiveAct] = useState<Activity | null>(null);

  function findContainer(id: string, current: DayWithActs[]) {
    if (id.startsWith("day:")) return id.slice(4);
    for (const d of current) if (d.activities.some((a) => a.id === id)) return d.id;
    return null;
  }

  async function persistDay(dayId: string, activities: (Activity & { doc_count?: number })[]) {
    const results = await Promise.all(
      activities.map((a, idx) =>
        supabase.from("itinerary_activities")
          .update({ day_id: dayId, position: idx })
          .eq("id", a.id),
      ),
    );
    const err = results.map((r) => r.error).find(Boolean);
    if (err) throw new Error(err.message);
  }

  function handleDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    const a = (days ?? []).flatMap((d) => d.activities).find((x) => x.id === id);
    setActiveAct(a ?? null);
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveAct(null);
    const { active, over } = e;
    if (!over || !days) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (activeId === overId) return;

    const fromDayId = findContainer(activeId, days);
    const toDayId = findContainer(overId, days);
    if (!fromDayId || !toDayId) return;

    const fromDay = days.find((d) => d.id === fromDayId)!;
    const toDay = days.find((d) => d.id === toDayId)!;
    const fromIdx = fromDay.activities.findIndex((a) => a.id === activeId);
    if (fromIdx === -1) return;

    let toIdx: number;
    if (overId.startsWith("day:")) {
      toIdx = toDay.activities.length;
    } else {
      toIdx = toDay.activities.findIndex((a) => a.id === overId);
      if (toIdx === -1) toIdx = toDay.activities.length;
    }

    const prev = days;
    const next = days.map((d) => ({ ...d, activities: [...d.activities] }));
    const nFromDay = next.find((d) => d.id === fromDayId)!;
    const nToDay = next.find((d) => d.id === toDayId)!;
    const [moved] = nFromDay.activities.splice(fromIdx, 1);
    if (fromDayId !== toDayId) moved.day_id = toDayId;
    nToDay.activities.splice(toIdx, 0, moved);
    qc.setQueryData(queryKey, next);

    try {
      if (fromDayId === toDayId) {
        await persistDay(toDayId, nToDay.activities);
      } else {
        await Promise.all([
          persistDay(fromDayId, nFromDay.activities),
          persistDay(toDayId, nToDay.activities),
        ]);
      }
    } catch (err) {
      qc.setQueryData(queryKey, prev);
      toast.error("Não foi possível reordenar: " + (err as Error).message);
    }
  }

  if (isLoading) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {preroteiroMode
            ? "Pré-roteiro ativo — cliente pode marcar Quero/Pulo nas atividades."
            : "Pré-roteiro desativado — cliente verá apenas o que estiver fechado."}
        </p>
        <div className="flex gap-2">
          <RegeocodeButton tripId={tripId} onDone={invalidate} />
          <Button size="sm" onClick={addDay}><Plus className="size-4" />Novo dia</Button>
        </div>
      </div>

      {!days?.length ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          Comece adicionando o primeiro dia do roteiro.
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="space-y-3">
            {days.map((d) => <DayEditor key={d.id} day={d} tripId={tripId} onChanged={invalidate} />)}
          </div>
          <DragOverlay>
            {activeAct ? (
              <div className="rounded-md border border-primary/40 bg-background shadow-lg p-3 text-sm max-w-md">
                <div className="flex items-center gap-2">
                  {activeAct.time && <span className="text-xs text-primary font-medium">{activeAct.time.slice(0, 5)}</span>}
                  <span className="font-medium truncate">{activeAct.name}</span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}

const DayEditor = memo(function DayEditor({ day, tripId, onChanged }: { day: DayWithActs; tripId: string; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: day.title ?? "", date: day.date ?? "", description: day.description ?? "" });

  const save = async () => {
    const { error } = await supabase.from("itinerary_days").update(form).eq("id", day.id);
    if (error) return toast.error(error.message);
    setEditing(false); onChanged();
  };
  const remove = async () => {
    if (!(await confirmAction(`Excluir Dia ${day.day_number}?`, { confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("itinerary_days").delete().eq("id", day.id);
    if (error) return toast.error(error.message);
    onChanged();
  };

  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `day:${day.id}` });
  const activityIds = day.activities.map((a) => a.id);

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-primary/10 grid place-items-center text-primary font-display font-medium text-sm shrink-0">
          {day.day_number}
        </div>
        {editing ? (
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="flex-1" />
        ) : (
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{day.title ?? `Dia ${day.day_number}`}</p>
            <p className="text-xs text-muted-foreground">
              {day.date ? new Date(day.date).toLocaleDateString("pt-BR") : "sem data"} · {day.activities.length} atividades
              {(() => {
                const tot = day.activities.reduce((s, a) => s + Number(a.estimated_cost ?? 0), 0);
                return tot > 0 ? <> · <span className="text-emerald-700 font-medium">{tot.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></> : null;
              })()}
            </p>
          </div>
        )}
        {editing ? (
          <>
            <Button size="sm" onClick={save}><Save className="size-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>X</Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Editar</Button>
            <Button size="sm" variant="ghost" onClick={remove} className="text-destructive"><Trash2 className="size-4" /></Button>
          </>
        )}
      </div>

      {editing && (
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          <div><Label className="flex items-center gap-1"><CalendarDays className="size-3" />Data</Label>
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </div>
          <div className="md:col-span-2"><Label>Descrição do dia</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
      )}

      <SortableContext items={activityIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setDropRef}
          className={`mt-4 space-y-2 min-h-[48px] rounded-md transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/30" : ""}`}
        >
          {day.activities.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3 italic">
              {isOver ? "Solte aqui para mover" : "Sem atividades — arraste uma para cá ou adicione abaixo"}
            </p>
          )}
          {day.activities.map((a) => (
            <SortableActivityRow key={a.id} a={a} tripId={tripId} dayId={day.id} onChanged={onChanged} />
          ))}
          <NewActivityDialog dayId={day.id} position={day.activities.length} onDone={onChanged} />
        </div>
      </SortableContext>
    </Card>
  );
});

function SortableActivityRow({ a, tripId, dayId, onChanged }: { a: Activity & { doc_count?: number }; tripId: string; dayId: string; onChanged: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: a.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <ActivityRow a={a} tripId={tripId} dayId={dayId} onChanged={onChanged} dragHandle={{ ...attributes, ...listeners }} />
    </div>
  );
}

function RegeocodeButton({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const fn = useServerFn(regeocodeTripActivities);
  const run = async (onlyMissing: boolean) => {
    const label = onlyMissing ? "atividades sem coordenadas" : "TODAS as atividades (sobrescreve coordenadas existentes)";
    if (!(await confirmAction(`Re-geocodificar ${label}?`, { confirmLabel: "Re-geocodificar" }))) return;
    setLoading(true);
    try {
      const res = await fn({ data: { tripId, onlyMissing } });
      toast.success(`${res.updated} atualizadas, ${res.skipped} sem resultado de ${res.total}`);
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao re-geocodificar");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex gap-1">
      <Button size="sm" variant="outline" disabled={loading} onClick={() => run(true)} title="Geocodifica apenas atividades sem latitude/longitude">
        <MapPin className="size-4" />{loading ? "..." : "Geo faltantes"}
      </Button>
      <Button size="sm" variant="ghost" disabled={loading} onClick={() => run(false)} title="Re-geocodifica todas as atividades aplicando viés por proximidade">
        Re-geo todas
      </Button>
    </div>
  );
}

type GeocodeCandidate = { latitude: number; longitude: number; place_name: string | null; relevance: number; country: string | null };

const ActivityRow = memo(function ActivityRow({ a, tripId, dayId, onChanged, dragHandle }: { a: Activity & { doc_count?: number }; tripId: string; dayId: string; onChanged: () => void; dragHandle?: Record<string, unknown> }) {
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState<Partial<Activity>>(a);
  const [savingLib, setSavingLib] = useState(false);
  const [libCountry, setLibCountry] = useState("");
  const [libCity, setLibCity] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [candidates, setCandidates] = useState<GeocodeCandidate[]>([]);
  const geocodeFn = useServerFn(geocodeAddress);

  const openEdit = () => { setForm(a); setEditOpen(true); setCandidates([]); };

  const handleGeocode = async () => {
    if (!form.address) return toast.error("Informe o endereço primeiro");
    setGeocoding(true);
    setCandidates([]);
    try {
      // viés por proximidade: usa coords já existentes desta atividade ou da viagem
      let proximity: [number, number] | undefined;
      if (form.latitude != null && form.longitude != null) {
        proximity = [Number(form.longitude), Number(form.latitude)];
      } else {
        const { data: sibs } = await supabase
          .from("itinerary_activities")
          .select("latitude, longitude, itinerary_days!inner(trip_id)")
          .eq("itinerary_days.trip_id", tripId)
          .not("latitude", "is", null)
          .limit(50);
        if (sibs && sibs.length) {
          const lng = sibs.reduce((s, x: any) => s + Number(x.longitude), 0) / sibs.length;
          const lat = sibs.reduce((s, x: any) => s + Number(x.latitude), 0) / sibs.length;
          proximity = [lng, lat];
        }
      }
      const res = await geocodeFn({ data: { address: form.address, proximity } });
      if (!res.candidates.length) return toast.error("Endereço não encontrado");
      if (res.candidates.length === 1) {
        const c = res.candidates[0];
        setForm((f) => ({ ...f, latitude: c.latitude, longitude: c.longitude }));
        toast.success("Coordenadas encontradas");
      } else {
        setCandidates(res.candidates);
        toast.info(`${res.candidates.length} resultados — escolha o correto`);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao buscar coordenadas");
    } finally {
      setGeocoding(false);
    }
  };


  const save = async () => {
    const { error } = await supabase.from("itinerary_activities").update({
      name: form.name, time: form.time, description: form.description,
      address: form.address, maps_url: form.maps_url, in_preroteiro: form.in_preroteiro,
      estimated_cost: form.estimated_cost ?? 0,
      currency: form.currency ?? "BRL",
      latitude: form.latitude ?? null,
      longitude: form.longitude ?? null,
      image_url: form.image_url ?? null,
      curiosities: form.curiosities ?? null,
    }).eq("id", a.id);
    if (error) return toast.error(error.message);
    setEditOpen(false); onChanged();
  };
  const remove = async () => {
    if (!(await confirmAction("Excluir atividade?", { confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("itinerary_activities").delete().eq("id", a.id);
    if (error) return toast.error(error.message);
    onChanged();
  };

  async function saveToLibrary() {
    if (!libCountry.trim() || !libCity.trim()) {
      return toast.error("Informe país e cidade para salvar na biblioteca");
    }
    setSavingLib(true);
    // find or create destination matching city/country
    const { data: existing } = await supabase
      .from("destinations").select("id")
      .eq("name", libCity.trim()).eq("country", libCountry.trim()).maybeSingle();
    let destId = existing?.id;
    if (!destId) {
      const { data: created, error: e1 } = await supabase
        .from("destinations").insert({ name: libCity.trim(), country: libCountry.trim() })
        .select("id").single();
      if (e1) { setSavingLib(false); return toast.error(e1.message); }
      destId = created.id;
    }
    const { error } = await supabase.from("destination_activities").insert({
      destination_id: destId!,
      name: form.name ?? a.name,
      description: form.description ?? a.description ?? null,
      address: form.address ?? a.address ?? null,
      maps_url: form.maps_url ?? a.maps_url ?? null,
      activity_type: (form.activity_type ?? a.activity_type) as any,
      country: libCountry.trim(),
      city: libCity.trim(),
    });
    setSavingLib(false);
    if (error) return toast.error(error.message);
    toast.success("Atividade salva na biblioteca");
  }

  return (
    <>
      <div className="rounded-md border border-border p-3 flex items-start gap-2">
        <button
          type="button"
          {...(dragHandle ?? {})}
          aria-label="Arrastar atividade"
          className="touch-none cursor-grab active:cursor-grabbing p-1 -m-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors mt-0.5"
        >
          <GripVertical className="size-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {a.time && <span className="text-xs text-primary font-medium">{a.time.slice(0, 5)}</span>}
            <p className="font-medium text-sm truncate">{a.name}</p>
            {a.in_preroteiro && (
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                sugestão
              </span>
            )}
            {!!Number(a.estimated_cost) && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700">
                {Number(a.estimated_cost).toLocaleString("pt-BR", { style: "currency", currency: a.currency ?? "BRL" })}
              </span>
            )}
            {a.client_response && (
              <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${
                a.client_response === "want" ? "bg-emerald-500/10 text-emerald-700" : "bg-muted text-muted-foreground"
              }`}>
                {a.client_response === "want" ? "quer" : "pulou"}
              </span>
            )}
            {!!a.doc_count && (
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary inline-flex items-center gap-1">
                <Paperclip className="size-3" />{a.doc_count} doc{a.doc_count > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {a.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{a.description}</p>}
          {a.maps_url && (
            <a href={a.maps_url} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1 mt-1">
              <ExternalLink className="size-3" />Maps
            </a>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={() => setUploadOpen(true)} title="Anexar documento">
          <Paperclip className="size-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={openEdit}>Editar</Button>
        <Button size="sm" variant="ghost" onClick={remove} className="text-destructive"><Trash2 className="size-4" /></Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar atividade</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Input placeholder="Nome" value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="time" value={form.time ?? ""} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              <Input placeholder="Maps URL" value={form.maps_url ?? ""} onChange={(e) => setForm({ ...form, maps_url: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <Input placeholder="Endereço" value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <Button type="button" variant="outline" size="sm" onClick={handleGeocode} disabled={geocoding || !form.address} className="shrink-0">
                <MapPin className="size-4" />{geocoding ? "..." : "Buscar"}
              </Button>
            </div>
            {candidates.length > 0 && (
              <div className="rounded-md border border-border bg-muted/30 p-2 space-y-1 max-h-48 overflow-y-auto">
                <p className="text-[11px] font-medium text-muted-foreground px-1">Escolha o local correto:</p>
                {candidates.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, latitude: c.latitude, longitude: c.longitude }));
                      setCandidates([]);
                      toast.success("Coordenadas atualizadas");
                    }}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-start gap-2"
                  >
                    <MapPin className="size-3 mt-0.5 shrink-0 text-primary" />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{c.place_name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {c.country?.toUpperCase()} · {c.latitude.toFixed(4)}, {c.longitude.toFixed(4)} · rel {Math.round(c.relevance * 100)}%
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Latitude</Label>
                <Input type="number" step="0.000001" placeholder="-33.4378" value={form.latitude ?? ""}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Longitude</Label>
                <Input type="number" step="0.000001" placeholder="-70.6504" value={form.longitude ?? ""}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
            {form.latitude != null && form.longitude != null && (
              <p className="text-[11px] text-emerald-600">
                📍 {Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)} —{" "}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${form.latitude},${form.longitude}`}
                  target="_blank" rel="noreferrer" className="underline"
                >conferir no mapa</a>
              </p>
            )}

            <Textarea rows={3} placeholder="Descrição" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />

            <div>
              <Label className="text-xs">URL da imagem do local</Label>
              <Input type="url" placeholder="https://..." value={form.image_url ?? ""}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              {form.image_url && (
                <div className="mt-2 aspect-video bg-muted rounded-md overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={form.image_url} alt="preview" className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs">Curiosidades e recomendações</Label>
              <Textarea rows={3} placeholder="História do lugar, prato mais pedido, dica especial..."
                value={form.curiosities ?? ""}
                onChange={(e) => setForm({ ...form, curiosities: e.target.value })} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Custo estimado (cliente)</Label>
                <Input type="number" step="0.01" value={form.estimated_cost ?? ""}
                  onChange={(e) => setForm({ ...form, estimated_cost: e.target.value ? Number(e.target.value) : 0 })} />
              </div>
              <div>
                <Label className="text-xs">Moeda</Label>
                <Select value={form.currency ?? "BRL"} onValueChange={(v) => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BRL">BRL</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={!!form.in_preroteiro}
                onCheckedChange={(v) => setForm({ ...form, in_preroteiro: v })} />
              <Label className="text-xs">Sugestão (pré-roteiro)</Label>
            </div>

            <ActivityPartnersEditor activityId={a.id} />

            <div className="border-t border-border pt-3 mt-3 space-y-2">
              <Label className="text-xs font-medium">Salvar na biblioteca de atividades</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="País" value={libCountry} onChange={(e) => setLibCountry(e.target.value)} />
                <Input placeholder="Cidade" value={libCity} onChange={(e) => setLibCity(e.target.value)} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={saveToLibrary} disabled={savingLib} className="w-full">
                <BookmarkPlus className="size-4" />{savingLib ? "Salvando…" : "Salvar atividade na biblioteca"}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={save}><Save className="size-4" />Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        tripId={tripId}
        dayId={dayId}
        activityId={a.id}
        activityName={a.name}
        onUploaded={onChanged}
      />
    </>
  );
});

function NewActivityDialog({ dayId, position, onDone }: {
  dayId: string; position: number; onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const initialForm = { name: "", time: "", description: "", address: "", maps_url: "", in_preroteiro: false, estimated_cost: 0, currency: "BRL", image_url: "", curiosities: "" };
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const reset = () => { setForm(initialForm); setCreatedId(null); };

  const save = async () => {
    if (!form.name) return toast.error("Informe o nome");
    setSaving(true);
    const { data, error } = await supabase.from("itinerary_activities").insert({
      day_id: dayId, position, name: form.name,
      time: form.time || null, description: form.description || null,
      address: form.address || null, maps_url: form.maps_url || null,
      in_preroteiro: form.in_preroteiro,
      estimated_cost: form.estimated_cost || 0,
      currency: form.currency,
      image_url: form.image_url || null,
      curiosities: form.curiosities || null,
    }).select("id").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setCreatedId(data.id);
    onDone();
  };

  const finish = () => { reset(); setOpen(false); };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="w-full">
        <Plus className="size-4" />Atividade
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); setOpen(o); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{createdId ? `Parceiros — ${form.name}` : "Nova atividade"}</DialogTitle>
          </DialogHeader>
          {!createdId ? (
            <div className="space-y-2">
              <Input placeholder="Nome da atividade" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                <Input placeholder="Maps URL" value={form.maps_url} onChange={(e) => setForm({ ...form, maps_url: e.target.value })} />
              </div>
              <Input placeholder="Endereço" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <Textarea rows={3} placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input type="url" placeholder="URL da imagem do local (https://...)" value={form.image_url}
                onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <Textarea rows={2} placeholder="Curiosidades e recomendações" value={form.curiosities}
                onChange={(e) => setForm({ ...form, curiosities: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Custo estimado (cliente)</Label>
                  <Input type="number" step="0.01" value={form.estimated_cost || ""}
                    onChange={(e) => setForm({ ...form, estimated_cost: e.target.value ? Number(e.target.value) : 0 })} />
                </div>
                <div>
                  <Label className="text-xs">Moeda</Label>
                  <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.in_preroteiro} onCheckedChange={(v) => setForm({ ...form, in_preroteiro: v })} />
                <Label className="text-xs">É uma sugestão (pré-roteiro)</Label>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Atividade criada. Adicione parceiros operacionais agora ou clique em concluir.
              </p>
              <ActivityPartnersEditor activityId={createdId} />
            </div>
          )}
          <DialogFooter>
            {!createdId ? (
              <>
                <Button variant="ghost" onClick={finish}>Cancelar</Button>
                <Button onClick={save} disabled={saving}>Adicionar</Button>
              </>
            ) : (
              <Button onClick={finish}>Concluir</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UploadDocumentDialog({ open, onOpenChange, tripId, dayId, activityId, activityName, onUploaded }: {
  open: boolean; onOpenChange: (o: boolean) => void;
  tripId: string; dayId?: string | null; activityId?: string | null;
  activityName?: string; onUploaded: () => void;
}) {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState<DocCategory>("ticket");
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!file) return toast.error("Escolha um arquivo");
    setUploading(true);
    const path = `${tripId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("trip-documents").upload(path, file);
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error: insErr } = await supabase.from("documents").insert({
      trip_id: tripId, day_id: dayId ?? null, activity_id: activityId ?? null,
      name: file.name, category, storage_path: path,
    });
    setUploading(false);
    if (insErr) return toast.error(insErr.message);
    toast.success("Documento anexado");
    setFile(null);
    onOpenChange(false);
    qc.invalidateQueries({ queryKey: ["trip-docs", tripId] });
    qc.invalidateQueries({ queryKey: ["trip-days", tripId] });
    onUploaded();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Anexar documento{activityName ? ` — ${activityName}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flight">Voo</SelectItem>
                <SelectItem value="train">Trem</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="ticket">Ingresso</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Arquivo</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={upload} disabled={uploading || !file}>
            <Upload className="size-4" />{uploading ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================== DOCS TAB ============================== */
function DocsTab({ tripId }: { tripId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["trip-docs", tripId],
    queryFn: async () => {
      const { data: docs, error } = await supabase.from("documents").select("*").eq("trip_id", tripId).order("created_at");
      if (error) throw error;
      const { data: acts } = await supabase.from("itinerary_activities").select("id, name, day_id");
      const { data: days } = await supabase.from("itinerary_days").select("id, day_number, title").eq("trip_id", tripId);
      const actMap = new Map((acts ?? []).map((a) => [a.id, a]));
      const dayMap = new Map((days ?? []).map((d) => [d.id, d]));
      return { docs: (docs ?? []) as Document[], actMap, dayMap };
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const [uploading, setUploading] = useState(false);
  const [category, setCategory] = useState<DocCategory>("other");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const path = `${tripId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("trip-documents").upload(path, file);
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error: insErr } = await supabase.from("documents").insert({
      trip_id: tripId, name: file.name, category, storage_path: path,
    });
    setUploading(false);
    e.target.value = "";
    if (insErr) return toast.error(insErr.message);
    toast.success("Documento enviado");
    qc.invalidateQueries({ queryKey: ["trip-docs", tripId] });
    qc.invalidateQueries({ queryKey: ["trip-days", tripId] });
  }

  async function remove(doc: Document) {
    if (!(await confirmAction(`Excluir "${doc.name}"?`, { confirmLabel: "Excluir" }))) return;
    await supabase.storage.from("trip-documents").remove([doc.storage_path]);
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) return toast.error(error.message);
    toast.success("Documento excluído");
    qc.invalidateQueries({ queryKey: ["trip-docs", tripId] });
    qc.invalidateQueries({ queryKey: ["trip-days", tripId] });
  }

  const general = (data?.docs ?? []).filter((d) => !d.activity_id);
  const byActivity = (data?.docs ?? []).filter((d) => d.activity_id);

  function DocItem({ d }: { d: Document }) {
    const act = d.activity_id ? data?.actMap.get(d.activity_id) : null;
    const day = act?.day_id ? data?.dayMap.get(act.day_id) : (d.day_id ? data?.dayMap.get(d.day_id) : null);
    return (
      <li className="py-3 flex items-center gap-3">
        <FileText className="size-4 text-primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{d.name}</p>
          <p className="text-xs text-muted-foreground">
            <span className="capitalize">{d.category}</span>
            {day && <> · Dia {day.day_number}{day.title ? ` — ${day.title}` : ""}</>}
            {act && <> · {act.name}</>}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => remove(d)} className="text-destructive">
          <Trash2 className="size-4" />
        </Button>
      </li>
    );
  }

  return (
    <Card className="p-5 space-y-6">
      <div>
        <p className="text-sm font-medium mb-2">Documento geral da viagem</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocCategory)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flight">Voo</SelectItem>
                <SelectItem value="train">Trem</SelectItem>
                <SelectItem value="hotel">Hotel</SelectItem>
                <SelectItem value="ticket">Ingresso</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Label className="cursor-pointer">
            <input type="file" className="hidden" onChange={handleFile} disabled={uploading} />
            <span className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
              <Upload className="size-4" />{uploading ? "Enviando…" : "Enviar arquivo"}
            </span>
          </Label>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Para anexar a uma atividade específica, use o ícone <Paperclip className="inline size-3" /> na aba Roteiro.
        </p>
      </div>

      {isLoading ? <Skeleton className="h-32" /> : (
        <>
          <div>
            <p className="text-sm font-medium mb-2">Documentos gerais</p>
            {general.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded">Nenhum documento geral.</p>
            ) : (
              <ul className="divide-y divide-border">{general.map((d) => <DocItem key={d.id} d={d} />)}</ul>
            )}
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Documentos por atividade</p>
            {byActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded">Nenhum documento vinculado a atividade.</p>
            ) : (
              <ul className="divide-y divide-border">{byActivity.map((d) => <DocItem key={d.id} d={d} />)}</ul>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

/* ============================== MAPA TAB ============================== */
function MapaTab({ tripId }: { tripId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["trip-map", tripId],
    queryFn: async () => {
      const { data: ds } = await supabase.from("itinerary_days").select("*").eq("trip_id", tripId).order("day_number");
      const ids = (ds ?? []).map((d) => d.id);
      const { data: acts } = ids.length
        ? await supabase.from("itinerary_activities").select("*").in("day_id", ids).order("position")
        : { data: [] as Activity[] };
      return (ds ?? []).map((d) => ({
        ...d,
        activities: (acts ?? []).filter((a) => a.day_id === d.id),
      }));
    },
    staleTime: 30_000,
  });

  if (isLoading || !data) return <Skeleton className="h-96" />;
  return <TripMap days={data} />;
}

/* ============================== ACTIVITY PARTNERS ============================== */
function ActivityPartnersEditor({ activityId }: { activityId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", role: "", cost: 0, currency: "BRL", included_in_package: false, notes: "" });

  const { data: partners } = useQuery({
    queryKey: ["activity-partners", activityId],
    queryFn: async () => {
      const { data, error } = await supabase.from("activity_partners").select("*").eq("activity_id", activityId).order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const { data: catalog } = useQuery({
    queryKey: ["operational-partners-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operational_partners")
        .select("id,name,role,default_cost,currency")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["activity-partners", activityId] });

  const pickFromCatalog = (id: string) => {
    const p = (catalog ?? []).find((c) => c.id === id);
    if (!p) return;
    setForm({
      name: p.name,
      role: p.role ?? "",
      cost: Number(p.default_cost ?? 0),
      currency: p.currency ?? "BRL",
      included_in_package: false,
      notes: "",
    });
    setAdding(true);
  };

  const add = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome do parceiro");
    const { error } = await supabase.from("activity_partners").insert({
      activity_id: activityId,
      name: form.name.trim(),
      role: form.role.trim() || null,
      cost: form.cost || 0,
      currency: form.currency,
      included_in_package: form.included_in_package,
      notes: form.notes.trim() || null,
    });
    if (error) return toast.error(error.message);
    setForm({ name: "", role: "", cost: 0, currency: "BRL", included_in_package: false, notes: "" });
    setAdding(false);
    invalidate();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("activity_partners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  return (
    <div className="border-t border-border pt-3 mt-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium">Parceiros operacionais</Label>
        <div className="flex items-center gap-1">
          {(catalog?.length ?? 0) > 0 && (
            <Select value="" onValueChange={pickFromCatalog}>
              <SelectTrigger className="h-7 text-xs w-[150px]">
                <SelectValue placeholder="Do catálogo…" />
              </SelectTrigger>
              <SelectContent>
                {catalog!.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name}{c.role ? ` · ${c.role}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {!adding && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(true)}>
              <Plus className="size-3" /> Novo
            </Button>
          )}
        </div>
      </div>
      {(partners ?? []).map((p) => (
        <div key={p.id} className="flex items-center gap-2 text-xs rounded border border-border p-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium">{p.role ? `${p.role}: ` : ""}{p.name}</p>
            <p className="text-muted-foreground">
              {p.included_in_package
                ? "Incluso no pacote"
                : Number(p.cost) > 0
                  ? Number(p.cost).toLocaleString("pt-BR", { style: "currency", currency: p.currency ?? "BRL" })
                  : "Sem custo definido"}
              {p.notes ? ` · ${p.notes}` : ""}
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => remove(p.id)} className="text-destructive">
            <Trash2 className="size-3" />
          </Button>
        </div>
      ))}
      {adding && (
        <div className="rounded border border-border p-2 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Função (guia, tradutor...)" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input type="number" step="0.01" placeholder="Custo" value={form.cost || ""}
                onChange={(e) => setForm({ ...form, cost: e.target.value ? Number(e.target.value) : 0 })}
                disabled={form.included_in_package} />
            </div>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">BRL</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.included_in_package}
              onCheckedChange={(v) => setForm({ ...form, included_in_package: v })} />
            <Label className="text-xs">Incluso no pacote</Label>
          </div>
          <Input placeholder="Notas (opcional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button>
            <Button type="button" size="sm" onClick={add}>Salvar parceiro</Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============= AI Creation Tab =============

import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Wand2 } from "lucide-react";
import {
  generateItinerarySuggestions,
  applyItinerarySuggestions,
  type ItinerarySuggestions,
} from "@/lib/itinerary-ai.functions";

type SuggestionItem = {
  selected: boolean;
  title: string;
  time: string;
  address: string;
  description: string;
  day_id: string;
};

type SuggestionGroup = {
  day_label: string;
  suggested_day_number: number;
  items: SuggestionItem[];
};

function AiCreationTab({ tripId, onApplied }: { tripId: string; onApplied: () => void }) {
  const storageKey = `ai-itinerary-draft:${tripId}`;
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [groups, setGroups] = useState<SuggestionGroup[] | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const generate = useServerFn(generateItinerarySuggestions);
  const apply = useServerFn(applyItinerarySuggestions);
  const queryClient = useQueryClient();

  const { data: days } = useQuery({
    queryKey: ["trip-days-ai", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itinerary_days")
        .select("id, day_number, title, date")
        .eq("trip_id", tripId)
        .order("day_number");
      if (error) throw error;
      return data ?? [];
    },
    // Sempre refazer ao montar — número de dias pode ter mudado em outra aba
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Hidrata rascunho salvo (prompt + sugestões) para esta viagem
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { prompt?: string; groups?: SuggestionGroup[] | null };
        if (parsed.prompt) setPrompt(parsed.prompt);
        if (parsed.groups) setGroups(parsed.groups);
      }
    } catch {}
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  // Persiste rascunho a cada mudança
  useEffect(() => {
    if (!hydrated) return;
    try {
      if (groups || prompt) {
        localStorage.setItem(storageKey, JSON.stringify({ prompt, groups }));
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch {}
  }, [prompt, groups, hydrated, storageKey]);

  function clearDraft() {
    setGroups(null);
    setPrompt("");
    try { localStorage.removeItem(storageKey); } catch {}
  }

  async function onGenerate() {
    if (prompt.trim().length < 5) {
      toast.error("Descreva o que você quer no prompt");
      return;
    }
    setLoading(true);
    try {
      // Garante contagem de dias atualizada antes de mapear
      const freshDays = await queryClient.fetchQuery({
        queryKey: ["trip-days-ai", tripId],
        queryFn: async () => {
          const { data, error } = await supabase
            .from("itinerary_days")
            .select("id, day_number, title, date")
            .eq("trip_id", tripId)
            .order("day_number");
          if (error) throw error;
          return data ?? [];
        },
      });
      const result = (await generate({ data: { tripId, prompt } })) as ItinerarySuggestions;
      const mapped: SuggestionGroup[] = result.days.map((d) => {
        const matchedDay = freshDays?.find((dd) => dd.day_number === d.suggested_day_number);
        return {
          day_label: d.day_label,
          suggested_day_number: d.suggested_day_number,
          items: d.activities.map((a) => ({
            selected: true,
            title: a.title,
            time: a.time ?? "",
            address: a.address ?? "",
            description: a.description ?? "",
            day_id: matchedDay?.id ?? "",
          })),
        };
      });
      setGroups(mapped);
      toast.success(`IA sugeriu ${mapped.reduce((n, g) => n + g.items.length, 0)} atividades`);
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao gerar");
    } finally {
      setLoading(false);
    }
  }

  async function onApply() {
    if (!groups) return;
    const items = groups.flatMap((g) =>
      g.items
        .filter((i) => i.selected && i.day_id && i.title.trim())
        .map((i) => ({
          day_id: i.day_id,
          title: i.title.trim(),
          time: i.time || null,
          address: i.address || null,
          description: i.description || null,
        })),
    );
    if (items.length === 0) {
      toast.error("Selecione ao menos uma atividade com dia definido");
      return;
    }
    setApplying(true);
    try {
      const res = (await apply({ data: { tripId, items } })) as { inserted: number };
      toast.success(`${res.inserted} atividades adicionadas ao roteiro`);
      clearDraft();
      await queryClient.invalidateQueries({ queryKey: ["trip-days-ai", tripId] });
      onApplied();
    } catch (err: any) {
      console.error("[apply itinerary] erro:", err);
      toast.error(err?.message ?? "Falha ao aplicar");
    } finally {
      setApplying(false);
    }
  }

  function updateItem(gi: number, ii: number, patch: Partial<SuggestionItem>) {
    setGroups((prev) => {
      if (!prev) return prev;
      const next = prev.map((g) => ({ ...g, items: g.items.map((i) => ({ ...i })) }));
      next[gi].items[ii] = { ...next[gi].items[ii], ...patch };
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <h3 className="font-medium">Gerar roteiro com IA</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          A viagem tem <strong>{days?.length ?? 0}</strong> dia(s) criados. Descreva o estilo, ritmo, interesses, restrições etc.
        </p>
        <Textarea
          rows={5}
          placeholder="Ex: 5 dias em Roma para um casal apaixonado por arte renascentista. Gostam de jantar tarde, querem evitar caminhar demais. Incluir Vaticano e dia em Tivoli."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={loading}
        />
        <div className="flex gap-2 flex-wrap">
          <Button onClick={onGenerate} disabled={loading}>
            <Wand2 className="size-4" />
            {loading ? "Gerando..." : groups ? "Regenerar sugestões" : "Gerar sugestões"}
          </Button>
          {(groups || prompt) && (
            <Button variant="outline" onClick={clearDraft} disabled={loading || applying}>
              Limpar rascunho
            </Button>
          )}
          {groups && (
            <span className="text-xs text-muted-foreground self-center">
              Rascunho salvo automaticamente — fica disponível ao voltar nesta aba.
            </span>
          )}
        </div>
      </Card>

      {loading && <Skeleton className="h-64" />}

      {groups && groups.length > 0 && (
        <div className="space-y-4">
          {groups.map((g, gi) => {
            const hasMatch = !!days?.find((dd) => dd.day_number === g.suggested_day_number);
            return (
              <Card key={gi} className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium">{g.day_label}</h4>
                  {!hasMatch && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                      Sem dia correspondente — escolha manualmente
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {g.items.map((item, ii) => (
                    <div key={ii} className="border rounded-md p-3 space-y-2 bg-muted/30">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={(v) => updateItem(gi, ii, { selected: !!v })}
                          className="mt-1"
                        />
                        <Input
                          value={item.title}
                          onChange={(e) => updateItem(gi, ii, { title: e.target.value })}
                          className="font-medium"
                          placeholder="Título"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-7">
                        <Input
                          type="time"
                          value={item.time}
                          onChange={(e) => updateItem(gi, ii, { time: e.target.value })}
                          placeholder="Horário"
                        />
                        <Input
                          value={item.address}
                          onChange={(e) => updateItem(gi, ii, { address: e.target.value })}
                          placeholder="Endereço"
                          className="md:col-span-2"
                        />
                      </div>
                      <div className="pl-7">
                        <Textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => updateItem(gi, ii, { description: e.target.value })}
                          placeholder="Descrição"
                        />
                      </div>
                      <div className="pl-7">
                        <Label className="text-xs text-muted-foreground">Adicionar ao dia</Label>
                        <Select
                          value={item.day_id || "none"}
                          onValueChange={(v) => updateItem(gi, ii, { day_id: v === "none" ? "" : v })}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Selecione um dia" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— sem dia —</SelectItem>
                            {(days ?? []).map((d) => (
                              <SelectItem key={d.id} value={d.id}>
                                Dia {d.day_number}{d.title ? ` — ${d.title}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}

          <div className="flex justify-end gap-2 sticky bottom-2">
            <Button onClick={onApply} disabled={applying}>
              {applying ? "Adicionando..." : "Adicionar selecionadas ao roteiro"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}



