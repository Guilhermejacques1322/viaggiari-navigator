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
          <CreateAccessButton
            contactId={contactId}
            email={contact.email}
            hasAccess={!!contact.user_id}
          />
        </div>
      </div>

      {contact.user_id && (contact as any).access_password && (
        <Card className="p-4 bg-primary/5 border-primary/30">
          <p className="text-xs uppercase tracking-wide text-primary font-medium mb-2">
            <Check className="size-3 inline mr-1" /> Acesso do cliente
          </p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">Login (e-mail)</Label>
              <p className="font-mono">{contact.email}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Senha</Label>
              <p className="font-mono">{(contact as any).access_password}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="hidden">
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
  const [submitting, setSubmitting] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fn({ data: { contactId, email: email.trim() } });
      setLink(res.magicLink);
      toast.success("Acesso criado. Copie o link e envie ao cliente.");
      qc.invalidateQueries({ queryKey: ["contact", contactId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar acesso");
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado");
  }

  function close() {
    setOpen(false);
    setLink(null);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <KeyRound className="size-4" /> Criar acesso do cliente
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar acesso do cliente</DialogTitle>
          <DialogDescription>
            O cliente recebe um link de acesso único. Sem senha — basta clicar para entrar na área dele.
          </DialogDescription>
        </DialogHeader>

        {!link ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="ca-email">E-mail do cliente</Label>
              <Input id="ca-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Gerando..." : "Gerar link de acesso"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Link de acesso (válido por tempo limitado)</Label>
              <Textarea readOnly value={link} rows={4} className="font-mono text-xs mt-1" />
            </div>
            <p className="text-xs text-muted-foreground">
              Envie este link ao cliente por WhatsApp ou e-mail. Ele entra direto na área de viagem dele — sem precisar de senha.
            </p>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={close}>Fechar</Button>
              <Button type="button" onClick={copyLink}>Copiar link</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
