import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// We will create these JSON files in Step 2
import enTranslations from './locales/en.json';
import taTranslations from './locales/ta.json';
import hiTranslations from './locales/hi.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ta: { translation: taTranslations },
      hi: { translation: hiTranslations }

    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already protects against XSS
    },
  });

export default i18n;