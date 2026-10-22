import React, { createContext, useContext, useEffect, useState } from "react";
import { Language } from "@/src/types";
import { translations } from "@/src/lib/i18n";

type TranslationKey = keyof typeof translations.ar;

interface LanguageContextType {
  language: Language;
  direction: "rtl" | "ltr";
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("taskflow_lang") as Language | null;
      return saved === "en" || saved === "ar" ? saved : "en";
    } catch {
      return "en";
    }
  });

  const direction = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    try {
      localStorage.setItem("taskflow_lang", language);
    } catch {
      // The selected language still applies for this session when storage is unavailable.
    }
    document.documentElement.setAttribute("dir", direction);
    document.documentElement.setAttribute("lang", language);
  }, [language, direction]);

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === "ar" ? "en" : "ar"));
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: TranslationKey): string => {
    const dict = translations[language] || translations.ar;
    return (dict as any)[key] || (translations.en as any)[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, direction, toggleLanguage, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within a LanguageProvider");
  return context;
};
