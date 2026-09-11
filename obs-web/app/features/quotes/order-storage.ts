import {
  calculateEstimate,
  type QuoteDraft,
  type QuoteEstimate,
} from "./quote-model";
import {
  createQuoteTagPlan,
  isValidQuoteTagPlan,
  tagTaxonomyVersion,
  type QuoteTagPlan,
} from "./quote-tags";

export interface StoredOrder {
  id: string;
  parentOrderId: string | null;
  provider: "Dynatrace";
  status: "Em revisão";
  createdAt: string;
  draft: QuoteDraft;
  estimate: QuoteEstimate;
  /** Snapshot submitted with the order. Optional only for legacy local orders. */
  tagPlan?: QuoteTagPlan;
}

const storageKey = "portal-observabilidade:pedidos:v1";

function normalizeDraft(draft: QuoteDraft): QuoteDraft {
  const legacyType = draft.instrumentationType;
  const requestType =
    draft.requestType ||
    (legacyType === "addition"
      ? "addition"
      : legacyType
        ? "new-instrumentation"
        : "");
  const systemStage =
    draft.systemStage ||
    draft.initiativeStage ||
    (legacyType === "productive-system"
      ? "production"
      : legacyType === "ongoing-project"
        ? "project"
        : "");

  return {
    ...draft,
    managerName: draft.managerName ?? "",
    managerEmail: draft.managerEmail ?? "",
    businessVertical: draft.businessVertical ?? "",
    productName: draft.productName ?? "",
    squadName: draft.squadName ?? "",
    requestType,
    systemStage,
    systemName: draft.systemName ?? draft.targetName ?? draft.projectName ?? "",
    sdmCategoryName: draft.sdmCategoryName ?? "",
    parentOrderId: draft.parentOrderId ?? "",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSafeDraft(draft: QuoteDraft) {
  const stringFields = [
    "requesterName",
    "requesterEmail",
    "managerName",
    "managerEmail",
    "department",
    "costCenter",
    "businessVertical",
    "productName",
    "squadName",
    "requestType",
    "systemStage",
    "systemName",
    "sdmCategoryName",
    "parentOrderId",
    "hosting",
  ] as const;
  const integerFields = [
    "hosts",
    "kubernetesClusters",
    "nodesPerCluster",
    "rumApplications",
    "serverlessFunctions",
    "syntheticMonitors",
  ] as const;
  const decimalFields = ["rumSessionsThousands", "logsGbPerDay"] as const;
  const booleanFields = [
    "rumEnabled",
    "serverlessEnabled",
    "logsEnabled",
    "syntheticsEnabled",
  ] as const;

  return (
    stringFields.every((key) => typeof draft[key] === "string") &&
    integerFields.every(
      (key) =>
        Number.isFinite(draft[key]) &&
        draft[key] >= 0 &&
        Number.isInteger(draft[key]),
    ) &&
    decimalFields.every(
      (key) => Number.isFinite(draft[key]) && draft[key] >= 0,
    ) &&
    booleanFields.every((key) => typeof draft[key] === "boolean") &&
    Array.isArray(draft.environments) &&
    draft.environments.every((environment) =>
      ["Desenvolvimento", "Homologação", "Produção"].includes(environment),
    ) &&
    ["", "Holding", "Porto Seguros", "Porto Bank", "Porto Serviços", "Porto Saúde"].includes(
      draft.businessVertical,
    ) &&
    ["", "new-instrumentation", "addition"].includes(draft.requestType) &&
    ["", "project", "production"].includes(draft.systemStage) &&
    ["on-premises", "aws", "azure", "gcp", "hibrido"].includes(draft.hosting)
  );
}

function isSafeEstimate(value: unknown): value is QuoteEstimate {
  if (
    !isRecord(value) ||
    !Array.isArray(value.lines) ||
    typeof value.monthlyTotal !== "number" ||
    !Number.isFinite(value.monthlyTotal) ||
    value.monthlyTotal < 0 ||
    typeof value.annualTotal !== "number" ||
    !Number.isFinite(value.annualTotal) ||
    value.annualTotal < 0
  ) {
    return false;
  }

  return value.lines.every(
    (line) =>
      isRecord(line) &&
      ["id", "label", "unit"].every((key) => typeof line[key] === "string") &&
      ["quantity", "unitPrice", "monthlyTotal"].every(
        (key) =>
          typeof line[key] === "number" &&
          Number.isFinite(line[key]) &&
          line[key] >= 0,
      ),
  ) &&
    Math.abs(
      value.lines.reduce(
        (total, line) => total + Number(line.monthlyTotal),
        0,
      ) - value.monthlyTotal,
    ) < 0.001 &&
    Math.abs(value.annualTotal - value.monthlyTotal * 12) < 0.001;
}

function snapshotsMatch(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function readRawOrders(): unknown[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseStoredOrder(value: unknown): StoredOrder | null {
  try {
    if (
      !isRecord(value) ||
      !isRecord(value.draft) ||
      !isSafeEstimate(value.estimate) ||
      typeof value.id !== "string" ||
      value.id.length === 0 ||
      value.provider !== "Dynatrace" ||
      value.status !== "Em revisão" ||
      typeof value.createdAt !== "string" ||
      Number.isNaN(Date.parse(value.createdAt))
    ) {
      return null;
    }

    const draft = normalizeDraft(value.draft as unknown as QuoteDraft);
    if (!isSafeDraft(draft)) return null;
    const parentOrderId =
      typeof value.parentOrderId === "string"
        ? value.parentOrderId
        : draft.parentOrderId.trim();
    const hasTagPlan = value.tagPlan !== undefined;
    if (hasTagPlan && !isValidQuoteTagPlan(value.tagPlan, value.id)) {
      return null;
    }
    const tagPlan = hasTagPlan ? (value.tagPlan as QuoteTagPlan) : undefined;
    if (
      tagPlan &&
      tagPlan.version === tagTaxonomyVersion &&
      !snapshotsMatch(tagPlan, createQuoteTagPlan(draft, value.id))
    ) {
      return null;
    }
    if (!snapshotsMatch(value.estimate, calculateEstimate(draft))) {
      return null;
    }

    return {
      id: value.id,
      parentOrderId: parentOrderId || null,
      provider: value.provider,
      status: value.status,
      createdAt: value.createdAt,
      draft,
      estimate: value.estimate,
      tagPlan,
    };
  } catch {
    return null;
  }
}

export function createOrderId(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const date = `${year}${month}${day}`;
  const randomValue =
    globalThis.crypto?.randomUUID?.().replaceAll("-", "") ??
    `${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  const suffix = randomValue.slice(0, 10).padEnd(10, "0").toUpperCase();
  return `ORC-${date}-${suffix}`;
}

export function loadOrders(): StoredOrder[] {
  return readRawOrders().flatMap((value) => {
    const order = parseStoredOrder(value);
    return order ? [order] : [];
  });
}

export function saveOrder(order: StoredOrder) {
  if (typeof window === "undefined") {
    return;
  }

  if (!order.tagPlan || !isValidQuoteTagPlan(order.tagPlan, order.id)) {
    throw new Error("O manifesto de tags do orçamento é inválido.");
  }
  if (
    !isSafeDraft(order.draft) ||
    !isSafeEstimate(order.estimate) ||
    order.tagPlan.version !== tagTaxonomyVersion ||
    !snapshotsMatch(order.tagPlan, createQuoteTagPlan(order.draft, order.id)) ||
    !snapshotsMatch(order.estimate, calculateEstimate(order.draft))
  ) {
    throw new Error("O orçamento não corresponde aos seus snapshots calculados.");
  }

  // Preserve unrecognized records instead of deleting them during a later save.
  const orders = readRawOrders();
  if (orders.some((item) => isRecord(item) && item.id === order.id)) {
    throw new Error("O identificador deste orçamento já foi utilizado.");
  }
  window.localStorage.setItem(storageKey, JSON.stringify([order, ...orders]));
}
