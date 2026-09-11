import {
  Badge,
  Button,
  Card,
  CardHeader,
  makeStyles,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  ArrowRightRegular,
  BranchForkRegular,
} from "@fluentui/react-icons";

import type { Route } from "./+types/home";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Portal de Observabilidade | Porto Seguros" },
    {
      name: "description",
      content:
        "Solicite, estime e acompanhe serviços de observabilidade da Porto Seguros.",
    },
  ];
}

const useStyles = makeStyles({
  page: {
    display: "grid",
    gap: tokens.spacingVerticalXXL,
    width: "100%",
    maxWidth: "1200px",
    minWidth: 0,
    margin: "0 auto",
  },
  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.6fr)",
    gap: tokens.spacingHorizontalXXL,
    alignItems: "center",
    padding: "40px",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow4,
    "@media (max-width: 900px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      padding: tokens.spacingHorizontalXXL,
    },
    "@media (max-width: 520px)": {
      padding: tokens.spacingHorizontalXL,
    },
  },
  title: {
    maxWidth: "760px",
    margin: 0,
    fontSize: tokens.fontSizeHero900,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero900,
    letterSpacing: "-0.03em",
    "@media (max-width: 900px)": {
      fontSize: tokens.fontSizeHero800,
      lineHeight: tokens.lineHeightHero800,
    },
    "@media (max-width: 520px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },
  lead: {
    maxWidth: "720px",
    marginTop: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalXL,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  heroVisual: {
    display: "grid",
    placeItems: "center",
    minHeight: "220px",
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorBrandBackground2,
    "@media (max-width: 900px)": {
      display: "none",
    },
  },
  heroIcon: {
    color: tokens.colorBrandForeground1,
    fontSize: "112px",
  },
  section: {
    display: "grid",
    gap: tokens.spacingVerticalL,
  },
  sectionHeading: {
    display: "flex",
    alignItems: "end",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalL,
  },
  sectionTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase600,
    lineHeight: tokens.lineHeightBase600,
  },
  sectionDescription: {
    margin: `${tokens.spacingVerticalXS} 0 0`,
    color: tokens.colorNeutralForeground2,
  },
  toolGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 900px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  toolCard: {
    gap: tokens.spacingVerticalM,
    minHeight: "230px",
    padding: tokens.spacingHorizontalXL,
  },
  toolIconBox: {
    display: "grid",
    placeItems: "center",
    width: "48px",
    height: "48px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  toolIcon: {
    display: "block",
    width: "30px",
    height: "30px",
    objectFit: "contain",
  },
  cardBody: {
    display: "grid",
    alignContent: "space-between",
    flexGrow: 1,
    gap: tokens.spacingVerticalL,
  },
  cardDescription: {
    margin: 0,
    color: tokens.colorNeutralForeground2,
    lineHeight: tokens.lineHeightBase300,
  },
  process: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    padding: tokens.spacingHorizontalXL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 900px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 520px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      padding: tokens.spacingHorizontalM,
    },
  },
  processStep: {
    position: "relative",
    display: "grid",
    gap: tokens.spacingVerticalS,
    padding: tokens.spacingHorizontalL,
    "&:not(:last-child)::after": {
      position: "absolute",
      top: "38px",
      right: "-12px",
      width: "24px",
      height: "1px",
      backgroundColor: tokens.colorNeutralStroke1,
      content: '""',
    },
    "@media (max-width: 900px)": {
      "&:not(:last-child)::after": {
        display: "none",
      },
    },
  },
  processNumber: {
    display: "grid",
    placeItems: "center",
    width: "36px",
    height: "36px",
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorNeutralForegroundOnBrand,
    backgroundColor: tokens.colorBrandBackground,
    fontWeight: tokens.fontWeightSemibold,
  },
  processText: {
    color: tokens.colorNeutralForeground2,
  },
});

const tools = [
  {
    name: "Dynatrace",
    description:
      "Dimensione hosts, clusters Kubernetes, RUM, serverless, logs e testes sintéticos.",
    status: "Disponível",
    icon: "/icons/dynatrace.svg",
    href: "/orcamentos/novo/dynatrace",
  },
  {
    name: "Datadog",
    description:
      "Solicitações para infraestrutura, APM, logs e experiência digital.",
    status: "Em breve",
    icon: "/icons/datadog.svg",
  },
  {
    name: "StackOpen",
    description:
      "Stack interna com OpenTelemetry, Prometheus, Grafana e componentes open source.",
    status: "Em breve",
    icon: "/icons/stackopen.svg",
  },
];

const process = [
  ["Dimensione", "Informe a infraestrutura e os serviços adicionais."],
  ["Revise", "Confira o escopo e a estimativa antes do envio."],
  ["Aprove", "A equipe técnica e os gestores analisam a solicitação."],
  ["Formalize", "O orçamento em PDF registra exatamente o que foi enviado."],
];

export default function Home() {
  const styles = useStyles();

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-title">
        <div>
          <h1 id="home-title" className={styles.title}>
            Planeje a observabilidade da sua aplicação em um só lugar
          </h1>
          <p className={styles.lead}>
            Crie uma solicitação, estime o investimento e acompanhe o fluxo de
            revisão e aprovação com rastreabilidade.
          </p>
          <Button
            as="a"
            href="/orcamentos"
            appearance="primary"
            size="large"
            icon={<ArrowRightRegular />}
            iconPosition="after"
          >
            Acessar Orçamentos
          </Button>
        </div>
        <div className={styles.heroVisual} aria-hidden="true">
          <BranchForkRegular className={styles.heroIcon} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="solutions-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="solutions-title" className={styles.sectionTitle}>
              Soluções disponíveis
            </h2>
            <p className={styles.sectionDescription}>
              Selecione a plataforma adequada ao seu cenário.
            </p>
          </div>
          <Button as="a" href="/orcamentos" appearance="subtle">
            Ver todas as solicitações
          </Button>
        </div>
        <div className={styles.toolGrid}>
          {tools.map((tool) => {
            return (
              <Card key={tool.name} className={styles.toolCard}>
                <CardHeader
                  image={
                    <div className={styles.toolIconBox}>
                      <img
                        className={styles.toolIcon}
                        src={tool.icon}
                        alt=""
                      />
                    </div>
                  }
                  header={<Text weight="semibold">{tool.name}</Text>}
                  description={
                    <Badge
                      appearance="tint"
                      color={tool.href ? "success" : "informative"}
                    >
                      {tool.status}
                    </Badge>
                  }
                />
                <div className={styles.cardBody}>
                  <p className={styles.cardDescription}>{tool.description}</p>
                  {tool.href ? (
                    <Button
                      as="a"
                      href={tool.href}
                      appearance="secondary"
                      icon={<ArrowRightRegular />}
                      iconPosition="after"
                    >
                      Solicitar orçamento
                    </Button>
                  ) : (
                    <Text size={200}>Em estruturação</Text>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="process-title">
        <div>
          <h2 id="process-title" className={styles.sectionTitle}>
            Como funciona
          </h2>
          <p className={styles.sectionDescription}>
            Um fluxo simples, inspirado no processo BPMN de solicitação.
          </p>
        </div>
        <div className={styles.process}>
          {process.map(([title, description], index) => (
            <div className={styles.processStep} key={title}>
              <span className={styles.processNumber}>{index + 1}</span>
              <Text weight="semibold">{title}</Text>
              <Text className={styles.processText} size={200}>
                {description}
              </Text>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
