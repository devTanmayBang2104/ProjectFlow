import React, { useState, useEffect } from "react";
import { XIcon, Briefcase } from "lucide-react";
import toast from "react-hot-toast";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";
import { useProfile } from "../hooks/useAuth";
import { useCreateProjectMutation } from "../hooks/useProjects";
import { useDispatch } from "react-redux";
import { openModal } from "../features/uiSlice";
import apiClient from "../api/apiClient";

const CreateProjectDialog = ({ isDialogOpen, setIsDialogOpen }) => {
    const dispatch = useDispatch();
    const { activeWorkspaceId, currentWorkspace, isLoading } = useActiveWorkspace();
    const { data: user } = useProfile();
    const createProjectMutation = useCreateProjectMutation(activeWorkspaceId);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        status: "PLANNING",
        priority: "MEDIUM",
        start_date: "",
        end_date: "",
        team_lead: "",
        team_members: [], // List of user IDs (UUIDs)
    });

    // Default the project lead to the logged-in user when dialog opens
    useEffect(() => {
        if (user?.id && !formData.team_lead) {
            setFormData((prev) => ({ ...prev, team_lead: user.id }));
        }
    }, [user, isDialogOpen]);

    const handleAddMember = (userId) => {
        if (userId && !formData.team_members.includes(userId)) {
            setFormData((prev) => ({
                ...prev,
                team_members: [...prev.team_members, userId]
            }));
        }
    };

    const handleRemoveMember = (userId) => {
        setFormData((prev) => ({
            ...prev,
            team_members: prev.team_members.filter((id) => id !== userId)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Project name is required.");
            return;
        }

        try {
            toast.loading("Creating project...");
            
            // Format dates to ISO String if they are selected
            const startISO = formData.start_date 
                ? new Date(formData.start_date).toISOString() 
                : undefined;
            const endISO = formData.end_date 
                ? new Date(formData.end_date).toISOString() 
                : undefined;

            const selectedLead = formData.team_lead || user?.id;

            // 1. Create the project
            const newProject = await createProjectMutation.mutateAsync({
                name: formData.name,
                description: formData.description || undefined,
                status: formData.status,
                priority: formData.priority,
                start_date: startISO,
                end_date: endISO,
                team_lead: selectedLead,
            });

            // 2. Add other team members to the project
            // Exclude the team lead, as they are automatically added as a project member by the backend
            const otherMemberIds = formData.team_members.filter((id) => id !== selectedLead);
            if (otherMemberIds.length > 0) {
                await Promise.all(
                    otherMemberIds.map((userId) =>
                        apiClient.post(`/projects/${newProject.id}/members`, { userId })
                    )
                );
            }

            toast.dismissAll();
            toast.success("Project created successfully!");
            setIsDialogOpen(false);
            
            // Reset Form
            setFormData({
                name: "",
                description: "",
                status: "PLANNING",
                priority: "MEDIUM",
                start_date: "",
                end_date: "",
                team_lead: user?.id || "",
                team_members: [],
            });
        } catch (err) {
            toast.dismissAll();
            const errMsg = err.response?.data?.error?.message || err.message || "Failed to create project.";
            toast.error(errMsg);
        }
    };

    if (!isDialogOpen) return null;

    // 1. LOADING STATE: Wait for workspace details query to complete
    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50 p-4">
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-300 flex flex-col items-center justify-center min-h-[220px] shadow-2xl">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4"></div>
                    <p className="text-xs font-semibold text-zinc-550 dark:text-zinc-400">Loading workspace details...</p>
                </div>
            </div>
        );
    }

    // 2. EMPTY STATE: If there is no active workspace selected (after loading), prompt them to create one
    if (!activeWorkspaceId) {
        return (
            <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50 p-4">
                <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200 relative shadow-2xl text-center">
                    <button 
                        className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer" 
                        onClick={() => setIsDialogOpen(false)} 
                    >
                        <XIcon className="size-5" />
                    </button>

                    <div className="w-14 h-14 mx-auto mb-4 bg-blue-550/10 rounded-full flex items-center justify-center text-blue-500">
                        <Briefcase className="w-6 h-6" />
                    </div>

                    <h2 className="text-lg font-bold mb-2">No Active Workspace</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 px-4">
                        Projects must belong to a workspace. Please create a new workspace or select one from the top-left dropdown first.
                    </p>

                    <div className="flex gap-3 justify-center text-xs font-semibold">
                        <button 
                            type="button"
                            onClick={() => setIsDialogOpen(false)}
                            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-750 cursor-pointer text-zinc-700 dark:text-zinc-300"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                dispatch(openModal("createWorkspace"));
                                setIsDialogOpen(false);
                            }}
                            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white cursor-pointer"
                        >
                            Create Workspace
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Filter workspace members to display in dropdown (excludes already selected members)
    const availableWorkspaceMembers = currentWorkspace?.members?.filter(
        (member) => !formData.team_members.includes(member.user.id)
    ) || [];

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-lg text-zinc-900 dark:text-zinc-200 relative shadow-2xl my-8">
                <button 
                    className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer" 
                    onClick={() => setIsDialogOpen(false)} 
                >
                    <XIcon className="size-5" />
                </button>

                <h2 className="text-xl font-bold mb-1">Create New Project</h2>
                {currentWorkspace && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                        In workspace: <span className="text-blue-600 dark:text-blue-400 font-semibold">{currentWorkspace.name}</span>
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Project Name */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Project Name</label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                            placeholder="Enter project name" 
                            className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 mt-1 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            required 
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Description</label>
                        <textarea 
                            value={formData.description} 
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                            placeholder="Describe your project" 
                            className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 mt-1 text-zinc-900 dark:text-zinc-200 text-sm h-16 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        />
                    </div>

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Status</label>
                            <select 
                                value={formData.status} 
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })} 
                                className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 mt-1 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            >
                                <option value="PLANNING">Planning</option>
                                <option value="ACTIVE">Active</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="ON_HOLD">On Hold</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Priority</label>
                            <select 
                                value={formData.priority} 
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })} 
                                className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 mt-1 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Start Date</label>
                            <input 
                                type="date" 
                                value={formData.start_date} 
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} 
                                className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">End Date</label>
                            <input 
                                type="date" 
                                value={formData.end_date} 
                                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} 
                                min={formData.start_date} 
                                className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            />
                        </div>
                    </div>

                    {/* Lead */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Project Lead</label>
                        <select 
                            value={formData.team_lead} 
                            onChange={(e) => setFormData({ ...formData, team_lead: e.target.value })} 
                            className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 mt-1 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                        >
                            <option value="">Select Project Lead</option>
                            {currentWorkspace?.members?.map((member) => (
                                <option key={member.user.id} value={member.user.id}>
                                    {member.user.name} ({member.user.email})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Team Members */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Team Members</label>
                        <select 
                            className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 mt-1 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => handleAddMember(e.target.value)}
                            value=""
                        >
                            <option value="">Add team members...</option>
                            {availableWorkspaceMembers.map((member) => (
                                <option key={member.user.id} value={member.user.id}>
                                    {member.user.name} ({member.user.email})
                                </option>
                            ))}
                        </select>

                        {/* Selected Members Tags */}
                        {formData.team_members.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2.5 max-h-24 overflow-y-auto">
                                {formData.team_members.map((memberId) => {
                                    const member = currentWorkspace?.members?.find((m) => m.user.id === memberId);
                                    if (!member) return null;
                                    return (
                                        <div 
                                            key={memberId} 
                                            className="flex items-center gap-1 bg-blue-50 dark:bg-blue-550/10 border border-blue-100 dark:border-blue-550/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-xs font-semibold"
                                        >
                                            {member.user.name}
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveMember(memberId)}
                                                className="hover:text-blue-800 dark:hover:text-blue-300 ml-0.5 cursor-pointer"
                                            >
                                                <XIcon className="w-3 h-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2 text-sm">
                        <button 
                            type="button" 
                            onClick={() => setIsDialogOpen(false)} 
                            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer text-xs font-semibold" 
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={createProjectMutation.isPending || !activeWorkspaceId} 
                            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition disabled:opacity-50 cursor-pointer text-xs font-semibold" 
                        >
                            {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateProjectDialog;