import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Select,
  Text,
  tokens,
} from "@fluentui/react-components";
import { DeleteRegular } from "@fluentui/react-icons";
import { useEffect, useId, useState, type FormEvent } from "react";

import {
  getPrimaryTrigger,
  triggerTypes,
  type ScheduledJob,
  type TriggerType,
} from "./scheduled-jobs-model";

const useStyles = makeStyles({
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

export type ScheduleDraft = {
  triggerType: TriggerType;
  expression: string;
  timeZone: string;
  calendar: string;
  misfireInstruction: string;
  priority: number;
};

const triggerExpressionDefaults: Record<TriggerType, string> = {
  CronTrigger: "0 0 8 ? * MON-FRI",
  SimpleTrigger: "INTERVAL 5 MINUTES · REPEAT FOREVER",
  CalendarIntervalTrigger: "1 DAY",
  DailyTimeIntervalTrigger:
    "MON-FRI · 08:00-18:00 · INTERVAL 30 MINUTES",
};

const misfireOptions: Record<TriggerType, string[]> = {
  CronTrigger: [
    "SMART_POLICY",
    "DO_NOTHING",
    "FIRE_ONCE_NOW",
    "IGNORE_MISFIRE_POLICY",
  ],
  SimpleTrigger: [
    "SMART_POLICY",
    "FIRE_NOW",
    "RESCHEDULE_NOW_WITH_EXISTING_REPEAT_COUNT",
    "RESCHEDULE_NEXT_WITH_REMAINING_COUNT",
    "IGNORE_MISFIRE_POLICY",
  ],
  CalendarIntervalTrigger: [
    "SMART_POLICY",
    "DO_NOTHING",
    "FIRE_ONCE_NOW",
    "IGNORE_MISFIRE_POLICY",
  ],
  DailyTimeIntervalTrigger: [
    "SMART_POLICY",
    "DO_NOTHING",
    "FIRE_ONCE_NOW",
    "IGNORE_MISFIRE_POLICY",
  ],
};

export function ScheduleEditorDialog({
  job,
  onClose,
  onSave,
}: {
  job?: ScheduledJob;
  onClose: () => void;
  onSave: (
    job: ScheduledJob,
    draft: ScheduleDraft,
  ) => Promise<string | undefined>;
}) {
  const styles = useStyles();
  const formId = useId();
  const trigger = job ? getPrimaryTrigger(job) : undefined;
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError("");
    setIsSaving(true);
    const error = await onSave(selectedJob, draft);
    if (error) {
      setSaveError(error);
      setIsSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(_, data) => {
        if (!data.open && !isSaving) onClose();
      }}
    >
      <DialogSurface className={styles.compactSurface}>
        <DialogBody>
          <DialogTitle>Editar agendamento</DialogTitle>
          <DialogContent>
            <form id={formId} className={styles.form} onSubmit={handleSubmit}>
              {saveError ? (
                <MessageBar intent="error" role="alert">
                  <MessageBarBody>{saveError}</MessageBarBody>
                </MessageBar>
              ) : null}
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
                    onChange={(event) => {
                      const triggerType = event.target.value as TriggerType;
                      setDraft((current) => ({
                        ...current,
                        triggerType,
                        expression: triggerExpressionDefaults[triggerType],
                        misfireInstruction: "SMART_POLICY",
                      }));
                    }}
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
                    {misfireOptions[draft.triggerType].map((instruction) => (
                      <option key={instruction} value={instruction}>
                        {instruction}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </form>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              appearance="primary"
              type="submit"
              form={formId}
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar agendamento"}
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
  onDelete: (job: ScheduledJob) => Promise<string | undefined>;
}) {
  const styles = useStyles();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setIsDeleting(false);
    setDeleteError("");
  }, [job?.id]);

  if (!job) return null;
  const selectedJob = job;

  async function handleDelete() {
    setDeleteError("");
    setIsDeleting(true);
    const error = await onDelete(selectedJob);
    if (error) {
      setDeleteError(error);
      setIsDeleting(false);
    }
  }

  return (
    <Dialog
      open
      modalType="alert"
      onOpenChange={(_, data) => {
        if (!data.open && !isDeleting) onClose();
      }}
    >
      <DialogSurface className={styles.compactSurface}>
        <DialogBody>
          <DialogTitle>Excluir esta rotina?</DialogTitle>
          <DialogContent className={styles.deleteContent}>
            {deleteError ? (
              <MessageBar intent="error" role="alert">
                <MessageBarBody>{deleteError}</MessageBarBody>
              </MessageBar>
            ) : null}
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
            <Button appearance="secondary" onClick={onClose} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button
              className={styles.deleteButton}
              icon={<DeleteRegular />}
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Excluindo..." : "Excluir rotina"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
