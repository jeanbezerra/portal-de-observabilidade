import { redirect } from "react-router";
import type { Route } from "./+types/administration";
import { securitySections } from "../features/security/security-model";
export function loader({ params }: Route.LoaderArgs) {
  if (Object.hasOwn(securitySections, params.secao))
    return redirect("/seguranca/" + params.secao);
  const legacy: Record<string, string> = {
    calendario: "calendarios",
    "fusos-horarios": "fusos-horarios",
  };
  if (legacy[params.secao])
    return redirect("/administracao/agendamentos/" + legacy[params.secao]);
  throw new Response("Seção administrativa não encontrada", { status: 404 });
}
export default function Administration() {
  return null;
}
