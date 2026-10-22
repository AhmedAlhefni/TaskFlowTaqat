import React, { useState, useMemo } from "react";
import {
  Users,
  X,
  Search,
  Crown,
  Shield,
  User,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
  UserPlus,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Kanban,
  Mail,
} from "lucide-react";
import { Project, ProjectMemberInfo, Task, UserProfile } from "@/src/types";
import { isTaskOverdue } from "@/src/lib/dateUtils";
import { useLanguage } from "@/src/context/LanguageContext";
import { useToast } from "@/src/components/common/Toast";
import { ConfirmationModal } from "@/src/components/common/ConfirmationModal";
import { ModalLayer } from "@/src/components/common/ModalLayer";

interface ProjectMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  members: ProjectMemberInfo[];
  tasks: Task[];
  currentUser: UserProfile;
  onFilterByMember?: (memberUid: string) => void;
  onAddMember?: (email: string) => Promise<any>;
  onRemoveMember?: (memberUid: string) => Promise<void>;
}

export const ProjectMembersModal: React.FC<ProjectMembersModalProps> = ({
  isOpen,
  onClose,
  project,
  members,
  tasks,
  currentUser,
  onFilterByMember,
  onAddMember,
  onRemoveMember,
}) => {
  const { t, language, direction } = useLanguage();
  const { showToast } = useToast();

  const isOwner = project.ownerId === currentUser.uid;
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Add member inline state
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Remove member state
  const [memberToRemove, setMemberToRemove] = useState<ProjectMemberInfo | null>(null);
  const [isSubmittingRemove, setIsSubmittingRemove] = useState(false);

  if (!isOpen) return null;

  // Filter members by search query
  const filteredMembers = members.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const nameMatch = m.displayName.toLowerCase().includes(q);
    const emailMatch = m.email.toLowerCase().includes(q);
    return nameMatch || emailMatch;
  });

  // Calculate task statistics for a specific member in this project
  const getMemberTaskStats = (memberUid: string) => {
    const memberTasks = tasks.filter((task) => task.assigneeId === memberUid);
    const done = memberTasks.filter((task) => task.status === "done").length;
    const inProgress = memberTasks.filter((task) => task.status === "in_progress").length;
    const todo = memberTasks.filter((task) => task.status === "todo").length;
    const overdue = memberTasks.filter((task) => isTaskOverdue(task)).length;

    return {
      total: memberTasks.length,
      done,
      inProgress,
      todo,
      overdue,
    };
  };

  const handleCopyEmail = (email: string, uid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(email);
    setCopiedUid(uid);
    showToast(t("emailCopied"), "info");
    setTimeout(() => {
      setCopiedUid((curr) => (curr === uid ? null : curr));
    }, 2000);
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newMemberEmail.trim();
    if (!email) return;

    if (!onAddMember) return;

    setAddError(null);
    setIsSubmittingAdd(true);
    try {
      await onAddMember(email);
      setNewMemberEmail("");
      setIsAddingMember(false);
    } catch (err: any) {
      let msg = err.message || t("authError");
      if (err.message === "userNotFound") msg = t("userNotFound");
      if (err.message === "alreadyMember") msg = t("alreadyMember");
      setAddError(msg);
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove || !onRemoveMember) return;
    setIsSubmittingRemove(true);
    try {
      await onRemoveMember(memberToRemove.uid);
      setMemberToRemove(null);
    } catch (err: any) {
      // Handled in caller
    } finally {
      setIsSubmittingRemove(false);
    }
  };

  // Helper avatar background colors based on member name
  const getAvatarGradient = (str: string) => {
    const gradients = [
      "from-indigo-500 to-purple-600",
      "from-blue-500 to-cyan-600",
      "from-emerald-500 to-teal-600",
      "from-amber-500 to-orange-600",
      "from-rose-500 to-pink-600",
      "from-violet-500 to-indigo-600",
    ];
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  return (
    <>
      <ModalLayer onClose={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div
          dir={direction}
          className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/20">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-xs">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                    {t("projectTeamMembers")}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 shrink-0">
                    {members.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5" dir="auto">
                  {project.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isOwner && onAddMember && !isAddingMember && (
                <button
                  type="button"
                  onClick={() => setIsAddingMember(true)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t("addMember")}</span>
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={t("close")}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Inline Add Member Form (if Owner toggles it) */}
          {isAddingMember && (
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50 animate-in slide-in-from-top-3 duration-200">
              <form onSubmit={handleAddMemberSubmit} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span>{t("addMemberByEmail")}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingMember(false);
                      setNewMemberEmail("");
                      setAddError(null);
                    }}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {t("cancel")}
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={newMemberEmail}
                      onChange={(e) => {
                        setNewMemberEmail(e.target.value);
                        if (addError) setAddError(null);
                      }}
                      placeholder={t("enterMemberEmail")}
                      dir="ltr"
                      className={`w-full ps-9 pe-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 ${
                        addError
                          ? "border-rose-400 dark:border-rose-700 focus:ring-rose-500"
                          : "border-indigo-200 dark:border-indigo-800 focus:ring-indigo-500"
                      }`}
                      autoFocus
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmittingAdd || !newMemberEmail.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {isSubmittingAdd ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    <span>{t("addMember")}</span>
                  </button>
                </div>
                {addError && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 font-medium px-1 animate-in fade-in">
                    {addError}
                  </p>
                )}
              </form>
            </div>
          )}

          {/* Search Bar */}
          <div className="p-4 pb-2 border-b border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("searchMembersPlaceholder")}
                className="w-full ps-10 pe-4 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-slate-900 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Members List Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1 divide-y divide-slate-100 dark:divide-slate-800/60">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {t("noMembersFound")}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                  >
                    {t("resetFilters")}
                  </button>
                )}
              </div>
            ) : (
              filteredMembers.map((member) => {
                const isMemberOwner = member.role === "owner" || member.uid === project.ownerId;
                const isCurrent = member.uid === currentUser.uid;
                const stats = getMemberTaskStats(member.uid);
                const initials = member.displayName
                  ? member.displayName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .substring(0, 2)
                      .toUpperCase()
                  : member.email[0].toUpperCase();

                const gradientClass = getAvatarGradient(member.email || member.displayName);

                return (
                  <div
                    key={member.uid}
                    className="pt-3.5 first:pt-0 group flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 p-3 rounded-2xl hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                  >
                    {/* User Identity info */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div
                          className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${gradientClass} text-white font-black text-sm flex items-center justify-center shadow-xs`}
                        >
                          {initials}
                        </div>
                        {isMemberOwner ? (
                          <div
                            className="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs ring-2 ring-white dark:ring-slate-900"
                            title={t("owner")}
                          >
                            <Crown className="w-3 h-3" />
                          </div>
                        ) : (
                          <div
                            className="absolute -bottom-1 -end-1 w-4 h-4 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"
                            title="Active Member"
                          />
                        )}
                      </div>

                      {/* Name, Email and Badge */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Display name with BiDi Isolation */}
                          <bdi
                            dir="auto"
                            className="text-sm font-extrabold text-slate-900 dark:text-white truncate"
                            style={{ unicodeBidi: "isolate" }}
                          >
                            {member.displayName}
                          </bdi>

                          {isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {language === "ar" ? "أنت" : "You"}
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              isMemberOwner
                                ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            {isMemberOwner ? (
                              <>
                                <Crown className="w-2.5 h-2.5 text-amber-500" />
                                <span>{language === "ar" ? "مالك المشروع" : "Owner"}</span>
                              </>
                            ) : (
                              <>
                                <User className="w-2.5 h-2.5 text-slate-400" />
                                <span>{language === "ar" ? "عضو بالفريق" : "Member"}</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Email with copy button */}
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            dir="ltr"
                            className="text-xs text-slate-500 dark:text-slate-400 font-mono select-all truncate"
                          >
                            {member.email}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyEmail(member.email, member.uid, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            title={t("copyEmail")}
                          >
                            {copiedUid === member.uid ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Member Task Metrics & Quick Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                      {/* Task Stats Badges */}
                      <div className="flex items-center gap-2">
                        <span
                          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                          title={t("memberTasksCount")}
                        >
                          <Kanban className="w-3 h-3 text-indigo-500" />
                          <span>{stats.total}</span>
                        </span>

                        <span
                          className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/60"
                          title={t("memberCompletedTasks")}
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span>{stats.done}</span>
                        </span>

                        {stats.overdue > 0 && (
                          <span
                            className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                            title={language === "ar" ? "مهام متأخرة" : "Overdue Tasks"}
                          >
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            <span>{stats.overdue}</span>
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        {onFilterByMember && stats.total > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              onFilterByMember(member.uid);
                              onClose();
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                            title={t("filterByMemberTasks")}
                          >
                            <Kanban className="w-3 h-3" />
                            <span className="hidden md:inline">{t("filterByMemberTasks")}</span>
                            {direction === "rtl" ? (
                              <ArrowLeft className="w-3 h-3" />
                            ) : (
                              <ArrowRight className="w-3 h-3" />
                            )}
                          </button>
                        )}

                        {/* Owner removing member button */}
                        {isOwner && !isMemberOwner && onRemoveMember && (
                          <button
                            type="button"
                            onClick={() => setMemberToRemove(member)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            title={t("removeMember")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>
              {language === "ar"
                ? `إجمالي أعضاء الفريق المسجلين: ${members.length}`
                : `Total Registered Workspace Members: ${members.length}`}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-colors cursor-pointer"
            >
              {t("close")}
            </button>
          </div>
        </div>
      </div>
      </ModalLayer>

      {/* Confirmation Modal for Removing Member */}
      {memberToRemove && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setMemberToRemove(null)}
          onConfirm={handleConfirmRemove}
          title={t("removeMember")}
          description={`${t("confirmRemoveMember")} (${memberToRemove.displayName || memberToRemove.email})`}
          confirmLabel={t("removeMember")}
          cancelLabel={t("cancel")}
          isDestructive={true}
          isLoading={isSubmittingRemove}
        />
      )}
    </>
  );
};
