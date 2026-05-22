"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "../../i18n";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lang = navigator.language.split("-")[0];
    if (["en", "ja", "ko"].includes(lang)) {
      i18n.changeLanguage(lang);
    }
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
