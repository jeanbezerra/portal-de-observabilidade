import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("orcamentos", "routes/budgets.tsx"),
  route("orcamentos/novo/dynatrace", "routes/new-dynatrace-quote.tsx"),
  route(
    "administracao/agendamentos/calendarios",
    "routes/administration-calendar.tsx",
  ),
  route(
    "administracao/agendamentos/fusos-horarios",
    "routes/administration-time-zones.tsx",
  ),
  route(
    "administracao/agendamentos/:secao",
    "routes/administration-scheduling.tsx",
  ),
  route("administracao/:secao", "routes/administration.tsx"),
] satisfies RouteConfig;
