export type Identity = {
  subject: string;
  username: string;
  displayName: string;
  email: string | null;
  providerId: string | null;
  roles: string[];
  permissions: string[];
  authorities: string[];
  session?: {
    checkedAt: string;
    expiresAt: string;
    absoluteExpiresAt: string;
  } | null;
};
export type User = {
  subject: string;
  username: string;
  displayName: string;
  email: string | null;
  enabled: boolean;
  local: boolean;
  roles: string[];
  groups: string[];
  createdAt: string;
  lastLogin: string | null;
};
export type Role = {
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  permissions: string[];
};
export type Permission = { key: string; description: string };
export type Group = {
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  roles: string[];
  members: string[];
};
export type GroupMapping = {
  id: string;
  providerId: string;
  externalGroup: string;
  role: string;
};
export type Provider = {
  id: string;
  displayName: string;
  type: "SAML" | "LDAP" | "OIDC";
  interaction: "REDIRECT" | "CREDENTIALS";
  status: "DRAFT" | "VALIDATED" | "ENABLED" | "DISABLED" | "ERROR";
  priority: number;
  configuration: Record<string, string>;
  attributeMappings: Record<string, string>;
  version: number;
};
export type DiscoveredProvider = Pick<
  Provider,
  "id" | "displayName" | "type" | "interaction"
>;
export type AuditEvent = {
  id: string;
  occurredAt: string;
  eventType: string;
  actorSubject: string;
  target: string;
  providerId: string | null;
  outcome: string;
  traceId: string | null;
};
export type AuditPage = {
  items: AuditEvent[];
  total: number;
  limit: number;
  offset: number;
};
export type ActiveSession = {
  reference: string;
  subject: string;
  createdAt: string;
  lastAccessedAt: string;
  expiresAt: string;
  current: boolean;
};
export const securitySections = {
  usuarios: {
    title: "Usuários",
    description:
      "Gerencie contas locais, bloqueios e os acessos de cada pessoa.",
    permission: "identity:read",
  },
  grupos: {
    title: "Grupos",
    description: "Reúna pessoas e atribua perfis de acesso aos grupos locais.",
    permission: "role:read",
  },
  roles: {
    title: "Perfis de acesso",
    description: "Defina quais permissões cada perfil concede na plataforma.",
    permission: "role:read",
  },
  permissoes: {
    title: "Permissões",
    description: "Mantenha o catálogo de ações e recursos da plataforma.",
    permission: "role:read",
  },
  "provedores-idp": {
    title: "Provedores externos",
    description:
      "Configure SAML e LDAP quando precisar integrar um diretório externo. O acesso local funciona por padrão.",
    permission: "identity-provider:read",
  },
  auditoria: {
    title: "Auditoria de segurança",
    description:
      "Consulte acessos, alterações administrativas e decisões de autorização.",
    permission: "audit:read",
  },
  sessoes: {
    title: "Sessões ativas",
    description: "Consulte os acessos em uso e encerre sessões de um usuário.",
    permission: "session:read",
  },
  "minha-conta": {
    title: "Minha conta",
    description: "Seus dados, acessos e segurança em um só lugar.",
    permission: "",
  },
} as const;
export type SecuritySection = keyof typeof securitySections;
export function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
