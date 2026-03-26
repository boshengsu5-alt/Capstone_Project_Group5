import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import zh from './locales/zh.json';

const STORE_LANGUAGE_KEY = 'settings.lang';

const languageDetectorPlugin = {
  type: 'languageDetector' as const,
  async: true,
  init: () => {},
  detect: async function (callback: (lang: string) => void) {
    try {
      // get stored language from Async storage
      await AsyncStorage.getItem(STORE_LANGUAGE_KEY).then((language) => {
        if (language) {
          // if language was stored before, use this language in the app
          return callback(language);
        } else {
          // if language was not stored yet, use english
          return callback('zh'); // Defaulting to Chinese based on current UI
        }
      });
    } catch (error) {
      console.log('Error reading language', error);
      callback('zh');
    }
  },
  cacheUserLanguage: async function (language: string) {
    try {
      // save a user's language choice in Async storage
      await AsyncStorage.setItem(STORE_LANGUAGE_KEY, language);
    } catch (error) {
      console.log('Error saving language', error);
    }
  },
};

const resources = {
  en: { translation: en },
  zh: { translation: zh },
};

i18n
  .use(initReactI18next)
  .use(languageDetectorPlugin)
  .init({
    resources,
    compatibilityJSON: 'v4',
    // fallback language is set to zh
    fallbackLng: 'zh',
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
