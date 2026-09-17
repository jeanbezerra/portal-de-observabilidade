import { makeStyles, Text, tokens } from "@fluentui/react-components";
import {
  CalendarClockRegular,
  HistoryRegular,
  type FluentIcon,
} from "@fluentui/react-icons";

import type { Route } from "./+types/administration-scheduling";
import { PageBreadcrumb } from "../components/page-breadcrumb";
import { ScheduledJobsPage } from "../features/administration/scheduled-jobs-page";

type SchedulingSection = {
  title: string;
  description: string;
  emptyState: string;
  icon: FluentIcon;
};

const schedulingSections: Record<string, SchedulingSection> = {
  "rotinas-agendadas": {
    title: "Rotinas agendadas",
    description:
      "Gerencie as rotinas, seus calendários, fusos horários e regras de execução.",
    emptyState: "O gerenciamento de rotinas agendadas será disponibilizado aqui.",
    icon: CalendarClockRegular,
  },
  "historico-execucoes": {
    title: "Histórico de execuções",
    description:
      "Consulte o resultado, a duração e a instância responsável por cada execução.",
    emptyState: "O histórico de execuções do scheduler será disponibilizado aqui.",
    icon: HistoryRegular,
  },
};

const useStyles = makeStyles({
  page: {
    display: "grid",
    gap: tokens.spacingVerticalXXL,
    width: "100%",
    maxWidth: "1200px",
    minWidth: 0,
    margin: "0 auto",
  },
  header: {
    display: "grid",
    gap: tokens.spacingVerticalS,
  },
  eyebrow: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero800,
    "@media (max-width: 520px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },
  description: {
    maxWidth: "720px",
    margin: 0,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  emptyState: {
    display: "grid",
    justifyItems: "center",
    gap: tokens.spacingVerticalM,
    minHeight: "280px",
    padding: tokens.spacingHorizontalXXL,
    textAlign: "center",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  emptyStateContent: {
    display: "grid",
    alignSelf: "center",
    justifyItems: "center",
    gap: tokens.spacingVerticalM,
    maxWidth: "480px",
  },
  iconBox: {
    display: "grid",
    placeItems: "center",
    width: "64px",
    height: "64px",
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
  },
  icon: {
    fontSize: "28px",
  },
  emptyStateTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
  },
  emptyStateDescription: {
    margin: 0,
    color: tokens.colorNeutralForeground2,
  },
});

export function meta({ params }: Route.MetaArgs) {
  const section = schedulingSections[params.secao];

  return [
    {
      title: section
        ? `${section.title} | Agendamentos | Portal de Observabilidade`
        : "Agendamentos | Portal de Observabilidade",
    },
  ];
}

export default function AdministrationScheduling({
  params,
}: Route.ComponentProps) {
  const styles = useStyles();
  const section = schedulingSections[params.secao];

  if (!section) {
    throw new Response("Seção de agendamentos não encontrada", { status: 404 });
  }

  if (params.secao === "rotinas-agendadas") {
    return <ScheduledJobsPage />;
  }

  const SectionIcon = section.icon;
  const titleId = `scheduling-${params.secao}-empty-title`;

  return (
    <div className={styles.page}>
      <PageBreadcrumb
        items={[
          { label: "Visão geral", href: "/" },
          { label: "Administração" },
          { label: "Agendamentos" },
          { label: section.title },
        ]}
      />

      <header className={styles.header}>
        <Text className={styles.eyebrow}>Administração · Agendamentos</Text>
        <h1 className={styles.title}>{section.title}</h1>
        <p className={styles.description}>{section.description}</p>
      </header>

      <section className={styles.emptyState} aria-labelledby={titleId}>
        <div className={styles.emptyStateContent}>
          <span className={styles.iconBox} aria-hidden="true">
            <SectionIcon className={styles.icon} />
          </span>
          <h2 id={titleId} className={styles.emptyStateTitle}>
            Área em preparação
          </h2>
          <p className={styles.emptyStateDescription}>{section.emptyState}</p>
        </div>
      </section>
    </div>
  );
}
