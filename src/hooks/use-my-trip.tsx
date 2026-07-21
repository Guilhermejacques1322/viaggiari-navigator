import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";

export type Trip = Database["public"]["Tables"]["trips"]["Row"];
export type Day = Database["public"]["Tables"]["itinerary_days"]["Row"];
export type Activity = Database["public"]["Tables"]["itinerary_activities"]["Row"];
export type Document = Database["public"]["Tables"]["documents"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type ActivityPartner = Database["public"]["Tables"]["activity_partners"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type ActivityRoute = Database["public"]["Tables"]["activity_routes"]["Row"];
export type TripUtility = Database["public"]["Tables"]["trip_utilities"]["Row"];
export type TripUtilitySection = Database["public"]["Tables"]["trip_utility_sections"]["Row"];

export interface MyTripData {
  trip: Trip | null;
  days: (Day & { activities: (Activity & { partners: ActivityPartner[] })[] })[];
  documents: Document[];
  payments: Payment[];
  notifications: Notification[];
  routes: ActivityRoute[];
  utilities: TripUtility[];
  utilitySections: TripUtilitySection[];
}

async function fetchMyTrip(userId: string): Promise<MyTripData> {
  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!contact) return { trip: null, days: [], documents: [], payments: [], notifications: [], routes: [], utilities: [], utilitySections: [] };

  const { data: trip } = await supabase
    .from("trips")
    .select("*")
    .eq("contact_id", contact.id)
    .eq("visible_to_client", true)
    .order("start_date", { ascending: true, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!trip) return { trip: null, days: [], documents: [], payments: [], notifications: [], routes: [], utilities: [], utilitySections: [] };

  const [{ data: days }, { data: documents }, { data: payments }, { data: notifications }, { data: utilities }, { data: utilitySections }] = await Promise.all([
    supabase.from("itinerary_days").select("*").eq("trip_id", trip.id).order("day_number"),
    supabase.from("documents").select("*").eq("trip_id", trip.id).order("event_date", { nullsFirst: false }),
    supabase.from("payments").select("*").eq("trip_id", trip.id).order("installment"),
    supabase.from("notifications").select("*").eq("trip_id", trip.id).order("scheduled_for", { ascending: false }).limit(20),
    supabase.from("trip_utilities").select("*").eq("trip_id", trip.id).order("position").order("created_at"),
    supabase.from("trip_utility_sections").select("*").eq("trip_id", trip.id).order("position"),
  ]);

  const dayIds = (days ?? []).map((d) => d.id);
  const { data: activities } = dayIds.length
    ? await supabase
        .from("itinerary_activities")
        .select("*")
        .in("day_id", dayIds)
        .order("position")
    : { data: [] as Activity[] };

  const activityIds = (activities ?? []).map((a) => a.id);
  const [{ data: partners }, { data: routes }] = await Promise.all([
    activityIds.length
      ? supabase.from("activity_partners").select("*").in("activity_id", activityIds).order("created_at")
      : Promise.resolve({ data: [] as ActivityPartner[] }),
    activityIds.length
      ? supabase.from("activity_routes").select("*").in("from_activity_id", activityIds)
      : Promise.resolve({ data: [] as ActivityRoute[] }),
  ]);

  const grouped = (days ?? []).map((d) => ({
    ...d,
    activities: (activities ?? [])
      .filter((a) => a.day_id === d.id)
      .map((a) => ({
        ...a,
        partners: (partners ?? []).filter((p) => p.activity_id === a.id),
      })),
  }));

  return {
    trip,
    days: grouped,
    documents: documents ?? [],
    payments: payments ?? [],
    notifications: notifications ?? [],
    routes: routes ?? [],
    utilities: utilities ?? [],
    utilitySections: utilitySections ?? [],
  };
}

const TripCtx = createContext<{
  data: MyTripData | undefined;
  loading: boolean;
  refetch: () => void;
} | null>(null);

export function MyTripProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["my-trip", user?.id],
    queryFn: () => fetchMyTrip(user!.id),
    enabled: !!user,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  const value = useMemo(
    () => ({ data: query.data, loading: query.isLoading, refetch: query.refetch }),
    [query.data, query.isLoading, query.refetch],
  );

  return <TripCtx.Provider value={value}>{children}</TripCtx.Provider>;
}

export function useMyTrip() {
  const ctx = useContext(TripCtx);
  if (!ctx) throw new Error("useMyTrip must be used inside MyTripProvider");
  return ctx;
}
