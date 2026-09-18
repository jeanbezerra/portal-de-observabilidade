const storageKey = "portal-observabilidade.navigation-preferences.v1";

export type NavigationPreferences = {
  sidebarCollapsed: boolean;
  collapsedGroupIds: string[];
  collapsedSectionIds: string[];
};

type NavigationPreferenceOptions = {
  groupIds: ReadonlySet<string>;
  sectionIds: ReadonlySet<string>;
};

function createDefaultPreferences(): NavigationPreferences {
  return {
    sidebarCollapsed: false,
    collapsedGroupIds: [],
    collapsedSectionIds: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readValidIds(value: unknown, validIds: ReadonlySet<string>) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.filter(
        (item): item is string =>
          typeof item === "string" && validIds.has(item),
      ),
    ),
  );
}

export function loadNavigationPreferences({
  groupIds,
  sectionIds,
}: NavigationPreferenceOptions): NavigationPreferences {
  if (typeof window === "undefined") return createDefaultPreferences();

  try {
    const rawPreferences = window.localStorage.getItem(storageKey);
    if (!rawPreferences) return createDefaultPreferences();

    const parsedPreferences: unknown = JSON.parse(rawPreferences);
    if (!isRecord(parsedPreferences)) return createDefaultPreferences();

    return {
      sidebarCollapsed: parsedPreferences.sidebarCollapsed === true,
      collapsedGroupIds: readValidIds(
        parsedPreferences.collapsedGroupIds,
        groupIds,
      ),
      collapsedSectionIds: readValidIds(
        parsedPreferences.collapsedSectionIds,
        sectionIds,
      ),
    };
  } catch {
    return createDefaultPreferences();
  }
}

export function saveNavigationPreferences(
  preferences: NavigationPreferences,
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch {
    // O menu continua funcional quando o navegador bloqueia o armazenamento.
  }
}
