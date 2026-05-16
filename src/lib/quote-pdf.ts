import jsPDF from "jspdf";

export type QuotePDFData = {
  contactName: string;
  serviceType: string;
  destinations: string[];
  days: number;
  dailyRate: number;
  discount: number;
  total: number;
  notes: string | null;
  shareToken: string;
};

const SERVICE_LABELS: Record<string, string> = {
  roteiro_personalizado: "Roteiro Personalizado",
  aluguel_carro: "Aluguel de Carro",
  hospedagem: "Hospedagem",
  pacote_completo: "Pacote Completo",
  consultoria: "Consultoria",
};

export function generateQuotePDF(data: QuotePDFData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const margin = 18;
  let y = 22;

  // Header band
  doc.setFillColor(107, 157, 194);
  doc.rect(0, 0, W, 38, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Viaggiari Travel", margin, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Assessoria de viagens personalizada", margin, 28);

  y = 50;
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Orçamento de Viagem", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Emitido em ${new Date().toLocaleDateString("pt-BR")}`, margin, y);
  y += 14;

  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold"); doc.text("Cliente:", margin, y);
  doc.setFont("helvetica", "normal"); doc.text(data.contactName, margin + 30, y); y += 7;
  doc.setFont("helvetica", "bold"); doc.text("Serviço:", margin, y);
  doc.setFont("helvetica", "normal"); doc.text(SERVICE_LABELS[data.serviceType] || data.serviceType, margin + 30, y); y += 7;
  doc.setFont("helvetica", "bold"); doc.text("Destinos:", margin, y);
  doc.setFont("helvetica", "normal"); doc.text(data.destinations.join(", ") || "—", margin + 30, y); y += 7;
  doc.setFont("helvetica", "bold"); doc.text("Duração:", margin, y);
  doc.setFont("helvetica", "normal"); doc.text(`${data.days} dia(s)`, margin + 30, y); y += 14;

  // Values box
  doc.setDrawColor(220, 220, 220);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, W - margin * 2, 42, 3, 3, "FD");
  const bx = margin + 6;
  let by = y + 9;
  doc.setFontSize(10); doc.setTextColor(100, 100, 100);
  doc.text("Diária", bx, by);
  doc.text("Dias", bx + 60, by);
  doc.text("Desconto", bx + 100, by);
  doc.text("TOTAL", bx + 140, by);
  by += 8;
  doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
  doc.text(brl(data.dailyRate), bx, by);
  doc.text(String(data.days), bx + 60, by);
  doc.text(brl(data.discount), bx + 100, by);
  doc.setTextColor(107, 157, 194);
  doc.setFontSize(15);
  doc.text(brl(data.total), bx + 140, by);
  by += 12;
  doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(100, 100, 100);
  doc.text("Forma de pagamento sugerida: 50% sinal + 50% até 30 dias antes da viagem.", bx, by);
  y += 52;

  if (data.notes) {
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(20, 20, 20);
    doc.text("Observações", margin, y); y += 6;
    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(data.notes, W - margin * 2);
    doc.text(lines, margin, y);
    y += lines.length * 5 + 6;
  }

  // Footer
  doc.setFontSize(8); doc.setTextColor(140, 140, 140);
  doc.text(`Link público: /orcamento/${data.shareToken}`, margin, 285);
  doc.text("Viaggiari Travel · contato@viaggiari.com.br", margin, 290);

  doc.save(`orcamento-viaggiari-${data.shareToken.slice(0, 8)}.pdf`);
}

function brl(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
}
