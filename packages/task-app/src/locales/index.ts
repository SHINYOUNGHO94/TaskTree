import i18n from "../i18n";
import en from "./en";
import ja from "./ja";
import ko from "./ko";
import zh from "./zh";

const UI_LANG_KEY = "ui-lang";
const SUPPORTED = ["en", "ja", "ko", "zh"] as const;
type SupportedLang = (typeof SUPPORTED)[number];

i18n.addResourceBundle("en", "ui", en, true, true);
i18n.addResourceBundle("ja", "ui", ja, true, true);
i18n.addResourceBundle("ko", "ui", ko, true, true);
i18n.addResourceBundle("zh", "ui", zh, true, true);

export function getStoredLang(): SupportedLang {
  if (typeof window === "undefined") return "ja";
  const stored = localStorage.getItem(UI_LANG_KEY);
  return SUPPORTED.includes(stored as SupportedLang)
    ? (stored as SupportedLang)
    : "ja";
}

export function changeUILanguage(lang: SupportedLang) {
  localStorage.setItem(UI_LANG_KEY, lang);
  i18n.changeLanguage(lang);
}

export { SUPPORTED, UI_LANG_KEY };
export type { SupportedLang };
