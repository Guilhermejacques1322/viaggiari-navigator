import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfYear,
  endOfYear,
  startOfDay,
  endOfDay,
  format,
  differenceInDays,
} from "date-fns";

export type PeriodPreset =
  | "this_month"
  | "last_month"
  | "last_30"
  | "last_90"
  | "this_year"
  | "custom";

export type DateRange = { from: Date; to: Date; label: string };

export function rangeFromPreset(preset: PeriodPreset, custom?: { from: Date; to: Date }): DateRange {
  const now = new Date();
  switch (preset) {
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now), label: "Este mês" };
    case "last_month": {
      const m = subMonths(now, 1);
      return { from: startOfMonth(m), to: endOfMonth(m), label: "Mês passado" };
    }
    case "last_30":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now), label: "Últimos 30 dias" };
    case "last_90":
      return { from: startOfDay(subDays(now, 89)), to: endOfDay(now), label: "Últimos 90 dias" };
    case "this_year":
      return { from: startOfYear(now), to: endOfYear(now), label: "Este ano" };
    case "custom":
      return {
        from: startOfDay(custom?.from ?? subDays(now, 7)),
        to: endOfDay(custom?.to ?? now),
        label: "Personalizado",
      };
  }
}

/** Período imediatamente anterior, com a mesma duração — para comparação % */
export function previousRange(range: DateRange): DateRange {
  const days = differenceInDays(range.to, range.from) + 1;
  return {
    from: startOfDay(subDays(range.from, days)),
    to: endOfDay(subDays(range.to, days)),
    label: "anterior",
  };
}

export function toISODate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function formatRangeShort(r: DateRange) {
  return `${format(r.from, "dd/MM/yy")} – ${format(r.to, "dd/MM/yy")}`;
}

export function pctChange(current: number, prev: number): number | null {
  if (prev === 0) return current === 0 ? 0 : null;
  return ((current - prev) / prev) * 100;
}
