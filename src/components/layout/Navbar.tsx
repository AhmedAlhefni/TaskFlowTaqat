import React, { useState, useEffect, useRef } from "react";
import {
  Sun,
  Moon,
  Languages,
  LogOut,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeft,
  LayoutGrid,
  FolderKanban,
  CheckSquare,
  ChevronDown,
  Folder,
  Plus,
  Check,
  User,
  Shield,
} from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";
import { useLanguage } from "@/src/context/LanguageContext";
import { useTheme } from "@/src/context/ThemeContext";
import { Project } from "@/src/types";

interface NavbarProps {
  currentView: "dashboard" | "projects" | "project-detail" | "my-tasks";
  projectName?: string | null;
  projects?: Project[];
  selectedProjectId?: string | null;
  isSidebarOpen: boolean;
  onNavigate: (view: "dashboard" | "projects" | "my-tasks") => void;
  onSelectProject?: (project: Project) => void;
  onCreateTask?: () => void;
  onCreateProject?: () => void;
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  projectName,
  projects = [],
  selectedProjectId,
  isSidebarOpen,
  onNavigate,
  onSelectProject,
  onCreateTask,
  onToggleSidebar,
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const { language, toggleLanguage, t, direction } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click or Escape key
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setIsUserMenuOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(target)) {
        setIsProjectDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsUserMenuOpen(false);
        setIsProjectDropdownOpen(false);
      }
    };

    // Use standard click instead of mousedown to avoid interfering with button click handlers
    document.addEventListener("click", handleDocumentClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("click", handleDocumentClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const displayName =
    userProfile?.displayName || currentUser?.displayName || currentUser?.email?.split("@")[0] || "User";
  const userInitials = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 transition-colors duration-200 shadow-xs select-none">
      {/* Top micro-accent line */}
      <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 opacity-90" />

      <div className="px-3 sm:px-5 h-14 sm:h-16 flex items-center justify-between gap-2 relative">
        {/* Left: Sidebar Toggle + Breadcrumbs (Fully responsive with strict truncation) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 max-w-[55%] sm:max-w-[65%]">
          {currentUser && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200/90 dark:border-slate-700/80 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer transition-all duration-150 flex items-center justify-center shrink-0 shadow-2xs active:scale-95"
              title={
                isSidebarOpen
                  ? language === "ar"
                    ? "طي القائمة الجانبية"
                    : "Collapse sidebar"
                  : language === "ar"
                  ? "فتح القائمة الجانبية"
                  : "Expand sidebar"
              }
              aria-label="Toggle Sidebar"
            >
              {isSidebarOpen ? (
                <PanelLeftClose className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <PanelLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              )}
            </button>
          )}

          {/* Desktop Breadcrumb Navigation */}
          {currentUser && (
            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 min-w-0 truncate">
              <button
                type="button"
                onClick={() => onNavigate("dashboard")}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-colors cursor-pointer shrink-0 ${
                  currentView === "dashboard"
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    : "hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <LayoutGrid className="w-3.5 h-3.5" />
                </div>
                <span>{t("dashboard")}</span>
              </button>

              {currentView === "my-tasks" && (
                <>
                  {direction === "rtl" ? (
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>{t("myTasks")}</span>
                  </span>
                </>
              )}

              {currentView === "projects" && (
                <>
                  {direction === "rtl" ? (
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                    <FolderKanban className="w-3.5 h-3.5" />
                    <span>{t("projects")}</span>
                  </span>
                </>
              )}

              {currentView === "project-detail" && (
                <>
                  {direction === "rtl" ? (
                    <ChevronLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigate("projects")}
                    className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors shrink-0"
                  >
                    <span>{t("projects")}</span>
                  </button>
                  <span className="text-slate-300 dark:text-slate-700">/</span>

                  {/* Project Switcher Dropdown in Breadcrumb */}
                  <div className="relative min-w-0" ref={projectDropdownRef}>
                    <button
                      type="button"
                      onClick={() => setIsProjectDropdownOpen((prev) => !prev)}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-200/80 dark:border-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold max-w-[150px] md:max-w-[200px] lg:max-w-xs truncate hover:border-indigo-400 transition-all cursor-pointer shadow-2xs"
                      title={projectName || ""}
                    >
                      <Folder className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span className="truncate">{projectName || t("selectProject")}</span>
                      <ChevronDown
                        className={`w-3 h-3 shrink-0 text-indigo-500 transition-transform duration-200 ${
                          isProjectDropdownOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isProjectDropdownOpen && projects.length > 0 && (
                      <div
                        className={`absolute top-full mt-1.5 w-60 sm:w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in duration-150 ${
                          direction === "rtl" ? "right-0" : "left-0"
                        }`}
                      >
                        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {t("switchProject")}
                        </div>
                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                          {projects.map((p) => {
                            const isSelected = p.id === selectedProjectId;
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  onSelectProject?.(p);
                                  setIsProjectDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 text-start text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                                  isSelected
                                    ? "text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 font-bold"
                                    : "text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                <span className="truncate">{p.name}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </nav>
          )}

          {/* Mobile Current View Context Tag */}
          {currentUser && (
            <div className="sm:hidden flex items-center gap-1.5 min-w-0 truncate">
              {currentView === "dashboard" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                  <div className="w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <LayoutGrid className="w-3 h-3" />
                  </div>
                  <span className="truncate">{t("dashboard")}</span>
                </span>
              )}
              {currentView === "my-tasks" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">
                  <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t("myTasks")}</span>
                </span>
              )}
              {currentView === "projects" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate">
                  <FolderKanban className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{t("projects")}</span>
                </span>
              )}
              {currentView === "project-detail" && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white max-w-[120px] truncate">
                  <Folder className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span className="truncate">{projectName || t("selectProject")}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Quick Action, Language, Theme, User Account */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Quick Task Creation (+ Task) */}
          {currentUser && onCreateTask && (
            <>
              {/* Desktop button with icon + label */}
              <button
                type="button"
                onClick={onCreateTask}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-indigo-600/25 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>{t("createTask")}</span>
              </button>

              {/* Mobile compact icon button */}
              <button
                type="button"
                onClick={onCreateTask}
                className="md:hidden w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-xs transition-all cursor-pointer flex items-center justify-center shrink-0"
                title={t("createTask")}
                aria-label="Create Task"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </button>
            </>
          )}

          {/* Language Switcher Capsule */}
          <button
            type="button"
            onClick={toggleLanguage}
            title={language === "ar" ? "Switch to English" : "التحويل إلى العربية"}
            className="flex items-center justify-center gap-1 h-8 sm:h-9 px-2 sm:px-2.5 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors cursor-pointer shadow-2xs shrink-0"
          >
            <Languages className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="font-bold text-[11px]">{language === "ar" ? "EN" : "عربي"}</span>
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === "dark" ? t("lightMode") : t("darkMode")}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors cursor-pointer shadow-2xs flex items-center justify-center shrink-0"
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 transition-transform hover:-rotate-12" />
            )}
          </button>

          {/* User Profile Pill & Dropdown (Fixed & fully responsive) */}
          {currentUser && (
            <div className="relative ps-0.5 shrink-0" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((prev) => !prev)}
                className={`flex items-center gap-2 p-1 sm:pe-2.5 rounded-full sm:rounded-2xl border transition-all cursor-pointer shadow-2xs ${
                  isUserMenuOpen
                    ? "border-indigo-500 ring-2 ring-indigo-500/25 bg-indigo-50/80 dark:bg-indigo-950/50"
                    : "border-slate-200/90 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700/80"
                }`}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
                aria-label="User Account Menu"
              >
                <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-indigo-500/20 overflow-hidden shrink-0 shadow-xs">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{userInitials}</span>
                  )}
                  {/* Online status indicator */}
                  <span className="absolute bottom-0 end-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <div className="hidden lg:flex flex-col text-start max-w-[100px]">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate">
                    {currentUser.email}
                  </span>
                </div>
                <ChevronDown
                  className={`hidden sm:block w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                    isUserMenuOpen ? "rotate-180 text-indigo-600 dark:text-indigo-400" : "text-slate-400"
                  }`}
                />
              </button>

              {/* User Dropdown Menu */}
              {isUserMenuOpen && (
                <div
                  className={`absolute top-full mt-2 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    direction === "rtl" ? "left-0" : "right-0"
                  }`}
                >
                  {/* User Summary Header */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl mb-1.5 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {userInitials}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {displayName}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate">
                          {currentUser.email}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{t("online")}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {t("activeWorkspace")}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-0.5 py-1">
                    <button
                      type="button"
                      onClick={() => {
                        onNavigate("dashboard");
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-start"
                    >
                      <LayoutGrid className="w-4 h-4 text-indigo-500" />
                      <span>{t("dashboard")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate("projects");
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-start"
                    >
                      <FolderKanban className="w-4 h-4 text-indigo-500" />
                      <span>{t("projects")}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onNavigate("my-tasks");
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-start"
                    >
                      <CheckSquare className="w-4 h-4 text-indigo-500" />
                      <span>{t("myTasks")}</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer text-start"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t("logout")}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
