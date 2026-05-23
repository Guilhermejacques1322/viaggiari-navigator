import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function TripChecklistAdmin({ tripId }: { tripId: string }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["trip-checklist", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_checklist_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("position");
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["trip-checklist", tripId] });

  const add = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Informe um título");
      const { error } = await supabase.from("trip_checklist_items").insert({
        trip_id: tripId,
        title: title.trim(),
        description: description.trim() || null,
        position: items.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      toast.success("Item adicionado");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = async (id: string) => {
    const { error } = await supabase.from("trip_checklist_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  const resetCompletion = async (id: string) => {
    const { error } = await supabase
      .from("trip_checklist_items")
      .update({ completed: false, completed_at: null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    invalidate();
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <div className="text-sm font-medium">Novo item</div>
        <Input
          placeholder="Ex: Tirar passaporte"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Textarea
          placeholder="Detalhes (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
        <Button onClick={() => add.mutate()} disabled={add.isPending} size="sm">
          <Plus className="size-4" /> Adicionar
        </Button>
      </Card>

      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum item ainda. Adicione tarefas que o cliente deve fazer antes da viagem.</p>
        )}
        {items.map((it) => (
          <Card key={it.id} className="p-3 flex items-start gap-3">
            <GripVertical className="size-4 text-muted-foreground mt-1" />
            <div className="flex-1">
              <p className={`text-sm font-medium ${it.completed ? "line-through text-muted-foreground" : ""}`}>
                {it.title}
              </p>
              {it.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{it.description}</p>
              )}
              {it.completed && (
                <button
                  onClick={() => resetCompletion(it.id)}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  Desmarcar como concluído
                </button>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => remove(it.id)}>
              <Trash2 className="size-4" />
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
