import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Bell, Trash2, CheckCircle2, Clock, Send } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { broadcastTestPush } from "@/lib/push.functions";

export const Route = createFileRoute("/admin/notificacoes")({ component: NotificacoesPage });

type Trip = { id: string; title: string; contacts?: { full_name: string } | null };
type Notification = {
  id: string;
  trip_id: string;
  title: string;
  body: string | null;
  scheduled_for: string;
  sent: boolean | null;
  read: boolean | null;
  created_at: string;
  trips?: { title: string; contacts?: { full_name: string } | null } | null;
};

function NotificacoesPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ trip_id: "", title: "", body: "", scheduled_for: new Date().toISOString().slice(0, 16) });

  async function load() {
    setLoading(true);
    const [{ data: ns }, { data: ts }] = await Promise.all([
      supabase.from("notifications").select("*, trips(title, contacts(full_name))").order("scheduled_for", { ascending: false }),
      supabase.from("trips").select("id, title, contacts(full_name)").order("created_at", { ascending: false }),
    ]);
    setItems((ns as Notification[]) || []);
    setTrips((ts as Trip[]) || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createNotification() {
    if (!form.trip_id || !form.title) return toast.error("Viagem e título são obrigatórios");
    const { error } = await supabase.from("notifications").insert({
      trip_id: form.trip_id,
      title: form.title,
      body: form.body || null,
      scheduled_for: new Date(form.scheduled_for).toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Notificação agendada");
    setOpen(false);
    setForm({ trip_id: "", title: "", body: "", scheduled_for: new Date().toISOString().slice(0, 16) });
    load();
  }

  async function markSent(id: string) {
    const { error } = await supabase.from("notifications").update({ sent: true }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function deleteNotification(id: string) {
    if (!confirm("Excluir notificação?")) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  const pending = items.filter((n) => !n.sent);
  const sent = items.filter((n) => n.sent);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Notificações</h1>
          <p className="text-sm text-muted-foreground">Lembretes e avisos programados para clientes</p>
        </div>
        <div className="flex items-center gap-2">
          <TestBroadcastButton />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="size-4 mr-2" />Nova notificação</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Agendar notificação</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Viagem *</Label>
                <Select value={form.trip_id} onValueChange={(v) => setForm({ ...form, trip_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
                  <SelectContent>
                    {trips.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title} {t.contacts?.full_name ? `— ${t.contacts.full_name}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Título *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Lembrete: check-in online em 24h" /></div>
              <div><Label>Mensagem</Label><Textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
              <div><Label>Agendar para</Label><Input type="datetime-local" value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} /></div>
              <Button onClick={createNotification} className="w-full">Agendar</Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? <p className="text-muted-foreground">Carregando…</p> : (
        <div className="space-y-6">
          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><Clock className="size-4" />Pendentes ({pending.length})</h2>
            {pending.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">Nada agendado.</Card>
            ) : (
              <div className="space-y-2">
                {pending.map((n) => <NotificationRow key={n.id} n={n} onMarkSent={() => markSent(n.id)} onDelete={() => deleteNotification(n.id)} />)}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2"><CheckCircle2 className="size-4" />Enviadas ({sent.length})</h2>
            {sent.length === 0 ? (
              <Card className="p-6 text-center text-sm text-muted-foreground">Nenhuma enviada ainda.</Card>
            ) : (
              <div className="space-y-2">
                {sent.slice(0, 20).map((n) => <NotificationRow key={n.id} n={n} onDelete={() => deleteNotification(n.id)} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ n, onMarkSent, onDelete }: { n: Notification; onMarkSent?: () => void; onDelete: () => void }) {
  const when = new Date(n.scheduled_for);
  const isPast = when.getTime() <= Date.now();
  return (
    <Card className="p-4 flex items-start justify-between gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <Bell className="size-4 mt-1 text-primary shrink-0" />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium truncate">{n.title}</h3>
            {n.sent ? <Badge variant="secondary" className="text-xs">enviada</Badge>
              : isPast ? <Badge variant="destructive" className="text-xs">atrasada</Badge>
              : <Badge variant="outline" className="text-xs">agendada</Badge>}
          </div>
          {n.body && <p className="text-xs text-muted-foreground mt-1">{n.body}</p>}
          <p className="text-[11px] text-muted-foreground mt-1">
            {when.toLocaleString("pt-BR")} · {n.trips?.title} {n.trips?.contacts?.full_name && `— ${n.trips.contacts.full_name}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onMarkSent && <Button size="sm" variant="outline" onClick={onMarkSent}>Marcar enviada</Button>}
        <Button size="icon" variant="ghost" onClick={onDelete}><Trash2 className="size-4" /></Button>
      </div>
    </Card>
  );
}

function TestBroadcastButton() {
  const broadcast = useServerFn(broadcastTestPush);
  const [loading, setLoading] = useState(false);
  async function run() {
    if (!confirm("Enviar push de teste para TODOS os usuários inscritos?")) return;
    setLoading(true);
    try {
      const res = await broadcast();
      toast.success(`Enviado: ${res.sent}/${res.total}${res.removed ? ` (removidas ${res.removed} inativas)` : ""}`);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao enviar broadcast");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={run} disabled={loading}>
      <Send className="size-4 mr-2" />{loading ? "Enviando…" : "Push de teste (todos)"}
    </Button>
  );
}

