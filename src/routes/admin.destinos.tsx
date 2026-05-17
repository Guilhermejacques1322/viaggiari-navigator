import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/destinos")({ component: DestinosPage });

type Destination = {
  id: string;
  name: string;
  country: string | null;
  cover_image_url: string | null;
  tips: string | null;
  tags: string[] | null;
};

type Activity = {
  id: string;
  destination_id: string;
  name: string;
  description: string | null;
  address: string | null;
  maps_url: string | null;
  activity_type: string | null;
  country: string | null;
  city: string | null;
};

function DestinosPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [activities, setActivities] = useState<Record<string, Activity[]>>({});
  const [loading, setLoading] = useState(true);
  const [newDest, setNewDest] = useState({ name: "", country: "", cover_image_url: "", tips: "", tags: "" });
  const [open, setOpen] = useState(false);
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCity, setFilterCity] = useState("");

  async function load() {
    setLoading(true);
    const { data: dests } = await supabase.from("destinations").select("*").order("name");
    const { data: acts } = await supabase.from("destination_activities").select("*").order("name");
    setDestinations(dests || []);
    const grouped: Record<string, Activity[]> = {};
    (acts || []).forEach((a) => {
      (grouped[a.destination_id] ||= []).push(a as Activity);
    });
    setActivities(grouped);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function createDestination() {
    if (!newDest.name) return toast.error("Nome obrigatório");
    const tags = newDest.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from("destinations").insert({
      name: newDest.name,
      country: newDest.country || null,
      cover_image_url: newDest.cover_image_url || null,
      tips: newDest.tips || null,
      tags,
    });
    if (error) return toast.error(error.message);
    toast.success("Destino criado");
    setNewDest({ name: "", country: "", cover_image_url: "", tips: "", tags: "" });
    setOpen(false);
    load();
  }

  async function deleteDestination(id: string) {
    if (!confirm("Excluir destino?")) return;
    const { error } = await supabase.from("destinations").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-semibold">Biblioteca de Destinos</h1>
          <p className="text-sm text-muted-foreground">Banco de conhecimento reutilizável para roteiros</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="size-4 mr-2" />Novo destino</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo destino</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome *</Label><Input value={newDest.name} onChange={(e) => setNewDest({ ...newDest, name: e.target.value })} /></div>
              <div><Label>País</Label><Input value={newDest.country} onChange={(e) => setNewDest({ ...newDest, country: e.target.value })} /></div>
              <div><Label>URL imagem de capa</Label><Input value={newDest.cover_image_url} onChange={(e) => setNewDest({ ...newDest, cover_image_url: e.target.value })} /></div>
              <div><Label>Tags (separadas por vírgula)</Label><Input value={newDest.tags} onChange={(e) => setNewDest({ ...newDest, tags: e.target.value })} placeholder="praia, gastronomia, família" /></div>
              <div><Label>Dicas</Label><Textarea rows={4} value={newDest.tips} onChange={(e) => setNewDest({ ...newDest, tips: e.target.value })} /></div>
              <Button onClick={createDestination} className="w-full">Criar destino</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Filtrar por país" value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="max-w-[200px]" />
        <Input placeholder="Filtrar por cidade" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="max-w-[200px]" />
        {(filterCountry || filterCity) && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterCountry(""); setFilterCity(""); }}>Limpar</Button>
        )}
      </div>

      {loading ? <p className="text-muted-foreground">Carregando…</p> : destinations.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">Nenhum destino cadastrado ainda.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {destinations
            .filter((d) => {
              if (filterCountry && !(d.country ?? "").toLowerCase().includes(filterCountry.toLowerCase())) return false;
              if (filterCity && !(d.name ?? "").toLowerCase().includes(filterCity.toLowerCase())) return false;
              return true;
            })
            .map((d) => (
              <DestinationCard key={d.id} dest={d} activities={activities[d.id] || []} onDelete={() => deleteDestination(d.id)} onReload={load} />
            ))}
        </div>
      )}
    </div>
  );
}

function DestinationCard({ dest, activities, onDelete, onReload }: { dest: Destination; activities: Activity[]; onDelete: () => void; onReload: () => void; }) {
  const [actOpen, setActOpen] = useState(false);
  const [newAct, setNewAct] = useState({ name: "", description: "", address: "", maps_url: "", activity_type: "passeio", country: dest.country ?? "", city: dest.name });

  async function addActivity() {
    if (!newAct.name) return toast.error("Nome obrigatório");
    const { error } = await supabase.from("destination_activities").insert({
      destination_id: dest.id,
      name: newAct.name,
      description: newAct.description,
      address: newAct.address,
      maps_url: newAct.maps_url,
      country: newAct.country || null,
      city: newAct.city || null,
      activity_type: newAct.activity_type as "passeio" | "refeicao" | "hospedagem" | "transporte" | "livre",
    });
    if (error) return toast.error(error.message);
    toast.success("Adicionada");
    setNewAct({ name: "", description: "", address: "", maps_url: "", activity_type: "passeio", country: dest.country ?? "", city: dest.name });
    setActOpen(false);
    onReload();
  }

  return (
    <Card className="overflow-hidden">
      {dest.cover_image_url && <img src={dest.cover_image_url} alt={dest.name} className="w-full h-32 object-cover" />}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-display font-semibold">{dest.name}</h3>
            {dest.country && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="size-3" />{dest.country}</p>}
          </div>
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 className="size-4" /></Button>
        </div>
        {dest.tags && dest.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dest.tags.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
          </div>
        )}
        {dest.tips && <p className="text-xs text-muted-foreground line-clamp-3">{dest.tips}</p>}
        <div className="border-t border-border pt-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">{activities.length} atividade(s)</span>
            <Dialog open={actOpen} onOpenChange={setActOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost"><Plus className="size-3 mr-1" />Atividade</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Atividade em {dest.name}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div><Label>Nome *</Label><Input value={newAct.name} onChange={(e) => setNewAct({ ...newAct, name: e.target.value })} /></div>
                  <div><Label>Tipo</Label>
                    <Select value={newAct.activity_type} onValueChange={(v) => setNewAct({ ...newAct, activity_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passeio">Passeio</SelectItem>
                        <SelectItem value="refeicao">Refeição</SelectItem>
                        <SelectItem value="hospedagem">Hospedagem</SelectItem>
                        <SelectItem value="transporte">Transporte</SelectItem>
                        <SelectItem value="livre">Tempo livre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Endereço</Label><Input value={newAct.address} onChange={(e) => setNewAct({ ...newAct, address: e.target.value })} /></div>
                  <div><Label>URL no Maps</Label><Input value={newAct.maps_url} onChange={(e) => setNewAct({ ...newAct, maps_url: e.target.value })} /></div>
                  <div><Label>Descrição</Label><Textarea rows={3} value={newAct.description} onChange={(e) => setNewAct({ ...newAct, description: e.target.value })} /></div>
                  <Button onClick={addActivity} className="w-full">Adicionar</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          {activities.slice(0, 4).map((a) => (
            <div key={a.id} className="text-xs text-muted-foreground flex justify-between">
              <span className="truncate">{a.name}</span>
              <Badge variant="outline" className="text-[10px]">{a.activity_type}</Badge>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
