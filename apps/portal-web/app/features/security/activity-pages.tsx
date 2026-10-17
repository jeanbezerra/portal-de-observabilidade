import { Badge, Button, Field, Select } from "@fluentui/react-components";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { useIdentity } from "./identity-context";
import { securityRequest } from "./identity-client";
import { formatDate, type ActiveSession, type User } from "./security-model";
import {
  DataState,
  EntryDialog,
  Notice,
  RecordTable,
  useSecurityData,
  useSecurityStyles,
} from "./security-ui";

export function SessionsPage() {
  const styles = useSecurityStyles();
  const { identity, refresh } = useIdentity();
  const [params, setParams] = useSearchParams();
  const users = useSecurityData(() =>
    identity?.authorities.includes("identity:read")
      ? securityRequest<User[]>("/users")
      : Promise.resolve([]),
  );
  const subject = params.get("usuario") || identity?.subject || "";
  const resource = useSecurityData(
    () =>
      securityRequest<ActiveSession[]>(
        "/sessions?subject=" + encodeURIComponent(subject),
      ),
    [subject],
  );
  const [revoking, setRevoking] = useState<ActiveSession | null>(null);
  const [notice, setNotice] = useState("");
  return (
    <>
      {notice && (
        <Notice
          intent="success"
          message={notice}
          onDismiss={() => setNotice("")}
        />
      )}
      <div className={styles.bar}>
        <Field label="Usuário">
          <Select
            value={subject}
            onChange={(_, state) => setParams({ usuario: state.value })}
          >
            {!users.data?.some(
              (user) => user.subject === identity?.subject,
            ) && (
              <option value={identity?.subject}>{identity?.displayName}</option>
            )}
            {users.data?.map((user) => (
              <option key={user.subject} value={user.subject}>
                {user.displayName} ({user.username})
              </option>
            ))}
          </Select>
        </Field>
        <Button onClick={() => void resource.reload()}>
          Atualizar sessões
        </Button>
      </div>
      {users.error && <Notice message={users.error} />}
      <DataState {...resource}>
        <RecordTable
          rows={resource.data ?? []}
          rowKey={(session) => session.reference}
          label="Sessões ativas"
          empty="Este usuário não tem sessões ativas."
          columns={[
            {
              title: "Sessão",
              render: (session) => (
                <div>
                  {session.current ? (
                    <Badge appearance="tint" color="brand">
                      Esta sessão
                    </Badge>
                  ) : (
                    "Sessão do usuário"
                  )}
                  <div className={styles.muted}>
                    {session.reference.slice(0, 12)}
                  </div>
                </div>
              ),
            },
            {
              title: "Início",
              render: (session) => formatDate(session.createdAt),
            },
            {
              title: "Última atividade",
              render: (session) => formatDate(session.lastAccessedAt),
            },
            {
              title: "Expira por inatividade",
              render: (session) => formatDate(session.expiresAt),
            },
            {
              title: "Ações",
              render: (session) =>
                identity?.authorities.includes("session:revoke") && (
                  <Button size="small" onClick={() => setRevoking(session)}>
                    Encerrar sessão
                  </Button>
                ),
            },
          ]}
        />
      </DataState>
      {revoking && (
        <EntryDialog
          open
          destructive
          title={
            revoking.current
              ? "Encerrar sua sessão"
              : "Encerrar sessão do usuário"
          }
          saveLabel="Encerrar sessão"
          onClose={() => setRevoking(null)}
          onSave={async () => {
            await securityRequest(
              "/sessions/" +
                revoking.reference +
                "?subject=" +
                encodeURIComponent(subject),
              "DELETE",
            );
            setNotice("Sessão encerrada. Um novo login será necessário.");
            await refresh();
            await resource.reload();
          }}
        >
          <p>
            {revoking.current
              ? "Você precisará entrar novamente para continuar."
              : "O usuário precisará entrar novamente para continuar nesta sessão."}
          </p>
        </EntryDialog>
      )}
    </>
  );
}
