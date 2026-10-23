import React, { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { 
    Bug, 
    CalendarIcon, 
    GitCommit, 
    MessageSquare, 
    Square, 
    Zap, 
    GripVertical, 
    Plus,
    XIcon,
    UserCircle2
} from "lucide-react";
import { useUpdateTaskMutation } from "../hooks/useTasks";

const typeIcons = {
    BUG: { icon: Bug, color: "text-red-600 dark:text-red-400" },
    FEATURE: { icon: Zap, color: "text-blue-600 dark:text-blue-400" },
    TASK: { icon: Square, color: "text-green-600 dark:text-green-400" },
    IMPROVEMENT: { icon: GitCommit, color: "text-purple-600 dark:text-purple-400" },
    OTHER: { icon: MessageSquare, color: "text-amber-600 dark:text-amber-400" },
};

const priorityStyles = {
    HIGH: "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50",
    MEDIUM: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50",
    LOW: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50",
};

const COLUMNS = [
    {
        id: "TODO",
        title: "To Do",
        dotColor: "bg-gray-400 dark:bg-zinc-650",
        badgeColor: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    },
    {
        id: "IN_PROGRESS",
        title: "In Progress",
        dotColor: "bg-yellow-500",
        badgeColor: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
    },
    {
        id: "DONE",
        title: "Done",
        dotColor: "bg-green-500",
        badgeColor: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
    },
];

export default function ProjectKanbanBoard({ tasks = [], projectId, onNewTask }) {
    const navigate = useNavigate();
    const updateTaskMutation = useUpdateTaskMutation(projectId);

    // Instant local optimistic state (0ms latency on drag & drop)
    const [taskList, setTaskList] = useState(tasks);
    const [draggingTaskId, setDraggingTaskId] = useState(null);
    const [dragOverColumn, setDragOverColumn] = useState(null);

    // Sync with React Query cache / server updates
    useEffect(() => {
        setTaskList(tasks);
    }, [tasks]);

    // Filters
    const [filters, setFilters] = useState({
        type: "",
        priority: "",
        assignee: "",
    });

    const assigneeList = useMemo(
        () => Array.from(new Set(taskList.map((t) => t.assignee?.name).filter(Boolean))),
        [taskList]
    );

    const filteredTasks = useMemo(() => {
        return taskList.filter((task) => {
            const { type, priority, assignee } = filters;
            return (
                (!type || task.type === type) &&
                (!priority || task.priority === priority) &&
                (!assignee || task.assignee?.name === assignee)
            );
        });
    }, [filters, taskList]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    // Drag handlers
    const handleDragStart = (e, task) => {
        setDraggingTaskId(task.id);
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e, columnId) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (dragOverColumn !== columnId) {
            setDragOverColumn(columnId);
        }
    };

    const handleDragLeave = (e, columnId) => {
        e.preventDefault();
        if (dragOverColumn === columnId) {
            setDragOverColumn(null);
        }
    };

    const handleDrop = (e, targetStatus) => {
        e.preventDefault();
        setDragOverColumn(null);

        const taskId = draggingTaskId || e.dataTransfer.getData("text/plain");
        if (!taskId) return;

        const currentTask = taskList.find((t) => t.id === taskId);
        if (!currentTask || currentTask.status === targetStatus) {
            setDraggingTaskId(null);
            return;
        }

        const columnTitle = COLUMNS.find((c) => c.id === targetStatus)?.title || targetStatus;

        // 1. INSTANT OPTIMISTIC UI UPDATE (0ms)
        const previousList = [...taskList];
        setTaskList((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
        );
        setDraggingTaskId(null);

        // 2. BACKGROUND MUTATION
        updateTaskMutation.mutate(
            { taskId, status: targetStatus },
            {
                onSuccess: () => {
                    toast.success(`Moved to "${columnTitle}"`, { duration: 1500 });
                },
                onError: (error) => {
                    // Revert instantly on network error
                    setTaskList(previousList);
                    toast.error(error?.response?.data?.error?.message || "Failed to update task status");
                },
            }
        );
    };

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    {["type", "priority", "assignee"].map((name) => {
                        const options = {
                            type: [
                                { label: "All Types", value: "" },
                                { label: "Task", value: "TASK" },
                                { label: "Bug", value: "BUG" },
                                { label: "Feature", value: "FEATURE" },
                                { label: "Improvement", value: "IMPROVEMENT" },
                                { label: "Other", value: "OTHER" },
                            ],
                            priority: [
                                { label: "All Priorities", value: "" },
                                { label: "High", value: "HIGH" },
                                { label: "Medium", value: "MEDIUM" },
                                { label: "Low", value: "LOW" },
                            ],
                            assignee: [
                                { label: "All Assignees", value: "" },
                                ...assigneeList.map((n) => ({ label: n, value: n })),
                            ],
                        };
                        return (
                            <select
                                key={name}
                                name={name}
                                value={filters[name]}
                                onChange={handleFilterChange}
                                className="border border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/60 outline-none px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm transition"
                            >
                                {options[name].map((opt, idx) => (
                                    <option key={idx} value={opt.value} className="bg-white dark:bg-zinc-900">
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        );
                    })}

                    {(filters.type || filters.priority || filters.assignee) && (
                        <button
                            type="button"
                            onClick={() => setFilters({ type: "", priority: "", assignee: "" })}
                            className="px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-xs font-medium transition cursor-pointer"
                        >
                            <XIcon className="size-3" /> Reset
                        </button>
                    )}
                </div>

                <div className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium flex items-center gap-1.5">
                    <GripVertical className="size-3.5" />
                    Drag cards between columns to change status
                </div>
            </div>

            {/* Kanban Columns Grid - Styled exactly like Landing Page Showcase */}
            <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/30 backdrop-blur-sm p-4 sm:p-6 shadow-sm">
                {/* Mock UI Title Bar */}
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800/80 pb-4 mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></div>
                            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                        </div>
                        <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono tracking-tight">
                            project://kanban-board
                        </span>
                    </div>

                    <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                        Showing <strong className="text-zinc-900 dark:text-white">{filteredTasks.length}</strong> tasks
                    </span>
                </div>

                {/* The 3 Columns */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    {COLUMNS.map((col) => {
                        const columnTasks = filteredTasks.filter((t) => t.status === col.id);
                        const isOver = dragOverColumn === col.id;

                        return (
                            <div
                                key={col.id}
                                onDragOver={(e) => handleDragOver(e, col.id)}
                                onDragLeave={(e) => handleDragLeave(e, col.id)}
                                onDrop={(e) => handleDrop(e, col.id)}
                                className={`rounded-xl transition-all duration-200 min-h-[420px] flex flex-col p-3 ${
                                    isOver
                                        ? "bg-blue-50/50 dark:bg-blue-950/20 border-2 border-dashed border-blue-500/80 shadow-md"
                                        : "bg-zinc-100/50 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-850/80"
                                }`}
                            >
                                {/* Column Header */}
                                <div className="flex items-center justify-between pb-3 px-1 border-b border-zinc-200/60 dark:border-zinc-800/60 mb-3">
                                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                        <span className={`w-2 h-2 rounded-full ${col.dotColor}`}></span>
                                        <span>{col.title}</span>
                                        <span className="ml-1 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                                            ({columnTasks.length})
                                        </span>
                                    </div>

                                    {onNewTask && (
                                        <button
                                            onClick={onNewTask}
                                            title={`Add task to ${col.title}`}
                                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition"
                                        >
                                            <Plus className="size-3.5" />
                                        </button>
                                    )}
                                </div>

                                {/* Task Cards Container */}
                                <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-0.5">
                                    {columnTasks.length > 0 ? (
                                        columnTasks.map((task) => {
                                            const { icon: TypeIcon, color: typeColor } = typeIcons[task.type] || typeIcons.TASK;
                                            const priorityClass = priorityStyles[task.priority] || priorityStyles.MEDIUM;
                                            const isDone = task.status === "DONE";
                                            const isBeingDragged = draggingTaskId === task.id;

                                            return (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, task)}
                                                    onClick={() => navigate(`/taskDetails?projectId=${task.projectId}&taskId=${task.id}`)}
                                                    className={`group relative bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl space-y-2.5 transition-all duration-200 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 ${
                                                        isDone ? "opacity-75 hover:opacity-100" : ""
                                                    } ${isBeingDragged ? "opacity-40 scale-95 border-dashed border-blue-500" : ""}`}
                                                >
                                                    {/* Top row: Priority & Type badges */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase tracking-wider ${priorityClass}`}>
                                                            {task.priority}
                                                        </span>

                                                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                                            <TypeIcon className={`size-3 ${typeColor}`} />
                                                            <span className="capitalize">{task.type.toLowerCase()}</span>
                                                        </div>
                                                    </div>

                                                    {/* Task Title */}
                                                    <h4 className={`text-xs font-semibold text-zinc-900 dark:text-white leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition ${
                                                        isDone ? "line-through text-zinc-500 dark:text-zinc-400" : ""
                                                    }`}>
                                                        {task.title}
                                                    </h4>

                                                    {/* Task Description (if any) */}
                                                    {task.description && (
                                                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium line-clamp-2 leading-relaxed">
                                                            {task.description}
                                                        </p>
                                                    )}

                                                    {/* Card Footer: Assignee & Due Date */}
                                                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                                                        {/* Assignee */}
                                                        <div className="flex items-center gap-1.5 truncate max-w-[130px]">
                                                            {task.assignee ? (
                                                                <>
                                                                    {task.assignee.image ? (
                                                                        <img
                                                                            src={task.assignee.image}
                                                                            alt={task.assignee.name}
                                                                            className="size-4 rounded-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="size-4 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 text-[9px] font-bold flex items-center justify-center">
                                                                            {task.assignee.name?.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <span className="truncate text-zinc-600 dark:text-zinc-300 font-medium">
                                                                        {task.assignee.name}
                                                                    </span>
                                                                </>
                                                            ) : (
                                                                <span className="flex items-center gap-1 text-zinc-400 italic">
                                                                    <UserCircle2 className="size-3.5" /> Unassigned
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Due Date */}
                                                        {task.due_date && (
                                                            <div className="flex items-center gap-1 font-medium">
                                                                <CalendarIcon className="size-3" />
                                                                <span>{format(new Date(task.due_date), "MMM d")}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="h-44 border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-lg flex flex-col items-center justify-center text-center p-4 text-xs text-zinc-400 dark:text-zinc-500 space-y-1">
                                            <p className="font-medium">No tasks</p>
                                            <p className="text-[10px]">Drop tasks here</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
