import {
  Badge,
  Button,
  Field,
  Input,
  Select,
} from "@fluentui/react-components";
import { useState } from "react";
import { useIdentity } from "./identity-context";
import { identityRequest, securityRequest } from "./identity-client";
import type { GroupMapping, Provider, Role } from "./security-model";
import { useSecurityActionStyles } from "./security-action-styles";
import {
  DataState,
  EntryDialog,
  Notice,
  RecordTable,
  useSecurityData,
  useSecurityStyles,
} from "./security-ui";

const statusLabels: Record<Provider["status"], string> = {
  DRAFT: "Rascunho",
  VALIDATED: "Validado",
  ENABLED: "Habilitado",
  DISABLED: "Desabilitado",
  ERROR: "Erro",
};
const configFields = {
  SAML: [
    ["metadata-uri", "URL HTTPS do metadata"],
    ["entity-id", "Identificador da aplicação (Entity ID)"],
    ["assertion-consumer-service-location", "URL de retorno (ACS)"],
    ["signing-private-key-reference", "Referência da chave de assinatura"],
    [
      "signing-certificate-reference",
      "Referência do certificado de assinatura",
    ],
    [
      "decryption-private-key-reference",
      "Referência da chave de descriptografia",
    ],
    [
      "decryption-certificate-reference",
      "Referência do certificado de descriptografia",
    ],
    ["sign-authn-requests", "Assinar solicitações (true ou false)"],
  ],
  LDAP: [
    ["url", "Endereço do diretório"],
    ["base-dn", "DN base"],
    ["user-search-base", "Base da busca de usuários"],
    ["user-search-filter", "Filtro de usuários"],
    ["group-search-base", "Base da busca de grupos"],
    ["group-search-filter", "Filtro de grupos"],
    ["group-role-attribute", "Atributo de nome do grupo"],
    ["bind-dn", "DN da conta de consulta"],
    ["bind-credential-reference", "Referência da senha da conta de consulta"],
    ["trust-certificate-reference", "Referência do certificado de confiança"],
  ],
  OIDC: [
    ["issuer-uri", "Emissor"],
    ["client-id", "Identificador do cliente"],
    ["client-secret-reference", "Referência do segredo"],
  ],
} as const;
const attributes = [
  ["subject", "Identificador único"],
  ["username", "Nome de login"],
  ["email", "E-mail"],
  ["displayName", "Nome de exibição"],
  ["groups", "Grupos externos"],
] as const;
function draft(): Provider {
  return {
    id: "",
    displayName: "",
    type: "SAML",
    interaction: "REDIRECT",
    status: "DRAFT",
    priority: 10,
    version: 0,
    configuration: {
      "assertion-consumer-service-location":
        "{baseUrl}/login/saml2/sso/{registrationId}",
    },
    attributeMappings: { subject: "NameID", username: "NameID" },
  };
}
export function ProvidersPage() {
  const styles = useSecurityStyles();
  const actionStyles = useSecurityActionStyles();
  const { identity } = useIdentity();
  const can = (permission: string) =>
    identity?.authorities.includes(permission);
  const resource = useSecurityData(() =>
    identityRequest<Provider[]>("/providers"),
  );
  const [editing, setEditing] = useState<Provider | null>(null);
  const [creating, setCreating] = useState(false);
  const [action, setAction] = useState<{
    provider: Provider;
    verb: "validate" | "enable" | "disable";
  } | null>(null);
  const [notice, setNotice] = useState("");
  return (
    <>
      <Notice
        intent="info"
        message="Contas e grupos locais funcionam independentemente de provedores externos. Segredos externos são configurados por referências, sem gravar senhas ou chaves nesta tela."
      />
      {notice && (
        <Notice
          intent="success"
          message={notice}
          onDismiss={() => setNotice("")}
        />
      )}
      <div className={styles.bar}>
        <span>{resource.data?.length ?? 0} provedores cadastrados</span>
        <div className={styles.actions}>
          <Button onClick={() => void resource.reload()}>Atualizar</Button>
          {can("identity-provider:create") && (
            <Button
              appearance="primary"
              onClick={() => {
                setCreating(true);
                setEditing(draft());
              }}
            >
              Cadastrar provedor
            </Button>
          )}
        </div>
      </div>
      <DataState {...resource}>
        <RecordTable
          rows={resource.data ?? []}
          rowKey={(provider) => provider.id}
          label="Provedores externos"
          empty="Nenhum provedor externo cadastrado. O acesso por conta local continua disponível."
          columns={[
            {
              title: "Provedor",
              render: (provider) => (
                <div>
                  <strong>{provider.displayName}</strong>
                  <div className={styles.muted}>{provider.id}</div>
                </div>
              ),
            },
            {
              title: "Protocolo",
              render: (provider) =>
                provider.type === "OIDC"
                  ? "OIDC (adapter pendente)"
                  : provider.type,
            },
            {
              title: "Status",
              render: (provider) => (
                <Badge
                  appearance="tint"
                  color={provider.status === "ENABLED" ? "success" : "subtle"}
                >
                  {statusLabels[provider.status]}
                </Badge>
              ),
            },
            { title: "Prioridade", render: (provider) => provider.priority },
            {
              title: "Ações",
              render: (provider) => (
                <div className={styles.actions}>
                  {can("identity-provider:update") && (
                    <>
                      <Button
                        size="small"
                        onClick={() => {
                          setCreating(false);
                          setEditing({ ...provider });
                        }}
                      >
                        Editar
                      </Button>
                      <Button
                        size="small"
                        onClick={() =>
                          setAction({ provider, verb: "validate" })
                        }
                      >
                        Validar
                      </Button>
                    </>
                  )}
                  {provider.type !== "OIDC" &&
                    provider.status !== "ENABLED" &&
                    can("identity-provider:enable") && (
                      <Button
                        size="small"
                        onClick={() => setAction({ provider, verb: "enable" })}
                      >
                        Habilitar
                      </Button>
                    )}
                  {provider.status === "ENABLED" &&
                    can("identity-provider:disable") && (
                      <Button
                        className={actionStyles.danger}
                        size="small"
                        onClick={() => setAction({ provider, verb: "disable" })}
                      >
                        Desabilitar
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
          title={
            creating ? "Cadastrar provedor externo" : "Editar provedor externo"
          }
          onClose={() => setEditing(null)}
          onSave={async () => {
            const configuration = Object.fromEntries(
              Object.entries(editing.configuration).filter(([, value]) =>
                value.trim(),
              ),
            );
            if (editing.type === "SAML")
              configuration["registration-id"] = editing.id;
            const attributeMappings = Object.fromEntries(
              Object.entries(editing.attributeMappings).filter(([, value]) =>
                value.trim(),
              ),
            );
            await identityRequest(
              "/providers" +
                (creating ? "" : "/" + encodeURIComponent(editing.id)),
              creating ? "POST" : "PUT",
              { ...editing, configuration, attributeMappings },
            );
            setNotice(
              "Provedor salvo como rascunho. Valide a configuração antes de habilitar o login externo.",
            );
            await resource.reload();
          }}
        >
          <div className={styles.columns}>
            <Field
              label="Identificador"
              required
              hint="Use letras minúsculas, números e hífen."
            >
              <Input
                required
                disabled={!creating}
                pattern="[a-z0-9][a-z0-9-]{1,62}"
                maxLength={63}
                value={editing.id}
                onChange={(_, state) =>
                  setEditing({ ...editing, id: state.value })
                }
              />
            </Field>
            <Field label="Nome de exibição" required>
              <Input
                required
                maxLength={120}
                value={editing.displayName}
                onChange={(_, state) =>
                  setEditing({ ...editing, displayName: state.value })
                }
              />
            </Field>
            <Field label="Protocolo">
              <Select
                disabled={!creating}
                value={editing.type}
                onChange={(_, state) => {
                  const type = state.value as Provider["type"];
                  setEditing({
                    ...editing,
                    type,
                    configuration: {},
                    attributeMappings:
                      type === "LDAP"
                        ? {
                            subject: "uid",
                            username: "uid",
                            email: "mail",
                            displayName: "cn",
                            groups: "memberOf",
                          }
                        : { subject: "NameID", username: "NameID" },
                  });
                }}
              >
                <option value="SAML">SAML 2.0 / Microsoft Entra ID</option>
                <option value="LDAP">LDAP / Active Directory</option>
                <option value="OIDC" disabled>
                  OIDC — adapter ainda indisponível
                </option>
              </Select>
            </Field>
            <Field
              label="Prioridade"
              hint="Valores menores aparecem primeiro no login."
            >
              <Input
                type="number"
                required
                min={0}
                value={String(editing.priority)}
                onChange={(_, state) =>
                  setEditing({ ...editing, priority: Number(state.value) })
                }
              />
            </Field>
          </div>
          <h2>Conexão</h2>
          <div className={styles.columns}>
            {configFields[editing.type].map(([key, label]) => (
              <Field
                key={key}
                label={label}
                hint={
                  key.endsWith("-reference")
                    ? "Informe uma referência secret://. O valor [REDACTED] preserva a configuração existente."
                    : undefined
                }
              >
                <Input
                  maxLength={2048}
                  value={editing.configuration[key] ?? ""}
                  onChange={(_, state) =>
                    setEditing({
                      ...editing,
                      configuration: {
                        ...editing.configuration,
                        [key]: state.value,
                      },
                    })
                  }
                />
              </Field>
            ))}
          </div>
          <h2>Mapeamento de atributos</h2>
          <div className={styles.columns}>
            {attributes.map(([key, label]) => (
              <Field
                key={key}
                label={label}
                required={
                  key === "subject" ||
                  key === "username" ||
                  (editing.type === "LDAP" && key === "groups")
                }
              >
                <Input
                  required={
                    key === "subject" ||
                    key === "username" ||
                    (editing.type === "LDAP" && key === "groups")
                  }
                  maxLength={255}
                  value={editing.attributeMappings[key] ?? ""}
                  onChange={(_, state) =>
                    setEditing({
                      ...editing,
                      attributeMappings: {
                        ...editing.attributeMappings,
                        [key]: state.value,
                      },
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </EntryDialog>
      )}
      {action && (
        <EntryDialog
          open
          title={
            (action.verb === "enable"
              ? "Habilitar "
              : action.verb === "disable"
                ? "Desabilitar "
                : "Validar ") + action.provider.displayName
          }
          saveLabel={
            action.verb === "enable"
              ? "Habilitar"
              : action.verb === "disable"
                ? "Desabilitar"
                : "Validar"
          }
          destructive={action.verb === "disable"}
          onClose={() => setAction(null)}
          onSave={async () => {
            await identityRequest(
              "/providers/" +
                encodeURIComponent(action.provider.id) +
                "/" +
                action.verb,
              "POST",
            );
            setNotice("Configuração do provedor atualizada.");
            await resource.reload();
          }}
        >
          <p>
            {action.verb === "disable"
              ? "Novos acessos por este provedor ficarão indisponíveis. As contas locais continuam funcionando."
              : action.verb === "enable"
                ? "O provedor aparecerá entre as opções de login. Revise o mapeamento dos grupos e as permissões antes de continuar."
                : "A configuração será verificada. Erros de campos e referências de segredos serão apresentados para correção."}
          </p>
        </EntryDialog>
      )}
      {can("role:read") && <ExternalMappings providers={resource.data ?? []} />}
    </>
  );
}
function ExternalMappings({ providers }: { providers: Provider[] }) {
  const styles = useSecurityStyles();
  const actionStyles = useSecurityActionStyles();
  const { identity, refresh } = useIdentity();
  const canWrite = identity?.authorities.includes("role:write");
  const resource = useSecurityData(async () => {
    const [mappings, roles] = await Promise.all([
      securityRequest<GroupMapping[]>("/group-mappings"),
      securityRequest<Role[]>("/roles"),
    ]);
    return { mappings, roles };
  });
  const [editing, setEditing] = useState<{
    providerId: string;
    externalGroup: string;
    role: string;
  } | null>(null);
  const [deleting, setDeleting] = useState<GroupMapping | null>(null);
  return (
    <section className={styles.stack} aria-labelledby="external-groups-title">
      <div className={styles.bar}>
        <h2 id="external-groups-title">Grupos externos e perfis locais</h2>
        {canWrite && (
          <Button
            disabled={!providers.length}
            onClick={() =>
              setEditing({
                providerId: providers[0]?.id ?? "",
                externalGroup: "",
                role: resource.data?.roles[0]?.key ?? "",
              })
            }
          >
            Vincular grupo externo
          </Button>
        )}
      </div>
      <p className={styles.muted}>
        Um grupo externo só concede acesso quando possui um vínculo explícito
        com um perfil local.
      </p>
      <DataState {...resource}>
        <RecordTable
          rows={resource.data?.mappings ?? []}
          label="Vínculos de grupos externos"
          rowKey={(mapping) => mapping.id}
          columns={[
            {
              title: "Provedor",
              render: (mapping) =>
                providers.find((provider) => provider.id === mapping.providerId)
                  ?.displayName ?? mapping.providerId,
            },
            {
              title: "Grupo externo",
              render: (mapping) => mapping.externalGroup,
            },
            { title: "Perfil local", render: (mapping) => mapping.role },
            {
              title: "Ações",
              render: (mapping) =>
                canWrite && (
                  <Button
                    className={actionStyles.danger}
                    size="small"
                    onClick={() => setDeleting(mapping)}
                  >
                    Remover vínculo
                  </Button>
                ),
            },
          ]}
        />
      </DataState>
      {editing && (
        <EntryDialog
          open
          title="Vincular grupo externo"
          onClose={() => setEditing(null)}
          onSave={async () => {
            await securityRequest("/group-mappings", "POST", editing);
            await refresh();
            await resource.reload();
          }}
        >
          <Field label="Provedor">
            <Select
              value={editing.providerId}
              onChange={(_, state) =>
                setEditing({ ...editing, providerId: state.value })
              }
            >
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.displayName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Identificador do grupo externo" required>
            <Input
              required
              maxLength={255}
              value={editing.externalGroup}
              onChange={(_, state) =>
                setEditing({ ...editing, externalGroup: state.value })
              }
            />
          </Field>
          <Field label="Perfil local" required>
            <Select
              required
              value={editing.role}
              onChange={(_, state) =>
                setEditing({ ...editing, role: state.value })
              }
            >
              {resource.data?.roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.displayName}
                </option>
              ))}
            </Select>
          </Field>
        </EntryDialog>
      )}
      {deleting && (
        <EntryDialog
          open
          destructive
          title="Remover vínculo externo"
          saveLabel="Remover vínculo"
          onClose={() => setDeleting(null)}
          onSave={async () => {
            await securityRequest("/group-mappings/" + deleting.id, "DELETE");
            await refresh();
            await resource.reload();
          }}
        >
          <p>
            O grupo {deleting.externalGroup} deixará de conceder o perfil{" "}
            {deleting.role}.
          </p>
        </EntryDialog>
      )}
    </section>
  );
}
