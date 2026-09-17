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
import { useEffect, useState, type FormEvent } from "react";

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
