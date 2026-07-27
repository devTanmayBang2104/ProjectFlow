import React, { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import toast from "react-hot-toast";
import { useProfile } from "../hooks/useAuth";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";
import { useProjectDetailsQuery } from "../hooks/useProjects";
import { useUpdateTaskMutation } from "../hooks/useTasks";
import {
    useProjectSprintsQuery,
    useCreateSprintMutation,
    useUpdateSprintMutation,
    useDeleteSprintMutation
} from "../hooks/useSprints";
import {
    Plus,
    Calendar,
    Edit2,
    Trash2,
    Loader2,
    ChevronDown,
    ChevronUp,
    Zap,
    CheckCircle2,
    FolderOpen,
    ArrowRight,
    Play,
    AlertCircle,
    X
} from "lucide-react";

const sprintStatusColors = {
    PLANNED: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50",
    ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50",
    COMPLETED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50",
};

const taskTypeColors = {
    BUG: "text-red-600 dark:text-red-400",
    FEATURE: "text-blue-600 dark:text-blue-400",
    TASK: "text-green-600 dark:text-green-400",
    IMPROVEMENT: "text-purple-600 dark:text-purple-400",
    OTHER: "text-amber-600 dark:text-amber-400",
};

export default function ProjectSprints({ projectId }) {
    const { data: currentUser } = useProfile();
    const { isAdminOrOwner } = useActiveWorkspace();
    const { data: project, isLoading: isProjectLoading } = useProjectDetailsQuery(projectId);
    const { data: sprints = [], isLoading: isSprintsLoading } = useProjectSprintsQuery(projectId);

    const createSprintMutation = useCreateSprintMutation(projectId);
    const updateSprintMutation = useUpdateSprintMutation();
    const deleteSprintMutation = useDeleteSprintMutation(projectId);
    const updateTaskMutation = useUpdateTaskMutation(projectId);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingSprint, setEditingSprint] = useState(null);
    const [expandedSprints, setExpandedSprints] = useState({});

    // Form states
    const [sprintForm, setSprintForm] = useState({
        name: "",
        startDate: "",
        endDate: "",
        status: "PLANNED"
    });

    const isTeamLead = project?.team_lead === currentUser?.id;
    const canManageSprints = isAdminOrOwner || isTeamLead;

    // Filter tasks
    const allTasks = project?.tasks || [];
    
    // Group tasks by sprintId
    const sprintTasksMap = useMemo(() => {
        const map = {};
        sprints.forEach(s => { map[s.id] = []; });
        allTasks.forEach(task => {
            if (task.sprintId && map[task.sprintId]) {
                map[task.sprintId].push(task);
            }
        });
        return map;
    }, [sprints, allTasks]);

    // Backlog tasks (no sprintId or sprintId not found in active sprints)
    const backlogTasks = useMemo(() => {
        return allTasks.filter(task => !task.sprintId || !sprints.some(s => s.id === task.sprintId));
    }, [allTasks, sprints]);

    const toggleExpand = (sprintId) => {
        setExpandedSprints(prev => ({ ...prev, [sprintId]: !prev[sprintId] }));
    };

    const handleCreateSprint = async (e) => {
        e.preventDefault();
        if (!sprintForm.name.trim()) {
            toast.error("Sprint name is required");
            return;
        }
        try {
            toast.loading("Creating sprint...");
            await createSprintMutation.mutateAsync({
                name: sprintForm.name,
                startDate: sprintForm.startDate ? new Date(sprintForm.startDate).toISOString() : undefined,
                endDate: sprintForm.endDate ? new Date(sprintForm.endDate).toISOString() : undefined,
                status: sprintForm.status
            });
            toast.dismissAll();
            toast.success("Sprint created successfully!");
            setIsCreateOpen(false);
            setSprintForm({ name: "", startDate: "", endDate: "", status: "PLANNED" });
        } catch (err) {
            toast.dismissAll();
            toast.error(err.response?.data?.error?.message || "Failed to create sprint");
        }
    };

    const handleUpdateSprint = async (e) => {
        e.preventDefault();
        if (!sprintForm.name.trim()) {
            toast.error("Sprint name is required");
            return;
        }
        try {
            toast.loading("Updating sprint...");
            await updateSprintMutation.mutate({
                sprintId: editingSprint.id,
                projectId,
                ...sprintForm,
                startDate: sprintForm.startDate ? new Date(sprintForm.startDate).toISOString() : null,
                endDate: sprintForm.endDate ? new Date(sprintForm.endDate).toISOString() : null,
            });
            toast.dismissAll();
            toast.success("Sprint updated successfully!");
            setEditingSprint(null);
        } catch (err) {
            toast.dismissAll();
            toast.error(err.response?.data?.error?.message || "Failed to update sprint");
        }
    };

    const handleDeleteSprint = async (sprintId) => {
        if (!window.confirm("Are you sure you want to delete this sprint? Tasks will be moved back to the backlog.")) {
            return;
        }
        try {
            toast.loading("Deleting sprint...");
            await deleteSprintMutation.mutateAsync(sprintId);
            toast.dismissAll();
            toast.success("Sprint deleted.");
        } catch (err) {
            toast.dismissAll();
            toast.error(err.response?.data?.error?.message || "Failed to delete sprint");
        }
    };

    const handleMoveTask = async (taskId, targetSprintId) => {
        try {
            toast.loading("Updating task...");
            await updateTaskMutation.mutateAsync({
                taskId,
                sprintId: targetSprintId || null
            });
            toast.dismissAll();
            toast.success(targetSprintId ? "Task added to sprint." : "Task moved to backlog.");
        } catch (err) {
            toast.dismissAll();
            toast.error(err.response?.data?.error?.message || "Failed to move task");
        }
    };

    const openEditModal = (sprint) => {
        setEditingSprint(sprint);
        setSprintForm({
            name: sprint.name,
            startDate: sprint.startDate ? format(parseISO(sprint.startDate), "yyyy-MM-dd") : "",
            endDate: sprint.endDate ? format(parseISO(sprint.endDate), "yyyy-MM-dd") : "",
            status: sprint.status
        });
    };

    const openCreateModal = () => {
        setIsCreateOpen(true);
        setSprintForm({ name: "", startDate: "", endDate: "", status: "PLANNED" });
    };

    if (isProjectLoading || isSprintsLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="size-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 text-gray-900 dark:text-zinc-100">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold">Agile Sprints</h2>
                    <p className="text-sm text-gray-500 dark:text-zinc-400">Plan and track your sprints, goals, and backlogs</p>
                </div>
                {canManageSprints && (
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 px-4 py-2 text-sm rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white font-medium hover:opacity-90 transition cursor-pointer"
                    >
                        <Plus className="size-4" /> Create Sprint
                    </button>
                )}
            </div>

            {/* Sprints List */}
            <div className="space-y-4">
                {sprints.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                        <Zap className="size-10 mx-auto text-zinc-400 dark:text-zinc-600 mb-2" />
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium">No sprints created yet</p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">Create a sprint to start planning your workflow cycles.</p>
                    </div>
                ) : (
                    sprints.map((sprint) => {
                        const isExpanded = expandedSprints[sprint.id] !== false; // Default expanded
                        const tasks = sprintTasksMap[sprint.id] || [];
                        const completedCount = tasks.filter(t => t.status === "DONE").length;

                        return (
                            <div
                                key={sprint.id}
                                className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden transition-all shadow-sm"
                            >
                                {/* Sprint Header */}
                                <div className="p-4 flex items-center justify-between flex-wrap gap-4 bg-zinc-50/50 dark:bg-zinc-900/30 border-b border-zinc-100 dark:border-zinc-800/60">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => toggleExpand(sprint.id)}
                                            className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400"
                                        >
                                            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                        </button>
                                        <div>
                                            <h3 className="font-semibold flex items-center gap-2">
                                                {sprint.name}
                                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${sprintStatusColors[sprint.status]}`}>
                                                    {sprint.status}
                                                </span>
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                <Calendar className="size-3.5" />
                                                {sprint.startDate && sprint.endDate ? (
                                                    <span>
                                                        {format(parseISO(sprint.startDate), "MMM dd")} - {format(parseISO(sprint.endDate), "MMM dd, yyyy")}
                                                    </span>
                                                ) : (
                                                    <span>No dates set</span>
                                                )}
                                                <span className="mx-1">•</span>
                                                <span>{completedCount}/{tasks.length} Completed</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {canManageSprints && (
                                            <>
                                                <button
                                                    onClick={() => openEditModal(sprint)}
                                                    className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-600 dark:text-zinc-300"
                                                    title="Edit Sprint"
                                                >
                                                    <Edit2 className="size-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteSprint(sprint.id)}
                                                    className="p-1.5 rounded border border-zinc-200 dark:border-zinc-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600"
                                                    title="Delete Sprint"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Tasks List */}
                                {isExpanded && (
                                    <div className="p-4 space-y-3">
                                        {tasks.length === 0 ? (
                                            <div className="py-6 text-center text-zinc-400 dark:text-zinc-500 text-sm">
                                                No tasks in this sprint. Drag tasks here or use "Assign Task" dropdown.
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden">
                                                {tasks.map((task) => (
                                                    <div
                                                        key={task.id}
                                                        className="flex items-center justify-between p-3 bg-white dark:bg-zinc-950 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition text-sm"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {task.status === "DONE" ? (
                                                                <CheckCircle2 className="size-4.5 text-emerald-500" />
                                                            ) : (
                                                                <Play className="size-4.5 text-blue-500" />
                                                            )}
                                                            <div>
                                                                <p className="font-medium text-zinc-800 dark:text-zinc-200">{task.title}</p>
                                                                <span className={`text-xs uppercase font-medium ${taskTypeColors[task.type]}`}>
                                                                    {task.type}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400">
                                                                {task.status.replace("_", " ")}
                                                            </span>
                                                            {canManageSprints && (
                                                                <button
                                                                    onClick={() => handleMoveTask(task.id, null)}
                                                                    className="text-xs text-red-500 hover:underline"
                                                                >
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Assign Task Selector */}
                                        {canManageSprints && backlogTasks.length > 0 && (
                                            <div className="flex items-center gap-2 pt-2">
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400">Add Backlog Task:</span>
                                                <select
                                                    onChange={(e) => {
                                                        if (e.target.value) {
                                                            handleMoveTask(e.target.value, sprint.id);
                                                            e.target.value = "";
                                                        }
                                                    }}
                                                    className="text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1 rounded max-w-xs outline-none"
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Select task...</option>
                                                    {backlogTasks.map(t => (
                                                        <option key={t.id} value={t.id}>{t.title} ({t.type})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Backlog Section */}
            <div className="bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                    <FolderOpen className="size-5 text-zinc-500" />
                    <h3 className="font-semibold text-lg">Project Backlog</h3>
                    <span className="text-xs px-2 py-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full font-medium">
                        {backlogTasks.length} Tasks
                    </span>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">Tasks that are not assigned to any sprint cycle.</p>

                {backlogTasks.length === 0 ? (
                    <p className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-6">All tasks have been assigned to sprints!</p>
                ) : (
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg overflow-hidden">
                        {backlogTasks.map((task) => (
                            <div
                                key={task.id}
                                className="flex items-center justify-between p-3.5 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition text-sm"
                            >
                                <div>
                                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{task.title}</p>
                                    <div className="flex items-center gap-2 mt-1 text-xs">
                                        <span className={`uppercase font-medium ${taskTypeColors[task.type]}`}>
                                            {task.type}
                                        </span>
                                        <span className="text-zinc-400">•</span>
                                        <span className="text-zinc-500 dark:text-zinc-500">Status: {task.status}</span>
                                    </div>
                                </div>

                                <div>
                                    {canManageSprints && sprints.length > 0 ? (
                                        <select
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleMoveTask(task.id, e.target.value);
                                                }
                                            }}
                                            className="text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 py-1 rounded outline-none cursor-pointer"
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Move to Sprint...</option>
                                            {sprints.map(s => (
                                                <option key={s.id} value={s.id}>{s.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <span className="text-xs text-zinc-400 dark:text-zinc-600">Create Sprints first</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialog / Modals */}
            {(isCreateOpen || editingSprint) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/50">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                                {isCreateOpen ? "Create New Sprint" : "Edit Sprint Settings"}
                            </h3>
                            <button
                                onClick={() => {
                                    setIsCreateOpen(false);
                                    setEditingSprint(null);
                                }}
                                className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={isCreateOpen ? handleCreateSprint : handleUpdateSprint} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                                    Sprint Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={sprintForm.name}
                                    onChange={(e) => setSprintForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Sprint 1, S2 - Core Features"
                                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 text-sm focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        value={sprintForm.startDate}
                                        onChange={(e) => setSprintForm(prev => ({ ...prev, startDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 text-sm outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        value={sprintForm.endDate}
                                        onChange={(e) => setSprintForm(prev => ({ ...prev, endDate: e.target.value }))}
                                        className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400 mb-1">
                                    Sprint Status
                                </label>
                                <select
                                    value={sprintForm.status}
                                    onChange={(e) => setSprintForm(prev => ({ ...prev, status: e.target.value }))}
                                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded bg-white dark:bg-zinc-900 text-sm outline-none cursor-pointer"
                                >
                                    <option value="PLANNED">Planned</option>
                                    <option value="ACTIVE">Active</option>
                                    <option value="COMPLETED">Completed</option>
                                </select>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-150 dark:border-zinc-850">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateOpen(false);
                                        setEditingSprint(null);
                                    }}
                                    className="px-4 py-2 text-sm font-medium rounded border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createSprintMutation.isPending || updateSprintMutation.isPending}
                                    className="px-4 py-2 text-sm font-medium rounded bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
                                >
                                    {isCreateOpen ? "Create Sprint" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
