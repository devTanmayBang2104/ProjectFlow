import React, { useState } from "react";
import { Mail, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { useActiveWorkspace } from "../hooks/useActiveWorkspace";
import { useAddWorkspaceMemberMutation } from "../hooks/useWorkspaces";

const InviteMemberDialog = ({ isDialogOpen, setIsDialogOpen }) => {
    const { currentWorkspace } = useActiveWorkspace();
    const activeWorkspaceId = currentWorkspace?.id;
    const addWorkspaceMemberMutation = useAddWorkspaceMemberMutation(activeWorkspaceId);

    const [formData, setFormData] = useState({
        email: "",
        role: "MEMBER",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email.trim()) {
            toast.error("Email is required.");
            return;
        }

        try {
            toast.loading("Sending invitation...");
            await addWorkspaceMemberMutation.mutateAsync({
                email: formData.email,
                role: formData.role,
            });

            toast.dismissAll();
            toast.success("Team member added successfully!");
            setIsDialogOpen(false);
            
            // Reset Form
            setFormData({
                email: "",
                role: "MEMBER",
            });
        } catch (err) {
            toast.dismissAll();
            const errMsg = err.response?.data?.error?.message || err.message || "Failed to invite member.";
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
                        <UserPlus className="size-5 text-blue-500" /> Invite Team Member
                    </h2>
                    {currentWorkspace && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            Inviting to workspace: <span className="text-blue-600 dark:text-blue-400 font-semibold">{currentWorkspace.name}</span>
                        </p>
                    )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Email */}
                    <div className="space-y-1">
                        <label htmlFor="email" className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                            Email Address
                        </label>
                        <div className="relative mt-1">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-4 h-4" />
                            <input 
                                type="email" 
                                value={formData.email} 
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })} 
                                placeholder="Enter email address" 
                                className="pl-10 w-full rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-755 text-zinc-900 dark:text-zinc-200 text-sm placeholder-zinc-400 dark:placeholder-zinc-500 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                required 
                            />
                        </div>
                    </div>

                    {/* Role */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Role</label>
                        <select 
                            value={formData.role} 
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })} 
                            className="w-full rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-250 dark:border-zinc-755 text-zinc-900 dark:text-zinc-200 py-2 px-3 mt-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm" 
                        >
                            <option value="MEMBER">Member</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2 text-xs font-semibold">
                        <button 
                            type="button" 
                            onClick={() => setIsDialogOpen(false)} 
                            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-750 text-zinc-900 dark:text-zinc-250 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer" 
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={addWorkspaceMemberMutation.isPending || !activeWorkspaceId} 
                            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition cursor-pointer" 
                        >
                            {addWorkspaceMemberMutation.isPending ? "Inviting..." : "Send Invitation"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InviteMemberDialog;
