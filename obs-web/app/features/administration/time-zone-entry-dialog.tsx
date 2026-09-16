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
  Text,
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
  emptyTimeZoneDraft,
  getSupportedTimeZones,
  normalizeTimeZoneDraft,
  validateTimeZoneDraft,
  type TimeZoneDraft,
  type TimeZoneEntry,
} from "./time-zone-model";
import { createTimeZoneEntryId } from "./time-zone-storage";

const useStyles = makeStyles({
  surface: {
    width: "min(660px, calc(100vw - 32px))",
    maxWidth: "660px",
  },
  form: {
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
  options: {
    display: "grid",
    gap: tokens.spacingVerticalM,
    padding: tokens.spacingHorizontalM,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  option: {
    display: "grid",
    gap: tokens.spacingVerticalXXS,
  },
  optionHint: {
    paddingLeft: "28px",
    color: tokens.colorNeutralForeground2,
  },
  textarea: {
    minHeight: "88px",
  },
  content: {
    display: "grid",
    gap: tokens.spacingVerticalL,
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

const supportedTimeZones = getSupportedTimeZones();

function toDraft(entry: TimeZoneEntry | undefined, isFirstEntry: boolean) {
  if (!entry) {
    return {
      ...emptyTimeZoneDraft,
      active: true,
      isDefault: isFirstEntry,
    };
  }

  return {
    label: entry.label,
    timeZone: entry.timeZone,
    description: entry.description,
    active: entry.active,
    isDefault: entry.isDefault,
  };
}

type TimeZoneEntryDialogProps = {
  entry?: TimeZoneEntry;
  entries: TimeZoneEntry[];
  onSave: (entry: TimeZoneEntry) => string | undefined;
};

export function TimeZoneEntryDialog({
  entry,
  entries,
  onSave,
}: TimeZoneEntryDialogProps) {
  const styles = useStyles();
  const formId = useId();
  const dataListId = useId();
  const isFirstEntry = !entry && entries.length === 0;
  const locksDefaultState = isFirstEntry || entry?.isDefault === true;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TimeZoneDraft>(() =>
    toDraft(entry, isFirstEntry),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [storageError, setStorageError] = useState("");
  const errors = showErrors
    ? validateTimeZoneDraft(draft, entries, entry?.id)
    : {};

  function updateDraft(update: Partial<TimeZoneDraft>) {
    setDraft((current) => ({ ...current, ...update }));
    setStorageError("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(toDraft(entry, isFirstEntry));
      setShowErrors(false);
      setStorageError("");
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    setStorageError("");

    const validationErrors = validateTimeZoneDraft(draft, entries, entry?.id);
    if (Object.keys(validationErrors).length > 0) return;

    const normalizedDraft = normalizeTimeZoneDraft(draft);
    const now = new Date().toISOString();
    const saveError = onSave({
      ...normalizedDraft,
      id: entry?.id ?? createTimeZoneEntryId(),
      createdAt: entry?.createdAt ?? now,
      updatedAt: now,
    });

    if (saveError) {
      setStorageError(saveError);
      return;
    }

    setOpen(false);
  }

  const formError =
    storageError || errors.form || errors.active || errors.isDefault;

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
            Adicionar fuso horário
          </Button>
        )}
      </DialogTrigger>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>
            {entry ? "Editar fuso horário" : "Adicionar fuso horário"}
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
                  label="Nome de exibição"
                  required
                  hint="Exemplo: Horário de Brasília."
                  validationState={errors.label ? "error" : "none"}
                  validationMessage={errors.label}
                >
                  <Input
                    value={draft.label}
                    maxLength={80}
                    onChange={(_, data) => updateDraft({ label: data.value })}
                  />
                </Field>

                <Field
                  label="Identificador IANA"
                  required
                  hint="Exemplo: America/Sao_Paulo."
                  validationState={errors.timeZone ? "error" : "none"}
                  validationMessage={errors.timeZone}
                >
                  <Input
                    list={dataListId}
                    value={draft.timeZone}
                    maxLength={100}
                    spellCheck={false}
                    onChange={(_, data) =>
                      updateDraft({ timeZone: data.value })
                    }
                  />
                </Field>

                <datalist id={dataListId}>
                  {supportedTimeZones.map((timeZone) => (
                    <option key={timeZone} value={timeZone} />
                  ))}
                </datalist>

                <Field
                  className={styles.fullWidth}
                  label="Descrição"
                  hint="Opcional. Explique quais sistemas, localidades ou equipes utilizam este fuso."
                  validationState={errors.description ? "error" : "none"}
                  validationMessage={errors.description}
                >
                  <Textarea
                    className={styles.textarea}
                    value={draft.description}
                    maxLength={300}
                    resize="vertical"
                    onChange={(_, data) =>
                      updateDraft({ description: data.value })
                    }
                  />
                </Field>
              </div>

              <div className={styles.options}>
                <div className={styles.option}>
                  <Checkbox
                    label="Disponível para uso"
                    checked={draft.active}
                    disabled={draft.isDefault}
                    onChange={(_, data) =>
                      updateDraft({ active: data.checked === true })
                    }
                  />
                  <Text size={200} className={styles.optionHint}>
                    {draft.isDefault
                      ? "O fuso horário padrão precisa permanecer ativo."
                      : "Fusos inativos permanecem cadastrados, mas não devem ser oferecidos pelos sistemas."}
                  </Text>
                </div>

                <div className={styles.option}>
                  <Checkbox
                    label="Definir como fuso horário padrão"
                    checked={draft.isDefault}
                    disabled={locksDefaultState}
                    onChange={(_, data) => {
                      const isDefault = data.checked === true;
                      updateDraft({
                        isDefault,
                        active: isDefault ? true : draft.active,
                      });
                    }}
                  />
                  <Text size={200} className={styles.optionHint}>
                    {isFirstEntry
                      ? "O primeiro fuso cadastrado será usado como padrão."
                      : entry?.isDefault
                        ? "Defina outro fuso como padrão para substituir este."
                        : "O padrão será usado quando um sistema não informar outro fuso."}
                  </Text>
                </div>
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
              {entry ? "Salvar alterações" : "Adicionar fuso"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

type DeleteTimeZoneEntryDialogProps = {
  entry: TimeZoneEntry;
  onDelete: (entry: TimeZoneEntry) => string | undefined;
};

export function DeleteTimeZoneEntryDialog({
  entry,
  onDelete,
}: DeleteTimeZoneEntryDialogProps) {
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
          <DialogTitle>Excluir fuso horário?</DialogTitle>
          <DialogContent className={styles.content}>
            <p>
              “{entry.label}” ({entry.timeZone}) será excluído permanentemente.
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
              Excluir fuso
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
