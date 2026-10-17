import {
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Checkbox,
  makeStyles,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  tokens,
} from "@fluentui/react-components";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router";
import { PageBreadcrumb } from "../../components/page-breadcrumb";
import { useIdentity } from "./identity-context";
import { errorMessage } from "./identity-client";
import { securitySections, type SecuritySection } from "./security-model";

export const useSecurityStyles = makeStyles({
  page: {
    display: "grid",
    gap: tokens.spacingVerticalXL,
    maxWidth: "1200px",
    minWidth: 0,
    margin: "0 auto",
  },
  heading: {
    overflowWrap: "anywhere",
    margin: 0,
    fontSize: tokens.fontSizeHero800,
    lineHeight: tokens.lineHeightHero800,
    "@media(max-width:600px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },
  lead: {
    marginTop: tokens.spacingVerticalS,
    marginBottom: 0,
    color: tokens.colorNeutralForeground2,
    maxWidth: "780px",
  },
  widePage: { maxWidth: "none", width: "100%" },
  bar: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: tokens.spacingHorizontalM,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: tokens.spacingHorizontalS,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))",
    gap: tokens.spacingHorizontalL,
  },
  stack: { display: "grid", gap: tokens.spacingVerticalM, minWidth: 0 },
  columns: {
    display: "grid",
    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
    gap: tokens.spacingHorizontalL,
    "@media(max-width:650px)": { gridTemplateColumns: "minmax(0,1fr)" },
  },
  panel: {
    padding: tokens.spacingHorizontalXL,
    display: "grid",
    gap: tokens.spacingVerticalL,
  },
  table: {
    overflowX: "auto",
    border: tokens.strokeWidthThin + " solid " + tokens.colorNeutralStroke2,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  tableCell: {
    minWidth: "140px",
    paddingTop: tokens.spacingVerticalM,
    paddingBottom: tokens.spacingVerticalM,
    overflowWrap: "anywhere",
  },
  empty: {
    padding: tokens.spacingHorizontalXXL,
    textAlign: "center",
    color: tokens.colorNeutralForeground2,
  },
  muted: {
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase200,
    overflowWrap: "anywhere",
  },
  form: { display: "grid", gap: tokens.spacingVerticalL },
  dialog: { maxWidth: "760px", width: "calc(100vw - 32px)" },
  choices: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
    maxHeight: "220px",
    overflowY: "auto",
    border: tokens.strokeWidthThin + " solid " + tokens.colorNeutralStroke2,
    borderRadius: tokens.borderRadiusMedium,
    padding: tokens.spacingHorizontalS,
  },
  search: { minWidth: "min(100%,280px)" },
});
export function Notice({
  message,
  intent = "error",
  onDismiss,
}: {
  message: string;
  intent?: "error" | "success" | "info";
  onDismiss?: () => void;
}) {
  return (
    <MessageBar intent={intent}>
      <MessageBarBody>
        {message}{" "}
        {onDismiss && (
          <Button size="small" appearance="transparent" onClick={onDismiss}>
            Fechar mensagem
          </Button>
        )}
      </MessageBarBody>
    </MessageBar>
  );
}
export function RequireIdentity({
  children,
  permission = "",
}: {
  children: ReactNode;
  permission?: string;
}) {
  const { identity, loading, unavailable, refresh } = useIdentity();
  const location = useLocation();
  const styles = useSecurityStyles();
  if (loading) return <Spinner label="Carregando sua sessão" />;
  if (!identity)
    return (
      <Card className={styles.panel}>
        <h1 className={styles.heading}>
          {unavailable
            ? "Serviço de segurança indisponível"
            : "Entre para gerenciar a segurança"}
        </h1>
        <p>
          {unavailable
            ? "Não foi possível consultar sua sessão. Tente novamente."
            : "Use sua conta local ou um provedor externo habilitado."}
        </p>
        <div className={styles.actions}>
          <Button
            appearance="primary"
            as="a"
            href={"/entrar?retorno=" + encodeURIComponent(location.pathname)}
          >
            Entrar
          </Button>
          <Button onClick={() => void refresh()}>Tentar novamente</Button>
        </div>
      </Card>
    );
  if (permission && !identity.authorities.includes(permission))
    return (
      <Card className={styles.panel}>
        <h1 className={styles.heading}>Acesso restrito</h1>
        <p>
          Sua conta não tem permissão para consultar esta área. Solicite acesso
          a um administrador.
        </p>
        <Button as="a" href="/seguranca/minha-conta">
          Consultar minha conta
        </Button>
      </Card>
    );
  return <>{children}</>;
}
export function SecurityFrame({
  section,
  children,
}: {
  section: SecuritySection;
  children: ReactNode;
}) {
  const styles = useSecurityStyles();
  const descriptor = securitySections[section];
  return (
    <RequireIdentity permission={descriptor.permission}>
      <div
        className={mergeClasses(
          styles.page,
          section === "auditoria" && styles.widePage,
        )}
      >
        <PageBreadcrumb
          items={[
            { label: "Visão geral", href: "/" },
            { label: "Segurança", href: "/seguranca" },
            { label: descriptor.title },
          ]}
        />
        <header>
          <h1 className={styles.heading}>{descriptor.title}</h1>
          <p className={styles.lead}>{descriptor.description}</p>
        </header>
        {children}
      </div>
    </RequireIdentity>
  );
}
export function useSecurityData<T>(
  load: () => Promise<T>,
  dependencies: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const reload = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError("");
    try {
      const value = await load();
      if (request === sequence.current) setData(value);
    } catch (reason) {
      if (request === sequence.current) {
        setError(errorMessage(reason));
        setData(null);
      }
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, dependencies);
  useEffect(() => {
    void reload();
    return () => {
      sequence.current++;
    };
  }, [reload]);
  return { data, loading, error, reload };
}
export function DataState({
  loading,
  error,
  reload,
  children,
  data = null,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
  children: ReactNode;
  data?: unknown;
}) {
  if (loading && data === null) return <Spinner label="Carregando registros" />;
  if (error)
    return (
      <div>
        <Notice message={error} />
        <Button onClick={reload}>Tentar novamente</Button>
      </div>
    );
  return (
    <>
      {loading && <Spinner size="tiny" label="Atualizando registros" />}
      {children}
    </>
  );
}
export function RecordTable<T>({
  rows,
  columns,
  rowKey,
  label,
  empty = "Nenhum registro encontrado.",
}: {
  rows: T[];
  columns: { title: string; render: (row: T) => ReactNode }[];
  rowKey: (row: T) => string;
  label: string;
  empty?: string;
}) {
  const styles = useSecurityStyles();
  if (!rows.length) return <Card className={styles.empty}>{empty}</Card>;
  return (
    <div className={styles.table}>
      <Table aria-label={label}>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHeaderCell key={column.title}>
                {column.title}
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((column) => (
                <TableCell className={styles.tableCell} key={column.title}>
                  {column.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
export function EntryDialog({
  title,
  open,
  onClose,
  onSave,
  children,
  saveLabel = "Salvar",
  destructive = false,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  children: ReactNode;
  saveLabel?: string;
  destructive?: boolean;
}) {
  const styles = useSecurityStyles();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const returnFocus = useRef<HTMLElement | null>(
    typeof document === "undefined"
      ? null
      : (document.activeElement as HTMLElement),
  );
  const errorFocus = useRef<HTMLDivElement>(null);
  useEffect(
    () => () => {
      if (returnFocus.current?.isConnected) returnFocus.current.focus();
    },
    [],
  );
  useEffect(() => {
    if (error) errorFocus.current?.focus();
  }, [error]);
  useEffect(() => {
    if (open) setError("");
  }, [open]);
  return (
    <Dialog
      open={open}
      modalType={destructive ? "alert" : "modal"}
      onOpenChange={(_, state) => {
        if (!state.open && !saving) onClose();
      }}
    >
      <DialogSurface className={styles.dialog}>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setError("");
            try {
              await onSave();
              onClose();
            } catch (reason) {
              setError(errorMessage(reason));
            } finally {
              setSaving(false);
            }
          }}
        >
          <DialogBody>
            <DialogTitle>{title}</DialogTitle>
            <DialogContent>
              <div className={styles.form}>
                {error && (
                  <div ref={errorFocus} tabIndex={-1}>
                    <Notice message={error} onDismiss={() => setError("")} />
                  </div>
                )}
                {children}
              </div>
            </DialogContent>
            <DialogActions>
              <Button disabled={saving} onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" appearance="primary" disabled={saving}>
                {saving ? "Salvando…" : saveLabel}
              </Button>
            </DialogActions>
          </DialogBody>
        </form>
      </DialogSurface>
    </Dialog>
  );
}
export function Choices({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { key: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const styles = useSecurityStyles();
  return (
    <Field label={label}>
      <div className={styles.choices} role="group" aria-label={label}>
        {options.length ? (
          options.map((option) => (
            <Checkbox
              key={option.key}
              label={option.label}
              checked={selected.includes(option.key)}
              onChange={(_, state) =>
                onChange(
                  state.checked
                    ? [...selected, option.key]
                    : selected.filter((key) => key !== option.key),
                )
              }
            />
          ))
        ) : (
          <p className={styles.muted}>Nenhuma opção cadastrada.</p>
        )}
      </div>
    </Field>
  );
}
