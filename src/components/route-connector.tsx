import { useState } from "react";
import { Car, Bus, Footprints, EyeOff, ChevronDown, Check } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ActivityRoute } from "@/hooks/use-my-trip";
import { setSegmentTransport, setTripDefaultTransport } from "@/lib/routes.functions";

type Mode = "driving" | "transit" | "walking" | "hidden";

interface Props {
  fromActivityId: string;
  fromName: string;
  toName: string;
  route: ActivityRoute | null;
  currentMode: Mode;
  tripId: string;
  isAdmin: boolean;
  onChanged: () => void;
}

const ICON: Record<Exclude<Mode, "hidden">, typeof Car> = {
  driving: Car,
  transit: Bus,
  walking: Footprints,
};

const LABEL: Record<Mode, string> = {
  driving: "Condução",
  transit: "Transporte",
  walking: "Caminhada",
  hidden: "Ocultas",
};

function getStats(route: ActivityRoute | null, mode: Exclude<Mode, "hidden">) {
  if (!route) return null;
  const dur =
    mode === "driving" ? route.driving_duration_sec :
    mode === "transit" ? route.transit_duration_sec :
    route.walking_duration_sec;
  const dist =
    mode === "driving" ? route.driving_distance_m :
    mode === "transit" ? route.transit_distance_m :
    route.walking_distance_m;
  if (dur == null || dist == null) return null;
  return { duration: formatDuration(dur), distance: formatDistance(dist) };
}

function formatDuration(sec: number): string {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function formatDistance(m: number): string {
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

export function RouteConnector(props: Props) {
  const { fromActivityId, fromName, toName, route, currentMode, tripId, isAdmin, onChanged } = props;
  const [open, setOpen] = useState(false);
  const setSegment = useServerFn(setSegmentTransport);
  const setDefault = useServerFn(setTripDefaultTransport);

  if (currentMode === "hidden") {
    return (
      <div className="flex items-center gap-2 pl-5 py-1 text-xs text-muted-foreground/60">
        <EyeOff className="size-3" />
        <button onClick={() => setOpen(true)} className="hover:underline">
          Mostrar direções
        </button>
        <ModeSheet
          open={open}
          onOpenChange={setOpen}
          fromName={fromName}
          toName={toName}
          route={route}
          currentMode={currentMode}
          isAdmin={isAdmin}
          onSelect={async (mode) => {
            try {
              await setSegment({ data: { fromActivityId, mode } });
              onChanged();
              setOpen(false);
            } catch (e) { toast.error((e as Error).message); }
          }}
          onSetDefault={async (mode) => {
            try {
              await setDefault({ data: { tripId, mode } });
              onChanged();
              setOpen(false);
              toast.success("Padrão atualizado");
            } catch (e) { toast.error((e as Error).message); }
          }}
        />
      </div>
    );
  }

  const Icon = ICON[currentMode];
  const stats = getStats(route, currentMode);

  return (
    <div className="flex items-center gap-2 pl-5 py-1.5">
      <div className="w-px h-4 bg-border ml-[1.25rem] -translate-x-[1.6rem]" aria-hidden />
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
      >
        <Icon className="size-3.5 shrink-0" />
        {stats ? (
          <span>
            {stats.duration} • {stats.distance}
          </span>
        ) : (
          <span className="italic">Rota não calculada</span>
        )}
        <ChevronDown className="size-3 opacity-60" />
        <span className="text-primary group-hover:underline">Direções</span>
      </button>
      <ModeSheet
        open={open}
        onOpenChange={setOpen}
        fromName={fromName}
        toName={toName}
        route={route}
        currentMode={currentMode}
        isAdmin={isAdmin}
        onSelect={async (mode) => {
          try {
            await setSegment({ data: { fromActivityId, mode } });
            onChanged();
            setOpen(false);
          } catch (e) { toast.error((e as Error).message); }
        }}
        onSetDefault={async (mode) => {
          try {
            await setDefault({ data: { tripId, mode } });
            onChanged();
            setOpen(false);
            toast.success("Padrão atualizado para toda a viagem");
          } catch (e) { toast.error((e as Error).message); }
        }}
      />
    </div>
  );
}

function ModeSheet({
  open, onOpenChange, fromName, toName, route, currentMode, isAdmin, onSelect, onSetDefault,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  fromName: string;
  toName: string;
  route: ActivityRoute | null;
  currentMode: Mode;
  isAdmin: boolean;
  onSelect: (mode: Mode) => void | Promise<void>;
  onSetDefault: (mode: Exclude<Mode, "hidden">) => void | Promise<void>;
}) {
  const modes: Array<Exclude<Mode, "hidden">> = ["driving", "transit", "walking"];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-center font-display">Modo de transporte</SheetTitle>
          <p className="text-xs text-muted-foreground text-center truncate">
            {fromName} → {toName}
          </p>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {modes.map((m) => {
            const Icon = ICON[m];
            const s = getStats(route, m);
            const active = currentMode === m;
            return (
              <button
                key={m}
                disabled={!isAdmin}
                onClick={() => isAdmin && onSelect(m)}
                className={cn(
                  "w-full flex items-center gap-4 py-3 px-2 rounded-lg text-left transition-colors",
                  isAdmin && "hover:bg-accent/60",
                  active && "bg-accent/40",
                  !isAdmin && "cursor-default",
                )}
              >
                <Icon className="size-5 shrink-0" />
                <span className="flex-1 text-sm font-medium">{LABEL[m]}</span>
                <span className="text-sm text-muted-foreground">
                  {s ? `${s.duration} • ${s.distance}` : "—"}
                  {m === "transit" && s && route?.transit_is_estimate && (
                    <span className="ml-1 text-[10px] uppercase">est.</span>
                  )}
                </span>
                {active && <Check className="size-4 text-primary" />}
              </button>
            );
          })}

          {isAdmin && (
            <button
              onClick={() => onSelect("hidden")}
              className="w-full flex items-center gap-4 py-3 px-2 rounded-lg text-left hover:bg-accent/60 transition-colors"
            >
              <EyeOff className="size-5 shrink-0" />
              <span className="flex-1 text-sm font-medium">Ocultar direções</span>
              {currentMode === "hidden" && <Check className="size-4 text-primary" />}
            </button>
          )}
        </div>

        {isAdmin && currentMode !== "hidden" && (
          <>
            <div className="my-3 border-t border-border" />
            <Button
              variant="ghost"
              className="w-full justify-start text-sm font-normal text-muted-foreground hover:text-foreground"
              onClick={() => onSetDefault(currentMode as Exclude<Mode, "hidden">)}
            >
              Alterar padrão para todos os lugares
            </Button>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
