import { useCallback, useSyncExternalStore } from "react";

export interface DashboardSettings {
  apiBaseUrl: string;
  confirmBeforeDelete: boolean;
  showRelativeTimes: boolean;
  dashboardAutoRefreshSeconds: number;
}

const STORAGE_KEY = "token-gateway.dashboard-settings";
const CHANGE_EVENT = "token-gateway:dashboard-settings";

export const DEFAULT_DASHBOARD_SETTINGS: DashboardSettings = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || "/admin",
  confirmBeforeDelete: true,
  showRelativeTimes: true,
  dashboardAutoRefreshSeconds: 0,
};

function isBrowser() {
  return typeof window !== "undefined";
}

function sanitizeSettings(settings?: Partial<DashboardSettings> | null): DashboardSettings {
  return {
    apiBaseUrl: settings?.apiBaseUrl?.trim() || DEFAULT_DASHBOARD_SETTINGS.apiBaseUrl,
    confirmBeforeDelete:
      settings?.confirmBeforeDelete ?? DEFAULT_DASHBOARD_SETTINGS.confirmBeforeDelete,
    showRelativeTimes: settings?.showRelativeTimes ?? DEFAULT_DASHBOARD_SETTINGS.showRelativeTimes,
    dashboardAutoRefreshSeconds: Math.max(
      0,
      Math.min(
        3600,
        Number(settings?.dashboardAutoRefreshSeconds) ||
          DEFAULT_DASHBOARD_SETTINGS.dashboardAutoRefreshSeconds,
      ),
    ),
  };
}

export function readDashboardSettings(): DashboardSettings {
  if (!isBrowser()) {
    return DEFAULT_DASHBOARD_SETTINGS;
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_DASHBOARD_SETTINGS;
    }

    const parsed = JSON.parse(rawValue) as Partial<DashboardSettings>;
    return sanitizeSettings(parsed);
  } catch {
    return DEFAULT_DASHBOARD_SETTINGS;
  }
}

function emitDashboardSettingsChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveDashboardSettings(settings: DashboardSettings): DashboardSettings {
  const nextSettings = sanitizeSettings(settings);

  if (isBrowser()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    emitDashboardSettingsChange();
  }

  return nextSettings;
}

export function updateDashboardSettings(patch: Partial<DashboardSettings>): DashboardSettings {
  return saveDashboardSettings({
    ...readDashboardSettings(),
    ...patch,
  });
}

export function resetDashboardSettings(): DashboardSettings {
  if (isBrowser()) {
    window.localStorage.removeItem(STORAGE_KEY);
    emitDashboardSettingsChange();
  }

  return DEFAULT_DASHBOARD_SETTINGS;
}

function subscribeToDashboardSettings(listener: () => void) {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      listener();
    }
  };

  const handleChange = () => {
    listener();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, handleChange);
  };
}

export function useDashboardSettings() {
  const settings = useSyncExternalStore(
    subscribeToDashboardSettings,
    readDashboardSettings,
    () => DEFAULT_DASHBOARD_SETTINGS,
  );

  const setSettings = useCallback((nextSettings: DashboardSettings) => {
    return saveDashboardSettings(nextSettings);
  }, []);

  const patchSettings = useCallback((patch: Partial<DashboardSettings>) => {
    return updateDashboardSettings(patch);
  }, []);

  const resetSettings = useCallback(() => {
    return resetDashboardSettings();
  }, []);

  return {
    settings,
    defaults: DEFAULT_DASHBOARD_SETTINGS,
    setSettings,
    patchSettings,
    resetSettings,
  };
}
