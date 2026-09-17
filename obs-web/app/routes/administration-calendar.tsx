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
  CalendarMonthRegular,
  DismissRegular,
  InfoRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import { useEffect, useMemo, useRef, useState } from "react";

import type { Route } from "./+types/administration-calendar";
import { PageBreadcrumb } from "../components/page-breadcrumb";
import {
  CalendarEntryDialog,
  DeleteCalendarEntryDialog,
} from "../features/administration/calendar-entry-dialog";
import {
  calendarEntryTypes,
  formatCalendarDate,
  formatCalendarWeekday,
  getCalendarEntryYear,
  type CalendarEntry,
  type CalendarEntryType,
} from "../features/administration/calendar-model";
import {
  deleteCalendarEntry,
  loadCalendarEntries,
  saveCalendarEntry,
} from "../features/administration/calendar-storage";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Calendário corporativo | Portal de Observabilidade" },
    {
      name: "description",
      content:
        "Cadastre e gerencie feriados, datas comemorativas e outras datas corporativas.",
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
    gridTemplateColumns: "minmax(120px, 0.35fr) minmax(190px, 0.65fr) minmax(260px, 1fr) auto",
    gap: tokens.spacingHorizontalM,
    alignItems: "end",
    padding: tokens.spacingHorizontalL,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 900px)": {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    "@media (max-width: 520px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  clearButton: {
    "@media (min-width: 901px)": {
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
    minWidth: "900px",
  },
  nameCell: {
    minWidth: "220px",
  },
  dateCell: {
    minWidth: "150px",
  },
  secondaryText: {
    color: tokens.colorNeutralForeground2,
    textTransform: "capitalize",
  },
  notes: {
    display: "block",
    maxWidth: "280px",
    color: tokens.colorNeutralForeground2,
    overflowWrap: "anywhere",
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

const currentYear = new Date().getFullYear();
const allTypes = "Todos os tipos" as const;
type TypeFilter = CalendarEntryType | typeof allTypes;

const typeColors: Record<
  CalendarEntryType,
  "danger" | "brand" | "warning" | "informative"
> = {
  Feriado: "danger",
  "Data comemorativa": "brand",
  "Ponto facultativo": "warning",
  "Data institucional": "informative",
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export default function AdministrationCalendar() {
  const styles = useStyles();
  const sectionTitleRef = useRef<HTMLHeadingElement>(null);
  const [entries, setEntries] = useState<CalendarEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(allTypes);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState<{
    intent: "success" | "error";
    message: string;
  }>();

  useEffect(() => {
    setEntries(loadCalendarEntries());
    setIsLoading(false);
  }, []);

  const years = useMemo(() => {
    const availableYears = new Set<number>();
    for (let year = currentYear - 1; year <= currentYear + 5; year += 1) {
      availableYears.add(year);
    }
    entries.forEach((entry) => availableYears.add(getCalendarEntryYear(entry.date)));
    availableYears.add(selectedYear);
    return [...availableYears].sort((left, right) => left - right);
  }, [entries, selectedYear]);

  const entriesInYear = useMemo(
    () =>
      entries.filter(
        (entry) => getCalendarEntryYear(entry.date) === selectedYear,
      ),
    [entries, selectedYear],
  );

  const visibleEntries = useMemo(() => {
    const normalizedSearch = normalizeSearch(search);
    return entriesInYear.filter((entry) => {
      const matchesType = typeFilter === allTypes || entry.type === typeFilter;
      const searchableContent = normalizeSearch(
        [
          entry.name,
          entry.type,
          entry.scope,
          entry.location,
          entry.notes,
        ].join(" "),
      );
      const matchesSearch =
        !normalizedSearch || searchableContent.includes(normalizedSearch);
      return matchesType && matchesSearch;
    });
  }, [entriesInYear, search, typeFilter]);

  const holidayCount = entriesInYear.filter(
    (entry) => entry.type === "Feriado",
  ).length;
  const commemorativeCount = entriesInYear.filter(
    (entry) => entry.type === "Data comemorativa",
  ).length;
  const filtersAreActive = typeFilter !== allTypes || search.trim().length > 0;

  function handleSave(entry: CalendarEntry) {
    try {
      setEntries(saveCalendarEntry(entry));
      setSelectedYear(getCalendarEntryYear(entry.date));
      setTypeFilter(allTypes);
      setSearch("");
      setNotice({
        intent: "success",
        message: `“${entry.name}” foi ${
          entries.some((item) => item.id === entry.id)
            ? "atualizada"
            : "adicionada"
        } ao calendário.`,
      });
      return undefined;
    } catch {
      return "Não foi possível salvar a data neste navegador. Tente novamente.";
    }
  }

  function handleDelete(entry: CalendarEntry) {
    try {
      setEntries(deleteCalendarEntry(entry.id));
      setNotice({
        intent: "success",
        message: `“${entry.name}” foi excluída do calendário.`,
      });
      requestAnimationFrame(() => sectionTitleRef.current?.focus());
      return undefined;
    } catch {
      return "Não foi possível excluir a data neste navegador. Tente novamente.";
    }
  }

  function clearFilters() {
    setTypeFilter(allTypes);
    setSearch("");
  }

  return (
    <div className={styles.page}>
      <PageBreadcrumb
        items={[
          { label: "Visão geral", href: "/" },
          { label: "Administração" },
          { label: "Agendamentos" },
          { label: "Calendários" },
        ]}
      />

      <header className={styles.pageHeader}>
        <div>
          <Text className={styles.eyebrow}>Administração · Agendamentos</Text>
          <h1 className={styles.title}>Calendário corporativo</h1>
          <p className={styles.lead}>
            Cadastre e gerencie feriados, datas comemorativas e outras datas
            relevantes para a organização.
          </p>
        </div>
        <CalendarEntryDialog entries={entries} onSave={handleSave} />
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
          Neste protótipo, o calendário fica salvo somente neste navegador. A
          persistência corporativa dependerá da integração com o backend.
        </MessageBarBody>
      </MessageBar>

      <section
        className={styles.summaryGrid}
        aria-label={`Resumo do calendário de ${selectedYear}`}
      >
        <div className={styles.summaryCard}>
          <Text className={styles.summaryValue}>{entriesInYear.length}</Text>
          <Text className={styles.summaryLabel}>Datas no ano</Text>
        </div>
        <div className={styles.summaryCard}>
          <Text className={styles.summaryValue}>{holidayCount}</Text>
          <Text className={styles.summaryLabel}>Feriados</Text>
        </div>
        <div className={styles.summaryCard}>
          <Text className={styles.summaryValue}>{commemorativeCount}</Text>
          <Text className={styles.summaryLabel}>Datas comemorativas</Text>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="calendar-list-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2
              id="calendar-list-title"
              className={styles.sectionTitle}
              ref={sectionTitleRef}
              tabIndex={-1}
            >
              Datas cadastradas
            </h2>
            <p className={styles.sectionDescription}>
              Consulte e mantenha o calendário anual usado pelo sistema.
            </p>
          </div>
          <Text size={200}>
            {visibleEntries.length} de {entriesInYear.length} {" "}
            {entriesInYear.length === 1 ? "data" : "datas"}
          </Text>
        </div>

        <div
          className={styles.filters}
          role="group"
          aria-label="Filtros do calendário"
        >
          <Field label="Ano">
            <Select
              value={String(selectedYear)}
              onChange={(event) => setSelectedYear(Number(event.target.value))}
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Tipo">
            <Select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as TypeFilter)
              }
            >
              <option value={allTypes}>{allTypes}</option>
              {calendarEntryTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Buscar">
            <Input
              value={search}
              contentBefore={<SearchRegular />}
              placeholder="Nome, localidade ou observação"
              onChange={(_, data) => setSearch(data.value)}
            />
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
              <Spinner label="Carregando calendário" />
            </div>
          ) : visibleEntries.length > 0 ? (
            <Table
              className={styles.table}
              aria-label={`Datas do calendário corporativo de ${selectedYear}`}
            >
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Data</TableHeaderCell>
                  <TableHeaderCell>Nome</TableHeaderCell>
                  <TableHeaderCell>Tipo</TableHeaderCell>
                  <TableHeaderCell>Abrangência</TableHeaderCell>
                  <TableHeaderCell>Observações</TableHeaderCell>
                  <TableHeaderCell>Ações</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className={styles.dateCell}>
                      <Text block weight="semibold">
                        {formatCalendarDate(entry.date)}
                      </Text>
                      <Text block size={200} className={styles.secondaryText}>
                        {formatCalendarWeekday(entry.date)}
                      </Text>
                    </TableCell>
                    <TableCell className={styles.nameCell}>
                      <Text weight="semibold">{entry.name}</Text>
                    </TableCell>
                    <TableCell>
                      <Badge appearance="tint" color={typeColors[entry.type]}>
                        {entry.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Text block>{entry.scope}</Text>
                      {entry.location ? (
                        <Text block size={200} className={styles.secondaryText}>
                          {entry.location}
                        </Text>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Text className={styles.notes}>
                        {entry.notes || "—"}
                      </Text>
                    </TableCell>
                    <TableCell>
                      <div className={styles.actions}>
                        <CalendarEntryDialog
                          entry={entry}
                          entries={entries}
                          onSave={handleSave}
                        />
                        <DeleteCalendarEntryDialog
                          entry={entry}
                          onDelete={handleDelete}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className={styles.empty}>
              <CalendarMonthRegular
                className={styles.emptyIcon}
                aria-hidden="true"
              />
              <div className={styles.emptyCopy}>
                <Text block weight="semibold">
                  {filtersAreActive
                    ? "Nenhuma data encontrada"
                    : `Nenhuma data cadastrada para ${selectedYear}`}
                </Text>
                <Text block size={200}>
                  {filtersAreActive
                    ? "Altere ou limpe os filtros para consultar outras datas."
                    : "Adicione o primeiro feriado ou data comemorativa deste ano."}
                </Text>
              </div>
              {filtersAreActive ? (
                <Button appearance="secondary" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              ) : (
                <CalendarEntryDialog entries={entries} onSave={handleSave} />
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
