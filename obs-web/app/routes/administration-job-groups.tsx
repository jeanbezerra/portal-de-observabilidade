import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  Select,
  Spinner,
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
  DismissRegular,
  FolderRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Route } from "./+types/administration-job-groups";
import { PageBreadcrumb } from "../components/page-breadcrumb";
import {
  DeleteJobGroupDialog,
  JobGroupEntryDialog,
} from "../features/administration/job-group-entry-dialog";
import {
  defaultJobGroups,
  type JobGroup,
} from "../features/administration/job-group-model";
import {
  deleteJobGroup,
  loadJobGroups,
  saveJobGroup,
} from "../features/administration/job-group-storage";
import { scheduledJobs } from "../features/administration/scheduled-jobs-model";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Grupos de rotinas | Portal de Observabilidade" },
    {
      name: "description",
      content: "Cadastre e gerencie os grupos disponíveis para as rotinas.",
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
    "@media (max-width: 680px)": {
      alignItems: "stretch",
      flexDirection: "column",
    },
  },
  eyebrow: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  title: {
    marginTop: tokens.spacingVerticalXS,
    marginBottom: 0,
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    letterSpacing: "-0.02em",
    "@media (max-width: 600px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },
  lead: {
    maxWidth: "760px",
    marginTop: tokens.spacingVerticalS,
    marginBottom: 0,
    color: tokens.colorNeutralForeground2,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: tokens.spacingHorizontalL,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  summaryCard: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalXL,
  },
  summaryValue: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero700,
  },
  summaryLabel: {
    color: tokens.colorNeutralForeground2,
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
    "@media (max-width: 680px)": {
      alignItems: "stretch",
      flexDirection: "column",
    },
  },
  sectionTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
  },
  sectionDescription: {
    marginTop: tokens.spacingVerticalXS,
    marginBottom: 0,
    color: tokens.colorNeutralForeground2,
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "minmax(260px, 1fr) minmax(180px, 0.4fr) auto",
    gap: tokens.spacingHorizontalM,
    alignItems: "end",
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 720px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  tablePanel: {
    overflowX: "auto",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  table: {
    minWidth: "920px",
  },
  groupCell: {
    minWidth: "180px",
  },
  descriptionCell: {
    minWidth: "300px",
  },
  secondary: {
    color: tokens.colorNeutralForeground2,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "end",
    gap: tokens.spacingHorizontalXS,
    minWidth: "150px",
    whiteSpace: "nowrap",
  },
  loading: {
    display: "grid",
    placeItems: "center",
    minHeight: "240px",
    padding: tokens.spacingHorizontalXXL,
  },
  empty: {
    display: "grid",
    justifyItems: "center",
    gap: tokens.spacingVerticalM,
    minHeight: "260px",
    alignContent: "center",
    padding: tokens.spacingHorizontalXXL,
    textAlign: "center",
  },
  emptyIcon: {
    color: tokens.colorNeutralForeground3,
    fontSize: "44px",
  },
});

