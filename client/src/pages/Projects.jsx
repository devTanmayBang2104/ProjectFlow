import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Plus, Search, FolderOpen } from "lucide-react";
import ProjectCard from "../components/ProjectCard";
import CreateProjectDialog from "../components/CreateProjectDialog";

import { useProjectsQuery } from "../hooks/useProjects";
import { Loader2Icon } from "lucide-react";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";

export default function Projects() {
    const activeWorkspaceId = useSelector((state) => state.ui.activeWorkspaceId);
    const { data: projects = [], isLoading } = useProjectsQuery(activeWorkspaceId);
    const { isAdminOrOwner } = useActiveWorkspace();

    const [filteredProjects, setFilteredProjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: "ALL",
        priority: "ALL",
    });

    const filterProjects = () => {
        let filtered = projects;

        if (searchTerm) {
            filtered = filtered.filter(
                (project) =>
                    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    project.description?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filters.status !== "ALL") {
            filtered = filtered.filter((project) => project.status === filters.status);
        }

        if (filters.priority !== "ALL") {
            filtered = filtered.filter(
                (project) => project.priority === filters.priority
            );
        }

        setFilteredProjects(filtered);
    };

    useEffect(() => {
        filterProjects();
    }, [projects, searchTerm, filters]);

    if (isLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2Icon className="size-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1"> Projects </h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm"> Manage and track your projects </p>
                </div>
                {isAdminOrOwner && (
                    <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white transition duration-200 shadow-md shadow-blue-500/10 cursor-pointer" >
                        <Plus className="size-4 mr-2" /> New Project
                    </button>
                )}
                <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-zinc-400 w-4 h-4" />
                    <input onChange={(e) => setSearchTerm(e.target.value)} value={searchTerm} className="w-full pl-10 text-sm pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white placeholder-zinc-450 dark:placeholder-zinc-500 focus:border-blue-500 outline-none transition duration-200" placeholder="Search projects..." />
                </div>
                <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition duration-200" >
                    <option value="ALL" className="bg-white dark:bg-zinc-900">All Status</option>
                    <option value="ACTIVE" className="bg-white dark:bg-zinc-900">Active</option>
                    <option value="PLANNING" className="bg-white dark:bg-zinc-900">Planning</option>
                    <option value="COMPLETED" className="bg-white dark:bg-zinc-900">Completed</option>
                    <option value="ON_HOLD" className="bg-white dark:bg-zinc-900">On Hold</option>
                    <option value="CANCELLED" className="bg-white dark:bg-zinc-900">Cancelled</option>
                </select>
                <select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })} className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50 text-zinc-900 dark:text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 cursor-pointer transition duration-200" >
                    <option value="ALL" className="bg-white dark:bg-zinc-900">All Priority</option>
                    <option value="HIGH" className="bg-white dark:bg-zinc-900">High</option>
                    <option value="MEDIUM" className="bg-white dark:bg-zinc-900">Medium</option>
                    <option value="LOW" className="bg-white dark:bg-zinc-900">Low</option>
                </select>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <FolderOpen className="w-12 h-12 text-zinc-400 dark:text-zinc-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-1">
                            No projects found
                        </h3>
                        <p className="text-zinc-550 dark:text-zinc-400 mb-6 text-sm font-medium">
                            Create your first project to get started
                        </p>
                        <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded font-semibold mx-auto text-sm shadow-md shadow-blue-500/10 cursor-pointer transition duration-200" >
                            <Plus className="size-4" />
                            Create Project
                        </button>
                    </div>
                ) : (
                    filteredProjects.map((project) => (
                        <ProjectCard key={project.id} project={project} />
                    ))
                )}
            </div>
        </div>
    );
}
