import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Select,
  Text,
  Textarea,
  tokens,
} from "@fluentui/react-components";
import { AddRegular, DeleteRegular } from "@fluentui/react-icons";
import { useEffect, useId, useState, type FormEvent } from "react";

import {
  getPrimaryTrigger,
  triggerTypes,
  type ScheduledJob,
  type TriggerType,
} from "./scheduled-jobs-model";

const useStyles = makeStyles({
  surface: {
    width: "min(820px, calc(100vw - 32px))",
    maxWidth: "820px",
  },
  compactSurface: {
    width: "min(680px, calc(100vw - 32px))",
    maxWidth: "680px",
  },
  form: {
    display: "grid",
    gap: tokens.spacingVerticalL,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
    "@media (max-width: 620px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  textarea: {
    minHeight: "86px",
  },
  checks: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: tokens.spacingVerticalS,
    "@media (max-width: 620px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  deleteButton: {
    color: tokens.colorStatusDangerForegroundInverted,
    backgroundColor: tokens.colorStatusDangerBackground3,
    "&:hover": {
      color: tokens.colorStatusDangerForegroundInverted,
      backgroundColor: tokens.colorStatusDangerBackground3Hover,
    },
    "&:active": {
      color: tokens.colorStatusDangerForegroundInverted,
      backgroundColor: tokens.colorStatusDangerBackground3Pressed,
    },
  },
  key: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  deleteContent: {
    display: "grid",
    gap: tokens.spacingVerticalM,
  },
});

type CreateJobDraft = {
  name: string;
  group: string;
  description: string;
  handler: string;
  triggerType: TriggerType;
  expression: string;
  timeZone: string;
  calendar: string;
  durable: boolean;
  requestsRecovery: boolean;
  disallowConcurrent: boolean;
  persistJobData: boolean;
};

const emptyCreateDraft: CreateJobDraft = {
  name: "",
  group: "plataforma",
  description: "",
  handler: "CalendarSyncJob",
  triggerType: "CronTrigger",
  expression: "0 0 8 ? * MON-FRI",
  timeZone: "America/Sao_Paulo",
  calendar: "feriados-nacionais-br",
  durable: true,
  requestsRecovery: false,
  disallowConcurrent: true,
  persistJobData: false,
};

const handlerOptions = [
  "BillingCloseJob",
  "CalendarSyncJob",
  "RegulatoryReportJob",
  "MetricCompactionJob",
  "DeadLetterReplayJob",
  "DailyReconciliationJob",
  "OnDemandExportJob",
];

function isValidQuartzKey(value: string) {
  return /^[a-z0-9][a-z0-9._-]*$/.test(value);
}

function buildScheduleSummary(type: TriggerType, expression: string) {
  if (type === "CronTrigger") return `Expressão Quartz cron: ${expression}`;
  if (type === "SimpleTrigger") return `Intervalo simples: ${expression}`;
  if (type === "CalendarIntervalTrigger") {
    return `Intervalo de calendário: ${expression}`;
  }
  return `Janela diária: ${expression}`;
}

