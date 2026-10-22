import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X,
  Users,
  UserPlus,
  Trash2,
  Shield,
  User,
  AlertTriangle,
  CheckCircle2,
  Save,
  AlertCircle,
} from "lucide-react";
import { Project, ProjectMemberInfo, UserProfile } from "@/src/types";
import { useLanguage } from "@/src/context/LanguageContext";
import { ConfirmationModal } from "@/src/components/common/ConfirmationModal";
import { ModalLayer } from "@/src/components/common/ModalLayer";
import {
  createProjectSchema,
  ProjectFormData,
  createAddMemberSchema,
  AddMemberFormData,
} from "@/src/lib/schemas";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  members?: ProjectMemberInfo[];
  currentUser: UserProfile;
  initialTab?: "general" | "members" | "danger";
  onUpdateProject: (name: string, description: string) => Promise<void>;
  onAddMember: (email: string) => Promise<{ uid: string; displayName: string; email: string } | any>;
  onRemoveMember: (memberUid: string) => Promise<void>;
  onDeleteProject: () => Promise<void>;
}

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  project,
  members,
  currentUser,
  initialTab = "general",
  onUpdateProject,
  onAddMember,
  onRemoveMember,
  onDeleteProject,
}) => {
  const { t } = useLanguage();

  const effectiveMembers = React.useMemo(() => {
    if (members && members.length > 0) return members;
    const list: ProjectMemberInfo[] = [];
    project.memberIds.forEach((uid) => {
      const info = project.members?.[uid];
      list.push({
        uid,
        email: info?.email || "",
        displayName: info?.displayName || (uid === project.ownerId ? "Owner" : "Member"),
        role: uid === project.ownerId ? "owner" : "member",
      });
    });
    return list;
  }, [members, project]);

  const [activeTab, setActiveTab] = useState<"general" | "members" | "danger">(initialTab);
  const [localMembers, setLocalMembers] = useState<ProjectMemberInfo[]>(effectiveMembers);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Zod Schemas
  const projectSchema = React.useMemo(() => createProjectSchema(t), [t]);
  const addMemberSchema = React.useMemo(() => createAddMemberSchema(t), [t]);

  // Form 1: Project Details (React Hook Form + Zod)
  const {
    register: registerProject,
    handleSubmit: handleProjectSubmit,
    reset: resetProjectForm,
    watch: watchProject,
    formState: { errors: projectErrors, isSubmitting: isSaving },
  } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project.name || "",
      description: project.description || "",
    },
    mode: "onChange",
  });

  // Form 2: Add Member (React Hook Form + Zod)
  const {
    register: registerMember,
    handleSubmit: handleMemberSubmit,
    reset: resetMemberForm,
    formState: { errors: memberErrors, isSubmitting: isAddingMember },
  } = useForm<AddMemberFormData>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  const nameValue = watchProject("name") || "";
  const descValue = watchProject("description") || "";

  // Sync state whenever modal opens or project/initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      resetProjectForm({
        name: project.name || "",
        description: project.description || "",
      });
      resetMemberForm({ email: "" });
      setStatusMsg(null);
    }
  }, [isOpen, initialTab, project.id, resetProjectForm, resetMemberForm]);

  useEffect(() => {
    setLocalMembers(effectiveMembers);
  }, [effectiveMembers]);

  // Modals
  const [memberToRemove, setMemberToRemove] = useState<ProjectMemberInfo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen) return null;

  const onSaveProjectDetails = async (data: ProjectFormData) => {
    setStatusMsg(null);
    try {
      await onUpdateProject(data.name.trim(), (data.description || "").trim());
      setStatusMsg({ type: "success", text: t("taskUpdatedSuccess") });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || t("authError") });
    }
  };

  const onAddMemberSubmit = async (data: AddMemberFormData) => {
    const emailToSubmit = data.email.trim();
    setStatusMsg(null);
    try {
      const added = await onAddMember(emailToSubmit);
      if (added && added.uid) {
        setLocalMembers((prev) => {
          if (prev.some((m) => m.uid === added.uid || m.email.toLowerCase() === added.email.toLowerCase())) {
            return prev;
          }
          return [
            ...prev,
            {
              uid: added.uid,
              email: added.email,
              displayName: added.displayName || added.email.split("@")[0],
              role: "member",
            },
          ];
        });
      }
      resetMemberForm({ email: "" });
      setStatusMsg({ type: "success", text: t("memberAddedSuccess") });
    } catch (err: any) {
      let text = err.message;
      if (err.message === "userNotFound") text = t("userNotFound");
      if (err.message === "alreadyMember") text = t("alreadyMember");
      setStatusMsg({ type: "error", text });
    }
  };

  const confirmRemoveMemberAction = async () => {
    if (!memberToRemove) return;
    const removedUid = memberToRemove.uid;
    try {
      // Optimistically remove from list immediately
      setLocalMembers((prev) => prev.filter((m) => m.uid !== removedUid));
      await onRemoveMember(removedUid);
      setMemberToRemove(null);
      setStatusMsg({ type: "success", text: t("taskUpdatedSuccess") });
    } catch (err: any) {
      // Revert if error
      setLocalMembers(effectiveMembers);
      setStatusMsg({ type: "error", text: err.message || t("authError") });
    }
  };

  return (
    <>
      <ModalLayer onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {t("projectSettings")}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {project.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 gap-6 text-sm font-semibold">
            <button
              onClick={() => {
                setActiveTab("general");
                setStatusMsg(null);
              }}
              className={`py-3 border-b-2 transition-colors cursor-pointer ${
                activeTab === "general"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {t("projectDetails")}
            </button>
            <button
              onClick={() => {
                setActiveTab("members");
                setStatusMsg(null);
              }}
              className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === "members"
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>{t("members")}</span>
              <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {effectiveMembers.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveTab("danger");
                setStatusMsg(null);
              }}
              className={`py-3 border-b-2 transition-colors cursor-pointer text-rose-600 ${
                activeTab === "danger"
                  ? "border-rose-600 text-rose-600 font-bold"
                  : "border-transparent opacity-80 hover:opacity-100"
              }`}
            >
              {t("deleteProject")}
            </button>
          </div>

          {/* Feedback banner */}
          {statusMsg && (
            <div
              className={`mx-6 mt-4 p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-150 ${
                statusMsg.type === "success"
                  ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300"
              }`}
            >
              {statusMsg.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Tab Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === "general" && (
              <form onSubmit={handleProjectSubmit(onSaveProjectDetails)} className="space-y-4">
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
                    {...registerProject("name")}
                    type="text"
                    maxLength={80}
                    className={`w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border rounded-xl text-sm text-slate-900 dark:text-white outline-none transition-all ${
                      projectErrors.name
                        ? "border-rose-300 dark:border-rose-800 focus:ring-2 focus:ring-rose-500/20"
                        : "border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                    }`}
                  />
                  {projectErrors.name && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{projectErrors.name.message}</span>
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
                    {...registerProject("description")}
                    rows={4}
                    maxLength={1000}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 resize-none"
                  />
                  {projectErrors.description && (
                    <p className="mt-1 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{projectErrors.description.message}</span>
                    </p>
                  )}
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isSaving || nameValue.trim().length < 3}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{t("save")}</span>
                  </button>
                </div>
              </form>
            )}

            {activeTab === "members" && (
              <div className="space-y-6">
                {/* Add Member form with Zod & React Hook Form */}
                <form
                  onSubmit={handleMemberSubmit(onAddMemberSubmit)}
                  className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-3"
                >
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    {t("addMemberByEmail")}
                  </label>
                  <div className="flex gap-2">
                    <input
                      {...registerMember("email")}
                      type="email"
                      placeholder={t("enterMemberEmail")}
                      className={`flex-1 px-3.5 py-2 bg-white dark:bg-slate-900 border rounded-xl text-sm text-slate-900 dark:text-white outline-none ${
                        memberErrors.email
                          ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                          : "border-slate-300 dark:border-slate-700 focus:border-indigo-600"
                      }`}
                    />
                    <button
                      type="submit"
                      disabled={isAddingMember}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {isAddingMember ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                      <span>{t("addMember")}</span>
                    </button>
                  </div>
                  {memberErrors.email && (
                    <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{memberErrors.email.message}</span>
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t("member")}
                  </p>
                </form>

                {/* Member List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {t("members")} ({localMembers.length})
                  </h4>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                    {localMembers.map((m) => {
                      const isItemOwner = m.role === "owner";
                      return (
                        <div
                          key={m.uid}
                          className="flex items-center justify-between p-3.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs ring-1 ring-slate-200 dark:ring-slate-700">
                              {m.displayName ? m.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span>{m.displayName || m.email}</span>
                                {isItemOwner && (
                                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900">
                                    <Shield className="w-3 h-3" />
                                    <span>{t("owner")}</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 dark:text-slate-400">
                                {m.email}
                              </span>
                            </div>
                          </div>

                          {!isItemOwner && (
                            <button
                              type="button"
                              onClick={() => setMemberToRemove(m)}
                              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 p-2 rounded-xl transition-colors cursor-pointer"
                              title={t("removeMember")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "danger" && (
              <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                      {t("confirmDeleteProjectTitle")}
                    </h4>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                      {t("confirmDeleteProjectDesc")}
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-sm shadow-rose-600/30 cursor-pointer transition-all"
                  >
                    {t("deleteProject")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </ModalLayer>

      {/* Confirmation Modal for removing a member */}
      <ConfirmationModal
        isOpen={!!memberToRemove}
        title={t("removeMember")}
        description={t("confirmRemoveMember")}
        confirmLabel={t("removeMember")}
        onConfirm={confirmRemoveMemberAction}
        onClose={() => setMemberToRemove(null)}
      />

      {/* Confirmation Modal for deleting project */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        title={t("confirmDeleteProjectTitle")}
        description={t("confirmDeleteProjectDesc")}
        confirmLabel={t("deleteProject")}
        onConfirm={async () => {
          setShowDeleteConfirm(false);
          await onDeleteProject();
        }}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </>
  );
};
