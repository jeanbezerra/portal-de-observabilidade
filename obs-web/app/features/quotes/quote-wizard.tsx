import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  Badge,
  Button,
  Card,
  Checkbox,
  Divider,
  Field,
  Input,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  Radio,
  RadioGroup,
  Select,
  shorthands,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowDownloadRegular,
  ArrowLeftRegular,
  ArrowRightRegular,
  CheckmarkCircleFilled,
  CheckmarkRegular,
  ChevronRightRegular,
  CloudRegular,
  CopyRegular,
  DocumentPdfRegular,
  GaugeRegular,
  InfoRegular,
  ServerRegular,
  TagRegular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  createOrderId,
  saveOrder,
  type StoredOrder,
} from "./order-storage";
import {
  calculateEstimate,
  businessVerticals,
  formatCurrency,
  hostingLabels,
  initialQuote,
  priceNotice,
  requestTypeLabels,
  systemStageLabels,
  type BusinessVertical,
  type EnvironmentName,
  type HostingType,
  type QuoteDraft,
  type RequestType,
  type SystemStage,
} from "./quote-model";
import {
  createQuoteTagPlan,
  isValidQuoteTagPlan,
  normalizeTagValue,
  toDtTagsValue,
  toKubernetesAnnotations,
  toOneAgentCtlCommand,
  toOtelResourceAttributes,
  type QuoteTagPlan,
} from "./quote-tags";

const STEP = {
  requester: 0,
  tags: 1,
  infrastructure: 2,
  addons: 3,
  review: 4,
  sent: 5,
} as const;

const steps = [
  "Solicitante",
  "Tags",
  "Infraestrutura",
  "Add-ons",
  "Revisão",
  "Enviado",
] as const;

const useStyles = makeStyles({
  page: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
    width: "100%",
    maxWidth: "1280px",
    minWidth: 0,
    margin: "0 auto",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  breadcrumbLink: {
    minHeight: "32px",
    display: "inline-flex",
    alignItems: "center",
    color: tokens.colorBrandForegroundLink,
    textDecorationLine: "none",
    "&:hover": {
      textDecorationLine: "underline",
    },
    "&:focus-visible": {
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "2px",
      outlineStyle: "solid",
      outlineWidth: "2px",
    },
  },
  pageHeader: {
    display: "flex",
    alignItems: "start",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalXL,
    "@media (max-width: 700px)": {
      flexDirection: "column",
    },
  },
  title: {
    margin: 0,
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    letterSpacing: "-0.02em",
    "@media (max-width: 700px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },
  lead: {
    maxWidth: "760px",
    marginTop: tokens.spacingVerticalS,
    marginBottom: 0,
    color: tokens.colorNeutralForeground2,
  },
  stepperPanel: {
    display: "grid",
    gap: tokens.spacingVerticalS,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    padding: tokens.spacingHorizontalL,
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 700px)": {
      padding: tokens.spacingHorizontalM,
    },
  },
  stepper: {
    display: "grid",
    gridTemplateColumns: "repeat(6, minmax(132px, 1fr))",
    minWidth: "840px",
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  stepItem: {
    minWidth: 0,
  },
  stepButton: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    justifyItems: "center",
    gap: tokens.spacingVerticalXS,
    width: "100%",
    minHeight: "72px",
    padding: 0,
    border: 0,
    color: tokens.colorNeutralForeground3,
    backgroundColor: "transparent",
    cursor: "pointer",
    "&:disabled": {
      cursor: "default",
    },
    "&:focus-visible": {
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "2px",
      outlineStyle: "solid",
      outlineWidth: "2px",
    },
  },
  currentStepButton: {
    color: tokens.colorNeutralForeground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  stepCircle: {
    display: "grid",
    placeItems: "center",
    width: "44px",
    height: "44px",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorNeutralForeground2,
    backgroundColor: tokens.colorNeutralBackground1,
    fontWeight: tokens.fontWeightSemibold,
  },
  currentStepCircle: {
    ...shorthands.borderColor(tokens.colorBrandBackground),
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: tokens.colorBrandBackground,
    "@media (forced-colors: active)": {
      ...shorthands.borderWidth("2px"),
    },
  },
  completedStepCircle: {
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
    "@media (forced-colors: active)": {
      ...shorthands.borderWidth("2px"),
    },
  },
  workspace: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) 340px",
    gap: tokens.spacingHorizontalXL,
    alignItems: "start",
    minWidth: 0,
    "@media (max-width: 1020px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  formCard: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
    minWidth: 0,
    padding: tokens.spacingHorizontalXXL,
    "@media (max-width: 700px)": {
      padding: tokens.spacingHorizontalL,
    },
  },
  stepHeader: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
  stepTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase600,
    lineHeight: tokens.lineHeightBase600,
    "&:focus": {
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "4px",
      outlineStyle: "solid",
      outlineWidth: "2px",
      borderRadius: tokens.borderRadiusSmall,
    },
  },
  stepDescription: {
    margin: 0,
    color: tokens.colorNeutralForeground2,
  },
  messageBar: {
    minWidth: 0,
    whiteSpace: "normal",
  },
  fieldGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 700px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  fullWidth: {
    gridColumn: "1 / -1",
    "@media (max-width: 700px)": {
      gridColumn: "auto",
    },
  },
  formSections: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
  },
  formSection: {
    display: "grid",
    gap: tokens.spacingVerticalL,
  },
  formSectionHeader: {
    display: "grid",
    gridTemplateColumns: "32px minmax(0, 1fr)",
    gap: tokens.spacingHorizontalM,
    alignItems: "start",
  },
  formSectionNumber: {
    display: "grid",
    placeItems: "center",
    width: "32px",
    height: "32px",
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
    fontWeight: tokens.fontWeightSemibold,
  },
  formSectionTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  formSectionDescription: {
    margin: `${tokens.spacingVerticalXXS} 0 0`,
    color: tokens.colorNeutralForeground2,
  },
  sequentialFields: {
    display: "grid",
    gap: tokens.spacingVerticalL,
  },
  fieldset: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    margin: 0,
    padding: 0,
    border: 0,
  },
  legend: {
    marginBottom: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  helpText: {
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
  },
  taxonomyIdentity: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    padding: tokens.spacingHorizontalL,
  },
  taxonomyIdentityText: {
    display: "grid",
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  taxonomyId: {
    overflowWrap: "anywhere",
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
    fontWeight: tokens.fontWeightSemibold,
  },
  tagTable: {
    minWidth: "700px",
    tableLayout: "fixed",
  },
  tagKey: {
    overflowWrap: "anywhere",
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
    fontSize: tokens.fontSizeBase200,
  },
  tagValue: {
    overflowWrap: "anywhere",
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
  },
  tagPurpose: {
    display: "grid",
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  implementationSection: {
    display: "grid",
    gap: tokens.spacingVerticalM,
  },
  implementationTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  implementationLead: {
    margin: 0,
    color: tokens.colorNeutralForeground2,
  },
  implementationAccordion: {
    overflow: "hidden",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  snippetCard: {
    display: "grid",
    alignContent: "start",
    gap: tokens.spacingVerticalM,
    minWidth: 0,
    padding: tokens.spacingHorizontalL,
  },
  snippetPanel: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    minWidth: 0,
    paddingBottom: tokens.spacingVerticalM,
  },
  snippetPanelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  snippetTitle: {
    display: "grid",
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  codeBlock: {
    maxWidth: "100%",
    margin: 0,
    padding: tokens.spacingHorizontalM,
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground2,
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace",
    fontSize: tokens.fontSizeBase100,
    lineHeight: tokens.lineHeightBase200,
    whiteSpace: "pre",
    "&:focus-visible": {
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "2px",
      outlineStyle: "solid",
      outlineWidth: "2px",
    },
  },
  conventionList: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  conventionItem: {
    display: "grid",
    gridTemplateColumns: "minmax(150px, 0.35fr) minmax(0, 1fr)",
    gap: tokens.spacingHorizontalL,
    paddingBottom: tokens.spacingVerticalM,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    "&:last-child": {
      paddingBottom: 0,
      borderBottom: 0,
    },
    "@media (max-width: 620px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: tokens.spacingVerticalXS,
    },
  },
  conventionDetail: {
    display: "grid",
    gap: tokens.spacingVerticalXXS,
    minWidth: 0,
  },
  copyStatus: {
    minHeight: tokens.lineHeightBase200,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  checkboxRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalL,
  },
  resourceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 700px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  resourceCard: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
  },
  resourceHeader: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
  },
  resourceIcon: {
    color: tokens.colorBrandForeground1,
    fontSize: "28px",
  },
  addonList: {
    display: "grid",
    gap: tokens.spacingVerticalM,
  },
  addonCard: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(220px, 0.7fr)",
    gap: tokens.spacingHorizontalXL,
    alignItems: "start",
    padding: tokens.spacingHorizontalL,
    "@media (max-width: 700px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  addonIdentity: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
  addonDescription: {
    marginLeft: "32px",
    color: tokens.colorNeutralForeground2,
  },
  addonFields: {
    display: "grid",
    gap: tokens.spacingVerticalM,
  },
  reviewSections: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
  },
  reviewSection: {
    display: "grid",
    gap: tokens.spacingVerticalM,
  },
  reviewTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  definitionList: {
    display: "grid",
    gridTemplateColumns: "180px minmax(0, 1fr)",
    gap: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    margin: 0,
    "@media (max-width: 700px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      gap: tokens.spacingVerticalXS,
    },
  },
  definitionTerm: {
    color: tokens.colorNeutralForeground3,
  },
  definitionValue: {
    margin: 0,
    overflowWrap: "anywhere",
    "@media (max-width: 700px)": {
      marginBottom: tokens.spacingVerticalS,
    },
  },
  tableWrap: {
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    "&:focus-visible": {
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "2px",
      outlineStyle: "solid",
      outlineWidth: "2px",
    },
  },
  estimateTable: {
    minWidth: "600px",
  },
  numericCell: {
    textAlign: "right",
  },
  reviewConfirmation: {
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    paddingTop: tokens.spacingVerticalM,
    "@media (max-width: 700px)": {
      alignItems: "stretch",
      flexDirection: "column-reverse",
    },
  },
  actionGroup: {
    display: "flex",
    gap: tokens.spacingHorizontalS,
    "@media (max-width: 700px)": {
      display: "grid",
    },
  },
  summary: {
    position: "sticky",
    top: "96px",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
    gap: tokens.spacingVerticalL,
    minWidth: 0,
    padding: tokens.spacingHorizontalXL,
    "@media (max-width: 1020px)": {
      position: "static",
    },
  },
  summaryTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  total: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
  },
  totalValue: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase600,
  },
  annualValue: {
    color: tokens.colorNeutralForeground2,
  },
  summaryList: {
    display: "grid",
    gap: tokens.spacingVerticalS,
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  summaryLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
    fontSize: tokens.fontSizeBase200,
  },
  summaryLineLabel: {
    color: tokens.colorNeutralForeground2,
  },
  flowList: {
    display: "grid",
    gap: 0,
    margin: 0,
    padding: 0,
    listStyleType: "none",
  },
  flowItem: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "24px minmax(0, 1fr)",
    gap: tokens.spacingHorizontalS,
    minHeight: "52px",
    "&:not(:last-child)::after": {
      position: "absolute",
      top: "25px",
      bottom: 0,
      left: "11px",
      width: "2px",
      backgroundColor: tokens.colorNeutralStroke2,
      content: '""',
    },
  },
  flowDot: {
    zIndex: 1,
    display: "grid",
    placeItems: "center",
    width: "24px",
    height: "24px",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorNeutralForeground3,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  flowDotCurrent: {
    ...shorthands.borderColor(tokens.colorBrandStroke1),
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
  },
  flowText: {
    display: "grid",
    alignContent: "start",
    gap: "2px",
  },
  success: {
    display: "grid",
    justifyItems: "center",
    gap: tokens.spacingVerticalL,
    maxWidth: "680px",
    margin: "0 auto",
    paddingTop: tokens.spacingVerticalXXL,
    paddingBottom: tokens.spacingVerticalXXL,
    textAlign: "center",
  },
  successIcon: {
    color: tokens.colorPaletteGreenForeground1,
    fontSize: "72px",
  },
  successTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase600,
    lineHeight: tokens.lineHeightBase600,
  },
  orderId: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalL}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
    fontFamily: "monospace",
    fontWeight: tokens.fontWeightSemibold,
  },
  successActions: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: tokens.spacingHorizontalM,
  },
});

