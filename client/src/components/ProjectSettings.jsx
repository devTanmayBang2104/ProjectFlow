import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import AddProjectMember from "./AddProjectMember";
import { useUpdateProjectMutation, useRemoveProjectMemberMutation } from "../hooks/useProjects";

export default function ProjectSettings({ project }) {
    const updateProjectMutation = useUpdateProjectMutation(project?.id);
    const removeProjectMemberMutation = useRemoveProjectMemberMutation(project?.id);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: "",
        end_date: "",
        progress: 0,
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Project name is required.");
            return;
        }

        try {
            setIsSubmitting(true);
            toast.loading("Saving project changes...");
            
            await updateProjectMutation.mutateAsync({
                name: formData.name,
                description: formData.description || undefined,
                status: formData.status,
                priority: formData.priority,
                start_date: formData.start_date ? new Date(formData.start_date).toISOString() : undefined,
                end_date: formData.end_date ? new Date(formData.end_date).toISOString() : undefined,
                progress: formData.progress,
            });

            toast.dismissAll();
            toast.success("Project updated successfully!");
        } catch (err) {
            toast.dismissAll();
            const errMsg = err.response?.data?.error?.message || err.message || "Failed to update project.";
            toast.error(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveProjectMember = async (userId) => {
        if (!window.confirm("Are you sure you want to remove this member from the project?")) {
            return;
        }

        try {
            toast.loading("Removing member from project...");
            await removeProjectMemberMutation.mutateAsync(userId);
            toast.dismissAll();
            toast.success("Member removed from project successfully!");
        } catch (err) {
            toast.dismissAll();
            const errMsg = err.response?.data?.error?.message || err.message || "Failed to remove project member.";
            toast.error(errMsg);
        }
    };

    useEffect(() => {
        if (project) {
            setFormData({
                name: project.name || "",
                description: project.description || "",
                status: project.status || "PLANNING",
                priority: project.priority || "MEDIUM",
                start_date: project.start_date || "",
                end_date: project.end_date || "",
                progress: project.progress || 0,
            });
        }
    }, [project]);

    // Safely format dates for rendering in input fields
    const getFormattedDate = (dateVal) => {
        if (!dateVal) return "";
        try {
            return format(new Date(dateVal), "yyyy-MM-dd");
        } catch (err) {
            return "";
        }
    };

    const handleDateChange = (field, val) => {
        setFormData((prev) => ({
            ...prev,
            [field]: val ? new Date(val).toISOString() : "",
        }));
    };

    const inputClasses = "w-full px-3 py-2 rounded mt-2 border text-sm dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-300";
    const cardClasses = "rounded-lg border p-6 not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border-zinc-300 dark:border-zinc-800";
    const labelClasses = "text-sm text-zinc-600 dark:text-zinc-400";

    return (
        <div className="grid lg:grid-cols-2 gap-8 text-left">
            {/* Project Details */}
            <div className={cardClasses}>
                <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-4 font-bold">Project Details</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Project Name</label>
                        <input 
                            value={formData.name} 
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                            className={inputClasses} 
                            required 
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Description</label>
                        <textarea 
                            value={formData.description} 
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                            className={inputClasses + " h-24 resize-none"} 
                        />
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelClasses}>Status</label>
                            <select 
                                value={formData.status} 
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                                className={inputClasses} 
                            >
                                <option value="PLANNING">Planning</option>
                                <option value="ACTIVE">Active</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className={labelClasses}>Priority</label>
                            <select 
                                value={formData.priority} 
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })} 
                                className={inputClasses} 
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelClasses}>Start Date</label>
                            <input 
                                type="date" 
                                value={getFormattedDate(formData.start_date)} 
                                onChange={(e) => handleDateChange("start_date", e.target.value)} 
                                className={inputClasses} 
                            />
                        </div>
                        <div className="space-y-2">
                            <label className={labelClasses}>End Date</label>
                            <input 
                                type="date" 
                                value={getFormattedDate(formData.end_date)} 
                                onChange={(e) => handleDateChange("end_date", e.target.value)} 
                                className={inputClasses} 
                                min={getFormattedDate(formData.start_date)}
                            />
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                        <label className={labelClasses}>Progress: {formData.progress}%</label>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            step="5" 
                            value={formData.progress} 
                            onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) })} 
                            className="w-full accent-blue-500 dark:accent-blue-400 mt-2 cursor-pointer" 
                        />
                    </div>

                    {/* Save Button */}
                    <button 
                        type="submit" 
                        disabled={isSubmitting || updateProjectMutation.isPending} 
                        className="ml-auto flex items-center text-xs font-semibold justify-center gap-2 bg-gradient-to-br from-blue-600 to-blue-500 hover:opacity-95 text-white px-4 py-2 rounded transition cursor-pointer disabled:opacity-50" 
                    >
                        <Save className="size-4" /> {isSubmitting || updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
                    </button>
                </form>
            </div>

            {/* Team Members */}
            <div className="space-y-6">
                <div className={cardClasses}>
                    <div className="flex items-center justify-between gap-4">
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-300 mb-4 font-bold">
                            Team Members <span className="text-sm font-semibold text-zinc-650 dark:text-zinc-400">({project?.members?.length || 0})</span>
                        </h2>
                        <button 
                            type="button" 
                            onClick={() => setIsDialogOpen(true)} 
                            className="p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer" 
                        >
                            <Plus className="size-4 text-zinc-900 dark:text-zinc-300" />
                        </button>
                        <AddProjectMember isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
                    </div>

                    {/* Member List */}
                    {project?.members?.length > 0 && (
                        <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                            {project.members.map((member, index) => (
                                <div key={index} className="flex items-center justify-between px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 text-sm text-zinc-900 dark:text-zinc-300" >
                                    <span> {member?.user?.email || "Unknown"} </span>
                                    <div className="flex items-center gap-2">
                                        {project.team_lead === member.user.id ? (
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">
                                                Team Lead
                                            </span>
                                        ) : (
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveProjectMember(member.user.id)}
                                                className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition cursor-pointer"
                                                title="Remove Member from Project"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
