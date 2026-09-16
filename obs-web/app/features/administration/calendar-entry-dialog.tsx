import {
  Button,
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
  Textarea,
  tokens,
} from "@fluentui/react-components";
import {
  AddRegular,
  DeleteRegular,
  EditRegular,
} from "@fluentui/react-icons";
import { useId, useState, type FormEvent } from "react";

import {
  calendarEntryScopes,
  calendarEntryTypes,
  emptyCalendarEntryDraft,
  formatCalendarDate,
  normalizeCalendarEntryDraft,
  validateCalendarEntry,
  type CalendarEntry,
  type CalendarEntryDraft,
  type CalendarEntryScope,
  type CalendarEntryType,
} from "./calendar-model";
import { createCalendarEntryId } from "./calendar-storage";

const useStyles = makeStyles({
  surface: {
    width: "min(680px, calc(100vw - 32px))",
    maxWidth: "680px",
  },
  form: {
    display: "grid",
    gap: tokens.spacingVerticalL,
  },
  content: {
    display: "grid",
    gap: tokens.spacingVerticalL,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: `${tokens.spacingVerticalL} ${tokens.spacingHorizontalL}`,
    "@media (max-width: 560px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  fullWidth: {
    gridColumn: "1 / -1",
  },
  textarea: {
    minHeight: "96px",
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
});

type CalendarEntryDialogProps = {
  entry?: CalendarEntry;
  entries: CalendarEntry[];
  onSave: (entry: CalendarEntry) => string | undefined;
};

function toDraft(entry?: CalendarEntry): CalendarEntryDraft {
  if (!entry) return { ...emptyCalendarEntryDraft };

  return {
    name: entry.name,
    date: entry.date,
    type: entry.type,
    scope: entry.scope,
    location: entry.location,
    notes: entry.notes,
  };
}

export function CalendarEntryDialog({
  entry,
  entries,
  onSave,
}: CalendarEntryDialogProps) {
  const styles = useStyles();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CalendarEntryDraft>(() => toDraft(entry));
  const [showErrors, setShowErrors] = useState(false);
  const [storageError, setStorageError] = useState("");
  const errors = showErrors
    ? validateCalendarEntry(draft, entries, entry?.id)
    : {};

  function updateDraft(update: Partial<CalendarEntryDraft>) {
    setDraft((current) => ({ ...current, ...update }));
    setStorageError("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(toDraft(entry));
      setShowErrors(false);
      setStorageError("");
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    setStorageError("");

    const validationErrors = validateCalendarEntry(draft, entries, entry?.id);
    if (Object.keys(validationErrors).length > 0) return;

    const normalizedDraft = normalizeCalendarEntryDraft(draft);
    const now = new Date().toISOString();
    const saveError = onSave({
      ...normalizedDraft,
      id: entry?.id ?? createCalendarEntryId(),
      createdAt: entry?.createdAt ?? now,
      updatedAt: now,
    });

    if (saveError) {
      setStorageError(saveError);
      return;
    }

    setOpen(false);
  }

  const formError = storageError || errors.form;

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => handleOpenChange(data.open)}
    >
      <DialogTrigger disableButtonEnhancement>
        {entry ? (
          <Button appearance="subtle" size="small" icon={<EditRegular />}>
            Editar
          </Button>
        ) : (
          <Button appearance="primary" size="large" icon={<AddRegular />}>
            Adicionar data
          </Button>
        )}
      </DialogTrigger>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>
            {entry ? "Editar data" : "Adicionar data ao calendário"}
          </DialogTitle>
          <DialogContent>
            <form
              id={formId}
              className={styles.form}
              onSubmit={handleSubmit}
              noValidate
            >
              {formError ? (
                <MessageBar intent="error">
                  <MessageBarBody>{formError}</MessageBarBody>
                </MessageBar>
              ) : null}

              <div className={styles.formGrid}>
                <Field
                  className={styles.fullWidth}
                  label="Nome"
                  required
                  validationState={errors.name ? "error" : "none"}
                  validationMessage={errors.name}
                >
                  <Input
                    value={draft.name}
                    maxLength={120}
                    onChange={(_, data) => updateDraft({ name: data.value })}
                  />
                </Field>

                <Field
                  label="Data"
                  required
                  validationState={errors.date ? "error" : "none"}
                  validationMessage={errors.date}
                >
                  <Input
                    type="date"
                    value={draft.date}
                    onChange={(_, data) => updateDraft({ date: data.value })}
                  />
                </Field>

                <Field
                  label="Tipo"
                  required
                  validationState={errors.type ? "error" : "none"}
                  validationMessage={errors.type}
                >
                  <Select
                    value={draft.type}
                    onChange={(event) =>
                      updateDraft({
                        type: event.target.value as CalendarEntryType,
                      })
                    }
                  >
                    {calendarEntryTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Abrangência"
                  required
                  validationState={errors.scope ? "error" : "none"}
                  validationMessage={errors.scope}
                >
                  <Select
                    value={draft.scope}
                    onChange={(event) =>
                      updateDraft({
                        scope: event.target.value as CalendarEntryScope,
                      })
                    }
                  >
                    {calendarEntryScopes.map((scope) => (
                      <option key={scope} value={scope}>
                        {scope}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="Localidade"
                  required={
                    draft.scope === "Estadual" || draft.scope === "Municipal"
                  }
                  hint={
                    draft.scope === "Estadual" || draft.scope === "Municipal"
                      ? "Identifique onde esta data deve ser considerada."
                      : "Opcional. Informe a unidade relacionada, se necessário."
                  }
                  validationState={errors.location ? "error" : "none"}
                  validationMessage={errors.location}
                >
                  <Input
                    value={draft.location}
                    maxLength={120}
                    onChange={(_, data) =>
                      updateDraft({ location: data.value })
                    }
                  />
                </Field>

                <Field
                  className={styles.fullWidth}
                  label="Observações"
                  hint="Opcional. Adicione informações úteis para quem consulta o calendário."
                  validationState={errors.notes ? "error" : "none"}
                  validationMessage={errors.notes}
                >
                  <Textarea
                    className={styles.textarea}
                    value={draft.notes}
                    maxLength={500}
                    resize="vertical"
                    onChange={(_, data) => updateDraft({ notes: data.value })}
                  />
                </Field>
              </div>
            </form>
          </DialogContent>
          <DialogActions>
            <DialogTrigger action="close" disableButtonEnhancement>
              <Button type="button" appearance="secondary">
                Cancelar
              </Button>
            </DialogTrigger>
            <Button type="submit" form={formId} appearance="primary">
              {entry ? "Salvar alterações" : "Adicionar data"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

type DeleteCalendarEntryDialogProps = {
  entry: CalendarEntry;
  onDelete: (entry: CalendarEntry) => string | undefined;
};

export function DeleteCalendarEntryDialog({
  entry,
  onDelete,
}: DeleteCalendarEntryDialogProps) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [storageError, setStorageError] = useState("");

  function handleDelete() {
    const deleteError = onDelete(entry);
    if (deleteError) {
      setStorageError(deleteError);
      return;
    }
    setOpen(false);
  }

  return (
    <Dialog
      modalType="alert"
      open={open}
      onOpenChange={(_, data) => {
        setStorageError("");
        setOpen(data.open);
      }}
    >
      <DialogTrigger disableButtonEnhancement>
        <Button appearance="subtle" size="small" icon={<DeleteRegular />}>
          Excluir
        </Button>
      </DialogTrigger>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Excluir data do calendário?</DialogTitle>
          <DialogContent className={styles.content}>
            <p>
              “{entry.name}”, em {formatCalendarDate(entry.date)}, será excluída
              permanentemente.
            </p>
            {storageError ? (
              <MessageBar intent="error">
                <MessageBarBody>{storageError}</MessageBarBody>
              </MessageBar>
            ) : null}
          </DialogContent>
          <DialogActions>
            <DialogTrigger action="close" disableButtonEnhancement>
              <Button appearance="secondary">Cancelar</Button>
            </DialogTrigger>
            <Button
              className={styles.deleteButton}
              appearance="primary"
              icon={<DeleteRegular />}
              onClick={handleDelete}
            >
              Excluir data
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
