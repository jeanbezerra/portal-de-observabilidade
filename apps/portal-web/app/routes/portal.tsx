import { Outlet } from "react-router";
import type { Route } from "./+types/portal";
import { PortalShell } from "../components/portal-shell";
import { IdentityProvider } from "../features/security/identity-context";
import { SessionBoundary } from "../features/security/session-boundary";
import { portalIdentityContext, requirePortalSession } from "../features/security/portal-session.server";

export const middleware: Route.MiddlewareFunction[] = [requirePortalSession];
export const loader = ({ context }: Route.LoaderArgs) => ({
  identity: context.get(portalIdentityContext),
});
export const shouldRevalidate = () => true;

export default function Portal({ loaderData }: Route.ComponentProps) {
  return (
    <IdentityProvider initialIdentity={loaderData.identity}>
      <SessionBoundary>
        <PortalShell><Outlet /></PortalShell>
      </SessionBoundary>
    </IdentityProvider>
  );
}
