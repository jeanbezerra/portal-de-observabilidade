import type { Route } from "./+types/identity-proxy";
import { proxyIdentity } from "../features/security/identity-proxy.server";
export const loader = ({ request, params }: Route.LoaderArgs) =>
  proxyIdentity(request, params["*"] ?? "");
export const action = ({ request, params }: Route.ActionArgs) =>
  proxyIdentity(request, params["*"] ?? "");
