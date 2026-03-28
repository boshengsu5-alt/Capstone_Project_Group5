import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AppSettings {
  showInAppAlerts: boolean;
  confirmBeforeLogout: boolean;
}

const APP_SETTINGS_KEY = 'settings.app';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  showInAppAlerts: true,
  confirmBeforeLogout: true,
};

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(APP_SETTINGS_KEY);
    if (!raw) return DEFAULT_APP_SETTINGS;

    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...parsed,
    };
  } catch (error) {
    console.warn('[appSettings] Failed to read settings:', error);
    return DEFAULT_APP_SETTINGS;
  }
}

export async function saveAppSettings(settings: AppSettings): Promise<AppSettings> {
  await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

export async function updateAppSettings(partial: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getAppSettings();
  const next = { ...current, ...partial };
  return saveAppSettings(next);
}

export async function resetAppSettings(): Promise<AppSettings> {
  await AsyncStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(DEFAULT_APP_SETTINGS));
  return DEFAULT_APP_SETTINGS;
}
