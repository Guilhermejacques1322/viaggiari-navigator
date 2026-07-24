// Gerador de PDF do roteiro — visual Viaggiari.
// Inspirado no roteiro-modelo: capa com hero, faixa de destaques, índice;
// páginas de dia com badge, hero, timeline laranja e sidebar (Roteiro do Dia + Dica).
import { formatDateBR } from "@/lib/date-utils";
import logoAsset from "@/assets/viaggiari-logo-full-v2.jpeg.asset.json";

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

// Paleta Viaggiari (alinhada ao roteiro-modelo)
const NAVY: RGB = [26, 46, 74];
const ORANGE: RGB = [232, 112, 60];
const ORANGE_SOFT: RGB = [251, 234, 224];
const CREAM: RGB = [250, 245, 238];
const INK: RGB = [30, 30, 30];
const MUTED: RGB = [107, 107, 107];
const WHITE: RGB = [255, 255, 255];
const BORDER: RGB = [230, 220, 205];
const BLUE_SOFT: RGB = [223, 232, 245];

type RGB = [number, number, number];

// Contatos rodapé (do modelo Viaggiari)
const CONTACT = {
  phone: "47 99612-2702",
  email: "viaggiaritravel@gmail.com",
  instagram: "@viaggiari.viagens",
  cnpj: "CNPJ 58.100.268/0001-85",
};

const TAGLINE = "Mais que uma viagem, uma história para viver juntos.";

// Dicas rotativas (uma por dia)
const TIPS = [
  "Desloque-se sempre com o voucher e o endereço combinado em mãos.",
  "Deixe cópia dos documentos no celular e uma via impressa na mala.",
  "Chegue com folga aos embarques: check-in doméstico costuma pedir documento.",
  "Guarde dinheiro e cartão em locais diferentes durante os passeios.",
  "Baixe mapas offline da cidade antes de sair do hotel.",
  "Confirme o horário de check-out do hotel no dia anterior.",
  "Hidrate-se bem — mesmo no frio, o corpo desidrata em altitude.",
  "Verifique se sua operadora libera roaming ou se vale um eSIM local.",
  "Reserve restaurantes disputados com pelo menos 1 dia de antecedência.",
  "Deixe o último dia com folga para imprevistos e compras de última hora.",
];

// Baixa e converte imagem para data URL.
async function loadImage(url: string): Promise<{ dataUrl: string; format: "JPEG" | "PNG"; w: number; h: number } | null> {
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
    // Ler dimensões nativas para preservar proporção sem distorcer.
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = dataUrl;
    });
    return { dataUrl, format, w: dims.w, h: dims.h };
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

function cleanDayTitle(title: string | null | undefined, dayNumber: number): string {
  const raw = (title ?? "").trim();
  if (!raw) return "";
  return raw
    .replace(new RegExp(`^\\s*dia\\s*0?${dayNumber}\\s*[-–—:.]?\\s*`, "i"), "")
    .replace(/^\s*dia\s*\d+\s*[-–—:.]?\s*/i, "")
    .trim();
}

