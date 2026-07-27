import React, { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useProjectDetailsQuery } from "../hooks/useProjects";
import { useCreateTaskMutation } from "../hooks/useTasks";
import { useProjectSprintsQuery } from "../hooks/useSprints";

export default function CreateTaskDialog({ showCreateTask, setShowCreateTask, projectId }) {
    const { data: project } = useProjectDetailsQuery(projectId);
    const { data: sprints = [] } = useProjectSprintsQuery(projectId);
    const teamMembers = project?.members || [];
    const createTaskMutation = useCreateTaskMutation(projectId);

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        type: "TASK",
        status: "TODO",
        priority: "MEDIUM",
        assigneeId: "",
        due_date: "",
        sprintId: "",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim()) {
            toast.error("Task title is required.");
            return;
        }

        try {
            toast.loading("Creating task...");
            const dueISO = formData.due_date 
                ? new Date(formData.due_date).toISOString() 
                : undefined;

            await createTaskMutation.mutateAsync({
                title: formData.title,
                description: formData.description || undefined,
                type: formData.type,
                status: formData.status,
                priority: formData.priority,
                assigneeId: formData.assigneeId || undefined,
                due_date: dueISO,
                sprintId: formData.sprintId || undefined,
            });

            toast.dismissAll();
            toast.success("Task created successfully!");
            setShowCreateTask(false);
            
            // Reset Form
            setFormData({
                title: "",
                description: "",
                type: "TASK",
                status: "TODO",
                priority: "MEDIUM",
                assigneeId: "",
                due_date: "",
                sprintId: "",
            });
        } catch (err) {
            toast.dismissAll();
            const errMsg = err.response?.data?.error?.message || err.message || "Failed to create task.";
            toast.error(errMsg);
        }
    };

    return showCreateTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/60 backdrop-blur p-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg shadow-2xl w-full max-w-md p-6 text-zinc-900 dark:text-white relative">
                <h2 className="text-xl font-bold mb-4">Create New Task</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Title */}
                    <div className="space-y-1">
                        <label htmlFor="title" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Title</label>
                        <input 
                            value={formData.title} 
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                            placeholder="Task title" 
                            className="w-full rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            required 
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label htmlFor="description" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Description</label>
                        <textarea 
                            value={formData.description} 
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                            placeholder="Describe the task" 
                            className="w-full rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 h-20 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        />
                    </div>

                    {/* Type & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Type</label>
                            <select 
                                value={formData.type} 
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })} 
                                className="w-full rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            >
                                <option value="TASK">Task</option>
                                <option value="BUG">Bug</option>
                                <option value="FEATURE">Feature</option>
                                <option value="IMPROVEMENT">Improvement</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Priority</label>
                            <select 
                                value={formData.priority} 
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })} 
                                className="w-full rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Assignee and Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Assignee</label>
                            <select 
                                value={formData.assigneeId} 
                                onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })} 
                                className="w-full rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            >
                                <option value="">Unassigned</option>
                                {teamMembers.map((member) => (
                                    <option key={member?.user.id} value={member?.user.id}>
                                        {member?.user.name} ({member?.user.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Status</label>
                            <select 
                                value={formData.status} 
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                                className="w-full rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            >
                                <option value="TODO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="DONE">Done</option>
                            </select>
                        </div>
                    </div>

                    {/* Due Date */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Due Date</label>
                        <div className="flex items-center gap-2 mt-1">
                            <CalendarIcon className="size-4.5 text-zinc-400" />
                            <input 
                                type="date" 
                                value={formData.due_date} 
                                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} 
                                min={new Date().toISOString().split('T')[0]} 
                                className="w-full rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            />
                        </div>
                        {formData.due_date && (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                                Selected: {format(new Date(formData.due_date), "PPP")}
                            </p>
                        )}
                    </div>

                    {/* Sprint selection */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Sprint (Optional)</label>
                        <select 
                            value={formData.sprintId} 
                            onChange={(e) => setFormData({ ...formData, sprintId: e.target.value })} 
                            className="w-full rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 px-3 py-2 text-zinc-900 dark:text-zinc-200 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer" 
                        >
                            <option value="">No Sprint (Backlog)</option>
                            {sprints.map((sprint) => (
                                <option key={sprint.id} value={sprint.id}>
                                    {sprint.name} ({sprint.status})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-2 pt-2 text-xs font-semibold">
                        <button 
                            type="button" 
                            onClick={() => setShowCreateTask(false)} 
                            className="rounded border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 px-4 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer" 
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={createTaskMutation.isPending}
                            className="rounded px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white dark:text-zinc-200 transition disabled:opacity-50 cursor-pointer" 
                        >
                            {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ) : null;
}