const allStatuses = "Todos os estados" as const;
type StatusFilter = typeof allStatuses | "Ativos" | "Inativos";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export default function AdministrationJobGroups() {
  const styles = useStyles();
  const sectionTitleRef = useRef<HTMLHeadingElement>(null);
  const [groups, setGroups] = useState<JobGroup[]>(defaultJobGroups);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(allStatuses);
  const [notice, setNotice] = useState<{
    intent: "success" | "error";
    message: string;
  }>();

  useEffect(() => {
    setGroups(loadJobGroups());
    setIsLoading(false);
  }, []);

  const routineCountByGroup = useMemo(() => {
    const counts = new Map<string, number>();
    scheduledJobs.forEach((job) => {
      counts.set(job.group, (counts.get(job.group) ?? 0) + 1);
    });
    return counts;
  }, []);

  const visibleGroups = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);
    return groups.filter((group) => {
      const matchesStatus =
        statusFilter === allStatuses ||
        (statusFilter === "Ativos" ? group.active : !group.active);
      const matchesSearch =
        !normalizedSearch ||
        normalizeSearch(
          [group.key, group.name, group.description].join(" "),
        ).includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [groups, search, statusFilter]);

  const activeCount = groups.filter((group) => group.active).length;
  const inUseCount = groups.filter(
    (group) => (routineCountByGroup.get(group.key) ?? 0) > 0,
  ).length;
  const filtersAreActive =
    search.trim().length > 0 || statusFilter !== allStatuses;

  function handleSave(group: JobGroup) {
    const isEditing = groups.some((item) => item.id === group.id);
    try {
      setGroups(saveJobGroup(group));
      setNotice({
        intent: "success",
        message: `“${group.name}” foi ${isEditing ? "atualizado" : "adicionado"}.`,
      });
      return undefined;
    } catch {
      return "Não foi possível salvar o grupo neste navegador. Tente novamente.";
    }
  }

  function handleDelete(group: JobGroup) {
    const routineCount = routineCountByGroup.get(group.key) ?? 0;
    if (routineCount > 0) {
      return "Remova ou transfira as rotinas vinculadas antes de excluir o grupo.";
    }

    try {
      setGroups(deleteJobGroup(group.id));
      setNotice({
        intent: "success",
        message: `“${group.name}” foi excluído.`,
      });
      requestAnimationFrame(() => sectionTitleRef.current?.focus());
      return undefined;
    } catch {
      return "Não foi possível excluir o grupo neste navegador. Tente novamente.";
    }
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter(allStatuses);
  }

  return (
    <div className={styles.page}>
      <PageBreadcrumb
        items={[
          { label: "Visão geral", href: "/" },
          { label: "Administração" },
          { label: "Agendamentos" },
          { label: "Grupos de rotinas" },
        ]}
      />

      <header className={styles.pageHeader}>
        <div>
          <Text className={styles.eyebrow}>Administração · Agendamentos</Text>
          <h1 className={styles.title}>Grupos de rotinas</h1>
          <p className={styles.lead}>
            Organize as rotinas por finalidade e controle quais grupos podem ser
            usados em novos cadastros.
          </p>
        </div>
        <JobGroupEntryDialog groups={groups} onSave={handleSave} />
      </header>

      {notice ? (
        <MessageBar
          intent={notice.intent}
          role={notice.intent === "error" ? "alert" : "status"}
        >
          <MessageBarBody>{notice.message}</MessageBarBody>
        </MessageBar>
      ) : null}

      <section className={styles.summaryGrid} aria-label="Resumo dos grupos">
        <Card appearance="outline" className={styles.summaryCard}>
          <Text className={styles.summaryValue}>{groups.length}</Text>
          <Text className={styles.summaryLabel}>Grupos cadastrados</Text>
        </Card>
        <Card appearance="outline" className={styles.summaryCard}>
          <Text className={styles.summaryValue}>{activeCount}</Text>
          <Text className={styles.summaryLabel}>Disponíveis para novas rotinas</Text>
        </Card>
        <Card appearance="outline" className={styles.summaryCard}>
          <Text className={styles.summaryValue}>{inUseCount}</Text>
          <Text className={styles.summaryLabel}>Com rotinas vinculadas</Text>
        </Card>
      </section>

      <section className={styles.section} aria-labelledby="job-groups-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2
              id="job-groups-title"
              className={styles.sectionTitle}
              ref={sectionTitleRef}
              tabIndex={-1}
            >
              Grupos cadastrados
            </h2>
            <p className={styles.sectionDescription}>
              Grupos com rotinas vinculadas podem ser editados ou inativados,
              mas não excluídos.
            </p>
          </div>
          <Text size={200}>
            {visibleGroups.length} de {groups.length} {" "}
            {groups.length === 1 ? "grupo" : "grupos"}
          </Text>
        </div>

        <div
          className={styles.filters}
          role="group"
          aria-label="Filtros dos grupos de rotinas"
        >
          <Field label="Buscar">
            <Input
              value={search}
              contentBefore={<SearchRegular />}
              placeholder="Identificador, nome ou descrição"
              onChange={(_, data) => setSearch(data.value)}
            />
          </Field>
          <Field label="Estado">
            <Select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
            >
              <option value={allStatuses}>{allStatuses}</option>
              <option value="Ativos">Ativos</option>
              <option value="Inativos">Inativos</option>
            </Select>
          </Field>
          <Button
            appearance="secondary"
            icon={<DismissRegular />}
            disabled={!filtersAreActive}
            onClick={clearFilters}
          >
            Limpar filtros
          </Button>
        </div>

        <div className={styles.tablePanel}>
          {isLoading ? (
            <div className={styles.loading}>
              <Spinner label="Carregando grupos de rotinas" />
            </div>
          ) : visibleGroups.length > 0 ? (
            <Table className={styles.table} aria-label="Grupos de rotinas">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Grupo</TableHeaderCell>
                  <TableHeaderCell>Nome</TableHeaderCell>
                  <TableHeaderCell>Descrição</TableHeaderCell>
                  <TableHeaderCell>Rotinas</TableHeaderCell>
                  <TableHeaderCell>Estado</TableHeaderCell>
                  <TableHeaderCell>Ações</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleGroups.map((group) => {
                  const routineCount = routineCountByGroup.get(group.key) ?? 0;
                  return (
                    <TableRow key={group.id}>
                      <TableCell className={styles.groupCell}>
                        <Text weight="semibold">{group.key}</Text>
                      </TableCell>
                      <TableCell>{group.name}</TableCell>
                      <TableCell className={styles.descriptionCell}>
                        <Text>{group.description || "—"}</Text>
                      </TableCell>
                      <TableCell>
                        {routineCount} {routineCount === 1 ? "rotina" : "rotinas"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          appearance="tint"
                          color={group.active ? "success" : "subtle"}
                        >
                          {group.active ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className={styles.actions}>
                          <JobGroupEntryDialog
                            group={group}
                            groups={groups}
                            routineCount={routineCount}
                            onSave={handleSave}
                          />
                          {routineCount === 0 ? (
                            <DeleteJobGroupDialog
                              group={group}
                              onDelete={handleDelete}
                            />
                          ) : (
                            <Text size={200} className={styles.secondary}>
                              Em uso
                            </Text>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className={styles.empty}>
              <FolderRegular className={styles.emptyIcon} aria-hidden="true" />
              <Text weight="semibold">Nenhum grupo encontrado</Text>
              <Text className={styles.secondary}>
                Altere ou limpe os filtros para consultar outros grupos.
              </Text>
              <Button appearance="secondary" onClick={clearFilters}>
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
