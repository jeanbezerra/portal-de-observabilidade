export type JobGroup = {
  id: string;
  key: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type JobGroupDraft = Pick<
  JobGroup,
  "key" | "name" | "description" | "active"
>;

export type JobGroupErrors = Partial<
  Record<keyof JobGroupDraft | "form", string>
>;

export const emptyJobGroupDraft: JobGroupDraft = {
  key: "",
  name: "",
  description: "",
  active: true,
};

const seededAt = "2026-09-01T12:00:00.000Z";

export const defaultJobGroups: JobGroup[] = [
  {
    id: "JOB-GROUP-financeiro",
    key: "financeiro",
    name: "Financeiro",
    description: "Rotinas de faturamento, fechamento e processamento financeiro.",
    active: true,
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "JOB-GROUP-plataforma",
    key: "plataforma",
    name: "Plataforma",
    description: "Serviços compartilhados e rotinas internas da plataforma.",
    active: true,
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "JOB-GROUP-grc",
    key: "grc",
    name: "GRC",
    description: "Governança, riscos, conformidade e entregas regulatórias.",
    active: true,
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "JOB-GROUP-observabilidade",
    key: "observabilidade",
    name: "Observabilidade",
    description: "Processamentos internos de métricas, logs e telemetria.",
    active: true,
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "JOB-GROUP-mensageria",
    key: "mensageria",
    name: "Mensageria",
    description: "Processamento, recuperação e manutenção de filas e eventos.",
    active: true,
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "JOB-GROUP-operacoes",
    key: "operacoes",
    name: "Operações",
    description: "Conciliações e rotinas recorrentes de operação.",
    active: true,
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "JOB-GROUP-exportacao",
    key: "exportacao",
    name: "Exportação",
    description: "Geração e entrega de arquivos sob demanda.",
    active: true,
    createdAt: seededAt,
    updatedAt: seededAt,
  },
];

export function normalizeJobGroupKey(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function normalizeJobGroupDraft(draft: JobGroupDraft): JobGroupDraft {
  return {
    ...draft,
    key: normalizeJobGroupKey(draft.key),
    name: draft.name.trim(),
    description: draft.description.trim(),
  };
}

export function validateJobGroupDraft(
  draft: JobGroupDraft,
  existingGroups: JobGroup[],
  editingId?: string,
): JobGroupErrors {
  const errors: JobGroupErrors = {};
  const key = normalizeJobGroupKey(draft.key);
  const name = draft.name.trim();

  if (!key) {
    errors.key = "Informe o identificador do grupo.";
  } else if (key.length > 80) {
    errors.key = "Use no máximo 80 caracteres.";
  } else if (!/^[a-z0-9][a-z0-9._-]*$/.test(key)) {
    errors.key =
      "Use letras minúsculas, números, ponto, hífen ou sublinhado.";
  }

  if (!name) {
    errors.name = "Informe o nome de exibição.";
  } else if (name.length > 80) {
    errors.name = "Use no máximo 80 caracteres.";
  }

  if (draft.description.trim().length > 300) {
    errors.description = "Use no máximo 300 caracteres.";
  }

  if (
    key &&
    existingGroups.some(
      (group) => group.id !== editingId && group.key === key,
    )
  ) {
    errors.form = "Já existe um grupo com este identificador.";
  }

  return errors;
}