function hasValidTechnicalValue(value: string) {
  return normalizeTagValue(value).length > 0;
}

function requestIsValid(draft: QuoteDraft) {
  return (
    draft.requesterName.trim().length >= 3 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.requesterEmail) &&
    draft.managerName.trim().length >= 3 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.managerEmail) &&
    draft.department.trim().length > 0 &&
    hasValidTechnicalValue(draft.costCenter) &&
    draft.businessVertical.length > 0 &&
    hasValidTechnicalValue(draft.productName) &&
    (!draft.squadName.trim() || hasValidTechnicalValue(draft.squadName)) &&
    draft.requestType.length > 0 &&
    draft.systemStage.length > 0 &&
    hasValidTechnicalValue(draft.systemName) &&
    hasValidTechnicalValue(draft.sdmCategoryName) &&
    (draft.requestType !== "addition" ||
      draft.parentOrderId.trim().length > 0)
  );
}

function infrastructureIsValid(draft: QuoteDraft) {
  const hasInfrastructure =
    draft.hosts > 0 ||
    (draft.kubernetesClusters > 0 && draft.nodesPerCluster > 0);
  return draft.environments.length > 0 && hasInfrastructure;
}

function taggingIsValid(plan: QuoteTagPlan | null) {
  return isValidQuoteTagPlan(plan);
}

function getNumberInputValue(value: string) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
}