export async function generateRoteiroPDF(data: RoteiroPDFData) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const H = 297;
  const M = 14; // margem lateral

  type JsPDFDoc = InstanceType<typeof jsPDF>;
  type WithGState = JsPDFDoc & { setGState: (g: unknown) => void; GState: new (o: unknown) => unknown };
  const setC = (c: RGB, fn: "text" | "fill" | "draw") => {
    if (fn === "text") doc.setTextColor(c[0], c[1], c[2]);
    else if (fn === "fill") doc.setFillColor(c[0], c[1], c[2]);
    else doc.setDrawColor(c[0], c[1], c[2]);
  };
  const withOpacity = (opacity: number, fn: () => void) => {
    const d = doc as WithGState;
    d.setGState(new d.GState({ opacity }));
    fn();
    d.setGState(new d.GState({ opacity: 1 }));
  };

  // Pré-carrega logo (falha silenciosa se offline)
  const logo = await loadImage(logoAsset.url);

  async function cropImageToCover(img: { dataUrl: string; format: "JPEG" | "PNG"; w: number; h: number }, targetRatio: number) {
    if (typeof document === "undefined") return { dataUrl: img.dataUrl, format: img.format };

    const source = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = reject;
      element.src = img.dataUrl;
    });

    const sourceRatio = img.w / img.h;
    let sx = 0;
    let sy = 0;
    let sw = img.w;
    let sh = img.h;

    if (sourceRatio > targetRatio) {
      sw = img.h * targetRatio;
      sx = (img.w - sw) / 2;
    } else {
      sh = img.w / targetRatio;
      sy = (img.h - sh) / 2;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = Math.max(1, Math.round(canvas.width / targetRatio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return { dataUrl: img.dataUrl, format: img.format };
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/jpeg", 0.88), format: "JPEG" as const };
  }

  async function drawCoverAsync(url: string | null, dx: number, dy: number, dw: number, dh: number, fallback: RGB = NAVY) {
    const img = url ? await loadImage(url) : null;
    if (!img || !img.w || !img.h) {
      setC(fallback, "fill");
      doc.rect(dx, dy, dw, dh, "F");
      return;
    }
    try {
      setC(fallback, "fill");
      doc.rect(dx, dy, dw, dh, "F");
      const cropped = await cropImageToCover(img, dw / dh);
      doc.addImage(cropped.dataUrl, cropped.format, dx, dy, dw, dh, undefined, "FAST");
    } catch {
      setC(fallback, "fill");
      doc.rect(dx, dy, dw, dh, "F");
    }
  }

  function drawLogo(cx: number, y: number, h: number) {
    if (!logo || !logo.w) return;
    const ratio = logo.w / logo.h;
    const w = h * ratio;
    try { doc.addImage(logo.dataUrl, logo.format, cx - w / 2, y, w, h, undefined, "FAST"); } catch { /* noop */ }
  }

  function footerBar() {
    const barH = 12;
    setC(ORANGE, "fill");
    doc.rect(0, H - barH, W, barH, "F");
    setC(WHITE, "text");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const items = [
      `Tel/WhatsApp: ${CONTACT.phone}`,
      CONTACT.email,
      CONTACT.instagram,
      CONTACT.cnpj,
    ];
    const slot = W / items.length;
    const y = H - barH / 2 + 1.2;
    items.forEach((t, i) => {
      doc.text(t, slot * i + slot / 2, y, { align: "center" });
    });
  }

  // ============== CAPA ==============
  setC(CREAM, "fill");
  doc.rect(0, 0, W, H, "F");

  // Logo centralizado
  drawLogo(W / 2, 10, 32);

  // Roteiro personalizado (rótulo)
  setC(NAVY, "text");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("R O T E I R O   P E R S O N A L I Z A D O", W / 2, 48, { align: "center" });
  setC(ORANGE, "draw");
  doc.setLineWidth(0.6);
  doc.line(W / 2 - 8, 51, W / 2 + 8, 51);

  // Título grande
  doc.setFont("times", "bold");
  doc.setFontSize(32);
  setC(NAVY, "text");
  const titleLines = doc.splitTextToSize(data.tripTitle, W - M * 2);
  const titleY = 62;
  doc.text(titleLines, W / 2, titleY, { align: "center" });

  // Destinos
  const afterTitleY = titleY + titleLines.length * 11;
  setC(ORANGE, "text");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  const dests = (data.destinations ?? []).filter(Boolean).join(" · ");
  if (dests) {
    const dl = doc.splitTextToSize(dests, W - M * 2);
    doc.text(dl, W / 2, afterTitleY + 4, { align: "center" });
  }

  // Datas
  const period = [
    data.startDate ? formatDateBR(data.startDate) : null,
    data.endDate ? formatDateBR(data.endDate) : null,
  ].filter(Boolean).join(" — ");
  if (period) {
    doc.setFontSize(13);
    doc.text(period, W / 2, afterTitleY + 12, { align: "center" });
  }

  // Hero image (reduzido, com margem lateral, para não competir com o título)
  const heroSideM = M + 6;
  const heroW = W - heroSideM * 2;
  const heroH = 60;
  const heroY = afterTitleY + 24;
  await drawCoverAsync(
    data.days.find((d) => d.cover_image_url)?.cover_image_url ?? null,
    heroSideM, heroY, heroW, heroH, NAVY,
  );
  setC(BORDER, "draw");
  doc.setLineWidth(0.3);
  doc.rect(heroSideM, heroY, heroW, heroH);


  // Faixa navy com 4 destaques
  const bandY = heroY + heroH + 8;
  const bandH = 24;
  setC(NAVY, "fill");
  doc.rect(0, bandY, W, bandH, "F");
  const stats = [
    { title: `${data.days.length} dias`, sub: "de experiências" },
    { title: "Memórias", sub: "que ficam para sempre" },
    { title: "Destinos", sub: "inesquecíveis" },
    { title: "Viagem feita", sub: data.clientName ? `para ${data.clientName}` : "para você" },
  ];
  const colW = W / stats.length;
  setC(WHITE, "text");
  stats.forEach((s, i) => {
    const cx = colW * i + colW / 2;
    setC(ORANGE, "fill");
    doc.circle(cx, bandY + 6, 1.4, "F");
    setC(WHITE, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.text(s.title, cx, bandY + 13, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(s.sub, cx, bandY + 18, { align: "center" });
    if (i < stats.length - 1) {
      setC(WHITE, "draw");
      doc.setLineWidth(0.2);
      withOpacity(0.35, () => doc.line(colW * (i + 1), bandY + 5, colW * (i + 1), bandY + bandH - 5));
    }
  });

  // Índice de dias
  let iy = bandY + bandH + 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  for (const d of data.days) {
    if (iy > H - 40) break; // deixa espaço para tagline/rodapé
    setC(ORANGE, "text");
    doc.setFont("helvetica", "bold");
    doc.text(`DIA ${d.day_number}`, M + 4, iy);
    setC(NAVY, "text");
    doc.setFont("helvetica", "normal");
    doc.text("—", M + 26, iy);
    const title = cleanDayTitle(d.title, d.day_number) || "Programação do dia";
    const tt = doc.splitTextToSize(title, 90);
    doc.text(tt[0] ?? title, M + 32, iy);
    if (d.date) {
      setC(MUTED, "text");
      doc.setFontSize(9);
      doc.text(formatDateBR(d.date, { day: "2-digit", month: "long", year: "numeric" }), W - M - 4, iy, { align: "right" });
      doc.setFontSize(10);
    }
    iy += 6.5;
  }

  // Tagline
  setC(NAVY, "text");
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  doc.text(TAGLINE, W / 2, H - 22, { align: "center" });

  footerBar();

  // ============== DIAS ==============
  for (let dIdx = 0; dIdx < data.days.length; dIdx++) {
    const day = data.days[dIdx];
    doc.addPage();


    // fundo cream
    setC(CREAM, "fill");
    doc.rect(0, 0, W, H, "F");

    // Logo topo
    drawLogo(W / 2, 6, 20);

    // Hero (mais compacto, sem nenhum texto sobreposto)
    const heroTop = 30;
    const heroHeight = 46;
    const heroPad = M;
    await drawCoverAsync(day.cover_image_url, heroPad, heroTop, W - heroPad * 2, heroHeight, NAVY);
    setC(BORDER, "draw");
    doc.setLineWidth(0.3);
    doc.rect(heroPad, heroTop, W - heroPad * 2, heroHeight);

    // Conteúdo abaixo da imagem (sem sidebar — coluna única para melhor leitura)
    const contentTop = heroTop + heroHeight + 8;
    const mainW = W - M * 2;
    const mainX = M;

    // ---- Conteúdo ----
    let y = contentTop;

    // Badge DIA X + weekday na mesma linha (abaixo da imagem)
    const badgeW = 30, badgeH = 9;
    setC(ORANGE, "fill");
    doc.roundedRect(mainX, y, badgeW, badgeH, 1.8, 1.8, "F");
    setC(WHITE, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`DIA ${day.day_number}`, mainX + badgeW / 2, y + badgeH / 2 + 1.4, { align: "center" });

    if (day.date) {
      setC(MUTED, "text");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      const weekday = formatDateBR(day.date, { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
      const weekdayTrunc = doc.splitTextToSize(weekday, mainW - badgeW - 6)[0] ?? weekday;
      doc.text(weekdayTrunc, mainX + badgeW + 4, y + badgeH / 2 + 1.4);
    }
    y += badgeH + 5;

    // Título — só aparece quando tem nome real; evita repetir "DIA X" duas vezes.
    const title = cleanDayTitle(day.title, day.day_number);
    if (title) {
      setC(NAVY, "text");
      doc.setFont("times", "bold");
      doc.setFontSize(20);
      const tl = doc.splitTextToSize(title, mainW);
      doc.text(tl, mainX, y + 2);
      y += tl.length * 7.5 + 2;
    }


    // Descrição
    if (day.description) {
      setC(INK, "text");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const dl = doc.splitTextToSize(day.description, mainW);
      doc.text(dl, mainX, y + 3);
      y += dl.length * 5 + 4;
    }

    y += 2;

    // Timeline de atividades
    for (let i = 0; i < day.activities.length; i++) {
      const a = day.activities[i];
      const next = day.activities[i + 1];

      // Estima altura
      doc.setFont("helvetica", "bold"); doc.setFontSize(11);
      const timeStr = a.time ? a.time.slice(0, 5) : "";
      const headerText = a.name;
      const headerLines = doc.splitTextToSize(headerText, mainW - 14);
      let blockH = 4 + headerLines.length * 5.2;
      if (a.address) {
        doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
        const al = doc.splitTextToSize(a.address, mainW - 14);
        blockH += al.length * 4;
      }
      if (a.description) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
        const dl2 = doc.splitTextToSize(a.description, mainW - 14);
        blockH += dl2.length * 4.5 + 2;
      }
      blockH += 5;

      // Quebra de página se necessário
      if (y + blockH > H - 18) {
        // rodapé nesta página
        footerBar();
        doc.addPage();
        // fundo + logo + retomada
        setC(CREAM, "fill");
        doc.rect(0, 0, W, H, "F");
        drawLogo(W / 2, 6, 20);
        setC(ORANGE, "fill");
        const cbW = 40, cbH = 9;
        doc.roundedRect(M, 14, cbW, cbH, 1.8, 1.8, "F");
        setC(WHITE, "text");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`DIA ${day.day_number} (cont.)`, M + cbW / 2, 14 + cbH / 2 + 1.4, { align: "center" });
        y = 32;
      }

      // Bullet + linha vertical (dentro coluna principal)
      const bulletX = mainX + 3.5;
      setC(WHITE, "fill");
      doc.circle(bulletX, y + 3.2, 2.6, "F");
      setC(ORANGE, "draw");
      doc.setLineWidth(0.9);
      doc.circle(bulletX, y + 3.2, 2.6, "S");
      setC(ORANGE, "fill");
      doc.circle(bulletX, y + 3.2, 1.2, "F");
      if (next) {
        setC(ORANGE, "draw");
        doc.setLineWidth(0.4);
        doc.line(bulletX, y + 6.5, bulletX, y + blockH + 2);
      }

      const bodyX = mainX + 10;
      const bodyW = mainW - 12;

      // Hora (laranja) + nome (navy)
      setC(ORANGE, "text");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const timeW = timeStr ? doc.getTextWidth(timeStr) + 2.5 : 0;
      if (timeStr) doc.text(timeStr, bodyX, y + 4);
      setC(NAVY, "text");
      const nameLines = doc.splitTextToSize(a.name, bodyW - timeW);
      doc.text(nameLines, bodyX + timeW, y + 4);
      let localY = y + 4 + nameLines.length * 5.2;

      if (a.address) {
        setC(MUTED, "text");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8.5);
        const al = doc.splitTextToSize(a.address, bodyW);
        doc.text(al, bodyX, localY);
        localY += al.length * 4;
      }

      if (a.description) {
        setC(INK, "text");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        const dl2 = doc.splitTextToSize(a.description, bodyW);
        doc.text(dl2, bodyX, localY + 1);
        localY += dl2.length * 4.5 + 1;
      }

      y = localY + 3;

      // Rota até próximo
      if (next) {
        const mode = (a.transport_mode_to_next ?? data.defaultTransport);
        if (mode !== "hidden") {
          const r = day.routes.find((rr) => rr.from_activity_id === a.id && rr.to_activity_id === next.id);
          const { dur, dist } = routeStats(r, mode as "driving" | "transit" | "walking");
          if (dur || dist) {
            const modeLabel = mode === "driving" ? "Carro" : mode === "transit" ? "Transporte público" : "A pé";
            setC(MUTED, "text");
            doc.setFont("helvetica", "italic");
            doc.setFontSize(8);
            doc.text(`→ ${modeLabel} · ${[dur, dist].filter(Boolean).join(" · ")}`, bodyX, y);
            y += 4;
          }
        }
        y += 3;
      }
    }

    if (day.activities.length === 0) {
      setC(MUTED, "text");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text("Dia livre. Aproveite para descansar ou explorar sem pressa.", mainX, y);
    }

    // ---- Dica Viaggiari (largura total, ao fim do dia) ----
    const tip = TIPS[(day.day_number - 1) % TIPS.length];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const tipLines = doc.splitTextToSize(tip, mainW - 8);
    const tipH = 14 + tipLines.length * 4.5;
    if (y + tipH > H - 18) {
      footerBar();
      doc.addPage();
      setC(CREAM, "fill");
      doc.rect(0, 0, W, H, "F");
      drawLogo(W / 2, 6, 20);
      y = 30;
    } else {
      y += 4;
    }
    setC(ORANGE_SOFT, "fill");
    setC(ORANGE, "draw");
    doc.setLineWidth(0.4);
    doc.roundedRect(mainX, y, mainW, tipH, 2, 2, "FD");
    setC(ORANGE, "text");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("DICA VIAGGIARI", mainX + 4, y + 6);
    setC(INK, "text");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(tipLines, mainX + 4, y + 12);


    footerBar();
  }

  const safeTitle = data.tripTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "roteiro";
  doc.save(`roteiro-${safeTitle}.pdf`);
}
