import { useEffect, useState } from "react";
import { ArrowRight, ChevronUp, Clock, AlertTriangle, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";
import { useProfile } from "../hooks/useAuth";

export default function TasksSummary() {
    const navigate = useNavigate();
    const { currentWorkspace, isLoading } = useActiveWorkspace();
    const { data: userProfile } = useProfile();
    const user = userProfile || { id: "" };
    const [tasks, setTasks] = useState([]);
    const [expandedCards, setExpandedCards] = useState({});

    // Get all tasks for all projects in current workspace
    useEffect(() => {
        if (currentWorkspace) {
            setTasks(currentWorkspace.projects?.flatMap((project) => project.tasks || []) || []);
        }
    }, [currentWorkspace]);

    const myTasks = tasks.filter(i => i.assigneeId === user.id && i.status !== 'DONE');
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'DONE');
    const inProgressIssues = tasks.filter(i => i.status === 'IN_PROGRESS');

    const toggleExpand = (title) => {
        setExpandedCards(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    const handleTaskClick = (issue) => {
        const projectId = issue.projectId;
        navigate(`/taskDetails?taskId=${issue.id}${projectId ? `&projectId=${projectId}` : ''}`);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map((n) => (
                    <div key={n} className="h-44 animate-pulse bg-slate-100 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800" />
                ))}
            </div>
        );
    }

    const summaryCards = [
        {
            title: "My Tasks",
            count: myTasks.length,
            icon: User,
            color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
            allItems: myTasks
        },
        {
            title: "Overdue",
            count: overdueTasks.length,
            icon: AlertTriangle,
            color: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-400",
            allItems: overdueTasks
        },
        {
            title: "In Progress",
            count: inProgressIssues.length,
            icon: Clock,
            color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400",
            allItems: inProgressIssues
        }
    ];

    return (
        <div className="space-y-6">
            {summaryCards.map((card) => {
                const isExpanded = !!expandedCards[card.title];
                const displayedItems = isExpanded ? card.allItems : card.allItems.slice(0, 3);

                return (
                    <div key={card.title} className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 rounded-lg overflow-hidden">
                        <div className="border-b border-zinc-200 dark:border-zinc-800 p-4 pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                                    <card.icon className="w-4 h-4 text-gray-500 dark:text-zinc-400" />
                                </div>
                                <div className="flex items-center justify-between flex-1">
                                    <h3 className="text-sm font-medium text-gray-800 dark:text-white">{card.title}</h3>
                                    <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-semibold ${card.color}`}>
                                        {card.count}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4">
                            {card.allItems.length === 0 ? (
                                <p className="text-sm text-gray-500 dark:text-zinc-400 text-center py-4">
                                    No {card.title.toLowerCase()}
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {displayedItems.map((issue) => (
                                        <div
                                            key={issue.id}
                                            onClick={() => handleTaskClick(issue)}
                                            className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer select-none"
                                            title="Click to view task details"
                                        >
                                            <h4 className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                                {issue.title}
                                            </h4>
                                            <p className="text-xs text-gray-600 dark:text-zinc-400 capitalize mt-1">
                                                {issue.type} • {issue.priority} Priority
                                            </p>
                                        </div>
                                    ))}
                                    {card.count > 3 && (
                                        <button
                                            type="button"
                                            onClick={() => toggleExpand(card.title)}
                                            className="flex items-center justify-center w-full py-2 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors cursor-pointer mt-1"
                                        >
                                            {isExpanded ? (
                                                <span className="flex items-center gap-1">
                                                    Show less <ChevronUp className="w-3.5 h-3.5" />
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1">
                                                    View {card.count - 3} more <ArrowRight className="w-3.5 h-3.5" />
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
