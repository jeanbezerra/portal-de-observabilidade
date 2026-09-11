export type HostingType = "on-premises" | "aws" | "azure" | "gcp" | "hibrido";
export type EnvironmentName = "Desenvolvimento" | "Homologação" | "Produção";
export type BusinessVertical =
  | "Holding"
  | "Porto Seguros"
  | "Porto Bank"
  | "Porto Serviços"
  | "Porto Saúde";
export type LegacyInstrumentationType =
  | "productive-system"
  | "ongoing-project"
  | "addition";
export type RequestType = "new-instrumentation" | "addition";
export type SystemStage = "project" | "production";

export interface QuoteDraft {
  requesterName: string;
  requesterEmail: string;
  managerName: string;
  managerEmail: string;
  department: string;
  costCenter: string;
  businessVertical: BusinessVertical | "";
  productName: string;
  squadName: string;
  requestType: RequestType | "";
  systemStage: SystemStage | "";
  systemName: string;
  sdmCategoryName: string;
  // Campos legados mantidos para leitura de orçamentos já salvos.
  instrumentationType?: LegacyInstrumentationType | "";
  initiativeStage?: SystemStage | "";
  targetName?: string;
  projectName?: string;
  parentOrderId: string;
  hosting: HostingType;
  environments: EnvironmentName[];
  hosts: number;
  kubernetesClusters: number;
  nodesPerCluster: number;
  rumEnabled: boolean;
  rumApplications: number;
  rumSessionsThousands: number;
  serverlessEnabled: boolean;
  serverlessFunctions: number;
  logsEnabled: boolean;
  logsGbPerDay: number;
  syntheticsEnabled: boolean;
  syntheticMonitors: number;
}

export interface EstimateLine {
  id: string;
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  monthlyTotal: number;
}

export interface QuoteEstimate {
  lines: EstimateLine[];
  monthlyTotal: number;
  annualTotal: number;
}

export const priceNotice =
  "Estimativa interna demonstrativa para validação do fluxo. Não representa a tabela comercial oficial do Dynatrace e deverá ser revisada pela equipe responsável.";

export const initialQuote: QuoteDraft = {
  requesterName: "",
  requesterEmail: "",
  managerName: "",
  managerEmail: "",
  department: "",
  costCenter: "",
  businessVertical: "",
  productName: "",
  squadName: "",
  requestType: "",
  systemStage: "",
  systemName: "",
  sdmCategoryName: "",
  parentOrderId: "",
  hosting: "on-premises",
  environments: ["Produção"],
  hosts: 0,
  kubernetesClusters: 0,
  nodesPerCluster: 0,
  rumEnabled: false,
  rumApplications: 0,
  rumSessionsThousands: 0,
  serverlessEnabled: false,
  serverlessFunctions: 0,
  logsEnabled: false,
  logsGbPerDay: 0,
  syntheticsEnabled: false,
  syntheticMonitors: 0,
};

const demonstrativeRates = {
  host: 425,
  kubernetesNode: 310,
  rumApplication: 180,
  rumThousandSessions: 12,
  serverlessFunction: 25,
  logsGbPerDay: 55.5,
  syntheticMonitor: 95,
} as const;

export function calculateEstimate(draft: QuoteDraft): QuoteEstimate {
  const lines: EstimateLine[] = [];

  if (draft.hosts > 0) {
    lines.push({
      id: "hosts",
      label: "Monitoramento de hosts",
      quantity: draft.hosts,
      unit: "host",
      unitPrice: demonstrativeRates.host,
      monthlyTotal: draft.hosts * demonstrativeRates.host,
    });
  }

  const kubernetesNodes = draft.kubernetesClusters * draft.nodesPerCluster;
  if (kubernetesNodes > 0) {
    lines.push({
      id: "kubernetes",
      label: "Nós Kubernetes monitorados",
      quantity: kubernetesNodes,
      unit: "nó",
      unitPrice: demonstrativeRates.kubernetesNode,
      monthlyTotal: kubernetesNodes * demonstrativeRates.kubernetesNode,
    });
  }

  if (draft.rumEnabled && draft.rumApplications > 0) {
    lines.push({
      id: "rum-applications",
      label: "Aplicações com RUM",
      quantity: draft.rumApplications,
      unit: "aplicação",
      unitPrice: demonstrativeRates.rumApplication,
      monthlyTotal: draft.rumApplications * demonstrativeRates.rumApplication,
    });
  }

  if (draft.rumEnabled && draft.rumSessionsThousands > 0) {
    lines.push({
      id: "rum-sessions",
      label: "Sessões RUM",
      quantity: draft.rumSessionsThousands,
      unit: "mil sessões",
      unitPrice: demonstrativeRates.rumThousandSessions,
      monthlyTotal:
        draft.rumSessionsThousands * demonstrativeRates.rumThousandSessions,
    });
  }

  if (draft.serverlessEnabled && draft.serverlessFunctions > 0) {
    lines.push({
      id: "serverless",
      label: "Funções serverless monitoradas",
      quantity: draft.serverlessFunctions,
      unit: "função",
      unitPrice: demonstrativeRates.serverlessFunction,
      monthlyTotal:
        draft.serverlessFunctions * demonstrativeRates.serverlessFunction,
    });
  }

  if (draft.logsEnabled && draft.logsGbPerDay > 0) {
    lines.push({
      id: "logs",
      label: "Ingestão de logs",
      quantity: draft.logsGbPerDay,
      unit: "GB/dia",
      unitPrice: demonstrativeRates.logsGbPerDay,
      monthlyTotal: draft.logsGbPerDay * demonstrativeRates.logsGbPerDay,
    });
  }

  if (draft.syntheticsEnabled && draft.syntheticMonitors > 0) {
    lines.push({
      id: "synthetics",
      label: "Monitores sintéticos",
      quantity: draft.syntheticMonitors,
      unit: "monitor",
      unitPrice: demonstrativeRates.syntheticMonitor,
      monthlyTotal:
        draft.syntheticMonitors * demonstrativeRates.syntheticMonitor,
    });
  }

  const monthlyTotal = lines.reduce(
    (total, line) => total + line.monthlyTotal,
    0,
  );

  return {
    lines,
    monthlyTotal,
    annualTotal: monthlyTotal * 12,
  };
}

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);

export const formatDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T00:00:00`))
    : "—";

export const hostingLabels: Record<HostingType, string> = {
  "on-premises": "Datacenter próprio",
  aws: "Amazon Web Services (AWS)",
  azure: "Microsoft Azure",
  gcp: "Google Cloud Platform (GCP)",
  hibrido: "Ambiente híbrido",
};

export const businessVerticals: BusinessVertical[] = [
  "Holding",
  "Porto Seguros",
  "Porto Bank",
  "Porto Serviços",
  "Porto Saúde",
];

export const requestTypeLabels: Record<RequestType, string> = {
  "new-instrumentation": "Nova instrumentação",
  addition: "Adição a orçamento aprovado",
};

export const systemStageLabels: Record<SystemStage, string> = {
  project: "Em fase de projeto",
  production: "Em produção",
};
