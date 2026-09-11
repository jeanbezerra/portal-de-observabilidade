import type { EnvironmentName, QuoteDraft } from "./quote-model";

export const tagTaxonomyVersion = "1.0";
export const instrumentationIdPlaceholder = "<instrumentation-id>";
export const tagPlanSchema = "porto-observability/dynatrace-tags";
export const corporateRuntimeAttributeLimit = 12;
export const oneAgentRuntimeTagLimit = 20;
const supportedTagTaxonomyVersions = new Set(["1.0"]);
const quoteIdPattern = /^ORC-\d{8}-[A-Z0-9]{10}$/;
const portableRuntimeValuePattern = /^[A-Za-z0-9._:/<>-]+$/;
const allowedRuntimeTagKeys = new Set([
  "primary_tags.observability_quote_id",
  "primary_tags.business_unit",
  "primary_tags.product",
  "primary_tags.application",
  "primary_tags.system_lifecycle",
  "primary_tags.team",
  "primary_tags.sdm_category",
]);
const requiredRuntimeTagKeys = [
  "primary_tags.observability_quote_id",
  "primary_tags.business_unit",
  "primary_tags.product",
  "primary_tags.application",
  "primary_tags.system_lifecycle",
  "primary_tags.sdm_category",
] as const;

export type TraceabilityTagCategory =
  | "correlation"
  | "organization"
  | "ownership"
  | "cost";

export interface TraceabilityTag {
  key: string;
  value: string;
  label: string;
  source: string;
  purpose: string;
  category: TraceabilityTagCategory;
  immutable: boolean;
}

export interface TraceabilityEnvironment {
  label: EnvironmentName;
  value: string;
}

export interface InstrumentationTagTemplate extends TraceabilityTag {
  format: string;
  targetTypes: string[];
}

export interface EnvironmentTagTemplate {
  key: string;
  value: string;
  label: string;
  source: string;
  purpose: string;
}

export interface QuoteObjectConventions {
  rum: {
    webFrontendName: string;
    mobileFrontendName: string;
    additionalFrontendNamePattern: string;
    primaryFilterField: "frontend.name";
    stableIdField: "dt.smartscape.frontend";
    experimentalInstrumentationIdField: "dt.rum.instrumentation.id";
  };
  dashboard: {
    label: string;
    enrichedTelemetryFilter: string;
    rumFilterFields: ["frontend.name", "dt.smartscape.frontend"];
  };
  anomalyDetection: {
    source: "portal-observabilidade";
    externalId: string;
    eventPropertyKey: "observability.quote.id";
    eventPropertyValue: string;
  };
  costAllocation: {
    requestedProduct: string;
    requestedCostCenter: string;
    status: "requires-dps-allowlist-validation";
    productKey: "dt.cost.product";
    costCenterKey: "dt.cost.costcenter";
  };
}

export interface QuoteTagPlan {
  schema: string;
  version: string;
  orderId: string;
  tags: TraceabilityTag[];
  instrumentationTag: InstrumentationTagTemplate;
  environmentTag: EnvironmentTagTemplate;
  environments: TraceabilityEnvironment[];
  runtimeAttributeCount: number;
  conventions: QuoteObjectConventions;
}

const environmentValues: Record<EnvironmentName, string> = {
  Desenvolvimento: "development",
  Homologação: "staging",
  Produção: "production",
};

function hashValue(value: string) {
  let hash = 5381;
  for (const character of value) {
    hash = (hash * 33) ^ character.charCodeAt(0);
  }
  return (hash >>> 0).toString(36).padStart(6, "0").slice(-6);
}

/**
 * Produces a portable value for OneAgent, OpenTelemetry and Kubernetes.
 * The 63-character ceiling is a corporate portability policy, not a general
 * Dynatrace value limit. Display names remain untouched in the order.
 */
export function normalizeTagValue(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (normalized.length <= 63) {
    return normalized;
  }

  const suffix = hashValue(normalized);
  const prefix = normalized.slice(0, 56).replace(/-+$/g, "");
  return `${prefix}-${suffix}`;
}

function createTag(
  tag: Omit<TraceabilityTag, "value"> & {
    value: string;
    preserveValue?: boolean;
  },
): TraceabilityTag {
  const { preserveValue, ...traceabilityTag } = tag;
  return {
    ...traceabilityTag,
    value: preserveValue ? tag.value.trim() : normalizeTagValue(tag.value),
  };
}

