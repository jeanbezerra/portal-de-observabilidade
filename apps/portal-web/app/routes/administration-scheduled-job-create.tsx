import type { Route } from "./+types/administration-scheduled-job-create";
import { ScheduledJobCreatePage } from "../features/administration/scheduled-job-create-page";

export function meta({}: Route.MetaArgs) {
  return [
    {
      title: "Criar rotina | Agendamentos | Portal de Observabilidade",
    },
  ];
}

export default function AdministrationScheduledJobCreate() {
  return <ScheduledJobCreatePage />;
}
