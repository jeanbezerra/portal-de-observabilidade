import type { Route } from "./+types/new-dynatrace-quote";
import { QuoteWizard } from "../features/quotes/quote-wizard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Novo orçamento Dynatrace | Portal de Observabilidade" },
    {
      name: "description",
      content:
        "Dimensione e envie uma solicitação de instrumentação Dynatrace.",
    },
  ];
}

export default function NewDynatraceQuote() {
  return <QuoteWizard />;
}
