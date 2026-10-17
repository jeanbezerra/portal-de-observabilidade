import {
  Badge,
  Button,
  Field,
  Input,
  Switch,
} from "@fluentui/react-components";
import { useState } from "react";
import { useIdentity } from "./identity-context";
import { securityRequest } from "./identity-client";
import type { Group, Role, User } from "./security-model";
import {
  Choices,
  DataState,
  EntryDialog,
  Notice,
  RecordTable,
  useSecurityData,
  useSecurityStyles,
} from "./security-ui";

type UserForm = {
  subject?: string;
  username: string;
  displayName: string;
  email: string;
  enabled: boolean;
  roles: string[];
  groups: string[];
  password: string;
  local: boolean;
};
export function UsersPage() {
  const styles = useSecurityStyles();
  const { identity, refresh } = useIdentity();
  const canWrite =
    identity?.authorities.includes("identity:write") &&
    identity.authorities.includes("role:write");
  const canReadRoles = identity?.authorities.includes("role:read");
  const resource = useSecurityData(async () => {
    const [users, roles, groups] = await Promise.all([
      securityRequest<User[]>("/users"),
      canReadRoles ? securityRequest<Role[]>("/roles") : Promise.resolve([]),
      canReadRoles ? securityRequest<Group[]>("/groups") : Promise.resolve([]),
    ]);
    return { users, roles, groups };
  }, [canReadRoles]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<UserForm | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState("");
  const rows =
    resource.data?.users.filter((user) =>
      (user.displayName + " " + user.username + " " + (user.email ?? ""))
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR")),
    ) ?? [];
  const edit = (user?: User) =>
    setEditing(
      user
        ? { ...user, email: user.email ?? "", password: "" }
        : {
            username: "",
            displayName: "",
            email: "",
            enabled: true,
            roles: [],
            groups: [],
            password: "",
            local: true,
          },
    );
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
        <Field label="Buscar usuários" className={styles.search}>
          <Input
            value={search}
            onChange={(_, state) => setSearch(state.value)}
          />
        </Field>
        <div className={styles.actions}>
          <Button onClick={() => void resource.reload()}>Atualizar</Button>
          {canWrite && (
            <Button appearance="primary" onClick={() => edit()}>
              Criar usuário
            </Button>
          )}
        </div>
      </div>
      <DataState {...resource}>
        <RecordTable
          rows={rows}
          rowKey={(user) => user.subject}
          label="Usuários da plataforma"
          empty={
            search
              ? "Nenhum usuário corresponde à busca."
              : "Nenhum usuário cadastrado."
          }
          columns={[
            {
              title: "Usuário",
              render: (user) => (
                <div>
                  <strong>{user.displayName}</strong>
                  <div className={styles.muted}>{user.username}</div>
                  <div className={styles.muted}>{user.email}</div>
                </div>
              ),
            },
            {
              title: "Origem",
              render: (user) =>
                user.local ? "Conta local" : "Provedor externo",
            },
            {
              title: "Status",
              render: (user) => (
                <Badge
                  appearance="tint"
                  color={user.enabled ? "success" : "danger"}
                >
                  {user.enabled ? "Ativo" : "Bloqueado"}
                </Badge>
              ),
            },
            {
              title: "Perfis diretos",
              render: (user) => user.roles.join(", ") || "Sem perfil direto",
            },
            {
              title: "Grupos locais",
              render: (user) => user.groups.join(", ") || "Sem grupo",
            },
            {
              title: "Ações",
              render: (user) => (
                <div className={styles.actions}>
                  {canWrite && (
                    <Button size="small" onClick={() => edit(user)}>
                      Editar
                    </Button>
                  )}
                  {user.local && canWrite && (
                      <Button
                        size="small"
                        onClick={() => {
                          setPassword("");
                          setResetting(user);
                        }}
                      >
                        Redefinir senha
                      </Button>
                    )}
                  {identity?.authorities.includes("session:read") && (
                    <Button
                      size="small"
                      as="a"
                      href={
                        "/seguranca/sessoes?usuario=" +
                        encodeURIComponent(user.subject)
                      }
                    >
                      Sessões
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      </DataState>
      {editing && (
        <EntryDialog
          open
          title={editing.subject ? "Editar usuário" : "Criar usuário local"}
          onClose={() => setEditing(null)}
          onSave={async () => {
            await securityRequest(
              "/users" +
                (editing.subject
                  ? "/" + encodeURIComponent(editing.subject)
                  : ""),
              editing.subject ? "PUT" : "POST",
              {
                ...editing,
                email: editing.email || null,
                password: editing.subject ? undefined : editing.password,
              },
            );
            setNotice(
              editing.subject
                ? "Usuário atualizado. Os acessos serão reavaliados nas sessões em uso."
                : "Usuário local criado.",
            );
            await refresh();
            await resource.reload();
          }}
        >
          <div className={styles.columns}>
            <Field
              label="Usuário de login"
              required
              hint="Use letras, números, ponto, hífen, sublinhado ou @."
            >
              <Input
                required
                disabled={!!editing.subject}
                pattern="[a-zA-Z0-9][a-zA-Z0-9._@-]{1,254}"
                value={editing.username}
                onChange={(_, state) =>
                  setEditing({ ...editing, username: state.value })
                }
              />
            </Field>
            <Field label="Nome completo" required>
              <Input
                required
                disabled={!editing.local}
                maxLength={255}
                value={editing.displayName}
                onChange={(_, state) =>
                  setEditing({ ...editing, displayName: state.value })
                }
              />
            </Field>
            <Field label="E-mail">
              <Input
                type="email"
                disabled={!editing.local}
                maxLength={320}
                value={editing.email}
                onChange={(_, state) =>
                  setEditing({ ...editing, email: state.value })
                }
              />
            </Field>
            {!editing.subject && (
              <Field
                label="Senha inicial"
                required
                hint="Pelo menos 12 caracteres; máximo de 72 bytes."
              >
                <Input
                  type="password"
                  required
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                  value={editing.password}
                  onChange={(_, state) =>
                    setEditing({ ...editing, password: state.value })
                  }
                />
              </Field>
            )}
          </div>
          <Switch
            label={editing.enabled ? "Usuário ativo" : "Usuário bloqueado"}
            checked={editing.enabled}
            disabled={editing.subject === identity?.subject}
            onChange={(_, state) =>
              setEditing({ ...editing, enabled: state.checked })
            }
          />
          <Choices
            label="Perfis diretos"
            selected={editing.roles}
            options={
              resource.data?.roles.map((role) => ({
                key: role.key,
                label: role.displayName,
              })) ?? []
            }
            onChange={(roles) => setEditing({ ...editing, roles })}
          />
          <Choices
            label="Grupos locais"
            selected={editing.groups}
            options={
              resource.data?.groups.map((group) => ({
                key: group.key,
                label: group.displayName,
              })) ?? []
            }
            onChange={(groups) => setEditing({ ...editing, groups })}
          />
          {!editing.local && (
            <p className={styles.muted}>
              Nome, e-mail e senha são gerenciados no provedor externo. O
              bloqueio e os acessos à plataforma permanecem locais.
            </p>
          )}
        </EntryDialog>
      )}
      {resetting && (
        <EntryDialog
          open
          title={"Redefinir senha de " + resetting.displayName}
          saveLabel="Redefinir senha"
          onClose={() => {
            setPassword("");
            setResetting(null);
          }}
          onSave={async () => {
            await securityRequest(
              "/users/" + encodeURIComponent(resetting.subject) + "/password",
              "POST",
              { password },
            );
            setPassword("");
            setNotice(
              "Senha redefinida. Todas as sessões desse usuário foram encerradas.",
            );
            await refresh();
            await resource.reload();
          }}
        >
          <p>
            As sessões em uso serão encerradas. Informe a nova senha ao usuário
            por um canal seguro.
          </p>
          <Field
            label="Nova senha"
            required
            hint="Pelo menos 12 caracteres; máximo de 72 bytes."
          >
            <Input
              required
              type="password"
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
              value={password}
              onChange={(_, state) => setPassword(state.value)}
            />
          </Field>
        </EntryDialog>
      )}
    </>
  );
}
