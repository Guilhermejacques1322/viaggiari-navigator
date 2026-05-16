import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Search, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Database } from "@/integrations/supabase/types";

type Contact = Database["public"]["Tables"]["contacts"]["Row"];
type Status = Database["public"]["Enums"]["contact_status"];

const STATUS_LABEL: Record<Status, string> = {
  lead: "Lead",
  negotiating: "Negociando",
  active_client: "Cliente ativo",
  completed: "Concluído",
  inactive: "Inativo",
};

const STATUS_COLOR: Record<Status, string> = {
  lead: "bg-muted text-muted-foreground",
  negotiating: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  active_client: "bg-primary/10 text-primary",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  inactive: "bg-muted text-muted-foreground/70",
};

export const Route = createFileRoute("/admin/crm")({
  component: CRMShell,
});

function CRMShell() {
  // Detail child renders its own content; this layout shows list + outlet.
  const childMatch = useMatch({ from: "/admin/crm/$contactId", shouldThrow: false });
  return childMatch ? <Outlet /> : <CRMList />;
}

function CRMList() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [open, setOpen] = useState(false);

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Contact[];
    },
  });

  const filtered = (contacts ?? []).filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (q && !`${c.full_name} ${c.email}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="brand-title text-xs text-primary mb-2">CRM</p>
          <h1 className="font-display text-3xl font-light">Contatos</h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4" /> Novo contato</Button>
          </DialogTrigger>
          <NewContactDialog onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["contacts"] }); }} />
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Buscar nome ou e-mail" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? <Skeleton className="h-64" /> :
        filtered.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            Nenhum contato {q || statusFilter !== "all" ? "com esses filtros" : "ainda"}.
          </Card>
        ) : (
          <Card className="divide-y divide-border">
            {filtered.map((c) => (
              <Link
                key={c.id}
                to="/admin/crm/$contactId"
                params={{ contactId: c.id }}
                className="flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="size-10 rounded-full bg-primary/10 grid place-items-center text-primary font-display font-medium text-sm">
                  {c.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                </div>
                <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${STATUS_COLOR[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </Card>
        )}
    </div>
  );
}

function NewContactDialog({ onCreated }: { onCreated: () => void }) {
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", status: "lead" as Status });
  const mut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contacts").insert(form);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Contato criado"); onCreated(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Novo contato</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Nome</Label>
          <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as Status })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button onClick={() => mut.mutate()} disabled={!form.full_name || !form.email || mut.isPending}>
          Criar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

export { STATUS_LABEL, STATUS_COLOR };
