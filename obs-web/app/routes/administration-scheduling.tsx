import type { Route } from "./+types/administration-scheduling";
import { ExecutionHistoryPage } from "../features/administration/execution-history-page";
import { ScheduledJobsPage } from "../features/administration/scheduled-jobs-page";

const schedulingSectionTitles: Record<string, string> = {
  "rotinas-agendadas": "Rotinas agendadas",
  "historico-execucoes": "Histórico de execuções",
};

export function meta({ params }: Route.MetaArgs) {
  const title = schedulingSectionTitles[params.secao];

  return [
    {
      title: title
        ? `${title} | Agendamentos | Portal de Observabilidade`
        : "Agendamentos | Portal de Observabilidade",
    },
  ];
}

export default function AdministrationScheduling({
  params,
}: Route.ComponentProps) {
  if (params.secao === "rotinas-agendadas") {
    return <ScheduledJobsPage />;
  }

  if (params.secao === "historico-execucoes") {
    return <ExecutionHistoryPage />;
  }

  throw new Response("Seção de agendamentos não encontrada", { status: 404 });
}
