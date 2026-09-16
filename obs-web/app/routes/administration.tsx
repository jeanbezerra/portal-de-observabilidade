import { makeStyles, Text, tokens } from "@fluentui/react-components";
import {
  BuildingPeopleRegular,
  GroupRegular,
  KeyRegular,
  PersonKeyRegular,
  PersonRegular,
  type FluentIcon,
} from "@fluentui/react-icons";

import type { Route } from "./+types/administration";

type AdministrationSection = {
  title: string;
  description: string;
  emptyState: string;
  icon: FluentIcon;
};

const administrationSections: Record<string, AdministrationSection> = {
  usuarios: {
    title: "Usuários",
    description:
      "Gerencie as pessoas que podem acessar o Portal de Observabilidade.",
    emptyState: "O gerenciamento de usuários será disponibilizado aqui.",
    icon: PersonRegular,
  },
  grupos: {
    title: "Grupos",
    description:
      "Organize usuários em grupos para simplificar a concessão de acessos.",
    emptyState: "O gerenciamento de grupos será disponibilizado aqui.",
    icon: GroupRegular,
  },
  roles: {
    title: "Roles",
    description:
      "Defina os papéis usados para atribuir responsabilidades no portal.",
    emptyState: "O gerenciamento de roles será disponibilizado aqui.",
    icon: PersonKeyRegular,
  },
  permissoes: {
    title: "Permissões",
    description:
      "Controle as ações e os recursos disponíveis para cada role.",
    emptyState: "O gerenciamento de permissões será disponibilizado aqui.",
    icon: KeyRegular,
  },
  "provedores-idp": {
    title: "Provedores IDP",
    description:
      "Configure provedores de identidade como Microsoft Entra ID, LDAP e OAuth 2.0.",
    emptyState:
      "O gerenciamento de provedores de identidade será disponibilizado aqui.",
    icon: BuildingPeopleRegular,
  },
};

const useStyles = makeStyles({
  page: {
    display: "grid",
    gap: tokens.spacingVerticalXXL,
    width: "100%",
    maxWidth: "1200px",
    minWidth: 0,
    margin: "0 auto",
  },
  header: {
    display: "grid",
    gap: tokens.spacingVerticalS,
  },
  eyebrow: {
    color: tokens.colorBrandForeground1,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: tokens.fontSizeHero800,
    fontWeight: tokens.fontWeightSemibold,
    lineHeight: tokens.lineHeightHero800,
    "@media (max-width: 520px)": {
      fontSize: tokens.fontSizeBase600,
      lineHeight: tokens.lineHeightBase600,
    },
  },
  description: {
    maxWidth: "720px",
    margin: 0,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  emptyState: {
    display: "grid",
    justifyItems: "center",
    gap: tokens.spacingVerticalM,
    minHeight: "280px",
    padding: tokens.spacingHorizontalXXL,
    textAlign: "center",
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusXLarge,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  emptyStateContent: {
    display: "grid",
    alignSelf: "center",
    justifyItems: "center",
    gap: tokens.spacingVerticalM,
    maxWidth: "480px",
  },
  iconBox: {
    display: "grid",
    placeItems: "center",
    width: "64px",
    height: "64px",
    borderRadius: tokens.borderRadiusCircular,
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
  },
  icon: {
    fontSize: "28px",
  },
  emptyStateTitle: {
    margin: 0,
    fontSize: tokens.fontSizeBase500,
    lineHeight: tokens.lineHeightBase500,
  },
  emptyStateDescription: {
    margin: 0,
    color: tokens.colorNeutralForeground2,
  },
});

export function meta({ params }: Route.MetaArgs) {
  const section = administrationSections[params.secao];

  return [
    {
      title: section
        ? `${section.title} | Administração | Portal de Observabilidade`
        : "Administração | Portal de Observabilidade",
    },
  ];
}

export default function Administration({ params }: Route.ComponentProps) {
  const styles = useStyles();
  const section = administrationSections[params.secao];

  if (!section) {
    throw new Response("Seção administrativa não encontrada", { status: 404 });
  }

  const SectionIcon = section.icon;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Text className={styles.eyebrow}>Administração</Text>
        <h1 className={styles.title}>{section.title}</h1>
        <p className={styles.description}>{section.description}</p>
      </header>

      <section className={styles.emptyState} aria-labelledby="admin-empty-title">
        <div className={styles.emptyStateContent}>
          <span className={styles.iconBox} aria-hidden="true">
            <SectionIcon className={styles.icon} />
          </span>
          <h2 id="admin-empty-title" className={styles.emptyStateTitle}>
            Área em preparação
          </h2>
          <p className={styles.emptyStateDescription}>{section.emptyState}</p>
        </div>
      </section>
    </div>
  );
}
