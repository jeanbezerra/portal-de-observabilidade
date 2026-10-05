import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Tab,
  TabList,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  tokens,
} from "@fluentui/react-components";
import { PlayRegular } from "@fluentui/react-icons";
import { useId, useState } from "react";

import type { ScheduledJob } from "./scheduled-jobs-model";
import {
  ExecutionResultBadge,
  ExecutionStatus,
  TriggerStateBadge,
} from "./scheduled-job-status";

type DetailTab = "definition" | "triggers" | "execution" | "request";

const useStyles = makeStyles({
  surface: {
    width: "min(980px, calc(100vw - 32px))",
    maxWidth: "980px",
  },
  titleBlock: {
    display: "grid",
    gap: "2px",
  },
  titleKey: {
    color: tokens.colorNeutralForeground2,
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  content: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    minHeight: "420px",
    maxHeight: "min(68vh, 680px)",
    overflowY: "auto",
  },
  tabs: {
    overflowX: "auto",
  },
  tabPanel: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    paddingTop: tokens.spacingVerticalM,
  },
  definitionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    margin: 0,
    "@media (max-width: 760px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  definitionItem: {
    display: "grid",
    alignContent: "start",
    gap: tokens.spacingVerticalXS,
    minWidth: 0,
    padding: tokens.spacingHorizontalM,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  term: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
  },
  value: {
    margin: 0,
    overflowWrap: "anywhere",
  },
  monospace: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  policies: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalXS,
  },
  section: {
    display: "grid",
    gap: tokens.spacingVerticalM,
  },
  sectionTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  triggerCard: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  triggerHeader: {
    display: "flex",
    alignItems: "start",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  executionPanel: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  executionCard: {
    display: "grid",
    alignContent: "start",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  dataTable: {
    minWidth: "680px",
  },
  dataPanel: {
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
  },
  secondary: {
    color: tokens.colorNeutralForeground2,
  },
});

function DefinitionItem({
  term,
  children,
}: {
  term: string;
  children: React.ReactNode;
}) {
  const styles = useStyles();

  return (
    <div className={styles.definitionItem}>
      <dt className={styles.term}>{term}</dt>
      <dd className={styles.value}>{children}</dd>
    </div>
  );
}

export function ScheduledJobDetailsDialog({
  job,
  onTriggerNow,
}: {
  job: ScheduledJob;
  onTriggerNow: (job: ScheduledJob) => void;
}) {
  const styles = useStyles();
  const tabIdPrefix = useId();
  const [selectedTab, setSelectedTab] = useState<DetailTab>("definition");
  const hasActiveExecution = Boolean(job.activeExecution);
  const triggerNowDisabled = job.disallowConcurrent && hasActiveExecution;
  const httpParameters = job.httpRequest
    ? [
        ...job.httpRequest.queryParameters.map((parameter) => ({ location: "Query", ...parameter })),
        ...job.httpRequest.headers.map((parameter) => ({ location: "Cabeçalho", ...parameter })),
        ...job.httpRequest.cookies.map((parameter) => ({ location: "Cookie", ...parameter })),
        ...job.httpRequest.formParameters.map((parameter) => ({ location: "Formulário", ...parameter })),
        ...job.httpRequest.authentication.tokenParameters.map((parameter) => ({ location: "Token OAuth", ...parameter })),
      ]
    : [];

  return (
    <Dialog>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance="secondary">Detalhes</Button>
      </DialogTrigger>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>
            <span className={styles.titleBlock}>
              <span>Detalhes da rotina</span>
              <span className={styles.titleKey}>
                {job.group}.{job.name}
              </span>
            </span>
          </DialogTitle>
          <DialogContent className={styles.content}>
            <TabList
              className={styles.tabs}
              selectedValue={selectedTab}
              onTabSelect={(_, data) =>
                setSelectedTab(data.value as DetailTab)
              }
              aria-label="Seções dos detalhes da rotina"
            >
              <Tab id={`${tabIdPrefix}-definition`} value="definition">
                Definição
              </Tab>
              <Tab id={`${tabIdPrefix}-triggers`} value="triggers">
                Triggers ({job.triggers.length})
              </Tab>
              <Tab id={`${tabIdPrefix}-execution`} value="execution">
                Execução
              </Tab>
              <Tab id={`${tabIdPrefix}-request`} value="request">
                Requisição HTTP
              </Tab>
            </TabList>

            {selectedTab === "definition" ? (
              <div
                className={styles.tabPanel}
                role="tabpanel"
                aria-labelledby={`${tabIdPrefix}-definition`}
              >
                <section className={styles.section}>
                  <div>
                    <h3 className={styles.sectionTitle}>JobDetail</h3>
                    <Text className={styles.secondary}>
                      Definição persistida do executor e de suas políticas operacionais.
                    </Text>
                  </div>
                  <dl className={styles.definitionGrid}>
                    <DefinitionItem term="JobKey">
                      <Text className={styles.monospace}>{job.id}</Text>
                    </DefinitionItem>
                    <DefinitionItem term="Tipo do job">
                      <Text className={styles.monospace}>{job.type}</Text>
                    </DefinitionItem>
                    <DefinitionItem term="Descrição">
                      {job.description}
                    </DefinitionItem>
                    <DefinitionItem term="Durável">
                      {job.durable
                        ? "Permanece sem triggers associados"
                        : "Removido quando ficar sem triggers"}
                    </DefinitionItem>
                    <DefinitionItem term="Recuperação">
                      {job.requestsRecovery
                        ? "Solicita recuperação após falha da instância"
                        : "Não solicita recuperação automática"}
                    </DefinitionItem>
                    <DefinitionItem term="Interrupção">
                      {job.interruptable
                        ? "O handler aceita solicitação de interrupção"
                        : "O handler não é interrompível"}
                    </DefinitionItem>
                  </dl>
                </section>

                <section className={styles.section}>
                  <h3 className={styles.sectionTitle}>Políticas do handler</h3>
                  <div className={styles.policies}>
                    <Badge
                      appearance="tint"
                      color={job.disallowConcurrent ? "informative" : "subtle"}
                    >
                      {job.disallowConcurrent
                        ? "Execução concorrente bloqueada"
                        : "Execução concorrente permitida"}
                    </Badge>
                    <Badge
                      appearance="tint"
                      color="subtle"
                    >
                      Configuração HTTP imutável durante a execução
                    </Badge>
                  </div>
                </section>
              </div>
            ) : null}

            {selectedTab === "triggers" ? (
              <div
                className={styles.tabPanel}
                role="tabpanel"
                aria-labelledby={`${tabIdPrefix}-triggers`}
              >
                {job.triggers.length > 0 ? (
                  job.triggers.map((trigger) => (
                    <section className={styles.triggerCard} key={trigger.key}>
                      <div className={styles.triggerHeader}>
                        <div>
                          <Text block weight="semibold">
                            {trigger.group}.{trigger.key}
                          </Text>
                          <Text block size={200} className={styles.secondary}>
                            {trigger.type}
                          </Text>
                        </div>
                        <TriggerStateBadge state={trigger.state} />
                      </div>
                      <dl className={styles.definitionGrid}>
                        <DefinitionItem term="Agendamento">
                          {trigger.schedule}
                        </DefinitionItem>
                        <DefinitionItem term="Expressão">
                          <Text className={styles.monospace}>
                            {trigger.expression}
                          </Text>
                        </DefinitionItem>
                        <DefinitionItem term="Estado Quartz">
                          <Text className={styles.monospace}>{trigger.state}</Text>
                        </DefinitionItem>
                        <DefinitionItem term="Próximo disparo">
                          {trigger.nextFireTime}
                        </DefinitionItem>
                        <DefinitionItem term="Disparo anterior">
                          {trigger.previousFireTime}
                        </DefinitionItem>
                        <DefinitionItem term="Fuso horário">
                          <Text className={styles.monospace}>
                            {trigger.timeZone}
                          </Text>
                        </DefinitionItem>
                        <DefinitionItem term="Calendário de exclusão">
                          {trigger.calendar}
                        </DefinitionItem>
                        <DefinitionItem term="Política de misfire">
                          <Text className={styles.monospace}>
                            {trigger.misfireInstruction}
                          </Text>
                        </DefinitionItem>
                        <DefinitionItem term="Prioridade">
                          {trigger.priority}
                        </DefinitionItem>
                        <DefinitionItem term="Início">
                          {trigger.startAt}
                        </DefinitionItem>
                        <DefinitionItem term="Término">
                          {trigger.endAt}
                        </DefinitionItem>
                      </dl>
                    </section>
                  ))
                ) : (
                  <section className={styles.triggerCard}>
                    <Text weight="semibold">Nenhum trigger associado</Text>
                    <Text className={styles.secondary}>
                      Este JobDetail é durável e pode ser disparado manualmente
                      ou associado a um agendamento no futuro.
                    </Text>
                  </section>
                )}
              </div>
            ) : null}

            {selectedTab === "execution" ? (
              <div
                className={styles.tabPanel}
                role="tabpanel"
                aria-labelledby={`${tabIdPrefix}-execution`}
              >
                <div className={styles.executionPanel}>
                  <section className={styles.executionCard}>
                    <h3 className={styles.sectionTitle}>Execução atual</h3>
                    <ExecutionStatus execution={job.activeExecution} />
                    {job.activeExecution ? (
                      <dl className={styles.definitionGrid}>
                        <DefinitionItem term="Fire instance ID">
                          <Text className={styles.monospace}>
                            {job.activeExecution.fireInstanceId}
                          </Text>
                        </DefinitionItem>
                        <DefinitionItem term="Instância Quartz">
                          {job.activeExecution.schedulerInstance}
                        </DefinitionItem>
                        <DefinitionItem term="Pod EKS">
                          <Text className={styles.monospace}>
                            {job.activeExecution.podName}
                          </Text>
                        </DefinitionItem>
                        <DefinitionItem term="Disparo previsto">
                          {job.activeExecution.scheduledFireTime}
                        </DefinitionItem>
                        <DefinitionItem term="Início real">
                          {job.activeExecution.actualFireTime}
                        </DefinitionItem>
                        <DefinitionItem term="Recuperação">
                          {job.activeExecution.recovering ? "Sim" : "Não"}
                        </DefinitionItem>
                      </dl>
                    ) : (
                      <Text className={styles.secondary}>
                        A API não retornou um JobExecutionContext ativo para esta
                        rotina.
                      </Text>
                    )}
                  </section>

                  <section className={styles.executionCard}>
                    <h3 className={styles.sectionTitle}>Última execução</h3>
                    <ExecutionResultBadge result={job.lastExecution.result} />
                    <dl className={styles.definitionGrid}>
                      <DefinitionItem term="Finalizada em">
                        {job.lastExecution.finishedAt}
                      </DefinitionItem>
                      <DefinitionItem term="Duração">
                        {job.lastExecution.duration}
                      </DefinitionItem>
                      <DefinitionItem term="Resultado">
                        {job.lastExecution.message}
                      </DefinitionItem>
                    </dl>
                  </section>
                </div>
              </div>
            ) : null}

            {selectedTab === "request" ? (
              <div
                className={styles.tabPanel}
                role="tabpanel"
                aria-labelledby={`${tabIdPrefix}-request`}
              >
                {job.httpRequest ? (
                  <>
                    <dl className={styles.definitionGrid}>
                      <DefinitionItem term="Método e URL">
                        <Text className={styles.monospace}>
                          {job.httpRequest.method} {job.httpRequest.url}
                        </Text>
                      </DefinitionItem>
                      <DefinitionItem term="Autenticação">
                        {job.httpRequest.authentication.type}
                      </DefinitionItem>
                      <DefinitionItem term="Corpo">
                        {job.httpRequest.bodyType} · {job.httpRequest.contentType || "Content-Type não definido"}
                      </DefinitionItem>
                      <DefinitionItem term="Timeouts">
                        Conexão {job.httpRequest.connectTimeoutSeconds}s · resposta {job.httpRequest.requestTimeoutSeconds}s
                      </DefinitionItem>
                      <DefinitionItem term="Validação SSL/TLS">
                        {job.httpRequest.ignoreTlsValidation
                          ? "Ignorada (modo inseguro)"
                          : "Ativa"}
                      </DefinitionItem>
                      <DefinitionItem term="Retentativas">
                        Até {job.httpRequest.retry.maxAttempts} tentativa(s)
                      </DefinitionItem>
                      <DefinitionItem term="Resposta aceita">
                        {job.httpRequest.expectedStatusCodes.length > 0
                          ? job.httpRequest.expectedStatusCodes.join(", ")
                          : "Qualquer status 2xx"}
                      </DefinitionItem>
                    </dl>
                    <Text className={styles.secondary}>
                      Valores protegidos aparecem apenas como referência de ambiente.
                    </Text>
                    <div className={styles.dataPanel}>
                      <Table className={styles.dataTable} aria-label="Parâmetros da requisição HTTP">
                        <TableHeader>
                          <TableRow>
                            <TableHeaderCell>Local</TableHeaderCell>
                            <TableHeaderCell>Nome</TableHeaderCell>
                            <TableHeaderCell>Valor ou referência</TableHeaderCell>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {httpParameters.map((parameter, index) => (
                            <TableRow key={`${parameter.location}-${parameter.name}-${index}`}>
                              <TableCell>{parameter.location}</TableCell>
                              <TableCell><Text className={styles.monospace}>{parameter.name}</Text></TableCell>
                              <TableCell>
                                <Text className={styles.monospace}>
                                  {parameter.secretRef ?? parameter.value ?? ""}
                                </Text>
                                {parameter.secretRef ? (
                                  <Badge appearance="tint" color="subtle">Referência protegida</Badge>
                                ) : null}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                ) : (
                  <MessageBar intent="warning">
                    <MessageBarBody>
                      Esta rotina usa uma definição legada e não possui configuração HTTP.
                    </MessageBarBody>
                  </MessageBar>
                )}
              </div>
            ) : null}
          </DialogContent>
          <DialogActions>
            <DialogTrigger action="close" disableButtonEnhancement>
              <Button appearance="secondary">Fechar</Button>
            </DialogTrigger>
            <DialogTrigger action="close" disableButtonEnhancement>
              <Button
                appearance="primary"
                icon={<PlayRegular />}
                disabled={triggerNowDisabled}
                onClick={() => onTriggerNow(job)}
              >
                Disparar agora
              </Button>
            </DialogTrigger>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
