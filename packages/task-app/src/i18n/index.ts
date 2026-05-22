import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en";
import ja from "./locales/ja";
import ko from "./locales/ko";

const SUPPORTED = ["en", "ja", "ko"];

const detectLanguage = (): string => {
  if (typeof navigator === "undefined") return "ja";
  const lang = navigator.language.split("-")[0];
  return SUPPORTED.includes(lang) ? lang : "ja";
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ja: { translation: ja },
    ko: { translation: ko },
  },
  lng: detectLanguage(),
  fallbackLng: "ja",
  interpolation: { escapeValue: false },
  initImmediate: false,
});

export default i18n;
