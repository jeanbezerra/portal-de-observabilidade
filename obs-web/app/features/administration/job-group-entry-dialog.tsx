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
  emptyJobGroupDraft,
  normalizeJobGroupDraft,
  validateJobGroupDraft,
  type JobGroup,
  type JobGroupDraft,
} from "./job-group-model";
import { createJobGroupId } from "./job-group-storage";

const useStyles = makeStyles({
  surface: {
    width: "min(640px, calc(100vw - 32px))",
    maxWidth: "640px",
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
  textarea: {
    minHeight: "88px",
  },
  option: {
    display: "grid",
    gap: tokens.spacingVerticalXXS,
    padding: tokens.spacingHorizontalM,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  optionHint: {
    paddingLeft: "28px",
    color: tokens.colorNeutralForeground2,
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

function toDraft(group?: JobGroup): JobGroupDraft {
  if (!group) return emptyJobGroupDraft;
  return {
    key: group.key,
    name: group.name,
    description: group.description,
    active: group.active,
  };
}

type JobGroupEntryDialogProps = {
  group?: JobGroup;
  groups: JobGroup[];
  routineCount?: number;
  onSave: (group: JobGroup) => string | undefined;
};

export function JobGroupEntryDialog({
  group,
  groups,
  routineCount = 0,
  onSave,
}: JobGroupEntryDialogProps) {
  const styles = useStyles();
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<JobGroupDraft>(() => toDraft(group));
  const [showErrors, setShowErrors] = useState(false);
  const [storageError, setStorageError] = useState("");
  const errors = showErrors
    ? validateJobGroupDraft(draft, groups, group?.id)
    : {};

  function updateDraft(update: Partial<JobGroupDraft>) {
    setDraft((current) => ({ ...current, ...update }));
    setStorageError("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setDraft(toDraft(group));
      setShowErrors(false);
      setStorageError("");
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setShowErrors(true);
    setStorageError("");

    const validationErrors = validateJobGroupDraft(draft, groups, group?.id);
    if (Object.keys(validationErrors).length > 0) return;

    const normalizedDraft = normalizeJobGroupDraft(draft);
    const now = new Date().toISOString();
    const saveError = onSave({
      ...normalizedDraft,
      id: group?.id ?? createJobGroupId(),
      createdAt: group?.createdAt ?? now,
      updatedAt: now,
    });

    if (saveError) {
      setStorageError(saveError);
      return;
    }

    setOpen(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(_, data) => handleOpenChange(data.open)}
    >
      <DialogTrigger disableButtonEnhancement>
        {group ? (
          <Button appearance="subtle" size="small" icon={<EditRegular />}>
            Editar
          </Button>
        ) : (
          <Button appearance="primary" size="large" icon={<AddRegular />}>
            Adicionar grupo
          </Button>
        )}
      </DialogTrigger>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>
            {group ? "Editar grupo de rotinas" : "Adicionar grupo de rotinas"}
          </DialogTitle>
          <DialogContent>
            <form
              id={formId}
              className={styles.form}
              onSubmit={handleSubmit}
              noValidate
            >
              {storageError || errors.form ? (
                <MessageBar intent="error">
                  <MessageBarBody>{storageError || errors.form}</MessageBarBody>
                </MessageBar>
              ) : null}

              <div className={styles.formGrid}>
                <Field
                  label="Identificador"
                  required
                  hint={
                    routineCount > 0
                      ? "O identificador não pode ser alterado enquanto houver rotinas vinculadas."
                      : "Exemplo: processamento-financeiro."
                  }
                  validationState={errors.key ? "error" : "none"}
                  validationMessage={errors.key}
                >
                  <Input
                    value={draft.key}
                    maxLength={80}
                    disabled={routineCount > 0}
                    spellCheck={false}
                    onChange={(_, data) => updateDraft({ key: data.value })}
                  />
                </Field>

                <Field
                  label="Nome de exibição"
                  required
                  hint="Exemplo: Processamento financeiro."
                  validationState={errors.name ? "error" : "none"}
                  validationMessage={errors.name}
                >
                  <Input
                    value={draft.name}
                    maxLength={80}
                    onChange={(_, data) => updateDraft({ name: data.value })}
                  />
                </Field>

                <Field
                  className={styles.fullWidth}
                  label="Descrição"
                  hint="Explique quais rotinas devem pertencer a este grupo."
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

              <div className={styles.option}>
                <Checkbox
                  label="Disponível para novas rotinas"
                  checked={draft.active}
                  onChange={(_, data) =>
                    updateDraft({ active: data.checked === true })
                  }
                />
                <Text size={200} className={styles.optionHint}>
                  Grupos inativos permanecem associados às rotinas existentes,
                  mas não aparecem no cadastro de novas rotinas.
                </Text>
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
              {group ? "Salvar alterações" : "Adicionar grupo"}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}

type DeleteJobGroupDialogProps = {
  group: JobGroup;
  onDelete: (group: JobGroup) => string | undefined;
};

export function DeleteJobGroupDialog({
  group,
  onDelete,
}: DeleteJobGroupDialogProps) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const [storageError, setStorageError] = useState("");

  function handleDelete() {
    const deleteError = onDelete(group);
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
          <DialogTitle>Excluir grupo de rotinas?</DialogTitle>
          <DialogContent className={styles.content}>
            <p>
              “{group.name}” será excluído permanentemente e deixará de aparecer
              no cadastro de novas rotinas.
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
              Excluir grupo
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
