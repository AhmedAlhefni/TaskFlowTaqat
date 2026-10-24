import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { X, Folder, AlertCircle, Info } from "lucide-react";
import { Project } from "@/src/types";
import { useLanguage } from "@/src/context/LanguageContext";
import { createProjectSchema, ProjectFormData } from "@/src/lib/schemas";
import { ModalLayer } from "@/src/components/common/ModalLayer";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; description: string }) => Promise<void>;
  project?: Project | null;
  noticeMessage?: string | null;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  project,
  noticeMessage,
}) => {
  const { t } = useLanguage();

  const projectSchema = React.useMemo(() => createProjectSchema(t), [t]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setFocus,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: "",
      description: "",
    },
    mode: "onChange",
  });

  const nameValue = watch("name") || "";
  const descValue = watch("description") || "";

  useEffect(() => {
    if (isOpen) {
      reset({
        name: project?.name || "",
        description: project?.description || "",
      });
      setTimeout(() => {
        setFocus("name");
      }, 100);
    }
  }, [project, isOpen, reset, setFocus]);

  if (!isOpen) return null;

  const onFormSubmit = async (data: ProjectFormData) => {
    try {
      await onSubmit({
        name: data.name.trim(),
        description: (data.description || "").trim(),
      });
      onClose();
    } catch (err: any) {
      console.error("Project submit error:", err);
      setError("root", {
        message: err.message || t("authError"),
      });
    }
  };

  return (
    <ModalLayer onClose={onClose} dismissible={!isSubmitting}>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform transition-all"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {project ? t("editProject") : t("newProject")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title={t("close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {noticeMessage && (
          <div className="mx-6 mt-5 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/80 text-indigo-900 dark:text-indigo-200 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in duration-150">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          {errors.root && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errors.root.message}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("projectName")} *
              </label>
              <span className={`text-[10px] font-mono ${nameValue.length > 80 ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                {nameValue.length}/80
              </span>
            </div>
            <input
              {...register("name")}
              type="text"
              maxLength={80}
              placeholder={t("projectNamePlaceholder")}
              className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white outline-none transition-all ${
                errors.name
                  ? "border-rose-300 dark:border-rose-800 focus:ring-2 focus:ring-rose-500/20"
                  : "border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.name.message}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t("projectDesc")}
              </label>
              <span className={`text-[10px] font-mono ${descValue.length > 1000 ? "text-rose-600 font-bold" : "text-slate-400"}`}>
                {descValue.length}/1000
              </span>
            </div>
            <textarea
              {...register("description")}
              rows={3}
              maxLength={1000}
              placeholder={t("projectDescPlaceholder")}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all resize-none"
            />
            {errors.description && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.description.message}</span>
              </p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || nameValue.trim().length < 3}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
            >
              {isSubmitting && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              <span>{t("save")}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
    </ModalLayer>
  );
};
