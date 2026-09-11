import {
  Badge,
  Button,
  Card,
  CardHeader,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
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
  AddRegular,
  ArrowRightRegular,
  DocumentRegular,
  InfoRegular,
} from "@fluentui/react-icons";
import { useEffect, useState } from "react";

import type { Route } from "./+types/budgets";
import {
  loadOrders,
  type StoredOrder,
} from "../features/quotes/order-storage";
import { formatCurrency } from "../features/quotes/quote-model";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Orçamentos | Portal de Observabilidade" },
    {
      name: "description",
      content: "Crie e acompanhe solicitações de orçamento de observabilidade.",
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
  pageHeader: {
    display: "flex",
    alignItems: "end",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 600px)": {
      alignItems: "stretch",
      flexDirection: "column",
    },
  },
  title: {
    margin: 0,
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    letterSpacing: "-0.02em",
    "@media (max-width: 600px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },
  lead: {
    maxWidth: "720px",
    marginTop: tokens.spacingVerticalS,
    marginBottom: 0,
    color: tokens.colorNeutralForeground2,
  },
  section: {
    display: "grid",
    gap: tokens.spacingVerticalL,
  },
  messageBar: {
    minWidth: 0,
    whiteSpace: "normal",
  },
  sectionTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
  },
  providerGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 900px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  providerCard: {
    gap: tokens.spacingVerticalM,
    minHeight: "210px",
    padding: tokens.spacingHorizontalXL,
  },
  activeCard: {
    ...shorthands.borderColor(tokens.colorBrandStroke1),
  },
  iconBox: {
    display: "grid",
    placeItems: "center",
    width: "48px",
    height: "48px",
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  icon: {
    display: "block",
    width: "30px",
    height: "30px",
    objectFit: "contain",
  },
  providerBody: {
    display: "grid",
    alignContent: "space-between",
    flexGrow: 1,
    gap: tokens.spacingVerticalL,
  },
  description: {
    margin: 0,
    color: tokens.colorNeutralForeground2,
  },
  tablePanel: {
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  table: {
    minWidth: "880px",
  },
  empty: {
    display: "grid",
    justifyItems: "center",
    gap: tokens.spacingVerticalM,
    padding: "48px 24px",
    textAlign: "center",
  },
  emptyIcon: {
    color: tokens.colorNeutralForeground3,
    fontSize: "40px",
  },
});

const providers = [
  {
    name: "Dynatrace",
    description:
      "Infraestrutura, Kubernetes e serviços adicionais em um único orçamento.",
    icon: "/icons/dynatrace.svg",
    available: true,
  },
  {
    name: "Datadog",
    description: "Solução corporativa em estruturação.",
    icon: "/icons/datadog.svg",
    available: false,
  },
  {
    name: "StackOpen",
    description: "OpenTelemetry, Prometheus, Grafana e demais stacks internas.",
    icon: "/icons/stackopen.svg",
    available: false,
  },
];

export default function Budgets() {
  const styles = useStyles();
  const [orders, setOrders] = useState<StoredOrder[]>([]);

  useEffect(() => {
    setOrders(loadOrders());
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Orçamentos</h1>
          <p className={styles.lead}>
            Dimensione recursos, formalize a necessidade e acompanhe cada
            solicitação até a aprovação.
          </p>
        </div>
        <Button
          as="a"
          href="/orcamentos/novo/dynatrace"
          appearance="primary"
          size="large"
          icon={<AddRegular />}
        >
          Nova solicitação
        </Button>
      </header>

      <MessageBar
        className={styles.messageBar}
        intent="info"
        icon={<InfoRegular />}
      >
        <MessageBarBody>
          Os valores apresentados no protótipo são referências internas
          demonstrativas e serão validados durante a revisão técnica.
        </MessageBarBody>
      </MessageBar>

      <section className={styles.section} aria-labelledby="providers-title">
        <h2 id="providers-title" className={styles.sectionTitle}>
          Escolha a solução
        </h2>
        <div className={styles.providerGrid}>
          {providers.map((provider) => {
            return (
              <Card
                key={provider.name}
                className={mergeClasses(
                  styles.providerCard,
                  provider.available && styles.activeCard,
                )}
              >
                <CardHeader
                  image={
                    <div className={styles.iconBox}>
                      <img
                        className={styles.icon}
                        src={provider.icon}
                        alt=""
                      />
                    </div>
                  }
                  header={<Text weight="semibold">{provider.name}</Text>}
                  description={
                    <Badge
                      appearance="tint"
                      color={provider.available ? "success" : "informative"}
                    >
                      {provider.available ? "Disponível" : "Em breve"}
                    </Badge>
                  }
                />
                <div className={styles.providerBody}>
                  <p className={styles.description}>{provider.description}</p>
                  {provider.available ? (
                    <Button
                      as="a"
                      href="/orcamentos/novo/dynatrace"
                      appearance="secondary"
                      icon={<ArrowRightRegular />}
                      iconPosition="after"
                    >
                      Criar orçamento
                    </Button>
                  ) : (
                    <Text size={200}>Ainda não aceita solicitações</Text>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="orders-title">
        <h2 id="orders-title" className={styles.sectionTitle}>
          Meus orçamentos
        </h2>
        <div className={styles.tablePanel}>
          {orders.length > 0 ? (
            <Table className={styles.table} aria-label="Orçamentos enviados">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Orçamento</TableHeaderCell>
                  <TableHeaderCell>Sistema / projeto</TableHeaderCell>
                  <TableHeaderCell>Solução</TableHeaderCell>
                  <TableHeaderCell>Estimativa mensal</TableHeaderCell>
                  <TableHeaderCell>Estimativa anual</TableHeaderCell>
                  <TableHeaderCell>Enviado em</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Text block weight="semibold">
                        {order.id}
                      </Text>
                      {order.parentOrderId ? (
                        <Text block size={200}>
                          Orçamento anterior: {order.parentOrderId}
                        </Text>
                      ) : null}
                    </TableCell>
                    <TableCell>{order.draft.systemName}</TableCell>
                    <TableCell>{order.provider}</TableCell>
                    <TableCell>
                      {formatCurrency(order.estimate.monthlyTotal)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(order.estimate.annualTotal)}
                    </TableCell>
                    <TableCell>
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge appearance="tint" color="warning">
                        {order.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className={styles.empty}>
              <DocumentRegular className={styles.emptyIcon} aria-hidden="true" />
              <div>
                <Text block weight="semibold">
                  Nenhum orçamento enviado
                </Text>
                <Text block size={200}>
                  As solicitações aparecerão aqui depois do envio para revisão.
                </Text>
              </div>
              <Button
                as="a"
                href="/orcamentos/novo/dynatrace"
                appearance="secondary"
                icon={<AddRegular />}
              >
                Criar primeiro orçamento
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
