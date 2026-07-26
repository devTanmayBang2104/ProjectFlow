import React, { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";
import { useProjectDetailsQuery, useAddProjectMemberMutation } from "../hooks/useProjects";

const AddProjectMember = ({ isDialogOpen, setIsDialogOpen }) => {
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id'); // Project ID from URL

    const { currentWorkspace } = useActiveWorkspace();
    const { data: project } = useProjectDetailsQuery(id);
    const addProjectMemberMutation = useAddProjectMemberMutation(id);

    const [selectedUserId, setSelectedUserId] = useState('');

    const projectMembersUserIds = project?.members?.map((member) => member.userId) || [];
    const workspaceMembers = currentWorkspace?.members || [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUserId) {
            toast.error("Please select a workspace member to add.");
            return;
        }

        try {
            toast.loading("Adding member to project...");
            await addProjectMemberMutation.mutateAsync(selectedUserId);
            
            toast.dismissAll();
            toast.success("Member added to project successfully!");
            setIsDialogOpen(false);
            setSelectedUserId('');
        } catch (err) {
            toast.dismissAll();
            const errMsg = err.response?.data?.error?.message || err.message || "Failed to add project member.";
            toast.error(errMsg);
        }
    };

    if (!isDialogOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200 shadow-2xl relative">
                {/* Header */}
                <div className="mb-4">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <UserPlus className="size-5 text-blue-500" /> Add Member to Project
                    </h2>
                    {project && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Adding to Project: <span className="text-blue-600 dark:text-blue-400 font-semibold">{project.name}</span>
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-1">
                        <label htmlFor="memberSelect" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            Select Workspace Member
                        </label>
                        <div className="relative mt-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                            <select 
                                id="memberSelect"
                                value={selectedUserId} 
                                onChange={(e) => setSelectedUserId(e.target.value)} 
                                className="pl-10 w-full rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm py-2.5 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                required 
                            >
                                <option value="">Select a member...</option>
                                {workspaceMembers
                                    .filter((member) => !projectMembersUserIds.includes(member.userId))
                                    .map((member) => (
                                        <option key={member.user.id} value={member.user.id}> 
                                            {member.user.name} ({member.user.email}) 
                                        </option>
                                    ))}
                            </select>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2 text-xs font-semibold">
                        <button 
                            type="button" 
                            onClick={() => setIsDialogOpen(false)} 
                            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer" 
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={addProjectMemberMutation.isPending || !id} 
                            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition cursor-pointer" 
                        >
                            {addProjectMemberMutation.isPending ? "Adding..." : "Add Member"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddProjectMember;