export function QuoteWizard() {
  const styles = useStyles();
  const [draft, setDraft] = useState<QuoteDraft>(initialQuote);
  const [reservedOrderId, setReservedOrderId] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [attemptedSteps, setAttemptedSteps] = useState<number[]>([]);
  const [reviewAccepted, setReviewAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const estimate = useMemo(() => calculateEstimate(draft), [draft]);
  const tagPlan = useMemo(
    () =>
      reservedOrderId
        ? createQuoteTagPlan(draft, reservedOrderId)
        : null,
    [draft, reservedOrderId],
  );

  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [currentStep]);

  const updateDraft = (updates: Partial<QuoteDraft>) => {
    setReviewAccepted(false);
    setDraft((current) => ({ ...current, ...updates }));
  };

  const stepIsValid = (step: number) => {
    if (step === STEP.requester) return requestIsValid(draft);
    if (step === STEP.tags) return taggingIsValid(tagPlan);
    if (step === STEP.infrastructure) return infrastructureIsValid(draft);
    return true;
  };

  const goNext = () => {
    if (!stepIsValid(currentStep)) {
      setAttemptedSteps((current) =>
        current.includes(currentStep) ? current : [...current, currentStep],
      );
      return;
    }
    if (currentStep === STEP.requester && !reservedOrderId) {
      setReservedOrderId(createOrderId());
    }
    const nextStep = Math.min(STEP.review, currentStep + 1);
    setCurrentStep(nextStep);
    setMaxReached((current) => Math.max(current, nextStep));
  };

  const goBack = () => setCurrentStep((current) => Math.max(0, current - 1));

  const goToStep = (step: number) => {
    if (!order && step <= maxReached && step < STEP.sent) {
      setCurrentStep(step);
    }
  };

  const toggleEnvironment = (environment: EnvironmentName) => {
    updateDraft({
      environments: draft.environments.includes(environment)
        ? draft.environments.filter((item) => item !== environment)
        : [...draft.environments, environment],
    });
  };

  const submitOrder = async () => {
    if (!requestIsValid(draft)) {
      setAttemptedSteps((current) =>
        current.includes(STEP.requester)
          ? current
          : [...current, STEP.requester],
      );
      setCurrentStep(STEP.requester);
      return;
    }

    if (!taggingIsValid(tagPlan)) {
      setAttemptedSteps((current) =>
        current.includes(STEP.tags) ? current : [...current, STEP.tags],
      );
      setSubmissionError(
        "Não foi possível confirmar a taxonomia. Retorne à etapa Tags e tente novamente.",
      );
      setCurrentStep(STEP.tags);
      return;
    }

    if (!infrastructureIsValid(draft)) {
      setAttemptedSteps((current) =>
        current.includes(STEP.infrastructure)
          ? current
          : [...current, STEP.infrastructure],
      );
      setCurrentStep(STEP.infrastructure);
      return;
    }

    if (!reviewAccepted) {
      setSubmissionError(
        "Confirme que os dados representam a necessidade antes de enviar.",
      );
      return;
    }

    setSubmitting(true);
    setSubmissionError("");
    const createdOrder: StoredOrder = {
      id: reservedOrderId,
      parentOrderId:
        draft.requestType === "addition"
          ? draft.parentOrderId.trim()
          : null,
      provider: "Dynatrace",
      status: "Em revisão",
      createdAt: new Date().toISOString(),
      draft,
      estimate,
      tagPlan: tagPlan ?? undefined,
    };

    try {
      saveOrder(createdOrder);
    } catch {
      setSubmissionError(
        "Não foi possível registrar o orçamento neste navegador. Verifique o armazenamento local e tente novamente.",
      );
      setSubmitting(false);
      return;
    }

    setOrder(createdOrder);
    setCurrentStep(STEP.sent);
    setMaxReached(STEP.sent);

    try {
      const { downloadOrderPdf } = await import("./pedido-pdf.client");
      await downloadOrderPdf(createdOrder);
    } catch {
      setSubmissionError(
        "O orçamento foi registrado neste navegador, mas o PDF não pôde ser baixado. Use “Baixar PDF” para tentar novamente.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const downloadAgain = async () => {
    if (!order) return;
    setSubmissionError("");
    try {
      const { downloadOrderPdf } = await import("./pedido-pdf.client");
      await downloadOrderPdf(order);
    } catch {
      setSubmissionError(
        "Não foi possível gerar o PDF. Verifique se o navegador permite downloads.",
      );
    }
  };

  const hasStepError = attemptedSteps.includes(currentStep);

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Navegação estrutural">
        <a className={styles.breadcrumbLink} href="/orcamentos">
          Orçamentos
        </a>
        <ChevronRightRegular aria-hidden="true" />
        <span>Novo orçamento Dynatrace</span>
      </nav>

      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Solicitação Dynatrace</h1>
          <p className={styles.lead}>
            Dimensione a instrumentação de servidores, clusters Kubernetes e
            serviços adicionais. Ao enviar, o portal registra o orçamento e gera o
            comprovante em PDF.
          </p>
        </div>
        <Badge appearance="tint" color={order ? "warning" : "informative"}>
          {order ? "Em revisão" : "Rascunho"}
        </Badge>
      </header>

      <section className={styles.stepperPanel} aria-label="Etapas da solicitação">
        <ol className={styles.stepper}>
          {steps.map((step, index) => {
            const isCurrent = index === currentStep;
            const isCompleted =
              index < currentStep || currentStep === STEP.sent;
            return (
              <li key={step} className={styles.stepItem}>
                <button
                  type="button"
                  className={mergeClasses(
                    styles.stepButton,
                    isCurrent && styles.currentStepButton,
                  )}
                  onClick={() => goToStep(index)}
                  disabled={Boolean(order) || index > maxReached || index === STEP.sent}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <span
                    className={mergeClasses(
                      styles.stepCircle,
                      isCurrent && styles.currentStepCircle,
                      isCompleted && !isCurrent && styles.completedStepCircle,
                    )}
                  >
                    {isCompleted && !isCurrent ? (
                      <CheckmarkRegular aria-label="Concluída" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span>{step}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <div className={styles.workspace}>
        <Card className={styles.formCard}>
          {currentStep === STEP.requester ? (
            <RequesterStep
              draft={draft}
              updateDraft={updateDraft}
              showErrors={hasStepError}
              headingRef={stepHeadingRef}
              styles={styles}
            />
          ) : null}
          {currentStep === STEP.tags && tagPlan ? (
            <TagsStep
              plan={tagPlan}
              showErrors={hasStepError}
              headingRef={stepHeadingRef}
              styles={styles}
            />
          ) : null}
          {currentStep === STEP.infrastructure ? (
            <InfrastructureStep
              draft={draft}
              updateDraft={updateDraft}
              toggleEnvironment={toggleEnvironment}
              showErrors={hasStepError}
              headingRef={stepHeadingRef}
              styles={styles}
            />
          ) : null}
          {currentStep === STEP.addons ? (
            <AddOnsStep
              draft={draft}
              updateDraft={updateDraft}
              headingRef={stepHeadingRef}
              styles={styles}
            />
          ) : null}
          {currentStep === STEP.review && tagPlan ? (
            <ReviewStep
              draft={draft}
              tagPlan={tagPlan}
              reviewAccepted={reviewAccepted}
              setReviewAccepted={setReviewAccepted}
              submissionError={submissionError}
              estimate={estimate}
              headingRef={stepHeadingRef}
              styles={styles}
            />
          ) : null}
          {currentStep === STEP.sent && order ? (
            <SuccessStep
              order={order}
              submissionError={submissionError}
              downloadAgain={downloadAgain}
              headingRef={stepHeadingRef}
              styles={styles}
            />
          ) : null}

          {currentStep < STEP.sent ? (
            <>
              <Divider />
              <div className={styles.actions}>
                <Button as="a" href="/orcamentos" appearance="subtle">
                  Cancelar
                </Button>
                <div className={styles.actionGroup}>
                  {currentStep > 0 ? (
                    <Button icon={<ArrowLeftRegular />} onClick={goBack}>
                      Voltar
                    </Button>
                  ) : null}
                  {currentStep < STEP.review ? (
                    <Button
                      appearance="primary"
                      icon={<ArrowRightRegular />}
                      iconPosition="after"
                      onClick={goNext}
                    >
                      Continuar
                    </Button>
                  ) : (
                    <Button
                      appearance="primary"
                      icon={<DocumentPdfRegular />}
                      disabled={submitting}
                      onClick={submitOrder}
                    >
                      {submitting ? "Gerando orçamento..." : "Enviar para revisão"}
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </Card>

        <QuoteSummary
          draft={order?.draft ?? draft}
          order={order}
          tagPlan={order?.tagPlan ?? tagPlan}
          styles={styles}
        />
      </div>
    </div>
  );
}

type WizardStyles = ReturnType<typeof useStyles>;
type HeadingRef = React.RefObject<HTMLHeadingElement | null>;

interface SharedStepProps {
  draft: QuoteDraft;
  updateDraft: (updates: Partial<QuoteDraft>) => void;
  headingRef: HeadingRef;
  styles: WizardStyles;
}

function RequesterStep({
  draft,
  updateDraft,
  showErrors,
  headingRef,
  styles,
}: SharedStepProps & { showErrors: boolean }) {
  const invalid = (condition: boolean) => (showErrors && condition ? "error" : "none");
  return (
    <>
      <div className={styles.stepHeader}>
        <h2 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
          Dados da solicitação
        </h2>
        <p className={styles.stepDescription}>
          Identifique os responsáveis, o vínculo organizacional e o escopo da
          instrumentação.
        </p>
      </div>
      {showErrors && !requestIsValid(draft) ? (
        <MessageBar className={styles.messageBar} intent="error">
          <MessageBarBody>
            Revise os campos obrigatórios indicados antes de continuar.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      <div className={styles.formSections}>
        <section className={styles.formSection} aria-labelledby="requester-personal-title">
          <div className={styles.formSectionHeader}>
            <span className={styles.formSectionNumber} aria-hidden="true">1</span>
            <div>
              <h3 id="requester-personal-title" className={styles.formSectionTitle}>
                Seus dados
              </h3>
              <p className={styles.formSectionDescription}>
                Informe seus dados e os dados do seu gestor.
              </p>
            </div>
          </div>
          <div className={styles.fieldGrid}>
            <Field
              label="Nome do solicitante"
              required
              validationState={invalid(draft.requesterName.trim().length < 3)}
              validationMessage={
                showErrors && draft.requesterName.trim().length < 3
                  ? "Informe o nome completo."
                  : undefined
              }
            >
              <Input
                value={draft.requesterName}
                autoComplete="name"
                onChange={(_, data) => updateDraft({ requesterName: data.value })}
              />
            </Field>
            <Field
              label="E-mail"
              required
              validationState={invalid(
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.requesterEmail),
              )}
              validationMessage={
                showErrors &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.requesterEmail)
                  ? "Informe um e-mail válido."
                  : undefined
              }
            >
              <Input
                type="email"
                value={draft.requesterEmail}
                autoComplete="email"
                onChange={(_, data) => updateDraft({ requesterEmail: data.value })}
              />
            </Field>
            <Field
              label="Nome do gestor"
              required
              validationState={invalid(draft.managerName.trim().length < 3)}
              validationMessage={
                showErrors && draft.managerName.trim().length < 3
                  ? "Informe o nome completo do gestor."
                  : undefined
              }
            >
              <Input
                value={draft.managerName}
                onChange={(_, data) => updateDraft({ managerName: data.value })}
              />
            </Field>
            <Field
              label="E-mail do gestor"
              required
              validationState={invalid(
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.managerEmail),
              )}
              validationMessage={
                showErrors &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.managerEmail)
                  ? "Informe um e-mail válido para o gestor."
                  : undefined
              }
            >
              <Input
                type="email"
                value={draft.managerEmail}
                onChange={(_, data) => updateDraft({ managerEmail: data.value })}
              />
            </Field>
            <Field
              label="Área solicitante"
              required
              validationState={invalid(draft.department.trim().length === 0)}
              validationMessage={
                showErrors && draft.department.trim().length === 0
                  ? "Informe a área responsável."
                  : undefined
              }
            >
              <Input
                value={draft.department}
                onChange={(_, data) => updateDraft({ department: data.value })}
              />
            </Field>
            <Field
              label="Centro de custo"
              required
              validationState={invalid(!hasValidTechnicalValue(draft.costCenter))}
              validationMessage={
                showErrors && !hasValidTechnicalValue(draft.costCenter)
                  ? "Use letras ou números no centro de custo."
                  : undefined
              }
            >
              <Input
                value={draft.costCenter}
                onChange={(_, data) => updateDraft({ costCenter: data.value })}
              />
            </Field>
          </div>
        </section>

        <Divider />

        <section className={styles.formSection} aria-labelledby="requester-organization-title">
          <div className={styles.formSectionHeader}>
            <span className={styles.formSectionNumber} aria-hidden="true">2</span>
            <div>
              <h3 id="requester-organization-title" className={styles.formSectionTitle}>
                Organização
              </h3>
              <p className={styles.formSectionDescription}>
                Relacione a demanda à vertical, ao produto e, quando houver, à
                squad responsável.
              </p>
            </div>
          </div>
          <div className={styles.sequentialFields}>
            <Field
              label="Vertical de negócio"
              required
              validationState={invalid(draft.businessVertical.length === 0)}
              validationMessage={
                showErrors && draft.businessVertical.length === 0
                  ? "Selecione a vertical de negócio."
                  : undefined
              }
            >
              <Select
                value={draft.businessVertical}
                onChange={(event) =>
                  updateDraft({
                    businessVertical: event.target.value as BusinessVertical | "",
                  })
                }
              >
                <option value="">Selecione uma vertical</option>
                {businessVerticals.map((vertical) => (
                  <option key={vertical} value={vertical}>
                    {vertical}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Produto"
              required
              validationState={invalid(!hasValidTechnicalValue(draft.productName))}
              validationMessage={
                showErrors && !hasValidTechnicalValue(draft.productName)
                  ? "Use letras ou números no nome do produto."
                  : undefined
              }
            >
              <Input
                value={draft.productName}
                onChange={(_, data) => updateDraft({ productName: data.value })}
              />
            </Field>
            <Field
              label="Nome da squad (se aplicável)"
              hint="Informe a squad responsável pelo produto ou deixe em branco."
              validationState={invalid(
                Boolean(draft.squadName.trim()) &&
                  !hasValidTechnicalValue(draft.squadName),
              )}
              validationMessage={
                showErrors &&
                draft.squadName.trim() &&
                !hasValidTechnicalValue(draft.squadName)
                  ? "Use letras ou números no nome da squad."
                  : undefined
              }
            >
              <Input
                value={draft.squadName}
                onChange={(_, data) => updateDraft({ squadName: data.value })}
              />
            </Field>
          </div>
        </section>

        <Divider />

        <section className={styles.formSection} aria-labelledby="requester-scope-title">
          <div className={styles.formSectionHeader}>
            <span className={styles.formSectionNumber} aria-hidden="true">3</span>
            <div>
              <h3 id="requester-scope-title" className={styles.formSectionTitle}>
                Sistema
              </h3>
              <p className={styles.formSectionDescription}>
                Identifique o sistema, seu estágio e a categoria usada para
                incidentes.
              </p>
            </div>
          </div>
          <div className={styles.sequentialFields}>
            <Field
              label="Estágio do sistema"
              required
              hint="Informe se o sistema está em fase de projeto ou em produção."
              validationState={invalid(draft.systemStage.length === 0)}
              validationMessage={
                showErrors && draft.systemStage.length === 0
                  ? "Selecione o estágio do sistema."
                  : undefined
              }
            >
              <RadioGroup
                required
                layout="horizontal-stacked"
                value={draft.systemStage}
                onChange={(_, data) =>
                  updateDraft({ systemStage: data.value as SystemStage })
                }
              >
                <Radio value="project" label={systemStageLabels.project} />
                <Radio
                  value="production"
                  label={systemStageLabels.production}
                />
              </RadioGroup>
            </Field>
            <Field
              label="Nome do sistema"
              required
              hint="Use o nome adotado nos controles internos, mesmo que o sistema ainda esteja em fase de projeto."
              validationState={invalid(
                !hasValidTechnicalValue(draft.systemName),
              )}
              validationMessage={
                showErrors && !hasValidTechnicalValue(draft.systemName)
                  ? "Use letras ou números no nome do sistema."
                  : undefined
              }
            >
              <Input
                value={draft.systemName}
                onChange={(_, data) => updateDraft({ systemName: data.value })}
              />
            </Field>
            <Field
              label="Nome da categoria (Porto SDM)"
              required
              hint="Informe a categoria usada no Porto SDM para os incidentes relacionados ao produto e ao sistema correspondente."
              validationState={invalid(
                !hasValidTechnicalValue(draft.sdmCategoryName),
              )}
              validationMessage={
                showErrors && !hasValidTechnicalValue(draft.sdmCategoryName)
                  ? "Use letras ou números no nome da categoria Porto SDM."
                  : undefined
              }
            >
              <Input
                value={draft.sdmCategoryName}
                onChange={(_, data) =>
                  updateDraft({ sdmCategoryName: data.value })
                }
              />
            </Field>
          </div>
        </section>

        <Divider />

        <section
          className={styles.formSection}
          aria-labelledby="requester-request-title"
        >
          <div className={styles.formSectionHeader}>
            <span className={styles.formSectionNumber} aria-hidden="true">4</span>
            <div>
              <h3 id="requester-request-title" className={styles.formSectionTitle}>
                Solicitação
              </h3>
              <p className={styles.formSectionDescription}>
                Defina se este orçamento inicia uma instrumentação ou amplia um
                escopo aprovado anteriormente.
              </p>
            </div>
          </div>
          <div className={styles.sequentialFields}>
            <Field
              label="Tipo de solicitação"
              required
              validationState={invalid(draft.requestType.length === 0)}
              validationMessage={
                showErrors && draft.requestType.length === 0
                  ? "Selecione o tipo de solicitação."
                  : undefined
              }
            >
              <RadioGroup
                required
                layout="horizontal-stacked"
                value={draft.requestType}
                onChange={(_, data) => {
                  const requestType = data.value as RequestType;
                  updateDraft({
                    requestType,
                    parentOrderId:
                      requestType === "addition" ? draft.parentOrderId : "",
                  });
                }}
              >
                <Radio
                  value="new-instrumentation"
                  label={requestTypeLabels["new-instrumentation"]}
                />
                <Radio value="addition" label={requestTypeLabels.addition} />
              </RadioGroup>
            </Field>
            {draft.requestType === "addition" ? (
              <Field
                label="Orçamento anterior"
                required
                hint="Informe o identificador do orçamento aprovado anteriormente."
                validationState={invalid(draft.parentOrderId.trim().length === 0)}
                validationMessage={
                  showErrors && draft.parentOrderId.trim().length === 0
                    ? "Informe o orçamento anterior."
                    : undefined
                }
              >
                <Input
                  value={draft.parentOrderId}
                  spellCheck={false}
                  onChange={(_, data) => updateDraft({ parentOrderId: data.value })}
                />
              </Field>
            ) : null}
          </div>
        </section>
      </div>
      <MessageBar className={styles.messageBar} intent="warning">
        <MessageBarBody>
          <strong>Responsabilidade pelas informações.</strong> Todos os dados
          informados são essenciais para a rastreabilidade, a análise e a
          correlação deste orçamento. Preencha-os de forma completa, precisa e
          verdadeira. Informações falsas, inexatas ou deliberadamente omitidas
          não são admissíveis e podem comprometer a avaliação da solicitação.
        </MessageBarBody>
      </MessageBar>
    </>
  );
}

function TraceabilityTable({
  plan,
  styles,
  compact = false,
}: {
  plan: QuoteTagPlan;
  styles: WizardStyles;
  compact?: boolean;
}) {
  const environmentValue = plan.environments.length
    ? plan.environments.map((environment) => environment.value).join(" | ")
    : "<definido por recurso>";

  return (
    <div
      className={styles.tableWrap}
      role="region"
      aria-label="Tabela de tags Dynatrace; use as setas para rolar horizontalmente"
      tabIndex={0}
    >
      <Table
        className={styles.tagTable}
        aria-label="Campos e tags Dynatrace de rastreabilidade"
      >
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Chave Dynatrace</TableHeaderCell>
            <TableHeaderCell>Valor padronizado</TableHeaderCell>
            {!compact ? <TableHeaderCell>Origem e finalidade</TableHeaderCell> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {plan.tags.map((tag) => (
            <TableRow key={tag.key}>
              <TableCell>
                <code className={styles.tagKey}>{tag.key}</code>
              </TableCell>
              <TableCell>
                <code className={styles.tagValue}>{tag.value}</code>
              </TableCell>
              {!compact ? (
                <TableCell>
                  <span className={styles.tagPurpose}>
                    <Text weight="semibold" size={200}>
                      {tag.source}
                    </Text>
                    <Text size={200}>{tag.purpose}</Text>
                    {tag.immutable ? (
                      <Badge appearance="outline" color="informative" size="small">
                        Imutável
                      </Badge>
                    ) : null}
                  </span>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
          <TableRow key={plan.instrumentationTag.key}>
            <TableCell>
              <code className={styles.tagKey}>{plan.instrumentationTag.key}</code>
            </TableCell>
            <TableCell>
              <code className={styles.tagValue}>{plan.instrumentationTag.value}</code>
            </TableCell>
            {!compact ? (
              <TableCell>
                <span className={styles.tagPurpose}>
                  <Text weight="semibold" size={200}>
                    {plan.instrumentationTag.label}
                  </Text>
                  <Text size={200}>
                    Gerado após a aprovação no formato{" "}
                    {plan.instrumentationTag.format}, para cada alvo lógico; nunca
                    por pod, processo ou instância efêmera.
                  </Text>
                  <Badge appearance="outline" color="informative" size="small">
                    Imutável
                  </Badge>
                </span>
              </TableCell>
            ) : null}
          </TableRow>
          <TableRow key={plan.environmentTag.key}>
            <TableCell>
              <code className={styles.tagKey}>{plan.environmentTag.key}</code>
            </TableCell>
            <TableCell>
              <code className={styles.tagValue}>{environmentValue}</code>
            </TableCell>
            {!compact ? (
              <TableCell>
                <span className={styles.tagPurpose}>
                  <Text weight="semibold" size={200}>
                    {plan.environmentTag.label}
                  </Text>
                  <Text size={200}>
                    {plan.environmentTag.purpose} Os valores finais são confirmados
                    na etapa Infraestrutura.
                  </Text>
                </span>
              </TableCell>
            ) : null}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function ConfigurationSnippet({
  value,
  title,
  description,
  code,
  styles,
  copyEnabled = false,
}: {
  value: string;
  title: string;
  description: string;
  code: string;
  styles: WizardStyles;
  copyEnabled?: boolean;
}) {
  const [copyStatus, setCopyStatus] = useState("");

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus("Copiado para a área de transferência.");
    } catch {
      setCopyStatus("Não foi possível copiar automaticamente. Selecione o conteúdo.");
    }
  };

  return (
    <AccordionItem value={value}>
      <AccordionHeader>
        <div className={styles.snippetTitle}>
          <Text weight="semibold">{title}</Text>
          <Text size={200}>{description}</Text>
        </div>
      </AccordionHeader>
      <AccordionPanel>
        <div className={styles.snippetPanel}>
          <div className={styles.snippetPanelHeader}>
            <Text size={200}>
              Template de configuração: revise todos os placeholders.
            </Text>
            <Button
              size="small"
              appearance="subtle"
              icon={<CopyRegular />}
              onClick={copyCode}
              disabled={!copyEnabled}
              title={
                copyEnabled
                  ? "Copiar comando"
                  : "A cópia será liberada após a aprovação e a emissão do ID de instrumentação."
              }
            >
              {copyEnabled ? "Copiar comando" : "Cópia após aprovação"}
            </Button>
          </div>
          <pre className={styles.codeBlock} tabIndex={0}>
            <code>{code}</code>
          </pre>
          <span className={styles.copyStatus} role="status" aria-live="polite">
            {copyStatus}
          </span>
        </div>
      </AccordionPanel>
    </AccordionItem>
  );
}

function TagsStep({
  plan,
  showErrors,
  headingRef,
  styles,
}: {
  plan: QuoteTagPlan;
  showErrors: boolean;
  headingRef: HeadingRef;
  styles: WizardStyles;
}) {
  const { conventions } = plan;
  const dtTagsValue = toDtTagsValue(plan);
  const otelResourceAttributes = toOtelResourceAttributes(plan);
  const dtTagsCommands = [
    "# Bash / Ubuntu",
    `export DT_TAGS="${dtTagsValue}"`,
    "",
    "# Windows PowerShell",
    `$env:DT_TAGS = "${dtTagsValue}"`,
    "",
    "# AWS Lambda / Azure Functions / IaC",
    "Nome: DT_TAGS",
    `Valor: ${dtTagsValue}`,
  ].join("\n");
  const otelCommands = [
    "# Bash / Ubuntu",
    `export OTEL_RESOURCE_ATTRIBUTES="${otelResourceAttributes}"`,
    "",
    "# Windows PowerShell",
    `$env:OTEL_RESOURCE_ATTRIBUTES = "${otelResourceAttributes}"`,
    "",
    "# AWS Lambda / Azure Functions / IaC",
    "Nome: OTEL_RESOURCE_ATTRIBUTES",
    `Valor: ${otelResourceAttributes}`,
  ].join("\n");

  return (
    <>
      <div className={styles.stepHeader}>
        <h2 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
          Tags e rastreabilidade
        </h2>
        <p className={styles.stepDescription}>
          Confira o contrato de metadados que acompanhará a instrumentação e os
          objetos criados no Dynatrace.
        </p>
      </div>

      {showErrors && !taggingIsValid(plan) ? (
        <MessageBar className={styles.messageBar} intent="error">
          <MessageBarBody>
            Um ou mais dados não produziram um valor técnico válido. Volte à
            etapa Solicitante e use letras ou números nos campos indicados.
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <Card className={styles.taxonomyIdentity} appearance="outline">
        <div className={styles.taxonomyIdentityText}>
          <Text size={200}>
            Identificador do rascunho — confirmado no envio
          </Text>
          <span className={styles.taxonomyId}>{plan.orderId}</span>
        </div>
        <Badge appearance="tint" color="informative" icon={<TagRegular />}>
          Taxonomia v{plan.version}
        </Badge>
      </Card>

      <MessageBar className={styles.messageBar} intent="info">
        <MessageBarBody>
          Valores derivados de nomes são gerados em minúsculas, sem acentos e com
          limite corporativo de 63 caracteres; IDs corporativos são preservados
          exatamente. Nomes e e-mails não viram tags, evitando PII e alta
          cardinalidade. Em adições, a relação com o orçamento anterior permanece
          no portal. AppID e CMDB ID só poderão ser anexados quando vierem do
          catálogo corporativo. O produto usa <code>primary_tags.product</code>;
          o centro de custo permanece no orçamento. <code>dt.cost.product</code> e{" "}
          <code>dt.cost.costcenter</code> só serão aplicados com os valores
          canônicos das listas de rateio DPS, sem normalização.
          O manifesto-base usa até 9 atributos por ambiente e a política
          corporativa limita o conjunto final a 12, preservando capacidade para
          AppID e rateio aprovados. O limite oficial do OneAgent é 20 tags na
          combinação host/processo, e excedentes são descartados silenciosamente.
        </MessageBarBody>
      </MessageBar>

      <TraceabilityTable plan={plan} styles={styles} />

      <section
        className={styles.implementationSection}
        aria-labelledby="tag-implementation-title"
      >
        <div>
          <h3 id="tag-implementation-title" className={styles.implementationTitle}>
            Aplicação durante a instrumentação
          </h3>
          <p className={styles.implementationLead}>
            Estes blocos são templates de planejamento. Não os execute antes da
            aprovação. Substitua <code>&lt;instrumentation-id&gt;</code> pelo ID
            emitido pela equipe técnica, <code>&lt;environment&gt;</code> por
            development, staging ou production e{" "}
            <code>&lt;service-name&gt;</code> pelo componente técnico. O nome do
            serviço não deve carregar ambiente, time ou orçamento.
          </p>
        </div>
        <Accordion
          className={styles.implementationAccordion}
          multiple
          collapsible
          defaultOpenItems={["oneagent"]}
        >
          <ConfigurationSnippet
            value="oneagent"
            title="Hosts dedicados com OneAgent"
            description="Execute como administrador somente quando o host pertencer integralmente ao sistema. Em host compartilhado, use DT_TAGS no processo."
            code={toOneAgentCtlCommand(plan)}
            styles={styles}
          />
          <ConfigurationSnippet
            value="process-serverless"
            title="Processos, Lambda e Functions"
            description="Use DT_TAGS somente em módulos OneAgent. O escopo do processo prevalece sobre as tags do host."
            code={dtTagsCommands}
            styles={styles}
          />
          <ConfigurationSnippet
            value="kubernetes"
            title="Kubernetes"
            description="Requer metadataEnrichment habilitado, Operator 1.10+, OneAgent 1.333+ e ActiveGate 1.343+; anotações de pod não cobrem platform metrics ou events."
            code={`metadata:\n  annotations:\n${toKubernetesAnnotations(plan)}`}
            styles={styles}
          />
          <ConfigurationSnippet
            value="opentelemetry"
            title="OpenTelemetry"
            description="Atributos de recurso para SDKs, Collector e workloads sem OneAgent."
            code={otelCommands}
            styles={styles}
          />
        </Accordion>
      </section>

      <MessageBar className={styles.messageBar} intent="info">
        <MessageBarBody>
          <strong>Escopo compartilhado:</strong> aplique tags no namespace somente
          quando todos os workloads compartilharem orçamento, produto, sistema e
          ID de instrumentação; caso contrário, use o template do pod/workload.
          Não aplique tags de sistema ou orçamento a um ActiveGate compartilhado.
          Para ActiveGate standalone, registre no portal o ID nativo, o grupo e a
          network zone; não trate <code>custom.properties</code> como tags.
        </MessageBarBody>
      </MessageBar>

      <section
        className={styles.implementationSection}
        aria-labelledby="tag-object-correlation-title"
      >
        <div>
          <h3
            id="tag-object-correlation-title"
            className={styles.implementationTitle}
          >
            Correlação de objetos Dynatrace
          </h3>
          <p className={styles.implementationLead}>
            RUM, dashboards e detectores não compartilham um único mecanismo de
            tags. O portal deve registrar o ID nativo retornado pelo Dynatrace além
            das convenções abaixo.
          </p>
        </div>
        <Card className={styles.snippetCard} appearance="outline">
          <ul className={styles.conventionList}>
            <li className={styles.conventionItem}>
              <Text weight="semibold">RUM Web e Mobile</Text>
              <span className={styles.conventionDetail}>
                <Text size={200}>
                  Nome estável <code>{conventions.rum.webFrontendName}</code> ou{" "}
                  <code>{conventions.rum.mobileFrontendName}</code>. Registre o
                  identificador estável{" "}
                  <code>{conventions.rum.stableIdField}</code> e também{" "}
                  <code>
                    {conventions.rum.experimentalInstrumentationIdField}
                  </code>
                  , que ainda é experimental. Para múltiplos frontends, use{" "}
                  <code>{conventions.rum.additionalFrontendNamePattern}</code>.
                  O ID do orçamento não deve substituir o Application ID.
                </Text>
              </span>
            </li>
            <li className={styles.conventionItem}>
              <Text weight="semibold">Dashboards</Text>
              <span className={styles.conventionDetail}>
                <Text size={200}>
                  Grave o Document ID e use a label{" "}
                  <code>{conventions.dashboard.label}</code>.
                  Em tiles de infraestrutura e OpenTelemetry enriquecidos, filtre
                  com <code>{conventions.dashboard.enrichedTelemetryFilter}</code>;
                  em RUM, use{" "}
                  <code>{conventions.dashboard.rumFilterFields[0]}</code> ou{" "}
                  <code>{conventions.dashboard.rumFilterFields[1]}</code>.
                  A label organiza o documento, mas não filtra seus dados.
                </Text>
              </span>
            </li>
            <li className={styles.conventionItem}>
              <Text weight="semibold">Anomaly Detection</Text>
              <span className={styles.conventionDetail}>
                <Text size={200}>
                  Grave o Settings objectId e use{" "}
                  <code>{conventions.anomalyDetection.externalId}</code> como
                  externalId. Configure{" "}
                  <code>{conventions.anomalyDetection.source}</code> como source e
                  repita{" "}
                  <code>{conventions.anomalyDetection.eventPropertyKey}</code>
                  {" = "}
                  <code>{conventions.anomalyDetection.eventPropertyValue}</code>{" "}
                  nas propriedades do evento.
                </Text>
              </span>
            </li>
            <li className={styles.conventionItem}>
              <Text weight="semibold">Alarmes e workflows</Text>
              <span className={styles.conventionDetail}>
                <Text size={200}>
                  Para infraestrutura e OpenTelemetry enriquecidos, use{" "}
                  <code>primary_tags.*</code>; para RUM, use a identidade do
                  frontend. Um Davis event pode filtrar{" "}
                  <code>observability.quote.id</code>. Em gatilhos de problema,
                  propague antes essa propriedade como campo customizado.
                </Text>
              </span>
            </li>
          </ul>
        </Card>
      </section>

      <MessageBar className={styles.messageBar} intent="info">
        <MessageBarBody>
          Este contrato usa Primary Grail Tags do Latest Dynatrace e enriquecimento
          no OneAgent 1.333 ou posterior; para correlação de logs do AWS Lambda via{" "}
          <code>DT_TAGS</code>, use OneAgent 1.337 ou posterior. A disponibilidade
          deve ser validada no tenant. Em OTel/serverless, mantenha também os
          atributos cloud nativos, como <code>aws.account.id</code>,{" "}
          <code>aws.region</code>, <code>azure.subscription</code>,{" "}
          <code>azure.resource.group</code> e <code>azure.location</code>, quando
          não forem autodetectados. Identificadores nativos como{" "}
          <code>host.id</code>,{" "}
          <code>k8s.cluster.name</code>,{" "}
          <code>k8s.namespace.name</code>, <code>faas.name</code> e{" "}
          <code>service.name</code> continuam obrigatórios quando aplicáveis; eles
          identificam o recurso, enquanto as tags identificam seu contexto e o
          orçamento que autorizou a instrumentação.
        </MessageBarBody>
      </MessageBar>
    </>
  );
}

function InfrastructureStep({
  draft,
  updateDraft,
  toggleEnvironment,
  showErrors,
  headingRef,
  styles,
}: SharedStepProps & {
  toggleEnvironment: (environment: EnvironmentName) => void;
  showErrors: boolean;
}) {
  return (
    <>
      <div className={styles.stepHeader}>
        <h2 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
          Infraestrutura a instrumentar
        </h2>
        <p className={styles.stepDescription}>
          Informe onde as cargas estão hospedadas e o volume inicial esperado.
        </p>
      </div>
      {showErrors && !infrastructureIsValid(draft) ? (
        <MessageBar className={styles.messageBar} intent="error">
          <MessageBarBody>
            Selecione ao menos um ambiente e informe hosts ou clusters com nós.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      <div className={styles.fieldGrid}>
        <Field label="Modelo de hospedagem" required>
          <Select
            value={draft.hosting}
            onChange={(event) =>
              updateDraft({ hosting: event.target.value as HostingType })
            }
          >
            {Object.entries(hostingLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Ambientes monitorados *</legend>
          <div className={styles.checkboxRow}>
            {(["Desenvolvimento", "Homologação", "Produção"] as const).map(
              (environment) => (
                <Checkbox
                  key={environment}
                  label={environment}
                  checked={draft.environments.includes(environment)}
                  onChange={() => toggleEnvironment(environment)}
                />
              ),
            )}
          </div>
          {showErrors && draft.environments.length === 0 ? (
            <span role="alert" className={styles.helpText}>
              Selecione pelo menos um ambiente.
            </span>
          ) : null}
        </fieldset>
      </div>

      <div className={styles.resourceGrid}>
        <Card className={styles.resourceCard} appearance="outline">
          <div className={styles.resourceHeader}>
            <ServerRegular className={styles.resourceIcon} aria-hidden="true" />
            <div>
              <Text block weight="semibold">
                Servidores e máquinas virtuais
              </Text>
              <Text block size={200}>
                Hosts com OneAgent ou monitoramento equivalente.
              </Text>
            </div>
          </div>
          <Field label="Quantidade de hosts">
            <Input
              type="number"
              min={0}
              value={String(draft.hosts)}
              onChange={(_, data) =>
                updateDraft({ hosts: getNumberInputValue(data.value) })
              }
            />
          </Field>
        </Card>

        <Card className={styles.resourceCard} appearance="outline">
          <div className={styles.resourceHeader}>
            <CloudRegular className={styles.resourceIcon} aria-hidden="true" />
            <div>
              <Text block weight="semibold">
                Kubernetes
              </Text>
              <Text block size={200}>
                Clusters e nós de trabalho incluídos no escopo.
              </Text>
            </div>
          </div>
          <div className={styles.fieldGrid}>
            <Field label="Clusters">
              <Input
                type="number"
                min={0}
                value={String(draft.kubernetesClusters)}
                onChange={(_, data) =>
                  updateDraft({
                    kubernetesClusters: getNumberInputValue(data.value),
                  })
                }
              />
            </Field>
            <Field label="Nós por cluster">
              <Input
                type="number"
                min={0}
                value={String(draft.nodesPerCluster)}
                onChange={(_, data) =>
                  updateDraft({ nodesPerCluster: getNumberInputValue(data.value) })
                }
              />
            </Field>
          </div>
        </Card>
      </div>
    </>
  );
}

function AddOnsStep({
  draft,
  updateDraft,
  headingRef,
  styles,
}: SharedStepProps) {
  return (
    <>
      <div className={styles.stepHeader}>
        <h2 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
          Serviços adicionais
        </h2>
        <p className={styles.stepDescription}>
          Selecione somente os add-ons necessários. Esta etapa é opcional.
        </p>
      </div>
      <div className={styles.addonList}>
        <Card className={styles.addonCard} appearance="outline">
          <div className={styles.addonIdentity}>
            <Checkbox
              label="Real User Monitoring (RUM)"
              checked={draft.rumEnabled}
              onChange={(_, data) => updateDraft({ rumEnabled: data.checked === true })}
            />
            <Text size={200} className={styles.addonDescription}>
              Visibilidade da experiência real, desempenho e erros no frontend.
            </Text>
          </div>
          {draft.rumEnabled ? (
            <div className={styles.addonFields}>
              <Field label="Aplicações">
                <Input
                  type="number"
                  min={0}
                  value={String(draft.rumApplications)}
                  onChange={(_, data) =>
                    updateDraft({ rumApplications: getNumberInputValue(data.value) })
                  }
                />
              </Field>
              <Field label="Milhares de sessões por mês">
                <Input
                  type="number"
                  min={0}
                  value={String(draft.rumSessionsThousands)}
                  onChange={(_, data) =>
                    updateDraft({
                      rumSessionsThousands: getNumberInputValue(data.value),
                    })
                  }
                />
              </Field>
            </div>
          ) : null}
        </Card>

        <Card className={styles.addonCard} appearance="outline">
          <div className={styles.addonIdentity}>
            <Checkbox
              label="Serverless Monitoring"
              checked={draft.serverlessEnabled}
              onChange={(_, data) =>
                updateDraft({ serverlessEnabled: data.checked === true })
              }
            />
            <Text size={200} className={styles.addonDescription}>
              Monitoramento de funções, chamadas, falhas e desempenho serverless.
            </Text>
          </div>
          {draft.serverlessEnabled ? (
            <div className={styles.addonFields}>
              <Field label="Funções monitoradas">
                <Input
                  type="number"
                  min={0}
                  value={String(draft.serverlessFunctions)}
                  onChange={(_, data) =>
                    updateDraft({
                      serverlessFunctions: getNumberInputValue(data.value),
                    })
                  }
                />
              </Field>
            </div>
          ) : null}
        </Card>

        <Card className={styles.addonCard} appearance="outline">
          <div className={styles.addonIdentity}>
            <Checkbox
              label="Logs"
              checked={draft.logsEnabled}
              onChange={(_, data) => updateDraft({ logsEnabled: data.checked === true })}
            />
            <Text size={200} className={styles.addonDescription}>
              Ingestão, retenção e análise de logs operacionais.
            </Text>
          </div>
          {draft.logsEnabled ? (
            <div className={styles.addonFields}>
              <Field label="Volume médio em GB por dia">
                <Input
                  type="number"
                  min={0}
                  value={String(draft.logsGbPerDay)}
                  onChange={(_, data) =>
                    updateDraft({ logsGbPerDay: getNumberInputValue(data.value) })
                  }
                />
              </Field>
            </div>
          ) : null}
        </Card>

        <Card className={styles.addonCard} appearance="outline">
          <div className={styles.addonIdentity}>
            <Checkbox
              label="Synthetic Monitoring"
              checked={draft.syntheticsEnabled}
              onChange={(_, data) =>
                updateDraft({ syntheticsEnabled: data.checked === true })
              }
            />
            <Text size={200} className={styles.addonDescription}>
              Testes proativos de disponibilidade e jornadas críticas.
            </Text>
          </div>
          {draft.syntheticsEnabled ? (
            <div className={styles.addonFields}>
              <Field label="Monitores sintéticos">
                <Input
                  type="number"
                  min={0}
                  value={String(draft.syntheticMonitors)}
                  onChange={(_, data) =>
                    updateDraft({
                      syntheticMonitors: getNumberInputValue(data.value),
                    })
                  }
                />
              </Field>
            </div>
          ) : null}
        </Card>
      </div>
      <MessageBar
        className={styles.messageBar}
        intent="info"
        icon={<InfoRegular />}
      >
        <MessageBarBody>
          Hosts e nós Kubernetes já foram dimensionados na etapa anterior. A
          revisão técnica poderá ajustar unidades e critérios de licenciamento.
        </MessageBarBody>
      </MessageBar>
    </>
  );
}

interface ReviewStepProps {
  draft: QuoteDraft;
  tagPlan: QuoteTagPlan;
  reviewAccepted: boolean;
  setReviewAccepted: (value: boolean) => void;
  submissionError: string;
  estimate: ReturnType<typeof calculateEstimate>;
  headingRef: HeadingRef;
  styles: WizardStyles;
}

function ReviewStep({
  draft,
  tagPlan,
  reviewAccepted,
  setReviewAccepted,
  submissionError,
  estimate,
  headingRef,
  styles,
}: ReviewStepProps) {
  const requestTypeLabel = draft.requestType
    ? requestTypeLabels[draft.requestType]
    : "Não informado";
  const systemStageLabel = draft.systemStage
    ? systemStageLabels[draft.systemStage]
    : "Não informado";

  return (
    <>
      <div className={styles.stepHeader}>
        <h2 ref={headingRef} tabIndex={-1} className={styles.stepTitle}>
          Revise antes de enviar
        </h2>
        <p className={styles.stepDescription}>
          Este conteúdo será registrado no orçamento e encaminhado para revisão.
        </p>
      </div>
      {submissionError ? (
        <MessageBar className={styles.messageBar} intent="error">
          <MessageBarBody>{submissionError}</MessageBarBody>
        </MessageBar>
      ) : null}
      <MessageBar className={styles.messageBar} intent="warning">
        <MessageBarBody>{priceNotice}</MessageBarBody>
      </MessageBar>
      <div className={styles.reviewSections}>
        <section className={styles.reviewSection} aria-labelledby="review-request">
          <h3 id="review-request" className={styles.reviewTitle}>
            Solicitação
          </h3>
          <dl className={styles.definitionList}>
            <dt className={styles.definitionTerm}>Solicitante</dt>
            <dd className={styles.definitionValue}>{draft.requesterName}</dd>
            <dt className={styles.definitionTerm}>E-mail</dt>
            <dd className={styles.definitionValue}>{draft.requesterEmail}</dd>
            <dt className={styles.definitionTerm}>Gestor</dt>
            <dd className={styles.definitionValue}>{draft.managerName}</dd>
            <dt className={styles.definitionTerm}>E-mail do gestor</dt>
            <dd className={styles.definitionValue}>{draft.managerEmail}</dd>
            <dt className={styles.definitionTerm}>Área / centro de custo</dt>
            <dd className={styles.definitionValue}>
              {draft.department} / {draft.costCenter}
            </dd>
            <dt className={styles.definitionTerm}>Vertical de negócio</dt>
            <dd className={styles.definitionValue}>{draft.businessVertical}</dd>
            <dt className={styles.definitionTerm}>Produto</dt>
            <dd className={styles.definitionValue}>{draft.productName}</dd>
            {draft.squadName.trim() ? (
              <>
                <dt className={styles.definitionTerm}>Squad</dt>
                <dd className={styles.definitionValue}>{draft.squadName}</dd>
              </>
            ) : null}
            <dt className={styles.definitionTerm}>Tipo de solicitação</dt>
            <dd className={styles.definitionValue}>
              {requestTypeLabel}
            </dd>
            <dt className={styles.definitionTerm}>Estágio do sistema</dt>
            <dd className={styles.definitionValue}>
              {systemStageLabel}
            </dd>
            <dt className={styles.definitionTerm}>Nome do sistema</dt>
            <dd className={styles.definitionValue}>{draft.systemName}</dd>
            <dt className={styles.definitionTerm}>Categoria (Porto SDM)</dt>
            <dd className={styles.definitionValue}>{draft.sdmCategoryName}</dd>
            {draft.requestType === "addition" ? (
              <>
                <dt className={styles.definitionTerm}>Orçamento anterior</dt>
                <dd className={styles.definitionValue}>
                  {draft.parentOrderId}
                </dd>
              </>
            ) : null}
          </dl>
        </section>
        <Divider />
        <section className={styles.reviewSection} aria-labelledby="review-tags">
          <div>
            <h3 id="review-tags" className={styles.reviewTitle}>
              Tags de rastreabilidade
            </h3>
            <Text size={200}>
              Taxonomia v{tagPlan.version} vinculada ao identificador{" "}
              <code>{tagPlan.orderId}</code>.
            </Text>
          </div>
          <TraceabilityTable plan={tagPlan} styles={styles} compact />
        </section>
        <Divider />
        <section className={styles.reviewSection} aria-labelledby="review-scope">
          <h3 id="review-scope" className={styles.reviewTitle}>
            Escopo técnico
          </h3>
          <dl className={styles.definitionList}>
            <dt className={styles.definitionTerm}>Hospedagem</dt>
            <dd className={styles.definitionValue}>
              {hostingLabels[draft.hosting]}
            </dd>
            <dt className={styles.definitionTerm}>Ambientes</dt>
            <dd className={styles.definitionValue}>
              {draft.environments.join(", ")}
            </dd>
            <dt className={styles.definitionTerm}>Hosts</dt>
            <dd className={styles.definitionValue}>{draft.hosts}</dd>
            <dt className={styles.definitionTerm}>Kubernetes</dt>
            <dd className={styles.definitionValue}>
              {draft.kubernetesClusters} cluster(s), {draft.nodesPerCluster} nó(s)
              por cluster
            </dd>
          </dl>
        </section>
        <Divider />
        <section className={styles.reviewSection} aria-labelledby="review-estimate">
          <h3 id="review-estimate" className={styles.reviewTitle}>
            Estimativa demonstrativa
          </h3>
          <EstimateTable estimate={estimate} styles={styles} />
        </section>
      </div>
      <div className={styles.reviewConfirmation}>
        <Checkbox
          checked={reviewAccepted}
          onChange={(_, data) => setReviewAccepted(data.checked === true)}
          label="Confirmo que revisei os dados e que eles representam a necessidade a ser analisada."
        />
      </div>
    </>
  );
}

function EstimateTable({
  estimate,
  styles,
}: {
  estimate: ReturnType<typeof calculateEstimate>;
  styles: WizardStyles;
}) {
  return (
    <div
      className={styles.tableWrap}
      role="region"
      aria-label="Tabela da composição da estimativa; use as setas para rolar horizontalmente"
      tabIndex={0}
    >
      <Table className={styles.estimateTable} aria-label="Composição da estimativa">
        <TableHeader>
          <TableRow>
            <TableHeaderCell>Item</TableHeaderCell>
            <TableHeaderCell className={styles.numericCell}>Quantidade</TableHeaderCell>
            <TableHeaderCell className={styles.numericCell}>Valor unitário</TableHeaderCell>
            <TableHeaderCell className={styles.numericCell}>Mensal</TableHeaderCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {estimate.lines.map((line) => (
            <TableRow key={line.id}>
              <TableCell>{line.label}</TableCell>
              <TableCell className={styles.numericCell}>
                {line.quantity} {line.unit}
              </TableCell>
              <TableCell className={styles.numericCell}>
                {formatCurrency(line.unitPrice)}
              </TableCell>
              <TableCell className={styles.numericCell}>
                {formatCurrency(line.monthlyTotal)}
              </TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell>
              <Text weight="semibold">Total estimado</Text>
            </TableCell>
            <TableCell />
            <TableCell />
            <TableCell className={styles.numericCell}>
              <Text weight="semibold">{formatCurrency(estimate.monthlyTotal)}</Text>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

interface SuccessStepProps {
  order: StoredOrder;
  submissionError: string;
  downloadAgain: () => Promise<void>;
  headingRef: HeadingRef;
  styles: WizardStyles;
}

function SuccessStep({
  order,
  submissionError,
  downloadAgain,
  headingRef,
  styles,
}: SuccessStepProps) {
  return (
    <div className={styles.success}>
      <CheckmarkCircleFilled className={styles.successIcon} aria-hidden="true" />
      <Badge appearance="tint" color="warning">
        Em revisão
      </Badge>
      <h2 ref={headingRef} tabIndex={-1} className={styles.successTitle}>
        Solicitação enviada para revisão
      </h2>
      <Text>
        O escopo e o manifesto de tags foram registrados neste navegador, e o
        comprovante do orçamento foi preparado em PDF. A equipe técnica fará a
        próxima análise.
      </Text>
      <span className={styles.orderId}>{order.id}</span>
      {order.parentOrderId ? (
        <Text>
          Vinculado ao orçamento anterior <strong>{order.parentOrderId}</strong>.
        </Text>
      ) : null}
      {submissionError ? (
        <MessageBar className={styles.messageBar} intent="warning">
          <MessageBarBody>{submissionError}</MessageBarBody>
        </MessageBar>
      ) : null}
      <div className={styles.successActions}>
        <Button
          appearance="primary"
          icon={<ArrowDownloadRegular />}
          onClick={downloadAgain}
        >
          Baixar PDF
        </Button>
        <Button as="a" href="/orcamentos" appearance="secondary">
          Ver meus orçamentos
        </Button>
      </div>
    </div>
  );
}

function QuoteSummary({
  draft,
  order,
  tagPlan,
  styles,
}: {
  draft: QuoteDraft;
  order: StoredOrder | null;
  tagPlan: QuoteTagPlan | null | undefined;
  styles: WizardStyles;
}) {
  const estimate = calculateEstimate(draft);
  const flow = [
    {
      title: "Orçamento enviado",
      description: "Concluído",
      current: false,
      done: true,
    },
    {
      title: "Revisão técnica",
      description: "Aguardando análise",
      current: true,
      done: false,
    },
    {
      title: "Aprovação da gestão",
      description: "Pendente",
      current: false,
      done: false,
    },
    {
      title: "Orçamento aprovado",
      description: "Pendente",
      current: false,
      done: false,
    },
  ];

  return (
    <Card className={styles.summary} aria-label="Resumo do orçamento">
      {tagPlan ? (
        <>
          <div>
            <Text block size={200}>
              Identificador do orçamento
            </Text>
            <span className={styles.taxonomyId}>{tagPlan.orderId}</span>
            <Text block size={200}>
              Taxonomia v{tagPlan.version} · {tagPlan.runtimeAttributeCount} atributos
              por ambiente
            </Text>
          </div>
          <Divider />
        </>
      ) : null}
      <div>
        <Text block size={200}>
          Estimativa mensal
        </Text>
        <div className={styles.total} aria-live="polite">
          <span className={styles.totalValue}>
            {formatCurrency(estimate.monthlyTotal)}
          </span>
          <span className={styles.annualValue}>
            {formatCurrency(estimate.annualTotal)} ao ano
          </span>
        </div>
      </div>
      <Divider />
      <div>
        <h2 className={styles.summaryTitle}>Itens dimensionados</h2>
        {estimate.lines.length ? (
          <ul className={styles.summaryList}>
            {estimate.lines.map((line) => (
              <li key={line.id} className={styles.summaryLine}>
                <span className={styles.summaryLineLabel}>{line.label}</span>
                <span>{formatCurrency(line.monthlyTotal)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Text size={200}>Adicione recursos para calcular.</Text>
        )}
      </div>
      {order ? (
        <>
          <Divider />
          <div>
            <h2 className={styles.summaryTitle}>Fluxo da solicitação</h2>
            <ol className={styles.flowList}>
              {flow.map((item) => (
                <li className={styles.flowItem} key={item.title}>
                  <span
                    className={mergeClasses(
                      styles.flowDot,
                      (item.current || item.done) && styles.flowDotCurrent,
                    )}
                  >
                    {item.done ? (
                      <CheckmarkRegular aria-hidden="true" />
                    ) : item.current ? (
                      <GaugeRegular aria-hidden="true" />
                    ) : null}
                  </span>
                  <span className={styles.flowText}>
                    <Text weight={item.current ? "semibold" : "regular"}>
                      {item.title}
                    </Text>
                    <Text size={200}>{item.description}</Text>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </>
      ) : null}
    </Card>
  );
}
