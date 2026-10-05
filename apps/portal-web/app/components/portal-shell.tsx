import {
  Avatar,
  Button,
  makeStyles,
  mergeClasses,
  Text,
  Tooltip,
  tokens,
} from "@fluentui/react-components";
import {
  BuildingPeopleFilled,
  BuildingPeopleRegular,
  CalculatorFilled,
  CalculatorRegular,
  CalendarClockFilled,
  CalendarClockRegular,
  CalendarMonthFilled,
  CalendarMonthRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  GlobeLocationFilled,
  GlobeLocationRegular,
  FolderFilled,
  FolderRegular,
  GroupFilled,
  GroupRegular,
  HomeFilled,
  HomeRegular,
  HistoryFilled,
  HistoryRegular,
  KeyFilled,
  KeyRegular,
  PanelLeftContractRegular,
  PanelLeftExpandRegular,
  PersonFilled,
  PersonKeyFilled,
  PersonKeyRegular,
  PersonRegular,
  type FluentIcon,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { matchPath, NavLink, useLocation } from "react-router";

import {
  loadNavigationPreferences,
  saveNavigationPreferences,
} from "./navigation-preferences";

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
    transitionDuration: tokens.durationNormal,
    transitionProperty: "grid-template-columns",
    transitionTimingFunction: tokens.curveEasyEase,
    "@media (prefers-reduced-motion: reduce)": {
      transitionDuration: "0.01ms",
    },
    "@media (max-width: 760px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
      minHeight: "calc(100vh - 64px)",
    },
  },
  workspaceCollapsed: {
    gridTemplateColumns: "72px minmax(0, 1fr)",
    "@media (max-width: 760px)": {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
  sidebar: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: `${tokens.spacingVerticalXL} ${tokens.spacingHorizontalM}`,
    overflowY: "auto",
    borderRight: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    "@media (max-width: 760px)": {
      position: "sticky",
      zIndex: 9,
      top: "64px",
      display: "block",
      padding: tokens.spacingHorizontalS,
      overflowX: "auto",
      overflowY: "hidden",
      borderRight: "none",
      borderBottom: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke2}`,
    },
  },
  sidebarCollapsed: {
    paddingRight: tokens.spacingHorizontalS,
    paddingLeft: tokens.spacingHorizontalS,
    "@media (max-width: 760px)": {
      paddingTop: tokens.spacingVerticalS,
      paddingRight: tokens.spacingHorizontalS,
      paddingBottom: tokens.spacingVerticalS,
      paddingLeft: tokens.spacingHorizontalS,
    },
  },
  sidebarContent: {
    display: "grid",
    gap: tokens.spacingVerticalM,
  },
  sidebarControls: {
    display: "flex",
    justifyContent: "flex-end",
    "@media (max-width: 760px)": {
      display: "none",
    },
  },
  sidebarControlsCollapsed: {
    justifyContent: "center",
  },
  collapseButton: {
    minWidth: "44px",
    minHeight: "44px",
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
  navCollapsed: {
    justifyItems: "center",
    gap: tokens.spacingVerticalM,
    "@media (max-width: 760px)": {
      justifyItems: "stretch",
      gap: tokens.spacingHorizontalXS,
    },
  },
  navGroup: {
    display: "grid",
    gap: tokens.spacingVerticalXS,
    "@media (max-width: 760px)": {
      display: "flex",
    },
  },
  navSubgroups: {
    display: "grid",
    gap: tokens.spacingVerticalL,
    "@media (max-width: 760px)": {
      display: "flex",
      gap: tokens.spacingHorizontalXS,
    },
  },
  navSubgroupsCollapsed: {
    gap: tokens.spacingVerticalM,
    "@media (max-width: 760px)": {
      gap: tokens.spacingHorizontalXS,
    },
  },
  navSubgroup: {
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
  navGroupToggle: {
    justifyContent: "space-between",
    width: "100%",
    minWidth: 0,
    minHeight: "40px",
    paddingRight: tokens.spacingHorizontalM,
    paddingLeft: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    letterSpacing: "0.04em",
    textAlign: "left",
    textTransform: "uppercase",
    "@media (max-width: 760px)": {
      display: "none",
    },
  },
  collapsedLabel: {
    display: "none",
  },
  navSubgroupToggle: {
    justifyContent: "space-between",
    width: "100%",
    minWidth: 0,
    minHeight: "36px",
    paddingRight: tokens.spacingHorizontalM,
    paddingLeft: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground3,
    fontSize: tokens.fontSizeBase200,
    fontWeight: tokens.fontWeightSemibold,
    textAlign: "left",
    "@media (max-width: 760px)": {
      display: "none",
    },
  },
  navToggleIcon: {
    flexShrink: 0,
    fontSize: "16px",
  },
  collapsibleContentHidden: {
    display: "none",
    "@media (max-width: 760px)": {
      display: "flex",
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
  navLinkCollapsed: {
    justifyContent: "center",
    width: "44px",
    minWidth: "44px",
    paddingRight: 0,
    paddingLeft: 0,
    "@media (max-width: 760px)": {
      justifyContent: "flex-start",
      width: "auto",
      minWidth: "132px",
      paddingRight: tokens.spacingHorizontalM,
      paddingLeft: tokens.spacingHorizontalM,
    },
  },
  navLinkLabelCollapsed: {
    display: "none",
    "@media (max-width: 760px)": {
      display: "inline",
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

type NavigationItem = {
  to: string;
  label: string;
  end: boolean;
  regularIcon: FluentIcon;
  filledIcon: FluentIcon;
};

type NavigationSection = {
  id: string;
  label?: string;
  items: NavigationItem[];
};

type NavigationGroup = {
  id: string;
  label: string;
  sections: NavigationSection[];
};

const navigationGroups: NavigationGroup[] = [
  {
    id: "portal",
    label: "Portal",
    sections: [
      {
        id: "portal-principal",
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
    ],
  },
  {
    id: "servicos",
    label: "Serviços",
    sections: [
      {
        id: "servicos-principal",
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
    ],
  },
  {
    id: "administracao",
    label: "Administração",
    sections: [
      {
        id: "identidade-acesso",
        label: "Identidade e acesso",
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
      {
        id: "agendamentos",
        label: "Agendamentos",
        items: [
          {
            to: "/administracao/agendamentos/calendarios",
            label: "Calendários",
            end: true,
            regularIcon: CalendarMonthRegular,
            filledIcon: CalendarMonthFilled,
          },
          {
            to: "/administracao/agendamentos/fusos-horarios",
            label: "Fusos horários",
            end: true,
            regularIcon: GlobeLocationRegular,
            filledIcon: GlobeLocationFilled,
          },
          {
            to: "/administracao/agendamentos/grupos-de-rotinas",
            label: "Grupos de rotinas",
            end: true,
            regularIcon: FolderRegular,
            filledIcon: FolderFilled,
          },
          {
            to: "/administracao/agendamentos/rotinas-agendadas",
            label: "Rotinas agendadas",
            end: false,
            regularIcon: CalendarClockRegular,
            filledIcon: CalendarClockFilled,
          },
          {
            to: "/administracao/agendamentos/historico-execucoes",
            label: "Histórico de execuções",
            end: true,
            regularIcon: HistoryRegular,
            filledIcon: HistoryFilled,
          },
        ],
      },
    ],
  },
];

const navigationGroupIds = new Set(
  navigationGroups.map((group) => group.id),
);
const navigationSectionIds = new Set(
  navigationGroups.flatMap((group) =>
    group.sections.map((section) => section.id),
  ),
);

function isNavigationItemActive(pathname: string, item: NavigationItem) {
  return Boolean(
    matchPath({ path: item.to, end: item.end }, pathname),
  );
}

export function PortalShell({ children }: { children: ReactNode }) {
  const styles = useStyles();
  const location = useLocation();
  const previousPathnameRef = useRef(location.pathname);
  const [isNavigationCollapsed, setIsNavigationCollapsed] = useState(false);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [hasLoadedNavigationPreferences, setHasLoadedNavigationPreferences] =
    useState(false);
  const navigationToggleLabel = isNavigationCollapsed
    ? "Expandir navegação"
    : "Recolher navegação";

  useEffect(() => {
    const preferences = loadNavigationPreferences({
      groupIds: navigationGroupIds,
      sectionIds: navigationSectionIds,
    });

    setIsNavigationCollapsed(preferences.sidebarCollapsed);
    setCollapsedGroupIds(new Set(preferences.collapsedGroupIds));
    setCollapsedSectionIds(new Set(preferences.collapsedSectionIds));
    setHasLoadedNavigationPreferences(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedNavigationPreferences) return;

    saveNavigationPreferences({
      sidebarCollapsed: isNavigationCollapsed,
      collapsedGroupIds: Array.from(collapsedGroupIds).sort(),
      collapsedSectionIds: Array.from(collapsedSectionIds).sort(),
    });
  }, [
    collapsedGroupIds,
    collapsedSectionIds,
    hasLoadedNavigationPreferences,
    isNavigationCollapsed,
  ]);

  useEffect(() => {
    if (
      !hasLoadedNavigationPreferences ||
      previousPathnameRef.current === location.pathname
    ) {
      return;
    }

    previousPathnameRef.current = location.pathname;

    const activeGroup = navigationGroups.find((group) =>
      group.sections.some((section) =>
        section.items.some((item) =>
          isNavigationItemActive(location.pathname, item),
        ),
      ),
    );

    if (!activeGroup) {
      return;
    }

    const activeSection = activeGroup.sections.find((section) =>
      section.items.some((item) =>
        isNavigationItemActive(location.pathname, item),
      ),
    );

    setCollapsedGroupIds((currentIds) => {
      if (!currentIds.has(activeGroup.id)) {
        return currentIds;
      }

      const nextIds = new Set(currentIds);
      nextIds.delete(activeGroup.id);
      return nextIds;
    });

    if (activeSection?.label) {
      setCollapsedSectionIds((currentIds) => {
        if (!currentIds.has(activeSection.id)) {
          return currentIds;
        }

        const nextIds = new Set(currentIds);
        nextIds.delete(activeSection.id);
        return nextIds;
      });
    }
  }, [hasLoadedNavigationPreferences, location.pathname]);

  const toggleGroup = (groupId: string) => {
    setCollapsedGroupIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(groupId)) {
        nextIds.delete(groupId);
      } else {
        nextIds.add(groupId);
      }
      return nextIds;
    });
  };

  const toggleSection = (sectionId: string) => {
    setCollapsedSectionIds((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(sectionId)) {
        nextIds.delete(sectionId);
      } else {
        nextIds.add(sectionId);
      }
      return nextIds;
    });
  };

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

      <div
        className={mergeClasses(
          styles.workspace,
          isNavigationCollapsed && styles.workspaceCollapsed,
        )}
      >
        <aside
          className={mergeClasses(
            styles.sidebar,
            isNavigationCollapsed && styles.sidebarCollapsed,
          )}
        >
          <div className={styles.sidebarContent}>
            <div
              className={mergeClasses(
                styles.sidebarControls,
                isNavigationCollapsed && styles.sidebarControlsCollapsed,
              )}
            >
              <Tooltip
                content={navigationToggleLabel}
                relationship="description"
                positioning="after"
              >
                <Button
                  className={styles.collapseButton}
                  appearance="subtle"
                  icon={
                    isNavigationCollapsed ? (
                      <PanelLeftExpandRegular />
                    ) : (
                      <PanelLeftContractRegular />
                    )
                  }
                  aria-label={navigationToggleLabel}
                  aria-controls="navegacao-principal"
                  aria-expanded={!isNavigationCollapsed}
                  onClick={() =>
                    setIsNavigationCollapsed((isCollapsed) => !isCollapsed)
                  }
                />
              </Tooltip>
            </div>

            <nav
              id="navegacao-principal"
              className={mergeClasses(
                styles.nav,
                isNavigationCollapsed && styles.navCollapsed,
              )}
              aria-label="Navegação principal"
            >
              {navigationGroups.map((group) => {
                const isGroupExpanded = !collapsedGroupIds.has(group.id);
                const groupContentId = `navigation-group-${group.id}`;

                return (
                  <div
                    className={styles.navGroup}
                    key={group.id}
                    role="group"
                    aria-label={group.label}
                  >
                    <Button
                      className={mergeClasses(
                        styles.navGroupToggle,
                        isNavigationCollapsed && styles.collapsedLabel,
                      )}
                      appearance="subtle"
                      icon={
                        isGroupExpanded ? (
                          <ChevronDownRegular
                            className={styles.navToggleIcon}
                          />
                        ) : (
                          <ChevronRightRegular
                            className={styles.navToggleIcon}
                          />
                        )
                      }
                      iconPosition="after"
                      aria-expanded={isGroupExpanded}
                      aria-controls={groupContentId}
                      onClick={() => toggleGroup(group.id)}
                    >
                      {group.label}
                    </Button>
                    <div
                      id={groupContentId}
                      className={mergeClasses(
                        styles.navSubgroups,
                        isNavigationCollapsed && styles.navSubgroupsCollapsed,
                        !isNavigationCollapsed &&
                          !isGroupExpanded &&
                          styles.collapsibleContentHidden,
                      )}
                    >
                      {group.sections.map((section) => {
                        const isSectionExpanded =
                          !collapsedSectionIds.has(section.id);
                        const sectionContentId =
                          `navigation-section-${section.id}`;

                        return (
                          <div
                            className={styles.navSubgroup}
                            key={section.id}
                            role={section.label ? "group" : undefined}
                            aria-label={section.label}
                          >
                            {section.label ? (
                              <Button
                                className={mergeClasses(
                                  styles.navSubgroupToggle,
                                  isNavigationCollapsed &&
                                    styles.collapsedLabel,
                                )}
                                appearance="subtle"
                                icon={
                                  isSectionExpanded ? (
                                    <ChevronDownRegular
                                      className={styles.navToggleIcon}
                                    />
                                  ) : (
                                    <ChevronRightRegular
                                      className={styles.navToggleIcon}
                                    />
                                  )
                                }
                                iconPosition="after"
                                aria-expanded={isSectionExpanded}
                                aria-controls={sectionContentId}
                                onClick={() => toggleSection(section.id)}
                              >
                                {section.label}
                              </Button>
                            ) : null}
                            <div
                              id={sectionContentId}
                              className={mergeClasses(
                                styles.navItems,
                                !isNavigationCollapsed &&
                                  section.label &&
                                  !isSectionExpanded &&
                                  styles.collapsibleContentHidden,
                              )}
                            >
                              {section.items.map((item) => {
                                const RegularIcon = item.regularIcon;
                                const FilledIcon = item.filledIcon;
                                const navLink = (
                                  <NavLink
                                    key={item.to}
                                    to={item.to}
                                    end={item.end}
                                    aria-label={
                                      isNavigationCollapsed
                                        ? item.label
                                        : undefined
                                    }
                                    className={({ isActive }) =>
                                      mergeClasses(
                                        styles.navLink,
                                        isNavigationCollapsed &&
                                          styles.navLinkCollapsed,
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
                                        <span
                                          className={mergeClasses(
                                            isNavigationCollapsed &&
                                              styles.navLinkLabelCollapsed,
                                          )}
                                        >
                                          {item.label}
                                        </span>
                                      </>
                                    )}
                                  </NavLink>
                                );

                                return isNavigationCollapsed ? (
                                  <Tooltip
                                    key={item.to}
                                    content={item.label}
                                    relationship="description"
                                    positioning="after"
                                  >
                                    {navLink}
                                  </Tooltip>
                                ) : (
                                  navLink
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>
        </aside>

        <main id="conteudo-principal" className={styles.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
