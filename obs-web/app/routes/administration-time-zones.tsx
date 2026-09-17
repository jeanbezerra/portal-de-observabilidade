import {
  Badge,
  Button,
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
  GlobeLocationRegular,
  InfoRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Route } from "./+types/administration-time-zones";
import { PageBreadcrumb } from "../components/page-breadcrumb";
import {
  DeleteTimeZoneEntryDialog,
  TimeZoneEntryDialog,
} from "../features/administration/time-zone-entry-dialog";
import {
  formatTimeZoneOffset,
  formatZonedDateTime,
  type TimeZoneEntry,
} from "../features/administration/time-zone-model";
import {
  deleteTimeZoneEntry,
  loadTimeZoneEntries,
  saveTimeZoneEntry,
} from "../features/administration/time-zone-storage";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Fusos horários | Portal de Observabilidade" },
    {
      name: "description",
      content:
        "Cadastre e gerencie os fusos horários utilizados pelos sistemas.",
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
  messageBar: {
    minWidth: 0,
    whiteSpace: "normal",
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
    minWidth: 0,
    padding: tokens.spacingHorizontalXL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  summaryValue: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero700,
  },
  summaryDefault: {
    overflow: "hidden",
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightBase500,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
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
    gridTemplateColumns: "minmax(280px, 1fr) minmax(180px, 0.45fr) auto",
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
  clearButton: {
    "@media (min-width: 721px)": {
      marginBottom: "1px",
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
  nameCell: {
    minWidth: "210px",
  },
  identifier: {
    fontFamily: tokens.fontFamilyMonospace,
    fontSize: tokens.fontSizeBase200,
  },
  secondaryText: {
    color: tokens.colorNeutralForeground2,
  },
  badges: {
    display: "flex",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalXS,
  },
  actions: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    justifyContent: "end",
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
  emptyCopy: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
    maxWidth: "520px",
  },
});

const allStatuses = "Todos os status" as const;
type StatusFilter = typeof allStatuses | "Ativos" | "Inativos";

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export default function AdministrationTimeZones() {
  const styles = useStyles();
  const sectionTitleRef = useRef<HTMLHeadingElement>(null);
  const [entries, setEntries] = useState<TimeZoneEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>(allStatuses);
  const [now, setNow] = useState(() => new Date());
  const [notice, setNotice] = useState<{
    intent: "success" | "error";
    message: string;
  }>();

  useEffect(() => {
    setEntries(loadTimeZoneEntries());
    setIsLoading(false);
    setNow(new Date());

    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const visibleEntries = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);
    return entries.filter((entry) => {
      const matchesStatus =
        statusFilter === allStatuses ||
        (statusFilter === "Ativos" ? entry.active : !entry.active);
      const searchableContent = normalizeSearch(
        [entry.label, entry.timeZone, entry.description].join(" "),
      );
      const matchesSearch =
        !normalizedSearch || searchableContent.includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [entries, search, statusFilter]);

  const activeCount = entries.filter((entry) => entry.active).length;
  const defaultEntry = entries.find((entry) => entry.isDefault);
  const filtersAreActive =
    statusFilter !== allStatuses || search.trim().length > 0;

  function handleSave(entry: TimeZoneEntry) {
    try {
      const isEditing = entries.some((item) => item.id === entry.id);
      setEntries(saveTimeZoneEntry(entry));
      setSearch("");
      setStatusFilter(allStatuses);
      setNotice({
        intent: "success",
        message: `“${entry.label}” foi ${
          isEditing ? "atualizado" : "adicionado"
        } aos fusos horários.`,
      });
      return undefined;
    } catch {
      return "Não foi possível salvar o fuso horário neste navegador. Tente novamente.";
    }
  }

  function handleDelete(entry: TimeZoneEntry) {
    try {
      setEntries(deleteTimeZoneEntry(entry.id));
      setNotice({
        intent: "success",
        message: `“${entry.label}” foi excluído dos fusos horários.`,
      });
      requestAnimationFrame(() => sectionTitleRef.current?.focus());
      return undefined;
    } catch {
      return "Não foi possível excluir o fuso horário. Verifique se ele ainda é o padrão.";
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
          { label: "Fusos horários" },
        ]}
      />

      <header className={styles.pageHeader}>
        <div>
          <Text className={styles.eyebrow}>Administração · Agendamentos</Text>
          <h1 className={styles.title}>Fusos horários</h1>
          <p className={styles.lead}>
            Defina os fusos horários disponíveis para os sistemas e escolha o
            padrão usado quando nenhuma preferência for informada.
          </p>
        </div>
        <TimeZoneEntryDialog entries={entries} onSave={handleSave} />
      </header>

      {notice ? (
        <MessageBar
          className={styles.messageBar}
          intent={notice.intent}
          role={notice.intent === "error" ? "alert" : "status"}
        >
          <MessageBarBody>{notice.message}</MessageBarBody>
        </MessageBar>
      ) : null}

      <MessageBar
        className={styles.messageBar}
        intent="info"
        icon={<InfoRegular />}
      >
        <MessageBarBody>
          Use identificadores IANA para aplicar corretamente as regras locais,
          inclusive mudanças de horário de verão. Neste protótipo, os registros
          ficam somente neste navegador.
        </MessageBarBody>
      </MessageBar>

      <section
        className={styles.summaryGrid}
        aria-label="Resumo dos fusos horários"
      >
        <div className={styles.summaryCard}>
          <Text className={styles.summaryValue}>{entries.length}</Text>
          <Text className={styles.summaryLabel}>Fusos cadastrados</Text>
        </div>
        <div className={styles.summaryCard}>
          <Text className={styles.summaryValue}>{activeCount}</Text>
          <Text className={styles.summaryLabel}>Disponíveis para uso</Text>
        </div>
        <div className={styles.summaryCard}>
          <Text className={styles.summaryDefault} title={defaultEntry?.label}>
            {defaultEntry?.label ?? "Não definido"}
          </Text>
          <Text className={styles.summaryLabel}>Fuso horário padrão</Text>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="time-zone-list-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2
              id="time-zone-list-title"
              className={styles.sectionTitle}
              ref={sectionTitleRef}
              tabIndex={-1}
            >
              Fusos cadastrados
            </h2>
            <p className={styles.sectionDescription}>
              Consulte a hora local e controle quais opções podem ser usadas.
            </p>
          </div>
          <Text size={200}>
            {visibleEntries.length} de {entries.length} {" "}
            {entries.length === 1 ? "fuso" : "fusos"}
          </Text>
        </div>

        <div
          className={styles.filters}
          role="group"
          aria-label="Filtros de fusos horários"
        >
          <Field label="Buscar">
            <Input
              value={search}
              contentBefore={<SearchRegular />}
              placeholder="Nome, identificador ou descrição"
              onChange={(_, data) => setSearch(data.value)}
            />
          </Field>
          <Field label="Status">
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
            className={styles.clearButton}
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
              <Spinner label="Carregando fusos horários" />
            </div>
          ) : visibleEntries.length > 0 ? (
            <Table
              className={styles.table}
              aria-label="Fusos horários cadastrados"
            >
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Nome</TableHeaderCell>
                  <TableHeaderCell>Identificador IANA</TableHeaderCell>
                  <TableHeaderCell>Horário local</TableHeaderCell>
                  <TableHeaderCell>UTC</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Ações</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className={styles.nameCell}>
                      <Text block weight="semibold">
                        {entry.label}
                      </Text>
                      {entry.description ? (
                        <Text block size={200} className={styles.secondaryText}>
                          {entry.description}
                        </Text>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Text className={styles.identifier}>{entry.timeZone}</Text>
                    </TableCell>
                    <TableCell>{formatZonedDateTime(entry.timeZone, now)}</TableCell>
                    <TableCell>
                      {formatTimeZoneOffset(entry.timeZone, now)}
                    </TableCell>
                    <TableCell>
                      <div className={styles.badges}>
                        <Badge
                          appearance="tint"
                          color={entry.active ? "success" : "subtle"}
                        >
                          {entry.active ? "Ativo" : "Inativo"}
                        </Badge>
                        {entry.isDefault ? (
                          <Badge appearance="tint" color="brand">
                            Padrão
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={styles.actions}>
                        <TimeZoneEntryDialog
                          entry={entry}
                          entries={entries}
                          onSave={handleSave}
                        />
                        {!entry.isDefault ? (
                          <DeleteTimeZoneEntryDialog
                            entry={entry}
                            onDelete={handleDelete}
                          />
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className={styles.empty}>
              <GlobeLocationRegular
                className={styles.emptyIcon}
                aria-hidden="true"
              />
              <div className={styles.emptyCopy}>
                <Text block weight="semibold">
                  {filtersAreActive
                    ? "Nenhum fuso horário encontrado"
                    : "Nenhum fuso horário cadastrado"}
                </Text>
                <Text block size={200}>
                  {filtersAreActive
                    ? "Altere ou limpe os filtros para consultar outros fusos."
                    : "Adicione o primeiro fuso horário; ele será definido como padrão."}
                </Text>
              </div>
              {filtersAreActive ? (
                <Button appearance="secondary" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : (
                <TimeZoneEntryDialog entries={entries} onSave={handleSave} />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
