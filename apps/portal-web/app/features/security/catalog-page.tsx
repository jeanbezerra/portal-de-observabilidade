import {
  Badge,
  Button,
  Field,
  Input,
  Switch,
  Textarea,
} from "@fluentui/react-components";
import { useState } from "react";
import { useIdentity } from "./identity-context";
import { securityRequest } from "./identity-client";
import type { Group, Permission, Role, User } from "./security-model";
import {
  Choices,
  DataState,
  EntryDialog,
  Notice,
  RecordTable,
  useSecurityData,
  useSecurityStyles,
} from "./security-ui";

type Kind = "roles" | "permissions" | "groups";
type Entry = {
  key: string;
  displayName?: string;
  description: string;
  enabled?: boolean;
  permissions?: string[];
  roles?: string[];
  members?: string[];
};
const labels = { roles: "perfil", permissions: "permissão", groups: "grupo" };
export function CatalogPage({ kind }: { kind: Kind }) {
  const styles = useSecurityStyles();
  const { identity, refresh } = useIdentity();
  const canWrite = identity?.authorities.includes("role:write");
  const resource = useSecurityData(async () => {
    const [rows, permissions, roles, users] = await Promise.all([
      securityRequest<Entry[]>("/" + kind),
      kind === "roles"
        ? securityRequest<Permission[]>("/permissions")
        : Promise.resolve([]),
      kind !== "roles"
        ? securityRequest<Role[]>("/roles")
        : Promise.resolve([]),
      kind === "groups" && identity?.authorities.includes("identity:read")
        ? securityRequest<User[]>("/users")
        : Promise.resolve([]),
    ]);
    return { rows, permissions, roles, users };
  }, [kind, identity?.authorities.includes("identity:read")]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Entry | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [notice, setNotice] = useState("");
  const rows =
    resource.data?.rows.filter((row) =>
      (row.key + " " + row.displayName + " " + row.description)
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
    ) ?? [];
  const edit = (entry?: Entry) => {
    setCreating(!entry);
    setEditing(
      entry
        ? { ...entry }
        : {
            key: "",
            displayName: "",
            description: "",
            enabled: true,
            permissions: [],
            roles: [],
            members: [],
          },
    );
  };
  const protectedEntry = (row: Entry) =>
    kind === "roles"
      ? row.key === "OBS_ADMIN"
      : kind === "permissions"
        ? resource.data?.roles
            .find((role) => role.key === "OBS_ADMIN")
            ?.permissions.includes(row.key)
        : false;
  return (
    <>
      {notice && (
        <Notice
          message={notice}
          intent="success"
          onDismiss={() => setNotice("")}
        />
      )}
      <div className={styles.bar}>
        <Field label="Buscar registros" className={styles.search}>
          <Input
            value={search}
            onChange={(_, state) => setSearch(state.value)}
          />
        </Field>
        <div className={styles.actions}>
          <Button onClick={() => void resource.reload()}>Atualizar</Button>
          {canWrite && (
            <Button appearance="primary" onClick={() => edit()}>
              Criar {labels[kind]}
            </Button>
          )}
        </div>
      </div>
      <DataState {...resource}>
        <RecordTable
          rows={rows}
          label={
            kind === "roles"
              ? "Perfis de acesso"
              : kind === "groups"
                ? "Grupos locais"
                : "Permissões"
          }
          rowKey={(row) => row.key}
          columns={[
            {
              title: "Identificação",
              render: (row) => (
                <div>
                  <strong>{row.displayName || row.key}</strong>
                  {row.displayName && (
                    <div className={styles.muted}>{row.key}</div>
                  )}
                  <div className={styles.muted}>{row.description}</div>
                </div>
              ),
            },
            ...(kind !== "permissions"
              ? [
                  {
                    title: "Status",
                    render: (row: Entry) => (
                      <Badge
                        appearance="tint"
                        color={
                          row.enabled
                            ? ("success" as const)
                            : ("subtle" as const)
                        }
                      >
                        {row.enabled ? "Ativo" : "Inativo"}
                      </Badge>
                    ),
                  },
                ]
              : []),
            {
              title:
                kind === "roles"
                  ? "Permissões"
                  : kind === "groups"
                    ? "Participantes e perfis"
                    : "Recurso e ação",
              render: (row) =>
                kind === "roles" ? (
                  row.permissions?.join(", ") || "Nenhuma permissão"
                ) : kind === "groups" ? (
                  <div>
                    {row.members?.length ?? 0} participantes
                    <div className={styles.muted}>
                      {row.roles?.join(", ") || "Sem perfil"}
                    </div>
                  </div>
                ) : (
                  row.key.split(":").join(" / ")
                ),
            },
            {
              title: "Ações",
              render: (row) =>
                protectedEntry(row) ? (
                  <span className={styles.muted}>Protegido pelo sistema</span>
                ) : (
                  canWrite && (
                    <div className={styles.actions}>
                      <Button size="small" onClick={() => edit(row)}>
                        Editar
                      </Button>
                      <Button size="small" onClick={() => setDeleting(row)}>
                        Excluir
                      </Button>
                    </div>
                  )
                ),
            },
          ]}
        />
      </DataState>
      {editing && (
        <EntryDialog
          open
          title={(creating ? "Criar " : "Editar ") + labels[kind]}
          onClose={() => setEditing(null)}
          onSave={async () => {
            const body =
              kind === "permissions"
                ? { key: editing.key, description: editing.description }
                : editing;
            await securityRequest(
              "/" +
                kind +
                (creating || kind === "permissions"
                  ? ""
                  : "/" + encodeURIComponent(editing.key)),
              creating || kind === "permissions" ? "POST" : "PUT",
              body,
            );
            setNotice(
              "Registro salvo. As permissões serão reavaliadas nas sessões em uso.",
            );
            await refresh();
            await resource.reload();
          }}
        >
          <div className={styles.columns}>
            <Field
              label="Identificador"
              required
              hint={
                kind === "permissions"
                  ? "Formato recurso:ação. Exemplo: job:read."
                  : "Use letras, números, hífen ou sublinhado."
              }
            >
              <Input
                required
                disabled={!creating}
                maxLength={kind === "permissions" ? 127 : 100}
                pattern={
                  kind === "permissions"
                    ? "[a-z][a-z0-9-]{1,62}:[a-z][a-z0-9-]{1,62}"
                    : "[A-Za-z][A-Za-z0-9_\\-]{1,99}"
                }
                value={editing.key}
                onChange={(_, state) =>
                  setEditing({ ...editing, key: state.value })
                }
              />
            </Field>
            {kind !== "permissions" && (
              <Field label="Nome" required>
                <Input
                  required
                  maxLength={160}
                  value={editing.displayName}
                  onChange={(_, state) =>
                    setEditing({ ...editing, displayName: state.value })
                  }
                />
              </Field>
            )}
          </div>
          <Field label="Descrição">
            <Textarea
              maxLength={500}
              value={editing.description}
              onChange={(_, state) =>
                setEditing({ ...editing, description: state.value })
              }
            />
          </Field>
          {kind !== "permissions" && (
            <Switch
              label={editing.enabled ? "Ativo" : "Inativo"}
              checked={editing.enabled}
              onChange={(_, state) =>
                setEditing({ ...editing, enabled: state.checked })
              }
            />
          )}
          {kind === "roles" && (
            <Choices
              label="Permissões concedidas"
              selected={editing.permissions ?? []}
              options={
                resource.data?.permissions.map((permission) => ({
                  key: permission.key,
                  label: permission.key + " — " + permission.description,
                })) ?? []
              }
              onChange={(permissions) =>
                setEditing({ ...editing, permissions })
              }
            />
          )}
          {kind === "groups" && (
            <>
              <Choices
                label="Perfis do grupo"
                selected={editing.roles ?? []}
                options={
                  resource.data?.roles.map((role) => ({
                    key: role.key,
                    label: role.displayName,
                  })) ?? []
                }
                onChange={(roles) => setEditing({ ...editing, roles })}
              />
              <Choices
                label="Participantes"
                selected={editing.members ?? []}
                options={
                  resource.data?.users.map((user) => ({
                    key: user.subject,
                    label: user.displayName + " (" + user.username + ")",
                  })) ?? []
                }
                onChange={(members) => setEditing({ ...editing, members })}
              />
            </>
          )}
        </EntryDialog>
      )}
      {deleting && (
        <EntryDialog
          open
          destructive
          title={"Excluir " + labels[kind]}
          saveLabel="Excluir"
          onClose={() => setDeleting(null)}
          onSave={async () => {
            await securityRequest(
              "/" + kind + "/" + encodeURIComponent(deleting.key),
              "DELETE",
            );
            setNotice(
              "Registro excluído. Os vínculos de acesso correspondentes foram removidos.",
            );
            await refresh();
            await resource.reload();
          }}
        >
          <p>
            Excluir <strong>{deleting.displayName || deleting.key}</strong>{" "}
            remove seus vínculos de acesso. Esta ação não pode ser desfeita.
          </p>
        </EntryDialog>
      )}
    </>
  );
}
