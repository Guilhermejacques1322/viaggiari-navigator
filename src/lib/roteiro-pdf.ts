// Gerador de PDF do roteiro completo. jsPDF importado dinamicamente.
import { formatDateBR } from "@/lib/date-utils";

export type RoteiroPDFRoute = {
  from_activity_id: string;
  to_activity_id: string;
  driving_duration_sec: number | null;
  driving_distance_m: number | null;
  walking_duration_sec: number | null;
  walking_distance_m: number | null;
  transit_duration_sec: number | null;
  transit_distance_m: number | null;
};

export type RoteiroPDFActivity = {
  id: string;
  name: string;
  time: string | null;
  description: string | null;
  address: string | null;
  image_url: string | null;
  transport_mode_to_next?: "driving" | "transit" | "walking" | "hidden" | null;
};

export type RoteiroPDFDay = {
  id: string;
  day_number: number;
  title: string | null;
  date: string | null;
  description: string | null;
  cover_image_url: string | null;
  activities: RoteiroPDFActivity[];
  routes: RoteiroPDFRoute[];
};

export type RoteiroPDFData = {
  tripTitle: string;
  destinations: string[];
  startDate: string | null;
  endDate: string | null;
  clientName?: string | null;
  defaultTransport: "driving" | "transit" | "walking" | "hidden";
  days: RoteiroPDFDay[];
};

const OLIVE: [number, number, number] = [122, 122, 92];
const TERRA: [number, number, number] = [209, 122, 71];
const CREAM: [number, number, number] = [240, 230, 210];
const INK: [number, number, number] = [30, 30, 30];
const MUTED: [number, number, number] = [110, 110, 110];

// Baixa e converte imagem para data URL. Retorna null em qualquer erro (CORS, 404, etc).
async function loadImage(url: string): Promise<{ dataUrl: string; format: "JPEG" | "PNG" } | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const format: "JPEG" | "PNG" = blob.type.includes("png") ? "PNG" : "JPEG";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
    return { dataUrl, format };
  } catch {
    return null;
  }
}

function fmtDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h${String(rem).padStart(2, "0")}` : `${h}h`;
}
function fmtDistance(m: number | null | undefined): string {
  if (!m || m <= 0) return "";
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}
function routeStats(r: RoteiroPDFRoute | undefined, mode: "driving" | "transit" | "walking") {
  if (!r) return { dur: "", dist: "" };
  const d = mode === "driving" ? r.driving_duration_sec : mode === "transit" ? r.transit_duration_sec : r.walking_duration_sec;
  const dist = mode === "driving" ? r.driving_distance_m : mode === "transit" ? r.transit_distance_m : r.walking_distance_m;
  return { dur: fmtDuration(d), dist: fmtDistance(dist) };
}

export async function generateRoteiroPDF(data: RoteiroPDFData) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const margin = 16;
  const contentW = W - margin * 2;

  const setColor = (c: [number, number, number], fn: "text" | "fill" | "draw") => {
    if (fn === "text") doc.setTextColor(c[0], c[1], c[2]);
    else if (fn === "fill") doc.setFillColor(c[0], c[1], c[2]);
    else doc.setDrawColor(c[0], c[1], c[2]);
  };

  // ============== COVER ==============
  setColor(OLIVE, "fill");
  doc.rect(0, 0, W, H, "F");
  setColor(CREAM, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("VIAGGIARI", margin, 24);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Roteiro personalizado", margin, 30);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  const titleLines = doc.splitTextToSize(data.tripTitle, contentW);
  doc.text(titleLines, margin, 110);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  const dests = data.destinations.join(" • ");
  if (dests) doc.text(doc.splitTextToSize(dests, contentW), margin, 130);

  doc.setFontSize(11);
  const period = [
    data.startDate ? formatDateBR(data.startDate) : null,
    data.endDate ? formatDateBR(data.endDate) : null,
  ].filter(Boolean).join(" — ");
  if (period) doc.text(period, margin, 145);
  if (data.clientName) doc.text(`Para ${data.clientName}`, margin, 152);

  setColor(TERRA, "fill");
  doc.rect(margin, 165, 40, 1.5, "F");

  doc.setFontSize(9);
  setColor(CREAM, "text");
  doc.text(`${data.days.length} dia(s) de experiências`, margin, 178);

  // Rodapé capa
  doc.setFontSize(8);
  doc.text("viaggiari.com.br", margin, H - 12);

  // ============== ÍNDICE ==============
  doc.addPage();
  let y = 24;
  setColor(INK, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Índice", margin, y);
  y += 4;
  setColor(TERRA, "draw");
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin + 20, y);
  y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  setColor(INK, "text");
  for (const d of data.days) {
    if (y > H - 20) { doc.addPage(); y = 24; }
    const label = `Dia ${d.day_number}${d.title ? ` — ${d.title}` : ""}`;
    doc.text(label, margin, y);
    setColor(MUTED, "text");
    doc.setFontSize(9);
    const dateStr = d.date ? formatDateBR(d.date) : "";
    if (dateStr) doc.text(dateStr, W - margin, y, { align: "right" });
    setColor(INK, "text");
    doc.setFontSize(11);
    y += 7;
  }

  // ============== DIAS ==============
  for (const day of data.days) {
    doc.addPage();
    y = 0;

    // Hero do dia
    const heroH = 70;
    if (day.cover_image_url) {
      const img = await loadImage(day.cover_image_url);
      if (img) {
        try { doc.addImage(img.dataUrl, img.format, 0, 0, W, heroH, undefined, "FAST"); }
        catch { setColor(OLIVE, "fill"); doc.rect(0, 0, W, heroH, "F"); }
      } else {
        setColor(OLIVE, "fill");
        doc.rect(0, 0, W, heroH, "F");
      }
    } else {
      setColor(OLIVE, "fill");
      doc.rect(0, 0, W, heroH, "F");
    }
    // faixa escura para legibilidade
    doc.setFillColor(0, 0, 0);
    (doc as unknown as { setGState: (g: unknown) => void; GState: new (o: unknown) => unknown })
      .setGState(new (doc as unknown as { GState: new (o: unknown) => unknown }).GState({ opacity: 0.35 }));
    doc.rect(0, heroH - 30, W, 30, "F");
    (doc as unknown as { setGState: (g: unknown) => void; GState: new (o: unknown) => unknown })
      .setGState(new (doc as unknown as { GState: new (o: unknown) => unknown }).GState({ opacity: 1 }));

    setColor(CREAM, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(`DIA ${day.day_number}`, margin, heroH - 18);
    doc.setFontSize(20);
    doc.text(day.title ?? `Dia ${day.day_number}`, margin, heroH - 9);
    if (day.date) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(formatDateBR(day.date, { weekday: "long", day: "2-digit", month: "long" }), W - margin, heroH - 9, { align: "right" });
    }

    y = heroH + 10;
    setColor(INK, "text");

    if (day.description) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      setColor(MUTED, "text");
      const lines = doc.splitTextToSize(day.description, contentW);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 4;
      setColor(INK, "text");
    }

    // Atividades
    for (let i = 0; i < day.activities.length; i++) {
      const a = day.activities[i];
      const next = day.activities[i + 1];

      // Estimativa de altura do bloco
      const blockHeight = 40 + (a.description ? 12 : 0) + (a.address ? 6 : 0);
      if (y + blockHeight > H - 20) { doc.addPage(); y = 20; }

      // Bullet + linha do tempo
      setColor(TERRA, "fill");
      doc.circle(margin + 2, y + 3, 1.8, "F");
      if (next) {
        setColor(TERRA, "draw");
        doc.setLineWidth(0.4);
        doc.line(margin + 2, y + 6, margin + 2, y + blockHeight + 14);
      }

      const bodyX = margin + 8;
      const bodyW = contentW - 8;

      // Hora + nome
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      setColor(INK, "text");
      const timeStr = a.time ? a.time.slice(0, 5) : "";
      const header = timeStr ? `${timeStr}  ${a.name}` : a.name;
      const headerLines = doc.splitTextToSize(header, bodyW);
      doc.text(headerLines, bodyX, y + 4);
      let localY = y + 4 + headerLines.length * 5;

      if (a.address) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        setColor(MUTED, "text");
        const addrLines = doc.splitTextToSize(a.address, bodyW);
        doc.text(addrLines, bodyX, localY);
        localY += addrLines.length * 4;
      }

      if (a.description) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        setColor(INK, "text");
        const desc = doc.splitTextToSize(a.description, bodyW);
        doc.text(desc, bodyX, localY + 2);
        localY += desc.length * 4 + 2;
      }

      y = localY + 4;

      // Rota até próxima
      if (next) {
        const mode = (a.transport_mode_to_next ?? data.defaultTransport);
        if (mode !== "hidden") {
          const r = day.routes.find((rr) => rr.from_activity_id === a.id && rr.to_activity_id === next.id);
          const { dur, dist } = routeStats(r, mode as "driving" | "transit" | "walking");
          if (dur || dist) {
            const modeLabel = mode === "driving" ? "Carro" : mode === "transit" ? "Transporte público" : "A pé";
            setColor(MUTED, "text");
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            const line = `→ ${modeLabel} · ${[dur, dist].filter(Boolean).join(" · ")}`;
            doc.text(line, bodyX, y);
            y += 6;
          } else {
            y += 2;
          }
        }
        y += 4;
      }
    }

    if (day.activities.length === 0) {
      setColor(MUTED, "text");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text("Dia livre.", margin, y);
    }
  }

  // Rodapé em todas as páginas (exceto capa)
  const pageCount = doc.getNumberOfPages();
  for (let p = 2; p <= pageCount; p++) {
    doc.setPage(p);
    setColor(MUTED, "text");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Viaggiari · roteiro personalizado", margin, H - 8);
    doc.text(`${p - 1} / ${pageCount - 1}`, W - margin, H - 8, { align: "right" });
  }

  const safeTitle = data.tripTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "roteiro";
  doc.save(`roteiro-${safeTitle}.pdf`);
}
