import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, Edit2, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { confirmAction } from "@/lib/confirm";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["partner_products"]["Row"];
type OpPartner = Database["public"]["Tables"]["operational_partners"]["Row"];

export const Route = createFileRoute("/admin/parceiros")({
  component: AdminParceiros,
});

function AdminParceiros() {
  return (
    <div className="space-y-6">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Parceiros</p>
        <h1 className="font-display text-2xl md:text-3xl">Gestão de parceiros</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dois tipos: operacionais (uso interno em viagens) e produtos &amp; serviços (vitrine para clientes).
        </p>
      </div>

      <Tabs defaultValue="operacionais">
        <TabsList>
          <TabsTrigger value="operacionais">Operacionais</TabsTrigger>
          <TabsTrigger value="produtos">Produtos &amp; Serviços</TabsTrigger>
        </TabsList>
        <TabsContent value="operacionais" className="mt-6">
          <OperationalPartnersTab />
        </TabsContent>
        <TabsContent value="produtos" className="mt-6">
          <PartnerProductsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ============================== OPERACIONAIS ============================== */

const EMPTY_OP: Partial<OpPartner> = {
  name: "", role: "", default_cost: 0, currency: "BRL",
  contact: "", country: "", city: "", notes: "", active: true,
};

function OperationalPartnersTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<OpPartner> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-operational-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operational_partners")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as OpPartner[];
    },
    refetchOnWindowFocus: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-operational-partners"] });

  const save = useMutation({
    mutationFn: async (p: Partial<OpPartner>) => {
      if (!p.name?.trim()) throw new Error("Nome é obrigatório");
      const payload = {
        name: p.name.trim(),
        role: p.role?.trim() || null,
        default_cost: p.default_cost ?? 0,
        currency: p.currency || "BRL",
        contact: p.contact?.trim() || null,
        country: p.country?.trim() || null,
        city: p.city?.trim() || null,
        notes: p.notes?.trim() || null,
        active: p.active ?? true,
      };
      if (p.id) {
        const { error } = await supabase.from("operational_partners").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("operational_partners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { setEditing(null); invalidate(); toast.success("Salvo"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = async (p: OpPartner) => {
    const { error } = await supabase.from("operational_partners").update({ active: !p.active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  const remove = async (p: OpPartner) => {
    if (!(await confirmAction(`Excluir "${p.name}"?`, { confirmLabel: "Excluir" }))) return;
    const { error } = await supabase.from("operational_partners").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Guias, motoristas, tradutores, agências locais — usados ao montar atividades.
        </p>
        <Button onClick={() => setEditing({ ...EMPTY_OP })}>
          <Plus className="size-4" /> Novo parceiro
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.length ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          Nenhum parceiro operacional cadastrado ainda.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.map((p) => (
            <Card key={p.id} className={`p-4 space-y-2 ${p.active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  {p.role && <p className="text-xs text-muted-foreground">{p.role}</p>}
                </div>
                {(p.country || p.city) && (
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {[p.city, p.country].filter(Boolean).join(", ")}
                  </Badge>
                )}
              </div>
              {Number(p.default_cost) > 0 && (
                <p className="text-xs">
                  {Number(p.default_cost).toLocaleString("pt-BR", { style: "currency", currency: p.currency ?? "BRL" })}
                  <span className="text-muted-foreground"> · custo padrão</span>
                </p>
              )}
              {p.contact && <p className="text-xs text-muted-foreground truncate">📞 {p.contact}</p>}
              {p.notes && <p className="text-xs text-muted-foreground line-clamp-2">{p.notes}</p>}
              <div className="flex justify-end gap-1 pt-2 border-t border-border">
                <Button size="sm" variant="ghost" onClick={() => toggleActive(p)}>
                  {p.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Edit2 className="size-4" /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(p)} className="text-destructive">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar parceiro operacional" : "Novo parceiro operacional"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Função</Label>
                <Input placeholder="Guia, motorista, tradutor, agência..." value={editing.role ?? ""}
                  onChange={(e) => setEditing({ ...editing, role: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>País</Label>
                  <Input value={editing.country ?? ""}
                    onChange={(e) => setEditing({ ...editing, country: e.target.value })} />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input value={editing.city ?? ""}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Label>Custo padrão</Label>
                  <Input type="number" step="0.01" value={editing.default_cost ?? 0}
                    onChange={(e) => setEditing({ ...editing, default_cost: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label>Moeda</Label>
                  <Select value={editing.currency ?? "BRL"} onValueChange={(v) => setEditing({ ...editing, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BRL">BRL</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Contato</Label>
                <Input placeholder="WhatsApp, email..." value={editing.contact ?? ""}
                  onChange={(e) => setEditing({ ...editing, contact: e.target.value })} />
              </div>
              <div>
                <Label>Notas internas</Label>
                <Textarea rows={2} value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={editing.active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                <Label>Ativo</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================== PRODUTOS & SERVIÇOS ============================== */

const EMPTY_PROD: Partial<Product> = {
  store_name: "", product_name: "", purchase_url: "",
  image_url: "", description: "", category: "", display_order: 0, active: true,
};

function PartnerProductsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Product> | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-partner-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_products")
        .select("*")
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
    refetchOnWindowFocus: false,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-partner-products"] });

  const save = useMutation({
    mutationFn: async (p: Partial<Product>) => {
      if (!p.store_name?.trim() || !p.product_name?.trim() || !p.purchase_url?.trim()) {
        throw new Error("Loja, produto e link são obrigatórios");
      }
      const payload = {
        store_name: p.store_name.trim(),
        product_name: p.product_name.trim(),
        purchase_url: p.purchase_url.trim(),
        image_url: p.image_url?.trim() || null,
        description: p.description?.trim() || null,
        category: p.category?.trim() || null,
        display_order: p.display_order ?? 0,
        active: p.active ?? true,
      };
      if (p.id) {
        const { error } = await supabase.from("partner_products").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partner_products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { setEditing(null); invalidate(); toast.success("Salvo"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = async (p: Product) => {
    const { error } = await supabase.from("partner_products").update({ active: !p.active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  const remove = async (p: Product) => {
    if (!confirm(`Excluir "${p.product_name}"?`)) return;
    const { error } = await supabase.from("partner_products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Vitrine pública que aparece na aba "Parceiros" do app do cliente.
        </p>
        <Button onClick={() => setEditing({ ...EMPTY_PROD })}>
          <Plus className="size-4" /> Novo produto
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !data?.length ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed">
          Nenhum produto cadastrado ainda.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((p) => (
            <Card key={p.id} className={p.active ? "" : "opacity-60"}>
              <div className="aspect-video bg-muted rounded-t-xl overflow-hidden">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.product_name} loading="lazy"
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">sem imagem</div>
                )}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground truncate">{p.store_name}</p>
                    <p className="font-medium truncate">{p.product_name}</p>
                  </div>
                  {p.category && <Badge variant="secondary" className="shrink-0">{p.category}</Badge>}
                </div>
                {p.description && <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <a href={p.purchase_url} target="_blank" rel="noreferrer"
                     className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    <ExternalLink className="size-3" /> Abrir link
                  </a>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => toggleActive(p)}>
                      {p.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Edit2 className="size-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(p)} className="text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Nome da loja *</Label>
                <Input value={editing.store_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, store_name: e.target.value })} />
              </div>
              <div>
                <Label>Nome do produto *</Label>
                <Input value={editing.product_name ?? ""}
                  onChange={(e) => setEditing({ ...editing, product_name: e.target.value })} />
              </div>
              <div>
                <Label>Link de compra *</Label>
                <Input type="url" placeholder="https://..." value={editing.purchase_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, purchase_url: e.target.value })} />
              </div>
              <div>
                <Label>URL da imagem</Label>
                <Input type="url" placeholder="https://..." value={editing.image_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
                {editing.image_url && (
                  <div className="mt-2 aspect-video bg-muted rounded-md overflow-hidden">
                    <img src={editing.image_url} alt="preview" className="w-full h-full object-cover"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  </div>
                )}
              </div>
              <div>
                <Label>Categoria</Label>
                <Input placeholder="Ex: Mala, Eletrônico, Seguro…" value={editing.category ?? ""}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              </div>
              <div>
                <Label>Descrição curta</Label>
                <Textarea rows={2} value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ordem</Label>
                  <Input type="number" value={editing.display_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) || 0 })} />
                </div>
                <div className="flex items-end gap-2">
                  <Switch checked={editing.active ?? true}
                    onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                  <Label>Ativo</Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
