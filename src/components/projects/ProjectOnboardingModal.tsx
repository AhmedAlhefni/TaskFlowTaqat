import React from "react";
import {
  CheckCircle2,
  UserPlus,
  PlusCircle,
  Settings,
  ArrowRight,
  ArrowLeft,
  X,
  Sparkles,
} from "lucide-react";
import { Project } from "@/src/types";
import { useLanguage } from "@/src/context/LanguageContext";
import { ModalLayer } from "@/src/components/common/ModalLayer";

interface ProjectOnboardingModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onAddMembers: () => void;
  onCreateTask: () => void;
  onOpenSettings: () => void;
  onContinueToProject: () => void;
}

export const ProjectOnboardingModal: React.FC<ProjectOnboardingModalProps> = ({
  isOpen,
  project,
  onClose,
  onAddMembers,
  onCreateTask,
  onOpenSettings,
  onContinueToProject,
}) => {
  const { t, direction, language } = useLanguage();

  if (!isOpen || !project) return null;

  return (
    <ModalLayer onClose={onClose}>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white overflow-hidden">
          <div className="absolute -end-10 -bottom-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute top-4 end-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={t("close")}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Sparkles className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[11px] font-bold border border-emerald-400/30 mb-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>{language === "ar" ? "جاهز للاستخدام" : "Workspace Ready"}</span>
              </span>
              <h3 className="text-xl font-black tracking-tight">
                {t("projectOnboardingTitle")}
              </h3>
            </div>
          </div>
          <p className="mt-3 text-xs text-indigo-100/90 leading-relaxed">
            {project.name}: {t("projectOnboardingSubtitle")}
          </p>
        </div>

        {/* Options Body */}
        <div className="p-6 space-y-3">
          {/* Step 1: Add Members */}
          <button
            onClick={() => {
              onClose();
              onAddMembers();
            }}
            className="w-full group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-start flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {t("stepAddMembers")}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("stepAddMembersDesc")}
                </p>
              </div>
            </div>
            {direction === "rtl" ? (
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            ) : (
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            )}
          </button>

          {/* Step 2: Create First Task */}
          <button
            onClick={() => {
              onClose();
              onCreateTask();
            }}
            className="w-full group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-start flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {t("stepCreateTask")}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("stepCreateTaskDesc")}
                </p>
              </div>
            </div>
            {direction === "rtl" ? (
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            ) : (
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            )}
          </button>

          {/* Step 3: Review Settings */}
          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full group p-4 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 text-start flex items-center justify-between transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {t("stepProjectSettings")}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t("stepProjectSettingsDesc")}
                </p>
              </div>
            </div>
            {direction === "rtl" ? (
              <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            ) : (
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
            )}
          </button>
        </div>

        {/* Footer / Skip action */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            {language === "ar" ? "يمكنك إجراء هذه الخطوات لاحقاً في أي وقت" : "You can perform these anytime later"}
          </span>
          <button
            onClick={() => {
              onClose();
              onContinueToProject();
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <span>{t("stepSkip")}</span>
            {direction === "rtl" ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
    </ModalLayer>
  );
};