export function CreateScheduledJobDialog({
  jobs,
  onCreate,
}: {
  jobs: ScheduledJob[];
  onCreate: (job: ScheduledJob) => void;
}) {
  const styles = useStyles();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CreateJobDraft>(emptyCreateDraft);
  const [showErrors, setShowErrors] = useState(false);

  const normalizedName = draft.name.trim().toLocaleLowerCase("pt-BR");
  const normalizedGroup = draft.group.trim().toLocaleLowerCase("pt-BR");
  const duplicate = jobs.some(
    (job) => job.name === normalizedName && job.group === normalizedGroup,
  );
  const nameError = !draft.name.trim()
    ? "Informe o nome da rotina."
    : !isValidQuartzKey(normalizedName)
      ? "Use letras minúsculas, números, ponto, hífen ou sublinhado."
      : undefined;
  const groupError = !draft.group.trim()
    ? "Informe o grupo da rotina."
    : !isValidQuartzKey(normalizedGroup)
      ? "Use letras minúsculas, números, ponto, hífen ou sublinhado."
      : undefined;

  function updateDraft(update: Partial<CreateJobDraft>) {
    setDraft((current) => ({ ...current, ...update }));
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft({ ...emptyCreateDraft });
      setShowErrors(false);
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);

    if (nameError || groupError || duplicate || !draft.expression.trim()) return;

    const id = `${normalizedGroup}.${normalizedName}`;
    onCreate({
      id,
      name: normalizedName,
      group: normalizedGroup,
      description:
        draft.description.trim() || "Rotina criada no portal administrativo.",
      jobClass: `br.com.porto.scheduler.jobs.${draft.handler}`,
      durable: draft.durable,
      requestsRecovery: draft.requestsRecovery,
      disallowConcurrent: draft.disallowConcurrent,
      persistJobData: draft.persistJobData,
      interruptable: [
        "BillingCloseJob",
        "RegulatoryReportJob",
        "MetricCompactionJob",
        "DeadLetterReplayJob",
        "OnDemandExportJob",
      ].includes(draft.handler),
      triggers: [
        {
          key: `${normalizedName}-trigger`,
          group: normalizedGroup,
          type: draft.triggerType,
          state: "NORMAL",
          schedule: buildScheduleSummary(
            draft.triggerType,
            draft.expression.trim(),
          ),
          expression: draft.expression.trim(),
          timeZone: draft.timeZone,
          calendar: draft.calendar,
          nextFireTime: "Calculado pela API após persistir",
          previousFireTime: "Nunca disparado",
          startAt: "Imediatamente após a criação",
          endAt: "Sem término",
          priority: 5,
          misfireInstruction: "SMART_POLICY",
        },
      ],
      lastExecution: {
        result: "NONE",
        finishedAt: "Nunca executado",
        duration: "—",
        message: "Nenhuma execução registrada.",
      },
      jobData: [],
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(_, data) => handleOpenChange(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        <Button appearance="primary" size="large" icon={<AddRegular />}>
          Criar rotina
        </Button>
      </DialogTrigger>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Criar rotina agendada</DialogTitle>
          <DialogContent>
            <form
              id={formId}
              className={styles.form}
              onSubmit={handleSubmit}
              noValidate
            >
              <MessageBar intent="info">
                <MessageBarBody>
                  A API criará um JobDetail e seu primeiro Trigger em uma única
                  operação. Somente handlers publicados e autorizados podem ser
                  selecionados.
                </MessageBarBody>
              </MessageBar>

              {showErrors && duplicate ? (
                <MessageBar intent="error" role="alert">
                  <MessageBarBody>
                    Já existe uma rotina com este nome e grupo.
                  </MessageBarBody>
                </MessageBar>
              ) : null}

              <div className={styles.formGrid}>
                <Field
                  label="Nome da rotina"
                  required
                  hint="Forma a JobKey junto com o grupo"
                  validationState={showErrors && nameError ? "error" : "none"}
                  validationMessage={showErrors ? nameError : undefined}
                >
                  <Input
                    value={draft.name}
                    onChange={(_, data) => updateDraft({ name: data.value })}
                  />
                </Field>
                <Field
                  label="Grupo"
                  required
                  hint="Organiza operações coletivas no Quartz"
                  validationState={showErrors && groupError ? "error" : "none"}
                  validationMessage={showErrors ? groupError : undefined}
                >
                  <Input
                    value={draft.group}
                    onChange={(_, data) => updateDraft({ group: data.value })}
                  />
                </Field>
                <Field
                  className={styles.fullWidth}
                  label="Descrição"
                  hint="Explique o efeito operacional da rotina"
                >
                  <Textarea
                    className={styles.textarea}
                    value={draft.description}
                    onChange={(_, data) =>
                      updateDraft({ description: data.value })
                    }
                  />
                </Field>
                <Field label="Tipo de job" required>
                  <Select
                    value={draft.handler}
                    onChange={(event) =>
                      updateDraft({ handler: event.target.value })
                    }
                  >
                    {handlerOptions.map((handler) => (
                      <option key={handler} value={handler}>
                        {handler}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tipo de trigger" required>
                  <Select
                    value={draft.triggerType}
                    onChange={(event) =>
                      updateDraft({
                        triggerType: event.target.value as TriggerType,
                      })
                    }
                  >
                    {triggerTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  className={styles.fullWidth}
                  label="Expressão ou intervalo"
                  required
                  hint="A API validará o formato conforme o tipo de trigger"
                  validationState={
                    showErrors && !draft.expression.trim() ? "error" : "none"
                  }
                  validationMessage={
                    showErrors && !draft.expression.trim()
                      ? "Informe a expressão do agendamento."
                      : undefined
                  }
                >
                  <Input
                    value={draft.expression}
                    onChange={(_, data) =>
                      updateDraft({ expression: data.value })
                    }
                  />
                </Field>
                <Field label="Fuso horário" required>
                  <Select
                    value={draft.timeZone}
                    onChange={(event) =>
                      updateDraft({ timeZone: event.target.value })
                    }
                  >
                    <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                    <option value="UTC">UTC</option>
                    <option value="America/Manaus">America/Manaus</option>
                  </Select>
                </Field>
                <Field label="Calendário de exclusão">
                  <Select
                    value={draft.calendar}
                    onChange={(event) =>
                      updateDraft({ calendar: event.target.value })
                    }
                  >
                    <option value="Sem calendário de exclusão">
                      Nenhum
                    </option>
                    <option value="feriados-nacionais-br">
                      Feriados nacionais — Brasil
                    </option>
                    <option value="feriados-bancarios-br">
                      Feriados bancários — Brasil
                    </option>
                  </Select>
                </Field>
              </div>

              <div className={styles.checks}>
                <Checkbox
                  label="Manter o JobDetail sem triggers"
                  checked={draft.durable}
                  onChange={(_, data) =>
                    updateDraft({ durable: Boolean(data.checked) })
                  }
                />
                <Checkbox
                  label="Solicitar recuperação após falha da instância"
                  checked={draft.requestsRecovery}
                  onChange={(_, data) =>
                    updateDraft({ requestsRecovery: Boolean(data.checked) })
                  }
                />
                <Checkbox
                  label="Impedir execuções concorrentes"
                  checked={draft.disallowConcurrent}
                  onChange={(_, data) =>
                    updateDraft({ disallowConcurrent: Boolean(data.checked) })
                  }
                />
                <Checkbox
                  label="Persistir alterações do JobDataMap"
                  checked={draft.persistJobData}
                  onChange={(_, data) =>
                    updateDraft({ persistJobData: Boolean(data.checked) })
                  }
                />
              </div>
            </form>
          </DialogContent>
          <DialogActions>
            <DialogTrigger action="close" disableButtonEnhancement>
              <Button appearance="secondary">Cancelar</Button>
            </DialogTrigger>
            <Button appearance="primary" type="submit" form={formId}>
              Criar rotina
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

export type ScheduleDraft = {
  triggerType: TriggerType;
  expression: string;
  timeZone: string;
  calendar: string;
  misfireInstruction: string;
  priority: number;
};

export function ScheduleEditorDialog({
  job,
  onClose,
  onSave,
}: {
  job?: ScheduledJob;
  onClose: () => void;
  onSave: (job: ScheduledJob, draft: ScheduleDraft) => void;
}) {
  const styles = useStyles();
  const trigger = job ? getPrimaryTrigger(job) : undefined;
  const [draft, setDraft] = useState<ScheduleDraft>({
    triggerType: "CronTrigger",
    expression: "",
    timeZone: "America/Sao_Paulo",
    calendar: "Sem calendário de exclusão",
    misfireInstruction: "SMART_POLICY",
    priority: 5,
  });

  useEffect(() => {
    if (!job || !trigger) return;
    setDraft({
      triggerType: trigger.type,
      expression: trigger.expression,
      timeZone: trigger.timeZone,
      calendar: trigger.calendar,
      misfireInstruction: trigger.misfireInstruction,
      priority: trigger.priority,
    });
  }, [job, trigger]);

  if (!job || !trigger) return null;
  const selectedJob = job;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(selectedJob, draft);
  }

  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
    >
      <DialogSurface className={styles.compactSurface}>
        <DialogBody>
          <DialogTitle>Editar agendamento</DialogTitle>
          <DialogContent>
            <form className={styles.form} onSubmit={handleSubmit}>
              <MessageBar intent="warning">
                <MessageBarBody>
                  Ao salvar, a API usará rescheduleJob para substituir o trigger
                  <Text className={styles.key}> {trigger.group}.{trigger.key}</Text>.
                  O JobDetail permanecerá o mesmo.
                </MessageBarBody>
              </MessageBar>
              <div className={styles.formGrid}>
                <Field label="Tipo de trigger" required>
                  <Select
                    value={draft.triggerType}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        triggerType: event.target.value as TriggerType,
                      }))
                    }
                  >
                    {triggerTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Prioridade" required>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={String(draft.priority)}
                    onChange={(_, data) =>
                      setDraft((current) => ({
                        ...current,
                        priority: Number(data.value),
                      }))
                    }
                  />
                </Field>
                <Field
                  className={styles.fullWidth}
                  label="Expressão ou intervalo"
                  required
                >
                  <Input
                    value={draft.expression}
                    onChange={(_, data) =>
                      setDraft((current) => ({
                        ...current,
                        expression: data.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Fuso horário" required>
                  <Select
                    value={draft.timeZone}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        timeZone: event.target.value,
                      }))
                    }
                  >
                    <option value="America/Sao_Paulo">America/Sao_Paulo</option>
                    <option value="UTC">UTC</option>
                    <option value="America/Manaus">America/Manaus</option>
                  </Select>
                </Field>
                <Field label="Calendário de exclusão">
                  <Select
                    value={draft.calendar}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        calendar: event.target.value,
                      }))
                    }
                  >
                    <option value="Sem calendário de exclusão">Nenhum</option>
                    <option value="feriados-nacionais-br">
                      Feriados nacionais — Brasil
                    </option>
                    <option value="feriados-bancarios-br">
                      Feriados bancários — Brasil
                    </option>
                  </Select>
                </Field>
                <Field
                  className={styles.fullWidth}
                  label="Política de misfire"
                  hint="Define como tratar um disparo que não ocorreu no horário previsto"
                >
                  <Select
                    value={draft.misfireInstruction}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        misfireInstruction: event.target.value,
                      }))
                    }
                  >
                    <option value="SMART_POLICY">SMART_POLICY</option>
                    <option value="DO_NOTHING">DO_NOTHING</option>
                    <option value="FIRE_ONCE_NOW">FIRE_ONCE_NOW</option>
                  </Select>
                </Field>
              </div>
            </form>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              appearance="primary"
              onClick={() => onSave(selectedJob, draft)}
            >
              Salvar agendamento
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

export function DeleteScheduledJobDialog({
  job,
  onClose,
  onDelete,
}: {
  job?: ScheduledJob;
  onClose: () => void;
  onDelete: (job: ScheduledJob) => void;
}) {
  const styles = useStyles();
  if (!job) return null;

  return (
    <Dialog
      open
      modalType="alert"
      onOpenChange={(_, data) => {
        if (!data.open) onClose();
      }}
    >
      <DialogSurface className={styles.compactSurface}>
        <DialogBody>
          <DialogTitle>Excluir esta rotina?</DialogTitle>
          <DialogContent className={styles.deleteContent}>
            <Text>
              A API chamará deleteJob para remover o JobDetail
              <Text className={styles.key}> {job.id}</Text> e todos os triggers
              associados. Uma execução já iniciada pode continuar até terminar.
            </Text>
            <MessageBar intent="warning">
              <MessageBarBody>
                O histórico auditável capturado pela aplicação será preservado.
              </MessageBarBody>
            </MessageBar>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              className={styles.deleteButton}
              icon={<DeleteRegular />}
              onClick={() => onDelete(job)}
            >
              Excluir rotina
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
