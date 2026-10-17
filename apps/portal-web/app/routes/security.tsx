import type { Route } from "./+types/security";
import { UsersPage } from "../features/security/users-page";
import { CatalogPage } from "../features/security/catalog-page";
import { ProvidersPage } from "../features/security/providers-page";
import { SessionsPage } from "../features/security/sessions-page";
import { AuditPageView } from "../features/security/audit-page";
import { MyAccountPage } from "../features/security/my-account-page";
import { SecurityFrame } from "../features/security/security-ui";
import {
  securitySections,
  type SecuritySection,
} from "../features/security/security-model";

export function meta({ params }: Route.MetaArgs) {
  const section = securitySections[params.secao as SecuritySection];
  return [
    { title: (section?.title ?? "Segurança") + " | Portal de Observabilidade" },
  ];
}
export default function Security({ params }: Route.ComponentProps) {
  if (!Object.hasOwn(securitySections, params.secao))
    throw new Response("Área de segurança não encontrada", { status: 404 });
  const section = params.secao as SecuritySection;
  return (
    <SecurityFrame section={section}>
      {section === "usuarios" ? (
        <UsersPage />
      ) : section === "grupos" ? (
        <CatalogPage key="groups" kind="groups" />
      ) : section === "roles" ? (
        <CatalogPage key="roles" kind="roles" />
      ) : section === "permissoes" ? (
        <CatalogPage key="permissions" kind="permissions" />
      ) : section === "provedores-idp" ? (
        <ProvidersPage />
      ) : section === "auditoria" ? (
        <AuditPageView />
      ) : section === "sessoes" ? (
        <SessionsPage />
      ) : (
        <MyAccountPage />
      )}
    </SecurityFrame>
  );
}