export function createQuoteTagPlan(
  draft: QuoteDraft,
  orderId: string,
): QuoteTagPlan {
  const tags: TraceabilityTag[] = [
    createTag({
      key: "primary_tags.observability_quote_id",
      value: orderId,
      preserveValue: true,
      label: "Orçamento",
      source: "Identificador do rascunho, confirmado no envio",
      purpose: "Correlação imutável entre o orçamento e o recurso instrumentado.",
      category: "correlation",
      immutable: true,
    }),
  ];

  tags.push(
    createTag({
      key: "primary_tags.business_unit",
      value: draft.businessVertical,
      label: "Vertical de negócio",
      source: "Vertical de negócio",
      purpose: "Segmentação organizacional consistente em todos os sinais.",
      category: "organization",
      immutable: false,
    }),
    createTag({
      key: "primary_tags.product",
      value: draft.productName,
      label: "Produto",
      source: "Produto",
      purpose: "Contexto de negócio; não substitui o valor canônico de rateio DPS.",
      category: "organization",
      immutable: false,
    }),
    createTag({
      key: "primary_tags.application",
      value: draft.systemName,
      label: "Sistema",
      source: "Nome do sistema",
      purpose: "Agrupa recursos e sinais pertencentes ao mesmo sistema.",
      category: "organization",
      immutable: false,
    }),
    createTag({
      key: "primary_tags.system_lifecycle",
      value: draft.systemStage,
      label: "Estágio",
      source: "Estágio do sistema",
      purpose: "Distingue sistemas em projeto de sistemas em produção.",
      category: "organization",
      immutable: false,
    }),
  );

  if (draft.squadName.trim()) {
    tags.push(
      createTag({
        key: "primary_tags.team",
        value: draft.squadName,
        label: "Squad",
        source: "Nome da squad",
        purpose: "Identifica o time responsável para segmentação e roteamento.",
        category: "ownership",
        immutable: false,
      }),
    );
  }

  tags.push(
    createTag({
      key: "primary_tags.sdm_category",
      value: draft.sdmCategoryName,
      label: "Categoria Porto SDM",
      source: "Nome da categoria (Porto SDM)",
      purpose: "Relaciona eventos e alarmes ao catálogo operacional.",
      category: "ownership",
      immutable: false,
    }),
  );

  const normalizedQuoteId = normalizeTagValue(orderId);
  const application =
    tags.find((tag) => tag.key === "primary_tags.application")?.value ??
    "system";
  const instrumentationTag: InstrumentationTagTemplate = {
    key: "primary_tags.instrumentation_id",
    value: instrumentationIdPlaceholder,
    label: "Escopo de instrumentação",
    source: "Gerado após a aprovação",
    purpose:
      "Identifica cada alvo lógico aprovado; nunca um pod, processo ou instância efêmera.",
    category: "correlation",
    immutable: true,
    format: "INS-AAAAMMDD-SUFIXO-TIPO-NNN",
    targetTypes: [
      "HOST",
      "K8S",
      "AG",
      "LAMBDA",
      "AZFUNC",
      "RUMWEB",
      "RUMMOBILE",
    ],
  };
  const environmentTag: EnvironmentTagTemplate = {
    key: "primary_tags.environment",
    value: "<environment>",
    label: "Ambiente do recurso",
    source: "Infraestrutura",
    purpose: "Distingue development, staging e production no alvo instrumentado.",
  };
  const conventions: QuoteObjectConventions = {
    rum: {
      webFrontendName: `${application}-web`,
      mobileFrontendName: `${application}-mobile`,
      additionalFrontendNamePattern:
        `${application}-<channel>-<frontend-slug>`,
      primaryFilterField: "frontend.name",
      stableIdField: "dt.smartscape.frontend",
      experimentalInstrumentationIdField: "dt.rum.instrumentation.id",
    },
    dashboard: {
      label: `quote-${normalizedQuoteId}`,
      enrichedTelemetryFilter: `| filter primary_tags.observability_quote_id == "${orderId}"`,
      rumFilterFields: ["frontend.name", "dt.smartscape.frontend"],
    },
    anomalyDetection: {
      source: "portal-observabilidade",
      externalId: `portal-observabilidade/${normalizedQuoteId}/anomaly/<detector-slug>`,
      eventPropertyKey: "observability.quote.id",
      eventPropertyValue: orderId,
    },
    costAllocation: {
      requestedProduct: draft.productName.trim(),
      requestedCostCenter: draft.costCenter.trim(),
      status: "requires-dps-allowlist-validation",
      productKey: "dt.cost.product",
      costCenterKey: "dt.cost.costcenter",
    },
  };

  return {
    schema: tagPlanSchema,
    version: tagTaxonomyVersion,
    orderId,
    tags,
    instrumentationTag,
    environmentTag,
    environments: draft.environments.map((environment) => ({
      label: environment,
      value: environmentValues[environment],
    })),
    runtimeAttributeCount: tags.length + 2,
    conventions,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isValidRuntimePair(key: unknown, value: unknown) {
  return (
    isNonEmptyString(key) &&
    key.length <= 50 &&
    /^(?:primary_tags|dt\.cost)\.[a-z][a-z0-9_]*$/.test(key) &&
    !key.startsWith("#") &&
    isNonEmptyString(value) &&
    portableRuntimeValuePattern.test(value) &&
    `${key}=${value}`.length <= 256
  );
}

/** Validates a submitted manifest before it crosses the storage boundary. */
export function isValidQuoteTagPlan(
  value: unknown,
  expectedOrderId?: string,
): value is QuoteTagPlan {
  if (!isRecord(value)) return false;
  if (
    value.schema !== tagPlanSchema ||
    !isNonEmptyString(value.version) ||
    !supportedTagTaxonomyVersions.has(value.version) ||
    !isNonEmptyString(value.orderId) ||
    !quoteIdPattern.test(value.orderId) ||
    (expectedOrderId !== undefined && value.orderId !== expectedOrderId) ||
    !Array.isArray(value.tags) ||
    value.tags.length === 0 ||
    !isRecord(value.instrumentationTag) ||
    !isRecord(value.environmentTag) ||
    !Array.isArray(value.environments) ||
    !isRecord(value.conventions)
  ) {
    return false;
  }

  const tagsAreValid = value.tags.every(
    (tag) =>
      isRecord(tag) &&
      typeof tag.key === "string" &&
      allowedRuntimeTagKeys.has(tag.key) &&
      isValidRuntimePair(tag.key, tag.value) &&
      (tag.key === "primary_tags.observability_quote_id"
        ? tag.value === value.orderId
        : typeof tag.value === "string" &&
          tag.value.length <= 63 &&
          normalizeTagValue(tag.value) === tag.value) &&
      isNonEmptyString(tag.label) &&
      isNonEmptyString(tag.source) &&
      isNonEmptyString(tag.purpose) &&
      ["correlation", "organization", "ownership", "cost"].includes(
        String(tag.category),
      ) &&
      typeof tag.immutable === "boolean",
  );
  const instrumentationTag = value.instrumentationTag;
  const targetTypes = Array.isArray(instrumentationTag.targetTypes)
    ? instrumentationTag.targetTypes
    : [];
  const instrumentationIsValid =
    instrumentationTag.key === "primary_tags.instrumentation_id" &&
    instrumentationTag.value === instrumentationIdPlaceholder &&
    instrumentationTag.label === "Escopo de instrumentação" &&
    instrumentationTag.source === "Gerado após a aprovação" &&
    isNonEmptyString(instrumentationTag.purpose) &&
    instrumentationTag.category === "correlation" &&
    instrumentationTag.immutable === true &&
    instrumentationTag.format === "INS-AAAAMMDD-SUFIXO-TIPO-NNN" &&
    targetTypes.length === 7 &&
    new Set(targetTypes).size === targetTypes.length &&
    ["HOST", "K8S", "AG", "LAMBDA", "AZFUNC", "RUMWEB", "RUMMOBILE"].every(
      (targetType) => targetTypes.includes(targetType),
    ) &&
    isValidRuntimePair(
      instrumentationTag.key,
      instrumentationTag.value,
    );
  const environmentIsValid =
    value.environmentTag.key === "primary_tags.environment" &&
    value.environmentTag.value === "<environment>" &&
    value.environmentTag.label === "Ambiente do recurso" &&
    value.environmentTag.source === "Infraestrutura" &&
    isNonEmptyString(value.environmentTag.purpose) &&
    value.environments.length > 0 &&
    value.environments.every(
      (environment) =>
        isRecord(environment) &&
        typeof environment.label === "string" &&
        ["Desenvolvimento", "Homologação", "Produção"].includes(
          environment.label,
        ) &&
        typeof environment.value === "string" &&
        environmentValues[environment.label as EnvironmentName] ===
          environment.value,
    ) &&
    new Set(
      value.environments.map((environment) =>
        isRecord(environment) ? environment.label : undefined,
      ),
    ).size === value.environments.length;
  const keys = [
    ...value.tags.map((tag) => (isRecord(tag) ? String(tag.key) : "")),
    String(value.instrumentationTag.key),
    String(value.environmentTag.key),
  ];
  const quoteTag = value.tags.find(
    (tag) =>
      isRecord(tag) && tag.key === "primary_tags.observability_quote_id",
  );
  const applicationTag = value.tags.find(
    (tag) => isRecord(tag) && tag.key === "primary_tags.application",
  );
  const applicationValue =
    isRecord(applicationTag) && typeof applicationTag.value === "string"
      ? applicationTag.value
      : "";
  const normalizedQuoteId = normalizeTagValue(value.orderId);

  const conventions = value.conventions;
  const rum = isRecord(conventions.rum) ? conventions.rum : null;
  const dashboard = isRecord(conventions.dashboard)
    ? conventions.dashboard
    : null;
  const anomaly = isRecord(conventions.anomalyDetection)
    ? conventions.anomalyDetection
    : null;
  const cost = isRecord(conventions.costAllocation)
    ? conventions.costAllocation
    : null;
  const conventionsAreValid =
    rum?.primaryFilterField === "frontend.name" &&
    rum.stableIdField === "dt.smartscape.frontend" &&
    rum.experimentalInstrumentationIdField === "dt.rum.instrumentation.id" &&
    rum.webFrontendName === `${applicationValue}-web` &&
    rum.mobileFrontendName === `${applicationValue}-mobile` &&
    rum.additionalFrontendNamePattern ===
      `${applicationValue}-<channel>-<frontend-slug>` &&
    dashboard !== null &&
    dashboard.label === `quote-${normalizedQuoteId}` &&
    dashboard.enrichedTelemetryFilter ===
      `| filter primary_tags.observability_quote_id == "${value.orderId}"` &&
    Array.isArray(dashboard.rumFilterFields) &&
    dashboard.rumFilterFields.length === 2 &&
    dashboard.rumFilterFields[0] === "frontend.name" &&
    dashboard.rumFilterFields[1] === "dt.smartscape.frontend" &&
    anomaly?.source === "portal-observabilidade" &&
    anomaly.eventPropertyKey === "observability.quote.id" &&
    anomaly.eventPropertyValue === value.orderId &&
    anomaly.externalId ===
      `portal-observabilidade/${normalizedQuoteId}/anomaly/<detector-slug>` &&
    cost?.status === "requires-dps-allowlist-validation" &&
    cost.productKey === "dt.cost.product" &&
    cost.costCenterKey === "dt.cost.costcenter" &&
    isNonEmptyString(cost.requestedProduct) &&
    cost.requestedProduct.length <= 200 &&
    isNonEmptyString(cost.requestedCostCenter) &&
    cost.requestedCostCenter.length <= 200;

  return (
    tagsAreValid &&
    instrumentationIsValid &&
    environmentIsValid &&
    new Set(keys).size === keys.length &&
    requiredRuntimeTagKeys.every((key) => keys.includes(key)) &&
    isRecord(quoteTag) &&
    quoteTag.value === value.orderId &&
    value.runtimeAttributeCount === value.tags.length + 2 &&
    value.runtimeAttributeCount <= corporateRuntimeAttributeLimit &&
    value.runtimeAttributeCount <= oneAgentRuntimeTagLimit &&
    conventionsAreValid
  );
}

export function getTagsForEnvironment(
  plan: QuoteTagPlan,
  environment = plan.environmentTag.value,
) {
  if (
    environment !== plan.environmentTag.value &&
    !plan.environments.some((item) => item.value === environment)
  ) {
    throw new Error("O ambiente informado não pertence ao orçamento.");
  }

  return [
    ...plan.tags.map(({ key, value }) => ({ key, value })),
    {
      key: plan.instrumentationTag.key,
      value: plan.instrumentationTag.value,
    },
    { key: plan.environmentTag.key, value: environment },
  ];
}

export function toOneAgentCtlCommand(plan: QuoteTagPlan) {
  const parameters = getTagsForEnvironment(plan).map(
    ({ key, value }) => `--set-host-tag="${key}=${value}"`,
  );
  const linux = [
    "# Linux / Ubuntu (root)",
    "sudo /opt/dynatrace/oneagent/agent/tools/oneagentctl \\",
    ...parameters.map((parameter) => `  ${parameter} \\`),
    "  --restart-service",
  ];
  const windows = [
    "# Windows PowerShell (Administrador)",
    '& "$env:ProgramFiles\\dynatrace\\oneagent\\agent\\tools\\oneagentctl.exe" `',
    ...parameters.map((parameter) => `  ${parameter} \``),
    "  --restart-service",
  ];
  return [...linux, "", ...windows].join("\n");
}

export function toDtTagsValue(plan: QuoteTagPlan) {
  return getTagsForEnvironment(plan)
    .map(({ key, value }) => `${key}=${value}`)
    .join(" ");
}

export function toOtelResourceAttributes(plan: QuoteTagPlan) {
  const application =
    plan.tags.find((tag) => tag.key === "primary_tags.application")?.value ??
    "system";
  return [
    ...getTagsForEnvironment(plan),
    { key: "service.namespace", value: normalizeTagValue(application) },
    { key: "service.name", value: "<service-name>" },
  ]
    .map(({ key, value }) => `${key}=${value}`)
    .join(",");
}

export function toKubernetesAnnotations(plan: QuoteTagPlan) {
  return getTagsForEnvironment(plan)
    .map(({ key, value }) => `    metadata.dynatrace.com/${key}: "${value}"`)
    .join("\n");
}
