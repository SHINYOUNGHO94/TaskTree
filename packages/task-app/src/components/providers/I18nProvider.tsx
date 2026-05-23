"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../i18n";
import "../../locales";
import { getStoredLang } from "../../locales";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lang = getStoredLang();
    i18n.changeLanguage(lang);
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
