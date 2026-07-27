import { format } from "date-fns";
import toast from "react-hot-toast";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useUpdateTaskMutation, useDeleteTaskMutation } from "../hooks/useTasks";
import { Bug, CalendarIcon, GitCommit, MessageSquare, Square, Trash, XIcon, Zap } from "lucide-react";
import { useProfile } from "../hooks/useAuth";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";
import { useProjectDetailsQuery } from "../hooks/useProjects";

const typeIcons = {
    BUG: { icon: Bug, color: "text-red-600 dark:text-red-400" },
    FEATURE: { icon: Zap, color: "text-blue-600 dark:text-blue-400" },
    TASK: { icon: Square, color: "text-green-600 dark:text-green-400" },
    IMPROVEMENT: { icon: GitCommit, color: "text-purple-600 dark:text-purple-400" },
    OTHER: { icon: MessageSquare, color: "text-amber-600 dark:text-amber-400" },
};

const priorityTexts = {
    LOW: { background: "bg-emerald-100 dark:bg-emerald-955", prioritycolor: "text-emerald-600 dark:text-emerald-400" },
    MEDIUM: { background: "bg-blue-100 dark:bg-blue-955", prioritycolor: "text-blue-600 dark:text-blue-400" },
    HIGH: { background: "bg-red-100 dark:bg-red-955", prioritycolor: "text-red-600 dark:text-red-400" },
};

