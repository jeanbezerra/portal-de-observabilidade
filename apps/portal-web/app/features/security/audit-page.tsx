import {
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@fluentui/react-components";
import {
  ArrowDownloadRegular,
  ArrowSortDownRegular,
  ArrowSortUpRegular,
  ArrowSyncRegular,
  FilterRegular,
  SearchRegular,
} from "@fluentui/react-icons";
import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useIdentity } from "./identity-context";
import {
  identityResponse,
  securityRequest,
  IdentityServiceError,
} from "./identity-client";
import { DataState, EntryDialog, Notice, useSecurityData } from "./security-ui";
import { useAuditStyles } from "./audit-appearance";
import {
  appliedAuditParams,
  auditDate,
  auditEventLabels,
  auditParams,
  auditSorts,
  auditTimeToIso,
  draftFromParams,
  localAuditTime,
  type AuditDraft,
  type AuditResults,
  type AuditRow,
} from "./audit-model";

function Outcome({ value }: { value: string }) {
  return (
    <Badge
      appearance="tint"
      color={
        value === "SUCCESS"
          ? "success"
          : value === "DENIED"
            ? "warning"
            : value === "FAILURE"
              ? "danger"
              : "subtle"
      }
    >
      {value === "SUCCESS"
        ? "Concluído"
        : value === "FAILURE"
          ? "Falha"
          : value === "DENIED"
            ? "Negado"
            : value}
    </Badge>
  );
}
function actorCaption(row: AuditRow) {
  const primary = row.actorDisplayName || row.actorUsername || row.actorSubject;
  return row.actorUsername && row.actorUsername !== primary
    ? row.actorUsername
    : row.actorSubject !== primary
      ? row.actorSubject
      : "";
}
export function AuditPageView() {
  const styles = useAuditStyles();
  const id = useId();
  const { identity } = useIdentity();
  const [params, setParams] = useSearchParams();
  const query = params.toString();
  const [draft, setDraft] = useState<AuditDraft>(() => draftFromParams(params));
  const [filterError, setFilterError] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [advanced, setAdvanced] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<AuditRow | null>(null);
  const [notice, setNotice] = useState("");
  const detailTrigger = useRef<HTMLElement | null>(null);
  const resource = useSecurityData(
    () => securityRequest<AuditResults>("/audit?" + query),
    [query],
  );
  useEffect(() => {
    setDraft(draftFromParams(new URLSearchParams(query)));
    setFilterError("");
  }, [query]);
  const baseline = draftFromParams(params);
  const dirty = Object.entries(draft).some(
    ([key, value]) => value !== baseline[key as keyof AuditDraft],
  );
  const data = resource.data;
  const totals = data?.totals;
  const set = (key: keyof AuditDraft, value: string) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const apply = () => {
    try {
      const since = auditTimeToIso(draft.since),
        until = auditTimeToIso(draft.until);
      if (since && until && since > until)
        throw new Error("O início do período deve ser anterior ao fim.");
      setFilterError("");
      setParams(
        auditParams({
          ...draft,
          since,
          until,
          limit: params.get("limit") || "50",
        }),
      );
    } catch (reason) {
      setFilterError(
        reason instanceof Error
          ? reason.message
          : "Revise o período informado.",
      );
    }
  };
  const preset = (days: number) => {
    const end = Date.now();
    const next = {
      ...draft,
      since: localAuditTime(new Date(end - days * 86400000).toISOString()),
      until: localAuditTime(new Date(end).toISOString()),
    };
    setDraft(next);
    setFilterError("");
    setParams(
      auditParams({
        ...next,
        since: auditTimeToIso(next.since),
        until: auditTimeToIso(next.until),
        limit: params.get("limit") || "50",
      }),
    );
  };
  const sort = (key: string) => {
    if (!data) return;
    const direction =
      data.filters.sort === key && data.filters.direction === "asc"
        ? "desc"
        : "asc";
    setParams(
      appliedAuditParams({ ...data.filters, sort: key, direction }, data.limit),
    );
  };
  const sortHeader = (title: string, key: string) => {
    const active = data?.filters.sort === key;
    return (
      <TableHeaderCell
        aria-sort={
          active
            ? data.filters.direction === "asc"
              ? "ascending"
              : "descending"
            : "none"
        }
      >
        <Button
          appearance="transparent"
          className={styles.sortButton}
          disabled={resource.loading}
          onClick={() => sort(key)}
          icon={
            active ? (
              data.filters.direction === "asc" ? (
                <ArrowSortUpRegular />
              ) : (
                <ArrowSortDownRegular />
              )
            ) : undefined
          }
        >
          {title}
        </Button>
      </TableHeaderCell>
    );
  };
  return (
    <div className={styles.stack}>
      {notice && (
        <Notice
          intent="success"
          message={notice}
          onDismiss={() => setNotice("")}
        />
      )}
      <div className={styles.metrics} aria-label="Resumo da consulta aplicada">
        {[
          ["Eventos encontrados", totals?.total],
          ["Concluídos", totals?.success],
          ["Falhas", totals?.failure],
          ["Acessos negados", totals?.denied],
        ].map(([label, value]) => (
          <Card key={String(label)} className={styles.metric} focusMode="off">
            <span className={styles.muted}>{label}</span>
            <span className={styles.number}>
              {value === undefined
                ? "—"
                : Number(value).toLocaleString("pt-BR")}
            </span>
          </Card>
        ))}
      </div>
      <Card className={styles.panel} focusMode="off">
        <div className={styles.bar}>
          <div>
            <h2 className={styles.heading}>Consulta de eventos</h2>
            <p className={styles.muted}>
              Combine os filtros para investigar acessos e alterações. Horários
              de Brasília.
            </p>
          </div>
          <Button
            className={styles.button}
            appearance="subtle"
            icon={<FilterRegular />}
            aria-expanded={filtersOpen}
            aria-controls={id + "-filters"}
            onClick={() => setFiltersOpen(!filtersOpen)}
          >
            {filtersOpen ? "Ocultar filtros" : "Mostrar filtros"}
          </Button>
        </div>
        {filtersOpen && (
          <form
            id={id + "-filters"}
            className={styles.stack}
            onSubmit={(event) => {
              event.preventDefault();
              apply();
            }}
          >
            <div className={styles.actions} aria-label="Períodos rápidos">
              <span className={styles.muted}>Últimos:</span>
              {[
                ["24 horas", 1],
                ["7 dias", 7],
                ["30 dias", 30],
                ["90 dias", 90],
              ].map(([label, days]) => (
                <Button
                  key={days}
                  type="button"
                  onClick={() => preset(Number(days))}
                >
                  {label}
                </Button>
              ))}
            </div>
            {filterError && <Notice message={filterError} />}
            <div className={styles.grid}>
              <Field label="Busca geral">
                <Input
                  contentBefore={<SearchRegular />}
                  maxLength={255}
                  value={draft.query}
                  placeholder="Evento, pessoa, recurso ou rastreio"
                  onChange={(_, state) => set("query", state.value)}
                />
              </Field>
              <Field label="Resultado">
                <Select
                  value={draft.outcome}
                  onChange={(_, state) => set("outcome", state.value)}
                >
                  <option value="">Todos os resultados</option>
                  <option value="SUCCESS">Concluído</option>
                  <option value="FAILURE">Falha</option>
                  <option value="DENIED">Negado</option>
                </Select>
              </Field>
              <Field label="Tipo de evento">
                <Input
                  list={id + "-event-types"}
                  maxLength={100}
                  value={draft.eventType}
                  placeholder="Todos os eventos"
                  onChange={(_, state) => set("eventType", state.value)}
                />
                <datalist id={id + "-event-types"}>
                  {Object.entries(auditEventLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </datalist>
              </Field>
              <Field label="Usuário">
                <Input
                  maxLength={255}
                  value={draft.actor}
                  placeholder="Nome, usuário ou identificador"
                  onChange={(_, state) => set("actor", state.value)}
                />
              </Field>
              <Field label="Início do período">
                <Input
                  type="datetime-local"
                  step={1}
                  value={draft.since}
                  onChange={(_, state) => set("since", state.value)}
                />
              </Field>
              <Field label="Fim do período">
                <Input
                  type="datetime-local"
                  step={1}
                  value={draft.until}
                  onChange={(_, state) => set("until", state.value)}
                />
              </Field>
              <Field label="Recurso afetado">
                <Input
                  maxLength={255}
                  value={draft.target}
                  placeholder="Nome ou identificador do recurso"
                  onChange={(_, state) => set("target", state.value)}
                />
              </Field>
              <Field label="Provedor">
                <Input
                  list={id + "-providers"}
                  maxLength={63}
                  value={draft.providerId}
                  placeholder="Todos os provedores"
                  onChange={(_, state) => set("providerId", state.value)}
                />
                <datalist id={id + "-providers"}>
                  <option value="local">Conta local</option>
                  <option value="platform">Plataforma</option>
                </datalist>
              </Field>
            </div>
            {advanced && (
              <div id={id + "-advanced"} className={styles.filtersExtra}>
                <Field
                  label="Identificador de rastreio"
                  hint="Correspondência exata do trace ID."
                >
                  <Input
                    maxLength={64}
                    value={draft.traceId}
                    onChange={(_, state) => set("traceId", state.value)}
                  />
                </Field>
                <Field
                  label="Identificador do evento"
                  hint="UUID completo do evento."
                >
                  <Input
                    maxLength={36}
                    value={draft.eventId}
                    onChange={(_, state) => set("eventId", state.value)}
                  />
                </Field>
              </div>
            )}
            <div className={styles.bar}>
              <div className={styles.actions}>
                <Button
                  type="submit"
                  className={styles.button}
                  appearance="primary"
                  icon={<SearchRegular />}
                >
                  Aplicar filtros
                </Button>
                <Button
                  type="button"
                  className={styles.button}
                  onClick={() => {
                    setDraft(draftFromParams(new URLSearchParams()));
                    setFilterError("");
                    setParams({});
                  }}
                >
                  Limpar filtros
                </Button>
                <Button
                  type="button"
                  appearance="subtle"
                  className={styles.button}
                  aria-expanded={advanced}
                  aria-controls={id + "-advanced"}
                  onClick={() => setAdvanced(!advanced)}
                >
                  {advanced
                    ? "Ocultar identificadores"
                    : "Filtrar por identificadores"}
                </Button>
              </div>
              <p className={styles.muted}>
                {dirty
                  ? "Há alterações nos filtros. Aplique para atualizar a consulta e a exportação."
                  : draft.since || draft.until
                    ? "Período personalizado. Horários de Brasília."
                    : "Sem período informado: últimos 30 dias."}
              </p>
            </div>
          </form>
        )}
      </Card>

      <Card className={styles.panel} focusMode="off">
        <div className={styles.bar}>
          <div>
            <h2 className={styles.heading}>Eventos de segurança</h2>
            {data && (
              <p className={styles.muted}>
                {auditDate(data.filters.since)} até{" "}
                {auditDate(data.filters.until)} · Brasília
              </p>
            )}
          </div>
          <div className={styles.actions}>
            <Button
              className={styles.button}
              icon={<ArrowSyncRegular />}
              disabled={resource.loading || dirty}
              onClick={() => {
                if (params.has("snapshotAt")) {
                  const next = new URLSearchParams(params);
                  next.delete("snapshotAt");
                  setParams(next);
                } else void resource.reload();
              }}
            >
              Recarregar
            </Button>
            {identity?.authorities.includes("audit:export") && (
              <Button
                className={styles.button}
                icon={<ArrowDownloadRegular />}
                disabled={
                  resource.loading || !!resource.error || !data?.total || dirty
                }
                onClick={() => setExporting(true)}
              >
                Exportar consulta
              </Button>
            )}
          </div>
        </div>
        <div className={styles.bar}>
          <div className={styles.sortFields}>
            <Field label="Ordenar por">
              <Select
                value={data?.filters.sort ?? "occurredAt"}
                disabled={resource.loading || !data}
                onChange={(_, state) =>
                  data &&
                  setParams(
                    appliedAuditParams(
                      { ...data.filters, sort: state.value },
                      data.limit,
                    ),
                  )
                }
              >
                {Object.entries(auditSorts).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ordem">
              <Select
                value={data?.filters.direction ?? "desc"}
                disabled={resource.loading || !data}
                onChange={(_, state) =>
                  data &&
                  setParams(
                    appliedAuditParams(
                      { ...data.filters, direction: state.value },
                      data.limit,
                    ),
                  )
                }
              >
                <option value="desc">Decrescente</option>
                <option value="asc">Crescente</option>
              </Select>
            </Field>
          </div>
          <Field label="Eventos por página">
            <Select
              value={String(data?.limit ?? 50)}
              disabled={resource.loading || !data}
              onChange={(_, state) =>
                data &&
                setParams(appliedAuditParams(data.filters, Number(state.value)))
              }
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </Select>
          </Field>
        </div>
        <DataState {...resource}>
          {!data?.items.length ? (
            <div className={styles.empty}>
              <h3>Nenhum evento encontrado</h3>
              <p>
                Ajuste o período ou remova alguns filtros para ampliar a
                consulta.
              </p>
            </div>
          ) : (
            <div
              className={styles.tableRegion}
              role="region"
              aria-label="Tabela de eventos de segurança, com rolagem"
              tabIndex={0}
            >
              <Table className={styles.table} aria-label="Eventos de segurança">
                <colgroup>
                  <col style={{ width: "15%" }} />
                  <col style={{ width: "22%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "18%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "5%" }} />
                </colgroup>
                <TableHeader className={styles.tableHeader}>
                  <TableRow>
                    {sortHeader("Data do evento", "occurredAt")}
                    {sortHeader("Evento", "eventType")}
                    {sortHeader("Usuário", "actor")}
                    {sortHeader("Recurso", "target")}
                    {sortHeader("Provedor", "providerId")}
                    {sortHeader("Resultado", "outcome")}
                    <TableHeaderCell>
                      <span className={styles.muted}>Ver</span>
                    </TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className={styles.cell}>
                        <time dateTime={row.occurredAt}>
                          {auditDate(row.occurredAt)}
                        </time>
                      </TableCell>
                      <TableCell className={styles.cell}>
                        <div>
                          {auditEventLabels[row.eventType] || row.eventType}
                        </div>
                        {auditEventLabels[row.eventType] && (
                          <div className={styles.muted}>{row.eventType}</div>
                        )}
                      </TableCell>
                      <TableCell className={styles.cell}>
                        <div>
                          {row.actorDisplayName ||
                            row.actorUsername ||
                            row.actorSubject}
                        </div>
                        {actorCaption(row) && (
                          <div className={styles.muted}>
                            {actorCaption(row)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className={styles.cell}>
                        {row.target}
                      </TableCell>
                      <TableCell className={styles.cell}>
                        {row.providerId === "local"
                          ? "Conta local"
                          : row.providerId || "Plataforma"}
                      </TableCell>
                      <TableCell className={styles.cell}>
                        <Outcome value={row.outcome} />
                      </TableCell>
                      <TableCell className={styles.cell}>
                        <Button
                          className={styles.button}
                          appearance="subtle"
                          aria-label={"Ver detalhes do evento " + row.id}
                          onClick={(event) => {
                            detailTrigger.current = event.currentTarget;
                            setSelected(row);
                          }}
                        >
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className={styles.bar}>
            <p className={styles.muted} role="status">
              {data?.total
                ? `${data.offset + 1}–${Math.min(data.offset + data.items.length, data.total)} de ${data.total.toLocaleString("pt-BR")} eventos`
                : "0 eventos"}
            </p>
            <div className={styles.actions}>
              <Button
                className={styles.button}
                disabled={resource.loading || !data || data.offset === 0}
                onClick={() =>
                  data &&
                  setParams(
                    appliedAuditParams(
                      data.filters,
                      data.limit,
                      Math.max(0, data.offset - data.limit),
                    ),
                  )
                }
              >
                Anterior
              </Button>
              <Button
                className={styles.button}
                disabled={
                  resource.loading ||
                  !data ||
                  data.offset + data.limit >= data.total ||
                  data.offset + data.limit > 100000
                }
                onClick={() =>
                  data &&
                  setParams(
                    appliedAuditParams(
                      data.filters,
                      data.limit,
                      data.offset + data.limit,
                    ),
                  )
                }
              >
                Próxima
              </Button>
            </div>
          </div>
        </DataState>
        <p className={styles.muted}>
          Os nomes são consultados no cadastro atual; os identificadores
          originais do evento são preservados. Use os registros somente para
          investigação e controle de acesso autorizados.
        </p>
      </Card>
      {selected && (
        <AuditDetails
          row={selected}
          onClose={() => {
            setSelected(null);
            queueMicrotask(() => detailTrigger.current?.focus());
          }}
        />
      )}
      {exporting && data && (
        <ExportDialog
          data={data}
          onClose={() => setExporting(false)}
          onExported={setNotice}
        />
      )}
    </div>
  );
}

function AuditDetails({
  row,
  onClose,
}: {
  row: AuditRow;
  onClose: () => void;
}) {
  const styles = useAuditStyles();
  const fields = [
    ["Identificador do evento", row.id],
    ["Data e hora (Brasília)", auditDate(row.occurredAt)],
    ["Data e hora (UTC)", row.occurredAt],
    ["Tipo de evento", row.eventType],
    ["Usuário no evento", row.actorSubject],
    ["Usuário no cadastro atual", row.actorUsername || "Não localizado"],
    ["Nome no cadastro atual", row.actorDisplayName || "Não localizado"],
    ["Recurso afetado", row.target],
    ["Provedor", row.providerId || "Plataforma"],
    ["Rastreio (trace ID)", row.traceId || "Não registrado"],
    ["Contexto registrado", row.sourceContext || "Não registrado"],
  ];
  return (
    <Dialog
      open
      onOpenChange={(_, state) => {
        if (!state.open) onClose();
      }}
    >
      <DialogSurface className={styles.dialog}>
        <DialogBody>
          <DialogTitle>Detalhes do evento</DialogTitle>
          <DialogContent>
            <div className={styles.stack}>
              <Outcome value={row.outcome} />
              <dl className={styles.details}>
                {fields.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Fechar</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
function ExportDialog({
  data,
  onClose,
  onExported,
}: {
  data: AuditResults;
  onClose: () => void;
  onExported: (value: string) => void;
}) {
  const [format, setFormat] = useState("csv");
  const [purpose, setPurpose] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [includeActorNames, setIncludeActorNames] = useState(false);
  const { identity } = useIdentity();
  const maximum = format === "pdf" ? 1000 : 10000;
  return (
    <EntryDialog
      open
      title="Exportar evidência de auditoria"
      saveLabel="Gerar e baixar arquivo"
      onClose={onClose}
      onSave={async () => {
        if (!confirmed)
          throw new IdentityServiceError(
            "Confirme o uso autorizado dos dados.",
            400,
          );
        if (data.total > maximum)
          throw new IdentityServiceError(
            "Refine os filtros para respeitar o limite deste formato.",
            400,
          );
        const response = await identityResponse(
          "/security/audit/export?" +
            appliedAuditParams(data.filters, data.limit),
          "POST",
          { format, purpose, includeActorNames },
        );
        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition") || "";
        const filename =
          /filename="(auditoria-[a-f0-9-]+\.(?:csv|json|xlsx|pdf))"/.exec(
            disposition,
          )?.[1];
        if (!filename)
          throw new Error("O arquivo foi recebido sem identificação válida.");
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        onExported(
          `Arquivo gerado com ${response.headers.get("X-Audit-Record-Count") || data.total} eventos. Referência da exportação: ${response.headers.get("X-Audit-Export-Id") || filename}.`,
        );
      }}
    >
      <p>
        O arquivo inclui todos os eventos dos filtros aplicados, na mesma
        ordenação da consulta. A paginação da tela não limita a exportação.
      </p>
      <Field label="Formato">
        <Select value={format} onChange={(_, state) => setFormat(state.value)}>
          <option value="csv">CSV — análise e integração</option>
          <option value="xlsx">XLSX — planilha com aba de evidência</option>
          <option value="json">JSON — dados estruturados e metadados</option>
          <option value="pdf">PDF — relatório para leitura</option>
        </Select>
      </Field>
      <p>
        {data.total.toLocaleString("pt-BR")} eventos na consulta. Limite do
        formato: {maximum.toLocaleString("pt-BR")} eventos.
      </p>
      {data.total > maximum && (
        <Notice message="A consulta excede o limite deste formato. Feche esta janela e refine os filtros; nenhum arquivo parcial será gerado." />
      )}
      <Field
        label="Finalidade da exportação"
        required
        hint="De 10 a 500 caracteres. Informe a investigação, controle ou solicitação; não inclua senhas nem dados pessoais desnecessários."
      >
        <Input
          required
          minLength={10}
          maxLength={500}
          value={purpose}
          onChange={(_, state) => setPurpose(state.value)}
        />
      </Field>
      {identity?.authorities.includes("identity:read") && (
        <Checkbox
          label="Incluir nomes e usuários do cadastro atual"
          checked={includeActorNames}
          onChange={(_, state) => setIncludeActorNames(!!state.checked)}
        />
      )}
      <p>
        Por padrão, os nomes do cadastro são omitidos. Os identificadores
        originais continuam no arquivo e ainda podem identificar pessoas.
      </p>
      <Checkbox
        required
        label="Confirmo que o uso e o compartilhamento destes dados são autorizados para a finalidade informada."
        checked={confirmed}
        onChange={(_, state) => setConfirmed(!!state.checked)}
      />
      <p>
        O arquivo contém identificadores pessoais, os filtros, o autor da
        geração e um hash de conferência dos dados. A geração é registrada na
        auditoria. O hash não substitui uma assinatura digital.
      </p>
    </EntryDialog>
  );
}
