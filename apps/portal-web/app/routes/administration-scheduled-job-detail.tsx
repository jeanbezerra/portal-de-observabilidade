import type { Route } from "./+types/administration-scheduled-job-detail";
import { ScheduledJobDetailPage } from "../features/administration/scheduled-job-detail-page";

export function meta({ params }: Route.MetaArgs) {
  return [
    {
      title: `${params.nome} | Rotinas agendadas | Portal de Observabilidade`,
    },
  ];
}

export default function AdministrationScheduledJobDetail({
  params,
}: Route.ComponentProps) {
  return <ScheduledJobDetailPage group={params.grupo} name={params.nome} />;
}