const ProjectTasks = ({ tasks }) => {
    const navigate = useNavigate();
    const [selectedTasks, setSelectedTasks] = useState([]);

    const projectId = tasks[0]?.projectId || "";
    const updateTaskMutation = useUpdateTaskMutation(projectId);
    const deleteTaskMutation = useDeleteTaskMutation(projectId);

    const { data: currentUser } = useProfile();
    const { isAdminOrOwner } = useActiveWorkspace();
    const { data: project } = useProjectDetailsQuery(projectId);

    const isTeamLead = project?.team_lead === currentUser?.id;
    const canDeleteTasks = isAdminOrOwner || isTeamLead;

    const [filters, setFilters] = useState({
        status: "",
        type: "",
        priority: "",
        assignee: "",
    });

    const assigneeList = useMemo(
        () => Array.from(new Set(tasks.map((t) => t.assignee?.name).filter(Boolean))),
        [tasks]
    );

    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            const { status, type, priority, assignee } = filters;
            return (
                (!status || task.status === status) &&
                (!type || task.type === type) &&
                (!priority || task.priority === priority) &&
                (!assignee || task.assignee?.name === assignee)
            );
        });
    }, [filters, tasks]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const handleStatusChange = async (taskId, newStatus) => {
        try {
            toast.loading("Updating status...");
            await updateTaskMutation.mutateAsync({ taskId, status: newStatus });
            toast.dismissAll();
            toast.success("Task status updated successfully");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.error?.message || error.message);
        }
    };

    const handleDelete = async () => {
        try {
            const confirm = window.confirm("Are you sure you want to delete the selected tasks?");
            if (!confirm) return;

            toast.loading("Deleting tasks...");
            await Promise.all(selectedTasks.map((id) => deleteTaskMutation.mutateAsync(id)));
            setSelectedTasks([]);

            toast.dismissAll();
            toast.success("Tasks deleted successfully");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.error?.message || error.message);
        }
    };

    return (
        <div>
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-4">
                {["status", "type", "priority", "assignee"].map((name) => {
                    const options = {
                        status: [
                            { label: "All Statuses", value: "" },
                            { label: "To Do", value: "TODO" },
                            { label: "In Progress", value: "IN_PROGRESS" },
                            { label: "Done", value: "DONE" },
                        ],
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
                            { label: "Low", value: "LOW" },
                            { label: "Medium", value: "MEDIUM" },
                            { label: "High", value: "HIGH" },
                        ],
                        assignee: [
                            { label: "All Assignees", value: "" },
                            ...assigneeList.map((n) => ({ label: n, value: n })),
                        ],
                    };
                    return (
                        <select key={name} name={name} onChange={handleFilterChange} className="border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 outline-none px-3 py-1.5 rounded-lg text-sm text-zinc-900 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition duration-200" >
                            {options[name].map((opt, idx) => (
                                <option key={idx} value={opt.value} className="bg-white dark:bg-zinc-900">{opt.label}</option>
                            ))}
                        </select>
                    );
                })}

                {/* Reset filters */}
                {(filters.status || filters.type || filters.priority || filters.assignee) && (
                    <button type="button" onClick={() => setFilters({ status: "", type: "", priority: "", assignee: "" })} className="px-3 py-1.5 flex items-center gap-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 text-sm transition-colors cursor-pointer" >
                        <XIcon className="size-3" /> Reset
                    </button>
                )}

                {canDeleteTasks && selectedTasks.length > 0 && (
                    <button type="button" onClick={handleDelete} className="px-3 py-1.5 flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm transition-all cursor-pointer shadow-md shadow-red-500/10" >
                        <Trash className="size-3" /> Delete
                    </button>
                )}
            </div>

            {/* Tasks Table */}
            <div className="overflow-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/20 backdrop-blur-sm shadow-sm">
                <div className="w-full">
                    {/* Desktop/Table View */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="min-w-full text-sm text-left text-zinc-900 dark:text-zinc-300">
                            <thead className="text-xs uppercase bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                                <tr>
                                    {canDeleteTasks && (
                                        <th className="pl-3 pr-1 py-3">
                                            <input onChange={() => selectedTasks.length > 1 ? setSelectedTasks([]) : setSelectedTasks(tasks.map((t) => t.id))} checked={selectedTasks.length === tasks.length} type="checkbox" className="size-3 accent-zinc-650 dark:accent-zinc-500 cursor-pointer" />
                                        </th>
                                    )}
                                    <th className={`px-4 ${canDeleteTasks ? "pl-0" : "pl-4"} py-3`}>Title</th>
                                    <th className="px-4 py-3">Type</th>
                                    <th className="px-4 py-3">Priority</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Assignee</th>
                                    <th className="px-4 py-3">Due Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTasks.length > 0 ? (
                                    filteredTasks.map((task) => {
                                        const { icon: Icon, color } = typeIcons[task.type] || {};
                                        const { background, prioritycolor } = priorityTexts[task.priority] || {};

                                        return (
                                            <tr key={task.id} onClick={() => navigate(`/taskDetails?projectId=${task.projectId}&taskId=${task.id}`)} className="border-t border-zinc-200 dark:border-zinc-800 group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-all cursor-pointer" >
                                                {canDeleteTasks && (
                                                    <td onClick={e => e.stopPropagation()} className="pl-3 pr-1">
                                                        <input type="checkbox" className="size-3 accent-zinc-600 dark:accent-zinc-500" onChange={() => selectedTasks.includes(task.id) ? setSelectedTasks(selectedTasks.filter((i) => i !== task.id)) : setSelectedTasks((prev) => [...prev, task.id])} checked={selectedTasks.includes(task.id)} />
                                                    </td>
                                                )}
                                                <td className={`px-4 ${canDeleteTasks ? "pl-0" : "pl-4"} py-2`}>{task.title}</td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        {Icon && <Icon className={`size-4 ${color}`} />}
                                                        <span className={`uppercase text-xs ${color}`}>{task.type}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                        {task.priority}
                                                    </span>
                                                </td>
                                                <td onClick={e => e.stopPropagation()} className="px-4 py-2">
                                                    <select name="status" onChange={(e) => handleStatusChange(task.id, e.target.value)} value={task.status} className="bg-white/50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none px-2 pr-4 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 cursor-pointer focus:ring-1 focus:ring-blue-500" >
                                                        <option value="TODO" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">To Do</option>
                                                        <option value="IN_PROGRESS" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">In Progress</option>
                                                        <option value="DONE" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">Done</option>
                                                    </select>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <img src={task.assignee?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee?.name || 'U')}`} className="size-5 rounded-full object-cover" alt="avatar" referrerPolicy="no-referrer" />
                                                        {task.assignee?.name || "-"}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2">
                                                    <div className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
                                                        <CalendarIcon className="size-4" />
                                                        {format(new Date(task.due_date), "dd MMMM")}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="text-center text-zinc-500 dark:text-zinc-400 py-6">
                                            No tasks found for the selected filters.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile/Card View */}
                    <div className="lg:hidden flex flex-col gap-4">
                        {filteredTasks.length > 0 ? (
                            filteredTasks.map((task) => {
                                const { icon: Icon, color } = typeIcons[task.type] || {};
                                const { background, prioritycolor } = priorityTexts[task.priority] || {};

                                return (
                                    <div key={task.id} className=" dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-4 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-zinc-900 dark:text-zinc-200 text-sm font-semibold">{task.title}</h3>
                                            {canDeleteTasks && (
                                                <input type="checkbox" className="size-4 accent-zinc-600 dark:accent-zinc-500" onChange={() => selectedTasks.includes(task.id) ? setSelectedTasks(selectedTasks.filter((i) => i !== task.id)) : setSelectedTasks((prev) => [...prev, task.id])} checked={selectedTasks.includes(task.id)} />
                                            )}
                                        </div>

                                        <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
                                            {Icon && <Icon className={`size-4 ${color}`} />}
                                            <span className={`${color} uppercase`}>{task.type}</span>
                                        </div>

                                        <div>
                                            <span className={`text-xs px-2 py-1 rounded ${background} ${prioritycolor}`}>
                                                {task.priority}
                                            </span>
                                        </div>

                                        <div>
                                            <label className="text-zinc-600 dark:text-zinc-400 text-xs">Status</label>
                                            <select name="status" onChange={(e) => handleStatusChange(task.id, e.target.value)} value={task.status} className="w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 outline-none px-2 py-1 rounded text-sm text-zinc-900 dark:text-zinc-200 cursor-pointer" >
                                                <option value="TODO" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">To Do</option>
                                                <option value="IN_PROGRESS" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">In Progress</option>
                                                <option value="DONE" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">Done</option>
                                            </select>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                                            <img src={task.assignee?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee?.name || 'U')}`} className="size-5 rounded-full object-cover" alt="avatar" referrerPolicy="no-referrer" />
                                            {task.assignee?.name || "-"}
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                                            <CalendarIcon className="size-4" />
                                            {format(new Date(task.due_date), "dd MMMM")}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                                No tasks found for the selected filters.
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectTasks;
