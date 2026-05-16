import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save, Mail, Phone, Plane, Plus, KeyRound, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { STATUS_LABEL, STATUS_COLOR } from "./admin.crm";
import { createClientAccess } from "@/lib/admin-users.functions";
import type { Database } from "@/integrations/supabase/types";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type Status = Database["public"]["Enums"]["contact_status"];

export const Route = createFileRoute("/admin/crm/$contactId")({
  component: ContactProfile,
});

function ContactProfile() {
  const { contactId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: contact, isLoading } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").eq("id", contactId).single();
      if (error) throw error;
      return data as Contact;
    },
  });

  const { data: trips } = useQuery({
    queryKey: ["contact-trips", contactId],
    queryFn: async () => {
      const { data, error } = await supabase.from("trips").select("id, title, status, start_date")
        .eq("contact_id", contactId).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<Partial<Contact>>({});
  useEffect(() => { if (contact) setForm(contact); }, [contact]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contacts").update({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        status: form.status,
        travel_period: form.travel_period,
        internal_notes: form.internal_notes,
      }).eq("id", contactId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contact", contactId] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Contato atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createTrip = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("trips").insert({
        contact_id: contactId,
        title: `Viagem de ${contact?.full_name}`,
        service_type: "assessoria",
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (trip) => navigate({ to: "/admin/viagens/$tripId", params: { tripId: trip.id } }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !contact) return <Skeleton className="h-96" />;

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/admin/crm" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-primary/10 grid place-items-center text-primary font-display font-medium">
            {contact.full_name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl">{contact.full_name}</h1>
            <span className={`inline-block mt-1 text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_COLOR[contact.status]}`}>
              {STATUS_LABEL[contact.status]}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {!contact.user_id && <CreateAccessButton contactId={contactId} email={contact.email} />}
          {contact.user_id && (
            <span className="inline-flex items-center gap-1 text-xs text-primary px-3 py-1.5 rounded-md bg-primary/10">
              <Check className="size-3" /> Acesso criado
            </span>
          )}
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            <Save className="size-4" /> Salvar
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h2 className="font-display font-medium">Dados</h2>
          <Field label="Nome">
            <Input value={form.full_name ?? ""} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label="E-mail" icon={<Mail className="size-3" />}>
            <Input value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label="Telefone" icon={<Phone className="size-3" />}>
            <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Período da viagem">
            <Input value={form.travel_period ?? ""} onChange={(e) => setForm({ ...form, travel_period: e.target.value })} />
          </Field>
          <Field label="Status">
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Card>

        <Card className="p-5 space-y-3">
          <h2 className="font-display font-medium">Notas internas</h2>
          <Textarea rows={10}
            value={form.internal_notes ?? ""}
            onChange={(e) => setForm({ ...form, internal_notes: e.target.value })}
            placeholder="Observações sobre o cliente, preferências, histórico…" />
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-medium">Viagens</h2>
          <Button size="sm" variant="outline" onClick={() => createTrip.mutate()} disabled={createTrip.isPending}>
            <Plus className="size-4" /> Nova viagem
          </Button>
        </div>
        {!trips?.length ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma viagem ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {trips.map((t) => (
              <li key={t.id}>
                <Link to="/admin/viagens/$tripId" params={{ tripId: t.id }}
                  className="flex items-center gap-3 py-3 hover:text-primary">
                  <Plane className="size-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{t.status.replace("_", " ")}</p>
                  </div>
                  {t.start_date && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(t.start_date).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <Label className="flex items-center gap-1 mb-1">{icon}{label}</Label>
      {children}
    </div>
  );
}

function CreateAccessButton({ contactId, email: defaultEmail }: { contactId: string; email: string }) {
  const qc = useQueryClient();
  const fn = useServerFn(createClientAccess);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres");
      return;
    }
    setSubmitting(true);
    try {
      await fn({ data: { contactId, email: email.trim(), password } });
      toast.success("Acesso criado. Envie o e-mail e senha para o cliente manualmente.");
      qc.invalidateQueries({ queryKey: ["contact", contactId] });
      setOpen(false);
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar acesso");
    } finally {
      setSubmitting(false);
    }
  }

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let out = "";
    for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
    setPassword(out);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <KeyRound className="size-4" /> Criar acesso do cliente
      </Button>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Criar acesso do cliente</DialogTitle>
          <DialogDescription>
            Será criada uma conta com perfil de cliente. Envie as credenciais manualmente ao cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="ca-email">E-mail</Label>
            <Input id="ca-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ca-pass">Senha temporária</Label>
            <div className="flex gap-2">
              <Input id="ca-pass" type="text" required minLength={8} maxLength={72}
                value={password} onChange={(e) => setPassword(e.target.value)} />
              <Button type="button" variant="outline" size="sm" onClick={generatePassword}>Gerar</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mínimo 8 caracteres.</p>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Criando..." : "Criar acesso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
