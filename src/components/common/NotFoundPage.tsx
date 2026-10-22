import React from "react";
import { ArrowLeft, ArrowRight, House } from "lucide-react";
import { useLanguage } from "@/src/context/LanguageContext";

interface NotFoundPageProps {
  onGoToDashboard: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({ onGoToDashboard }) => {
  const { t, direction } = useLanguage();
  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <section
      dir={direction}
      className="mx-auto mt-8 flex min-h-[55vh] max-w-2xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:mt-12 sm:px-10"
    >
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
        <House aria-hidden="true" size={34} strokeWidth={1.8} />
      </div>
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">404</p>
      <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
        {t("pageNotFoundTitle")}
      </h1>
      <p className="mt-3 max-w-lg text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        {t("pageNotFoundDescription")}
      </p>
      <button
        type="button"
        onClick={onGoToDashboard}
        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <BackIcon aria-hidden="true" size={18} />
        {t("backToDashboard")}
      </button>
    </section>
  );
};
