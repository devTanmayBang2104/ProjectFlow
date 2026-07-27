import { useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { ChevronRightIcon, SettingsIcon, KanbanIcon, ChartColumnIcon, CalendarIcon, ArrowRightIcon } from 'lucide-react';
import { useProjectsQuery } from '../hooks/useProjects';
import { useSelector } from 'react-redux';

const ProjectSidebar = () => {

    const location = useLocation();

    const [expandedProjects, setExpandedProjects] = useState(new Set());
    const [searchParams] = useSearchParams();

    const activeWorkspaceId = useSelector((state) => state.ui.activeWorkspaceId);
    const { data: projects = [] } = useProjectsQuery(activeWorkspaceId);

    const getProjectSubItems = (projectId) => [
        { title: 'Tasks', icon: KanbanIcon, url: `/projectsDetail?id=${projectId}&tab=tasks` },
        { title: 'Analytics', icon: ChartColumnIcon, url: `/projectsDetail?id=${projectId}&tab=analytics` },
        { title: 'Calendar', icon: CalendarIcon, url: `/projectsDetail?id=${projectId}&tab=calendar` },
        { title: 'Settings', icon: SettingsIcon, url: `/projectsDetail?id=${projectId}&tab=settings` }
    ];

    const toggleProject = (id) => {
        const newSet = new Set(expandedProjects);
        newSet.has(id) ? newSet.delete(id) : newSet.add(id);
        setExpandedProjects(newSet);
    };

    return (
        <div className="mt-6 px-3">
            <div className="flex items-center justify-between px-3 py-2">
                <h3 className="text-xs font-medium text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                    Projects
                </h3>
                <Link to="/projects">
                    <button className="size-5 text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 rounded flex items-center justify-center transition-colors duration-200">
                        <ArrowRightIcon className="size-3" />
                    </button>
                </Link>
            </div>

            <div className="space-y-1 px-3">
                {projects.map((project) => (
                    <div key={project.id}>
                        <button onClick={() => toggleProject(project.id)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors duration-200 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 hover:text-zinc-900 dark:hover:text-white" >
                            <ChevronRightIcon className={`size-3 text-zinc-500 dark:text-zinc-400 transition-transform duration-200 ${expandedProjects.has(project.id) && 'rotate-90'}`} />
                            <div className="size-2 rounded-full bg-blue-500 shadow-sm shadow-blue-500/20" />
                            <span className="truncate max-w-40 text-sm font-medium">{project.name}</span>
                        </button>

                        {expandedProjects.has(project.id) && (
                            <div className="ml-5 mt-1 space-y-1">
                                {getProjectSubItems(project.id).map((subItem) => {
                                    // checking if the current path matches the sub-item's URL
                                    const isActive =
                                        location.pathname === `/projectsDetail` &&
                                        searchParams.get('id') === project.id &&
                                        searchParams.get('tab') === subItem.title.toLowerCase();

                                    return (
                                        <Link key={subItem.title} to={subItem.url} className={`flex items-center gap-3 px-3 py-1.5 rounded-lg transition-colors duration-200 text-xs font-medium ${isActive ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-l border-blue-500/50 pl-2.5' : 'text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-900/30'}`} >
                                            <subItem.icon className="size-3" />
                                            {subItem.title}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ProjectSidebar;