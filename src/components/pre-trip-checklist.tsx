import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

export function PreTripChecklist({
  tripId,
  startDate,
  status,
}: {
  tripId: string;
  startDate: string | null;
  status: string | null;
}) {
  const qc = useQueryClient();
  const [showCongrats, setShowCongrats] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Só aparece quando a viagem foi entregue ao cliente
  const isDelivered = status === "delivered";
  // Hide entirely once trip has started
  const tripStarted = startDate ? new Date(startDate).getTime() <= Date.now() : false;

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my-checklist", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_checklist_items")
        .select("*")
        .eq("trip_id", tripId)
        .order("position");
      if (error) throw error;
      return data;
    },
    enabled: !tripStarted && isDelivered,
    staleTime: 60_000,
  });

  const toggle = async (id: string, current: boolean) => {
    // optimistic update
    qc.setQueryData(["my-checklist", tripId], (old: any) =>
      (old ?? []).map((i: any) =>
        i.id === id ? { ...i, completed: !current, completed_at: !current ? new Date().toISOString() : null } : i,
      ),
    );
    const { error } = await supabase
      .from("trip_checklist_items")
      .update({ completed: !current, completed_at: !current ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) qc.invalidateQueries({ queryKey: ["my-checklist", tripId] });
  };

  const allDone = items.length > 0 && items.every((i) => i.completed);

  // Trigger congrats once when all done
  useEffect(() => {
    if (allDone && !dismissed) {
      setShowCongrats(true);
      const t = setTimeout(() => {
        setShowCongrats(false);
        setDismissed(true);
      }, 4500);
      return () => clearTimeout(t);
    }
  }, [allDone, dismissed]);

  if (tripStarted) return null;
  if (isLoading) return null;
  if (items.length === 0) return null;
  if (dismissed) return null;

  if (showCongrats) {
    return (
      <Card className="p-8 text-center bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border-primary/30">
        <Sparkles className="size-10 mx-auto text-primary mb-3" />
        <p className="font-display text-2xl font-light">Parabéns!</p>
        <p className="text-sm text-muted-foreground mt-2">
          Você concluiu tudo do checklist pré-viagem. Boa viagem!
        </p>
      </Card>
    );
  }

  const done = items.filter((i) => i.completed).length;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-1">
        <ListChecks className="size-4 text-primary" />
        <h2 className="font-display text-lg font-medium">Checklist pré-viagem</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        {done}/{items.length} concluídos
      </p>
      <ul className="space-y-2">
        {items.map((it) => (
          <li key={it.id} className="flex items-start gap-3">
            <Checkbox
              checked={!!it.completed}
              onCheckedChange={() => toggle(it.id, !!it.completed)}
              className="mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${it.completed ? "line-through text-muted-foreground" : ""}`}>
                {it.title}
              </p>
              {it.description && (
                <p className={`text-xs mt-0.5 ${it.completed ? "line-through text-muted-foreground/70" : "text-muted-foreground"}`}>
                  {it.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
