import {
  Badge,
  Button,
  Card,
  Checkbox,
  Combobox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Input,
  Option,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@fluentui/react-components";
import {
  ArrowSyncRegular,
  ClockRegular,
  DesktopRegular,
  PhoneRegular,
  SearchRegular,
  ShieldCheckmarkRegular,
  SignOutRegular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { useIdentity } from "./identity-context";
import { securityRequest } from "./identity-client";
import type { ActiveSession, User } from "./security-model";
import { DataState, EntryDialog, Notice, useSecurityData } from "./security-ui";
import { useSessionsStyles } from "./sessions-appearance";
import { useSecurityActionStyles } from "./security-action-styles";
import {
  activeSessions,
  defaultSessionFilters,
  durationLabel,
  filterSessions,
  providerLabel,
  revocationReasons,
  sessionDate,
  type RevocationReason,
  type RevocationResult,
  type SessionFilters,
  type SessionOverview,
} from "./sessions-model";

function ClientIcon({ session }: { session: ActiveSession }) {
  return session.device === "Celular" || session.device === "Tablet" ? (
    <PhoneRegular aria-hidden />
  ) : (
    <DesktopRegular aria-hidden />
  );
}

export function SessionsPage() {
  const styles = useSessionsStyles();
  const actionStyles = useSecurityActionStyles();
  const { identity, refresh, endSession } = useIdentity();
  const [params, setParams] = useSearchParams();
  const canReadUsers = !!identity?.authorities.includes("identity:read");
  const canRevoke = !!identity?.authorities.includes("session:revoke");
  const subject = params.get("usuario") || identity?.subject || "";
  const users = useSecurityData(
    () =>
      canReadUsers ? securityRequest<User[]>("/users") : Promise.resolve([]),
    [canReadUsers],
  );
  const resource = useSecurityData(
    () =>
      securityRequest<SessionOverview>(
        "/sessions/overview?subject=" + encodeURIComponent(subject),
      ),
    [subject],
  );
  // Never show the previous person's records while a new request is pending.
  const data = resource.data?.subject === subject ? resource.data : null;
  const [filters, setFilters] = useState<SessionFilters>(defaultSessionFilters);
  const [userSearch, setUserSearch] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [notice, setNotice] = useState("");
  const [detail, setDetail] = useState<ActiveSession | null>(null);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const [revoking, setRevoking] = useState<{
    subject: string;
    name: string;
    sessions: ActiveSession[];
  } | null>(null);
  const [reason, setReason] = useState<RevocationReason>("ADMINISTRATIVE");
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = performance.now();
    setElapsed(0);
    const timer = window.setInterval(
      () => setElapsed(performance.now() - started),
      10000,
    );
    return () => window.clearInterval(timer);
  }, [data]);
  useEffect(() => {
    setSelected([]);
    setPage(0);
    setDetail(null);
    setRevoking(null);
    setNotice("");
    setFilters(defaultSessionFilters);
    setUserSearch(null);
  }, [subject]);
  useEffect(() => {
    setSelected([]);
  }, [data]);
  const now = data ? Date.parse(data.checkedAt) + elapsed : 0;
  const checkedAt = data ? Date.parse(data.checkedAt) : 0;
  const all = activeSessions(data?.items ?? [], checkedAt);
  const rows = filterSessions(data?.items ?? [], filters, now, checkedAt);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pages - 1);
  const visible = rows.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize,
  );
  const current = all.find((session) => session.current);
  const others = all.filter((session) => !session.current);
  const selectedSessions = rows.filter((session) =>
    selected.includes(session.reference),
  );
  const selectedUser = users.data?.find((user) => user.subject === subject);
  const userName =
    selectedUser?.displayName ||
    (subject === identity?.subject ? identity?.displayName : subject) ||
    "Usuário";
  const userCaption =
    selectedUser?.username ||
    (subject === identity?.subject ? identity?.username : subject);
  const candidates = [...(users.data ?? [])];
  if (identity && !candidates.some((user) => user.subject === identity.subject))
    candidates.unshift({
      subject: identity.subject,
      displayName: identity.displayName,
      username: identity.username,
    } as User);
  const userLabel = (user: Pick<User, "displayName" | "username">) =>
    `${user.displayName} (${user.username})`;
  const filteredUsers = candidates.filter(
    (user) =>
      !userSearch ||
      userLabel(user)
        .toLocaleLowerCase("pt-BR")
        .includes(userSearch.toLocaleLowerCase("pt-BR")),
  );
  const blocked = resource.loading || !!resource.error || !data;
  const setFilter = (key: keyof SessionFilters, value: string) => {
    setFilters((previous) => ({ ...previous, [key]: value }));
    setPage(0);
    setSelected([]);
  };
  const chooseUser = (value: string) =>
    setParams(value === identity?.subject ? {} : { usuario: value });
  const openRevoke = (sessions: ActiveSession[]) => {
    setReason("ADMINISTRATIVE");
    setRevoking({ subject, name: userName, sessions });
  };
  const inspect = (session: ActiveSession) => {
    detailTrigger.current = document.activeElement as HTMLElement;
    setDetail(session);
  };
  const closeDetail = () => {
    setDetail(null);
    requestAnimationFrame(
      () => detailTrigger.current?.isConnected && detailTrigger.current.focus(),
    );
  };
  const toggle = (reference: string, checked: boolean) =>
    setSelected((previous) =>
      checked
        ? [...new Set([...previous, reference])].slice(0, 100)
        : previous.filter((value) => value !== reference),
    );
  const status = (session: ActiveSession) => (
    <Badge
      appearance="tint"
      color={
        session.current
          ? "brand"
          : Date.parse(session.expiresAt) - now <= 300000
            ? "warning"
            : "subtle"
      }
    >
      {Date.parse(session.expiresAt) <= now
        ? "Atualize o prazo"
        : session.current
          ? "Esta sessão"
          : Date.parse(session.expiresAt) - now <= 300000
            ? "Expira em breve"
            : "Ativa"}
    </Badge>
  );
  const actions = (session: ActiveSession) => (
    <div className={styles.actions}>
      <Button size="small" onClick={() => inspect(session)}>
        Detalhes
        <span className={styles.srOnly}>
          {" "}
          da sessão {session.reference.slice(0, 8)}
        </span>
      </Button>
      {canRevoke && (
        <Button
          size="small"
          className={actionStyles.danger}
          disabled={blocked}
          onClick={() => openRevoke([session])}
        >
          Encerrar
          <span className={styles.srOnly}>
            {" "}
            sessão {session.reference.slice(0, 8)}
          </span>
        </Button>
      )}
    </div>
  );
  const metricRows = [
    {
      title: "Sessões ativas",
      value: all.length,
      hint: "Do usuário selecionado",
      icon: <ShieldCheckmarkRegular aria-hidden />,
    },
    {
      title: "Outras sessões",
      value: others.length,
      hint: "Exceto a sessão deste portal",
      icon: <DesktopRegular aria-hidden />,
    },
    {
      title: "Atividade recente",
      value: all.filter(
        (session) => now - Date.parse(session.lastAccessedAt) < 300000,
      ).length,
      hint: "Últimos 5 minutos",
      icon: <ArrowSyncRegular aria-hidden />,
    },
    {
      title: "Expiram em breve",
      value: all.filter(
        (session) => Date.parse(session.expiresAt) - now <= 300000,
      ).length,
      hint: "Prazo nos próximos 5 minutos",
      icon: <ClockRegular aria-hidden />,
    },
  ];
  return (
    <div className={styles.stack}>
      {notice && (
        <Notice
          intent="success"
          message={notice}
          onDismiss={() => setNotice("")}
        />
      )}
      <Card className={styles.panel}>
        <div className={styles.bar}>
          <div className={styles.user}>
            {canReadUsers ? (
              <Field
                label="Usuário em acompanhamento"
                hint="Pesquise pelo nome ou usuário e selecione uma conta."
              >
                <Combobox
                  className={styles.wideControl}
                  inlinePopup
                  value={userSearch ?? `${userName} (${userCaption})`}
                  selectedOptions={[subject]}
                  onChange={(event) => setUserSearch(event.target.value)}
                  onOpenChange={(_, state) =>
                    setUserSearch(state.open ? "" : null)
                  }
                  onOptionSelect={(_, state) => {
                    if (state.optionValue) chooseUser(state.optionValue);
                    setUserSearch(null);
                  }}
                >
                  {filteredUsers.map((user) => (
                    <Option
                      key={user.subject}
                      value={user.subject}
                      text={userLabel(user)}
                    >
                      {userLabel(user)}
                      {user.subject === identity?.subject ? " · Você" : ""}
                    </Option>
                  ))}
                  {!filteredUsers.length && (
                    <Option disabled value="">
                      Nenhum usuário encontrado
                    </Option>
                  )}
                </Combobox>
              </Field>
            ) : (
              <div>
                <h2 className={styles.heading}>{userName}</h2>
                <p className={styles.muted}>{userCaption}</p>
              </div>
            )}
          </div>
          <div className={styles.actions}>
            {subject !== identity?.subject && (
              <Button onClick={() => chooseUser(identity?.subject || "")}>
                Minhas sessões
              </Button>
            )}
            <Button
              icon={<ArrowSyncRegular />}
              disabled={resource.loading}
              onClick={() => {
                setSelected([]);
                void resource.reload();
              }}
            >
              Atualizar sessões
            </Button>
          </div>
        </div>
        {selectedUser && (
          <div className={styles.actions}>
            <Badge
              appearance="tint"
              color={selectedUser.enabled ? "success" : "danger"}
            >
              {selectedUser.enabled ? "Conta habilitada" : "Conta bloqueada"}
            </Badge>
            <span className={styles.muted}>
              {selectedUser.local
                ? "Credencial local cadastrada"
                : "Conta sem credencial local"}
            </span>
          </div>
        )}
        {users.error && <Notice message={users.error} />}
        {!canRevoke && (
          <p className={styles.muted}>
            Seu acesso permite consultar sessões. O encerramento requer a
            permissão session:revoke.
          </p>
        )}
      </Card>
      <DataState {...resource} data={data}>
        <div
          className={styles.metrics}
          aria-label="Resumo do usuário selecionado"
        >
          {metricRows.map((metric) => (
            <Card key={metric.title} className={styles.metric}>
              <div className={styles.metricHeader}>
                <span>{metric.title}</span>
                <span className={styles.icon}>{metric.icon}</span>
              </div>
              <strong className={styles.value}>
                {data ? metric.value : "—"}
              </strong>
              <p className={styles.muted}>{metric.hint}</p>
            </Card>
          ))}
        </div>
        {current && (
          <section className={styles.current} aria-label="Sua sessão atual">
            <div className={styles.stack}>
              <div className={styles.actions}>
                <ShieldCheckmarkRegular aria-hidden />
                <h2 className={styles.currentTitle}>
                  Você está conectado nesta sessão
                </h2>
              </div>
              <span>
                {current.browser || "Navegador não registrado"} ·{" "}
                {current.operatingSystem || "Sistema não registrado"}
              </span>
              <p className={styles.muted}>
                Iniciada em {sessionDate(current.createdAt)} · Limite absoluto:{" "}
                {sessionDate(current.absoluteExpiresAt)}
              </p>
            </div>
            <div className={styles.stack}>
              <strong>
                Prazo atual:{" "}
                {durationLabel(Date.parse(current.expiresAt) - now)}
              </strong>
              <span className={styles.muted}>
                A atividade pode renovar a inatividade até o limite absoluto.
              </span>
            </div>
          </section>
        )}
        <Card className={styles.panel}>
          <div className={styles.bar}>
            <h2 className={styles.heading}>Acessos do usuário</h2>
            <div className={styles.actions}>
              {canRevoke && (
                <>
                  <Button
                    className={actionStyles.danger}
                    icon={<SignOutRegular />}
                    disabled={blocked || !others.length || others.length > 100}
                    onClick={() => openRevoke(others)}
                  >
                    Encerrar outras ({others.length})
                  </Button>
                  <Button
                    className={actionStyles.danger}
                    disabled={blocked || !all.length || all.length > 100}
                    onClick={() => openRevoke(all)}
                  >
                    Encerrar todas ({all.length})
                  </Button>
                </>
              )}
            </div>
          </div>
          <div className={styles.filters}>
            <Field label="Buscar sessão">
              <Input
                className={styles.wideControl}
                value={filters.query}
                contentBefore={<SearchRegular />}
                placeholder="Navegador, sistema, provedor ou referência"
                onChange={(_, state) => setFilter("query", state.value)}
              />
            </Field>
            <Field label="Sessões">
              <Select
                className={styles.wideControl}
                value={filters.scope}
                onChange={(_, state) => setFilter("scope", state.value)}
              >
                <option value="all">Todas as sessões</option>
                <option value="current">Esta sessão</option>
                <option value="other">Outras sessões</option>
              </Select>
            </Field>
            <Field label="Atividade e prazo">
              <Select
                className={styles.wideControl}
                value={filters.activity}
                onChange={(_, state) => setFilter("activity", state.value)}
              >
                <option value="all">Qualquer atividade</option>
                <option value="recent">Ativas nos últimos 5 min</option>
                <option value="idle">Sem atividade há 15 min</option>
                <option value="expiring">Expiram em até 5 min</option>
              </Select>
            </Field>
            <Field label="Provedor">
              <Select
                className={styles.wideControl}
                value={filters.provider}
                onChange={(_, state) => setFilter("provider", state.value)}
              >
                <option value="all">Todos os provedores</option>
                {[
                  ...new Set(
                    (data?.items ?? []).map(
                      (item) => item.providerId || "unknown",
                    ),
                  ),
                ]
                  .sort()
                  .map((value) => (
                    <option key={value} value={value}>
                      {providerLabel(value === "unknown" ? null : value)}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>
          <div className={styles.bar}>
            <div className={styles.actions}>
              <Field label="Ordenar por">
                <Select
                  className={styles.wideControl}
                  value={filters.sort}
                  onChange={(_, state) => setFilter("sort", state.value)}
                >
                  <option value="activity-desc">Atividade mais recente</option>
                  <option value="activity-asc">Atividade mais antiga</option>
                  <option value="created-desc">Início mais recente</option>
                  <option value="created-asc">Início mais antigo</option>
                  <option value="expires-asc">Expiração mais próxima</option>
                  <option value="expires-desc">Expiração mais distante</option>
                </Select>
              </Field>
              <Button
                onClick={() => {
                  setFilters(defaultSessionFilters);
                  setPage(0);
                  setSelected([]);
                }}
              >
                Limpar filtros
              </Button>
            </div>
            <p className={styles.muted}>
              {rows.length} de {all.length} sessões · Horários de Brasília
            </p>
          </div>
          {canRevoke && (
            <div className={styles.bar}>
              <div className={styles.actions}>
                <Checkbox
                  label="Selecionar esta página"
                  checked={
                    visible.length > 0 &&
                    visible.every((item) => selected.includes(item.reference))
                      ? true
                      : visible.some((item) =>
                            selected.includes(item.reference),
                          )
                        ? "mixed"
                        : false
                  }
                  disabled={blocked || !visible.length}
                  onChange={(_, state) =>
                    setSelected((previous) =>
                      state.checked
                        ? [
                            ...new Set([
                              ...previous,
                              ...visible.map((item) => item.reference),
                            ]),
                          ].slice(0, 100)
                        : previous.filter(
                            (value) =>
                              !visible.some((item) => item.reference === value),
                          ),
                    )
                  }
                />
                <span className={styles.muted}>
                  {selectedSessions.length} selecionadas · Limite de 100 por
                  ação
                </span>
              </div>
              <Button
                className={actionStyles.danger}
                disabled={blocked || !selectedSessions.length}
                onClick={() => openRevoke(selectedSessions)}
              >
                Encerrar selecionadas ({selectedSessions.length})
              </Button>
            </div>
          )}
          {rows.length ? (
            <>
              <div
                className={styles.tableWrap}
                tabIndex={0}
                role="region"
                aria-label="Tabela de sessões com rolagem horizontal"
              >
                <Table className={styles.table} aria-label="Sessões ativas">
                  <TableHeader>
                    <TableRow>
                      {canRevoke && (
                        <TableHeaderCell className={styles.selection}>
                          <span className={styles.srOnly}>Selecionar</span>
                        </TableHeaderCell>
                      )}
                      {[
                        "Dispositivo e navegador",
                        "Início",
                        "Última atividade",
                        "Expiração atual",
                        "Provedor",
                        "Ações",
                      ].map((title) => (
                        <TableHeaderCell key={title}>{title}</TableHeaderCell>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.map((session) => (
                      <TableRow key={session.reference}>
                        {canRevoke && (
                          <TableCell>
                            <Checkbox
                              aria-label={
                                "Selecionar sessão " +
                                session.reference.slice(0, 8)
                              }
                              disabled={blocked}
                              checked={selected.includes(session.reference)}
                              onChange={(_, state) =>
                                toggle(session.reference, !!state.checked)
                              }
                            />
                          </TableCell>
                        )}
                        <TableCell className={styles.cell}>
                          <div className={styles.device}>
                            <span className={styles.icon}>
                              <ClientIcon session={session} />
                            </span>
                            <div>
                              <strong>
                                {session.browser || "Navegador não registrado"}
                              </strong>
                              <p className={styles.muted}>
                                {session.operatingSystem ||
                                  "Sistema não registrado"}{" "}
                                ·{" "}
                                {session.device || "Dispositivo não registrado"}
                              </p>
                              <div className={styles.actions}>
                                {status(session)}
                                <span className={styles.reference}>
                                  {session.reference.slice(0, 8)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{sessionDate(session.createdAt)}</TableCell>
                        <TableCell>
                          <div>{sessionDate(session.lastAccessedAt)}</div>
                          <span className={styles.muted}>
                            Há{" "}
                            {durationLabel(
                              now - Date.parse(session.lastAccessedAt),
                            )}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>{sessionDate(session.expiresAt)}</div>
                          <span className={styles.muted}>
                            Em{" "}
                            {durationLabel(Date.parse(session.expiresAt) - now)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {providerLabel(session.providerId)}
                        </TableCell>
                        <TableCell>{actions(session)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className={styles.mobile}>
                {visible.map((session) => (
                  <Card key={session.reference} className={styles.panel}>
                    <div className={styles.bar}>
                      <div className={styles.device}>
                        <span className={styles.icon}>
                          <ClientIcon session={session} />
                        </span>
                        <strong>
                          {session.browser || "Navegador não registrado"}
                        </strong>
                      </div>
                      {status(session)}
                    </div>
                    <p className={styles.muted}>
                      {session.operatingSystem || "Sistema não registrado"} ·{" "}
                      {providerLabel(session.providerId)}
                    </p>
                    <dl className={styles.details}>
                      <div className={styles.detail}>
                        <dt>Última atividade</dt>
                        <dd>{sessionDate(session.lastAccessedAt)}</dd>
                      </div>
                      <div className={styles.detail}>
                        <dt>Expiração atual</dt>
                        <dd>
                          {sessionDate(session.expiresAt)}
                          <br />
                          Em{" "}
                          {durationLabel(Date.parse(session.expiresAt) - now)}
                        </dd>
                      </div>
                    </dl>
                    <div className={styles.bar}>
                      {canRevoke && (
                        <Checkbox
                          label={"Selecionar " + session.reference.slice(0, 8)}
                          checked={selected.includes(session.reference)}
                          disabled={blocked}
                          onChange={(_, state) =>
                            toggle(session.reference, !!state.checked)
                          }
                        />
                      )}
                      {actions(session)}
                    </div>
                  </Card>
                ))}
              </div>
              <div className={styles.bar}>
                <Field label="Sessões por página">
                  <Select
                    className={styles.wideControl}
                    value={String(pageSize)}
                    onChange={(_, state) => {
                      setPageSize(Number(state.value));
                      setPage(0);
                    }}
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </Select>
                </Field>
                <div className={styles.actions}>
                  <Button
                    disabled={!currentPage}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    Anterior
                  </Button>
                  <span>
                    Página {currentPage + 1} de {pages}
                  </span>
                  <Button
                    disabled={currentPage >= pages - 1}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.empty}>
              <ShieldCheckmarkRegular className={styles.icon} aria-hidden />
              <h3 className={styles.heading}>
                {all.length
                  ? "Nenhuma sessão corresponde aos filtros"
                  : "Nenhuma sessão ativa para este usuário"}
              </h3>
              <p className={styles.muted}>
                {all.length
                  ? "Ajuste a busca ou limpe os filtros para consultar os outros acessos."
                  : "As sessões expiradas ou encerradas deixam de aparecer nesta lista."}
              </p>
            </div>
          )}
          <p className={styles.muted}>
            Consulta realizada em {sessionDate(data?.checkedAt || null)}.{" "}
            {elapsed >= 60000
              ? "Os dados podem ter mudado. Atualize a consulta antes de decidir."
              : "Use Atualizar sessões para buscar os acessos mais recentes."}{" "}
            O prazo exibido reflete a última consulta e pode mudar com a
            atividade do usuário.
          </p>
        </Card>
        <p className={styles.muted}>
          Navegador e dispositivo são classificações aproximadas informadas pelo
          cliente no login. Sessões anteriores à atualização podem não ter esses
          dados. Uma sessão ativa não significa que a pessoa esteja online neste
          momento.
        </p>
      </DataState>
      {detail && (
        <Dialog
          open
          onOpenChange={(_, state) => {
            if (!state.open) closeDetail();
          }}
        >
          <DialogSurface className={styles.dialog}>
            <DialogBody>
              <DialogTitle>Detalhes da sessão</DialogTitle>
              <DialogContent>
                <div className={styles.stack}>
                  {status(detail)}
                  <dl className={styles.details}>
                    {[
                      ["Usuário", userName],
                      ["Navegador", detail.browser || "Não registrado"],
                      [
                        "Sistema operacional",
                        detail.operatingSystem || "Não registrado",
                      ],
                      ["Dispositivo", detail.device || "Não registrado"],
                      ["Provedor", providerLabel(detail.providerId)],
                      ["Início", sessionDate(detail.createdAt)],
                      [
                        "Última atividade na consulta",
                        sessionDate(detail.lastAccessedAt),
                      ],
                      [
                        "Expiração por inatividade",
                        sessionDate(detail.idleExpiresAt),
                      ],
                      [
                        "Limite absoluto",
                        sessionDate(detail.absoluteExpiresAt),
                      ],
                      ["Expiração efetiva", sessionDate(detail.expiresAt)],
                    ].map(([label, value]) => (
                      <div key={label} className={styles.detail}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div>
                    <strong>Referência de consulta</strong>
                    <p className={styles.reference}>{detail.reference}</p>
                    <p className={styles.muted}>
                      Use esta referência para correlacionar o acesso com os
                      registros de encerramento na auditoria.
                    </p>
                  </div>
                  <p className={styles.muted}>
                    O primeiro prazo atingido encerra o acesso: inatividade ou
                    limite absoluto. Encerrar esta sessão exige um novo login no
                    próximo acesso; não bloqueia a conta nem encerra a sessão no
                    provedor externo.
                  </p>
                </div>
              </DialogContent>
              <DialogActions>
                {identity?.authorities.includes("audit:read") && (
                  <Button
                    as="a"
                    href={
                      "/seguranca/auditoria?target=" +
                      encodeURIComponent(subject)
                    }
                  >
                    Auditoria do usuário
                  </Button>
                )}
                <Button appearance="primary" onClick={closeDetail}>
                  Fechar detalhes
                </Button>
              </DialogActions>
            </DialogBody>
          </DialogSurface>
        </Dialog>
      )}
      {revoking && (
        <EntryDialog
          open
          destructive
          title={
            revoking.sessions.length === 1
              ? "Encerrar sessão"
              : `Encerrar ${revoking.sessions.length} sessões`
          }
          saveLabel={
            revoking.sessions.length === 1
              ? "Encerrar sessão"
              : "Encerrar sessões"
          }
          busyLabel="Encerrando…"
          onClose={() => setRevoking(null)}
          onSave={async () => {
            const result = await securityRequest<RevocationResult>(
              "/sessions/revoke",
              "POST",
              {
                subject: revoking.subject,
                references: revoking.sessions.map(
                  (session) => session.reference,
                ),
                reason,
              },
            );
            if (result.currentRevoked) {
              endSession();
              return;
            }
            setSelected([]);
            setNotice(
              `${result.revoked} ${result.revoked === 1 ? "sessão encerrada" : "sessões encerradas"}.${result.alreadyEnded ? ` ${result.alreadyEnded} já não estavam disponíveis.` : ""} Um novo login será necessário para retomar esses acessos.`,
            );
            await refresh();
            await resource.reload();
          }}
        >
          <p>
            Usuário: <strong>{revoking.name}</strong>. Os acessos selecionados
            serão encerrados e a ação será registrada na auditoria.
          </p>
          {revoking.sessions.some((session) => session.current) && (
            <Notice
              intent="info"
              message="Esta ação inclui sua sessão atual. Você sairá do portal e precisará entrar novamente."
            />
          )}
          <Field label="Motivo do encerramento" required>
            <Select
              className={styles.wideControl}
              value={reason}
              onChange={(_, state) =>
                setReason(state.value as RevocationReason)
              }
            >
              {Object.entries(revocationReasons).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <p className={styles.muted}>
            A ação afeta apenas as {revoking.sessions.length} sessões
            confirmadas nesta consulta. Novos logins continuam permitidos. Para
            impedir novos acessos, um administrador deve bloquear a conta.
          </p>
        </EntryDialog>
      )}
    </div>
  );
}
