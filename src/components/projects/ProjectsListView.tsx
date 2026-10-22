import React, { useState } from "react";
import { FolderKanban, Plus, Search, FolderPlus } from "lucide-react";
import { Project, Task, UserProfile } from "@/src/types";
import { useLanguage } from "@/src/context/LanguageContext";
import { ProjectCard } from "@/src/components/projects/ProjectCard";

interface ProjectsListViewProps {
  projects: Project[];
  allTasksMap: Record<string, Task[]>;
  currentUser: UserProfile;
  onOpenProject: (project: Project) => void;
  onCreateProject: () => void;
}

export const ProjectsListView: React.FC<ProjectsListViewProps> = ({
  projects,
  allTasksMap,
  currentUser,
  onOpenProject,
  onCreateProject,
}) => {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");

  const filteredProjects = projects.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & New Project CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t("projects")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {projects.length} {t("projects")}
          </p>
        </div>

        <button
          onClick={onCreateProject}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>{t("newProject")}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("projectNamePlaceholder")}
          className="w-full ps-10 pe-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all shadow-xs"
        />
        <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-3" />
      </div>

      {/* Grid */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <FolderKanban className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {t("noProjectsYet")}
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t("createFirstProject")}
          </p>
          <button
            onClick={onCreateProject}
            className="mt-6 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-600/20 inline-flex items-center gap-2 cursor-pointer transition-all"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>{t("newProject")}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              tasks={allTasksMap[project.id] || []}
              currentUser={currentUser}
              onClick={onOpenProject}
            />
          ))}
        </div>
      )}
    </div>
  );
};
