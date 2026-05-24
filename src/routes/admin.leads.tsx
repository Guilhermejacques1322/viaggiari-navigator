import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { UserPlus, Trash2, Mail, Phone, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { confirmAction } from "@/lib/confirm";
import type { Database } from "@/integrations/supabase/types";

type Lead = Database["public"]["Tables"]["leads"]["Row"];

export const Route = createFileRoute("/admin/leads")({
  component: LeadsPage,
});

function LeadsPage() {
  const qc = useQueryClient();
  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Lead[];
    },
  });

  const convert = useMutation({
    mutationFn: async (lead: Lead) => {
      const { data: contact, error } = await supabase
        .from("contacts")
        .insert({
          full_name: lead.full_name,
          email: lead.email,
          phone: lead.phone,
          destinations_of_interest: lead.destination ? [lead.destination] : [],
          travel_period: lead.travel_period,
          source: "landing",
          status: "negotiating",
          internal_notes: lead.message,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from("leads").update({ contact_id: contact.id }).eq("id", lead.id);
      return contact;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success("Lead convertido em contato!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead removido");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <p className="brand-title text-xs text-primary mb-2">Captação</p>
        <h1 className="font-display text-3xl font-light">Leads do site</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pessoas que preencheram o formulário da landing. Converta em contato para iniciar o atendimento.
        </p>
      </div>

      {isLoading ? <Skeleton className="h-64" /> :
        !leads?.length ? (
          <Card className="p-12 text-center text-muted-foreground border-dashed">
            Nenhum lead ainda.
          </Card>
        ) : (
          <div className="space-y-3">
            {leads.map((lead) => (
              <Card key={lead.id} className="p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-display font-medium">{lead.full_name}</p>
                      {lead.contact_id && (
                        <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          convertido
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Mail className="size-3" />{lead.email}</span>
                      <span className="inline-flex items-center gap-1"><Phone className="size-3" />{lead.phone}</span>
                      {lead.destination && (
                        <span className="inline-flex items-center gap-1"><MapPin className="size-3" />{lead.destination}</span>
                      )}
                      {lead.travel_period && <span>· {lead.travel_period}</span>}
                    </div>
                    {lead.message && (
                      <p className="mt-3 text-sm text-foreground/80 italic">"{lead.message}"</p>
                    )}
                    <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-wide">
                      {new Date(lead.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex gap-2 md:flex-col">
                    <Button
                      size="sm"
                      onClick={() => convert.mutate(lead)}
                      disabled={!!lead.contact_id || convert.isPending}
                    >
                      <UserPlus className="size-4" />
                      Converter
                    </Button>
                    <Button size="sm" variant="ghost"
                      onClick={() => { if (confirm("Remover este lead?")) remove.mutate(lead.id); }}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}
