import { jsPDF } from "jspdf";

import type { StoredOrder } from "./order-storage";
import {
  formatCurrency,
  hostingLabels,
  priceNotice,
  requestTypeLabels,
  systemStageLabels,
} from "./quote-model";

async function loadLogoAsPng() {
  const image = new Image();
  image.src = "/porto.svg";
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = 650;
  canvas.height = 112;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Não foi possível preparar a marca para o PDF.");
  }
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export async function downloadOrderPdf(order: StoredOrder) {
  const documentPdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = documentPdf.internal.pageSize.getWidth();
  const pageHeight = documentPdf.internal.pageSize.getHeight();
  const left = 18;
  const right = pageWidth - 18;
  let y = 20;
  const requestType = order.draft.requestType;
  const requestTypeLabel = requestType
    ? requestTypeLabels[requestType]
    : "Não informado";
  const systemStage = order.draft.systemStage;
  const systemStageLabel = systemStage
    ? systemStageLabels[systemStage]
    : "Não informado";
  const parentOrderId =
    order.parentOrderId ?? order.draft.parentOrderId?.trim() ?? "";

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - 18) {
      return;
    }
    documentPdf.addPage();
    y = 20;
  };

  documentPdf.setFillColor(0, 161, 252);
  documentPdf.rect(0, 0, pageWidth, 7, "F");

  try {
    const logo = await loadLogoAsPng();
    documentPdf.addImage(logo, "PNG", left, y, 48, 8.3);
  } catch {
    documentPdf.setTextColor(0, 108, 189);
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(16);
    documentPdf.text("PORTO", left, y + 6);
  }

  documentPdf.setTextColor(36, 36, 36);
  documentPdf.setFont("helvetica", "normal");
  documentPdf.setFontSize(9);
  documentPdf.text("Portal de Observabilidade", right, y + 3, {
    align: "right",
  });
  y += 20;

  documentPdf.setFont("helvetica", "bold");
  documentPdf.setFontSize(18);
  documentPdf.text("ORÇAMENTO DE OBSERVABILIDADE", left, y);
  y += 8;
  documentPdf.setFontSize(11);
  documentPdf.setTextColor(79, 79, 79);
  documentPdf.text(`${order.id}  |  Status: ${order.status}`, left, y);
  y += 12;

  const section = (title: string) => {
    ensureSpace(16);
    documentPdf.setTextColor(36, 36, 36);
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setFontSize(12);
    documentPdf.text(title, left, y);
    y += 6;
  };

  const row = (label: string, value: string) => {
    documentPdf.setFontSize(9.5);
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setTextColor(79, 79, 79);
    documentPdf.setFont("helvetica", "normal");
    const lines = documentPdf.splitTextToSize(value || "—", 120) as string[];
    const height = Math.max(6, lines.length * 5);
    ensureSpace(height);
    documentPdf.setFont("helvetica", "bold");
    documentPdf.setTextColor(79, 79, 79);
    documentPdf.text(`${label}:`, left, y);
    documentPdf.setFont("helvetica", "normal");
    documentPdf.setTextColor(36, 36, 36);
    documentPdf.text(lines, left + 42, y);
    y += height;
  };

  const codeLine = (value: string) => {
    const lines = documentPdf.splitTextToSize(value, right - left - 8) as string[];
    ensureSpace(lines.length * 4.5 + 5);
    documentPdf.setFillColor(247, 247, 247);
    documentPdf.roundedRect(
      left,
      y - 3.5,
      right - left,
      lines.length * 4.5 + 3,
      1,
      1,
      "F",
    );
    documentPdf.setFont("courier", "normal");
    documentPdf.setFontSize(8);
    documentPdf.setTextColor(36, 36, 36);
    documentPdf.text(lines, left + 4, y);
    y += lines.length * 4.5 + 4;
  };

  section("Solicitação");
  row("Solicitante", order.draft.requesterName);
  row("E-mail", order.draft.requesterEmail);
  row("Gestor", order.draft.managerName);
  row("E-mail do gestor", order.draft.managerEmail);
  row("Área", order.draft.department);
  row("Centro de custo", order.draft.costCenter);
  row("Vertical de negócio", order.draft.businessVertical);
  row("Produto", order.draft.productName);
  if (order.draft.squadName.trim()) {
    row("Squad", order.draft.squadName);
  }
  row("Tipo de solicitação", requestTypeLabel);
  row("Estágio do sistema", systemStageLabel);
  row("Nome do sistema", order.draft.systemName);
  row("Categoria (Porto SDM)", order.draft.sdmCategoryName);
  if (parentOrderId) {
    row("Orçamento anterior", parentOrderId);
  }
  y += 3;

  section("Tags e campos de rastreabilidade");
  if (order.tagPlan) {
    const plan = order.tagPlan;
    const { anomalyDetection, costAllocation, dashboard, rum } =
      plan.conventions;

    row("Manifesto", plan.schema);
    row("Taxonomia", `Versão ${plan.version}`);
    for (const tag of plan.tags) {
      codeLine(`${tag.key}=${tag.value}`);
    }
    codeLine(`${plan.instrumentationTag.key}=${plan.instrumentationTag.value}`);
    row(
      "ID de instrumentação",
      `Formato ${plan.instrumentationTag.format}; tipos de alvo: ${plan.instrumentationTag.targetTypes.join(", ")}. O valor final é gerado após a aprovação, por alvo lógico.`,
    );
    for (const environment of plan.environments) {
      codeLine(`${plan.environmentTag.key}=${environment.value}`);
    }
    row(
      "Orientação",
      "Aplique um conjunto de tags por ambiente. Os identificadores nativos dos recursos e das configurações Dynatrace devem ser registrados junto ao orçamento após o provisionamento.",
    );

    section("Convenções Dynatrace persistidas");
    row("RUM Web — frontend.name", rum.webFrontendName);
    row("RUM Mobile — frontend.name", rum.mobileFrontendName);
    row("Padrão para frontends adicionais", rum.additionalFrontendNamePattern);
    row("Campo primário para filtro RUM", rum.primaryFilterField);
    row("Identificador estável do frontend", rum.stableIdField);
    row(
      "Identificador experimental RUM",
      rum.experimentalInstrumentationIdField,
    );
    row(
      "Orientação RUM",
      "Registre os valores nativos dos identificadores depois do provisionamento. O ID do orçamento não substitui o Application ID do RUM.",
    );

    row("Label do dashboard", dashboard.label);
    row("Filtro para telemetria enriquecida", dashboard.enrichedTelemetryFilter);
    row("Campos de filtro RUM", dashboard.rumFilterFields.join(" ou "));
    row(
      "Orientação de dashboard",
      "Registre também o Document ID. A label organiza o documento, mas não filtra os dados dos tiles.",
    );

    row("Anomaly Detection — source", anomalyDetection.source);
    row("Anomaly Detection — externalId", anomalyDetection.externalId);
    codeLine(
      `${anomalyDetection.eventPropertyKey}=${anomalyDetection.eventPropertyValue}`,
    );
    row(
      "Orientação de detector",
      "Registre também o Settings objectId gerado pelo Dynatrace.",
    );

    section("Pendência de rateio DPS");
    row(
      "Situação",
      "Produto e centro de custo aguardam validação nas allowlists vigentes do DPS. Não publique valores normalizados nessas chaves.",
    );
    row("Produto solicitado", costAllocation.requestedProduct);
    row("Chave canônica de produto", costAllocation.productKey);
    row("Centro de custo solicitado", costAllocation.requestedCostCenter);
    row("Chave canônica de centro de custo", costAllocation.costCenterKey);
  } else {
    row(
      "Manifesto",
      "Tags não registradas neste orçamento legado.",
    );
  }
  y += 3;

  section("Escopo técnico");
  row("Hospedagem", hostingLabels[order.draft.hosting]);
  row("Ambientes", order.draft.environments.join(", "));
  row("Hosts", String(order.draft.hosts));
  row("Clusters Kubernetes", String(order.draft.kubernetesClusters));
  row("Nós por cluster", String(order.draft.nodesPerCluster));
  y += 3;

  section("Estimativa mensal demonstrativa");
  if (order.estimate.lines.length === 0) {
    row("Itens", "Nenhum item calculável foi selecionado.");
  } else {
    for (const line of order.estimate.lines) {
      row(
        line.label,
        `${line.quantity} ${line.unit} × ${formatCurrency(line.unitPrice)} = ${formatCurrency(line.monthlyTotal)}`,
      );
    }
  }

  ensureSpace(22);
  y += 3;
  documentPdf.setDrawColor(200, 200, 200);
  documentPdf.line(left, y, right, y);
  y += 7;
  documentPdf.setFont("helvetica", "bold");
  documentPdf.setFontSize(11);
  documentPdf.setTextColor(36, 36, 36);
  documentPdf.text(
    `Total mensal: ${formatCurrency(order.estimate.monthlyTotal)}`,
    right,
    y,
    { align: "right" },
  );
  y += 6;
  documentPdf.text(
    `Projeção anual: ${formatCurrency(order.estimate.annualTotal)}`,
    right,
    y,
    { align: "right" },
  );
  y += 12;

  ensureSpace(28);
  documentPdf.setFillColor(245, 245, 245);
  const noticeLines = documentPdf.splitTextToSize(priceNotice, 164) as string[];
  documentPdf.roundedRect(left, y - 4, right - left, noticeLines.length * 4.5 + 10, 2, 2, "F");
  documentPdf.setFont("helvetica", "normal");
  documentPdf.setFontSize(8.5);
  documentPdf.setTextColor(79, 79, 79);
  documentPdf.text(noticeLines, left + 4, y + 2);

  const pages = documentPdf.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    documentPdf.setPage(page);
    documentPdf.setFontSize(8);
    documentPdf.setTextColor(115, 115, 115);
    documentPdf.text(
      `Gerado em ${new Date(order.createdAt).toLocaleString("pt-BR")}  •  Página ${page} de ${pages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: "center" },
    );
  }

  documentPdf.save(`${order.id}.pdf`);
}
