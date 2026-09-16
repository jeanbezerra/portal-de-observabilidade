import {
  Avatar,
  makeStyles,
  mergeClasses,
  Text,
  tokens,
} from "@fluentui/react-components";
import {
  BuildingPeopleFilled,
  BuildingPeopleRegular,
  CalculatorFilled,
  CalculatorRegular,
  GroupFilled,
  GroupRegular,
  HomeFilled,
  HomeRegular,
  KeyFilled,
  KeyRegular,
  PersonFilled,
  PersonKeyFilled,
  PersonKeyRegular,
  PersonRegular,
} from "@fluentui/react-icons";
import type { ReactNode } from "react";
import { NavLink } from "react-router";

const useStyles = makeStyles({
  app: {
    minHeight: "100vh",
    color: tokens.colorNeutralForeground1,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  header: {
    position: "sticky",
    zIndex: 10,
    top: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: "72px",
    paddingRight: tokens.spacingHorizontalXL,
    paddingLeft: tokens.spacingHorizontalXL,
    borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    boxShadow: tokens.shadow2,
    "@media (max-width: 760px)": {
      minHeight: "64px",
      paddingRight: tokens.spacingHorizontalM,
      paddingLeft: tokens.spacingHorizontalM,
    },
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalL,
    minWidth: 0,
  },
  logo: {
    display: "block",
    width: "148px",
    height: "auto",
    "@media (max-width: 760px)": {
      width: "116px",
    },
  },
  brandDivider: {
    width: "1px",
    height: "32px",
    backgroundColor: tokens.colorNeutralStroke2,
    "@media (max-width: 760px)": {
      display: "none",
    },
  },
  portalName: {
    overflow: "hidden",
    color: tokens.colorNeutralForeground1,
    fontFamily: "var(--font-family-porto-heading)",
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    "@media (max-width: 760px)": {
      display: "none",
    },
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    flexShrink: 0,
    "@media (max-width: 760px)": {
      gap: tokens.spacingHorizontalS,
    },
  },
  userName: {
    display: "grid",
    gap: "1px",
    textAlign: "right",
    "@media (max-width: 760px)": {
      display: "none",
    },
  },
  workspace: {
    display: "grid",
    gridTemplateColumns: "248px minmax(0, 1fr)",
    minHeight: "calc(100vh - 72px)",
    "@media (max-width: 760px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      minHeight: "calc(100vh - 64px)",
    },
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalM}`,
    borderRight: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 760px)": {
      position: "sticky",
      zIndex: 9,
      top: "64px",
      display: "block",
      padding: tokens.spacingHorizontalS,
      overflowX: "auto",
      borderRight: "none",
      borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    },
  },
  nav: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    "@media (max-width: 760px)": {
      display: "flex",
      gap: tokens.spacingHorizontalXS,
      width: "max-content",
    },
  },
  navGroup: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
    "@media (max-width: 760px)": {
      display: "flex",
    },
  },
  navItems: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
    "@media (max-width: 760px)": {
      display: "flex",
    },
  },
  navLabel: {
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    "@media (max-width: 760px)": {
      display: "none",
    },
  },
  navLink: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalM,
    minHeight: "44px",
    paddingRight: tokens.spacingHorizontalM,
    paddingLeft: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    color: tokens.colorNeutralForeground2,
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightMedium,
    textDecorationLine: "none",
    "&:hover": {
      color: tokens.colorNeutralForeground1,
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
    "&:focus-visible": {
      outlineColor: tokens.colorStrokeFocus2,
      outlineOffset: "2px",
      outlineStyle: "solid",
      outlineWidth: "2px",
    },
    "@media (max-width: 760px)": {
      minWidth: "132px",
    },
  },
  activeNavLink: {
    color: tokens.colorBrandForeground1,
    backgroundColor: tokens.colorBrandBackground2,
    "&:hover": {
      color: tokens.colorBrandForeground1,
      backgroundColor: tokens.colorBrandBackground2Hover,
    },
  },
  navIcon: {
    fontSize: "20px",
  },
  main: {
    minWidth: 0,
    maxWidth: "100%",
    padding: `${tokens.spacingVerticalXXL} ${tokens.spacingHorizontalXXL}`,
    "@media (max-width: 760px)": {
      padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalM}`,
    },
  },
});

const navigationGroups = [
  {
    label: "Portal",
    items: [
      {
        to: "/",
        label: "Visão geral",
        end: true,
        regularIcon: HomeRegular,
        filledIcon: HomeFilled,
      },
    ],
  },
  {
    label: "Serviços",
    items: [
      {
        to: "/orcamentos",
        label: "Orçamentos",
        end: false,
        regularIcon: CalculatorRegular,
        filledIcon: CalculatorFilled,
      },
    ],
  },
  {
    label: "Administração",
    items: [
      {
        to: "/administracao/usuarios",
        label: "Usuários",
        end: true,
        regularIcon: PersonRegular,
        filledIcon: PersonFilled,
      },
      {
        to: "/administracao/grupos",
        label: "Grupos",
        end: true,
        regularIcon: GroupRegular,
        filledIcon: GroupFilled,
      },
      {
        to: "/administracao/roles",
        label: "Roles",
        end: true,
        regularIcon: PersonKeyRegular,
        filledIcon: PersonKeyFilled,
      },
      {
        to: "/administracao/permissoes",
        label: "Permissões",
        end: true,
        regularIcon: KeyRegular,
        filledIcon: KeyFilled,
      },
      {
        to: "/administracao/provedores-idp",
        label: "Provedores IDP",
        end: true,
        regularIcon: BuildingPeopleRegular,
        filledIcon: BuildingPeopleFilled,
      },
    ],
  },
];

export function PortalShell({ children }: { children: ReactNode }) {
  const styles = useStyles();

  return (
    <div className={styles.app}>
      <a className="skip-link" href="#conteudo-principal">
        Pular para o conteúdo
      </a>
      <header className={styles.header}>
        <div className={styles.brand}>
          <img
            className={styles.logo}
            src="/porto.svg"
            alt="Porto"
          />
          <span className={styles.brandDivider} aria-hidden="true" />
          <span className={styles.portalName}>Portal de Observabilidade</span>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.userName}>
            <Text weight="semibold">Usuário Porto</Text>
            <Text size={200}>Solicitante</Text>
          </div>
          <Avatar name="Usuário Porto" color="brand" />
        </div>
      </header>

      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <nav className={styles.nav} aria-label="Navegação principal">
            {navigationGroups.map((group) => (
              <div
                className={styles.navGroup}
                key={group.label}
                role="group"
                aria-label={group.label}
              >
                <span className={styles.navLabel}>{group.label}</span>
                <div className={styles.navItems}>
                  {group.items.map((item) => {
                    const RegularIcon = item.regularIcon;
                    const FilledIcon = item.filledIcon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                          mergeClasses(
                            styles.navLink,
                            isActive && styles.activeNavLink,
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            {isActive ? (
                              <FilledIcon
                                className={styles.navIcon}
                                aria-hidden="true"
                              />
                            ) : (
                              <RegularIcon
                                className={styles.navIcon}
                                aria-hidden="true"
                              />
                            )}
                            <span>{item.label}</span>
                          </>
                        )}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

        </aside>

        <main id="conteudo-principal" className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
