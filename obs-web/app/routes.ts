import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("orcamentos", "routes/budgets.tsx"),
  route("orcamentos/novo/dynatrace", "routes/new-dynatrace-quote.tsx"),
] satisfies RouteConfig;
