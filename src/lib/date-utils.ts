// Parsing de datas ISO (YYYY-MM-DD) SEM timezone shift.
// `new Date("2026-01-15")` é interpretado como UTC-midnight, que em
// fusos negativos (Brasil UTC-3) exibe o dia anterior. Estas helpers
// tratam a string como data local pura.

export function parseISODateLocal(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const s = iso.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function formatDateBR(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
): string {
  const d = parseISODateLocal(iso);
  if (!d) return "";
  return d.toLocaleDateString("pt-BR", options);
}
