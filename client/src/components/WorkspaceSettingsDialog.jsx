import React, { useState, useEffect } from 'react';
import { X, Briefcase, Settings, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { closeModal, setActiveWorkspaceId } from '../features/uiSlice';
import { 
    useWorkspacesQuery, 
    useUpdateWorkspaceMutation, 
    useDeleteWorkspaceMutation 
} from '../hooks/useWorkspaces';

const WorkspaceSettingsDialog = () => {
    const dispatch = useDispatch();
    const isOpen = useSelector((state) => state.ui.modals.workspaceSettings);
    const activeWorkspaceId = useSelector((state) => state.ui.activeWorkspaceId);
    
    const { data: workspaces = [] } = useWorkspacesQuery();
    const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;
    const isAdmin = currentWorkspace?.role === 'ADMIN';

    const updateWorkspaceMutation = useUpdateWorkspaceMutation(activeWorkspaceId);
    const deleteWorkspaceMutation = useDeleteWorkspaceMutation();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
    });
    
    const [logo, setLogo] = useState(null); // base64 string or null or "" (for delete)
    const [logoPreview, setLogoPreview] = useState('');

    // Pre-populate fields on open
    useEffect(() => {
        if (currentWorkspace && isOpen) {
            setFormData({
                name: currentWorkspace.name || '',
                description: currentWorkspace.description || '',
            });
            setLogo(null);
            setLogoPreview(currentWorkspace.image_url || '');
        }
    }, [currentWorkspace, isOpen]);

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
            if (!allowedTypes.includes(file.type)) {
                toast.error('Only PNG, JPG, and JPEG images are allowed.');
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                toast.error('Logo image size cannot exceed 2 MB.');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setLogo(reader.result);
                setLogoPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogo(''); // empty string tells backend to nullify the URL
        setLogoPreview('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAdmin) return;

        if (!formData.name.trim()) {
            toast.error('Workspace name is required.');
            return;
        }

        try {
            toast.loading('Saving workspace changes...');
            
            // Prepare payload. Send logo (base64 or empty string) only if edited
            const payload = {
                name: formData.name,
                description: formData.description,
            };
            if (logo !== null) {
                payload.imageUrl = logo;
            }

            await updateWorkspaceMutation.mutateAsync(payload);
            toast.dismissAll();
            toast.success('Workspace updated successfully!');
            dispatch(closeModal('workspaceSettings'));
        } catch (err) {
            toast.dismissAll();
            toast.error(err.response?.data?.error?.message || err.message || 'Failed to update workspace.');
        }
    };

    const handleDeleteWorkspace = async () => {
        if (!isAdmin) return;

        const confirmText = `Are you sure you want to delete "${currentWorkspace.name}"?\n\nThis action cannot be undone. All projects, tasks, and data in this workspace will be deleted forever.`;
        if (window.confirm(confirmText)) {
            try {
                toast.loading('Deleting workspace...');
                await deleteWorkspaceMutation.mutateAsync(activeWorkspaceId);
                toast.dismissAll();
                toast.success('Workspace deleted successfully!');

                // Switch active workspace to another one if possible
                const remaining = workspaces.filter((w) => w.id !== activeWorkspaceId);
                if (remaining.length > 0) {
                    dispatch(setActiveWorkspaceId(remaining[0].id));
                } else {
                    dispatch(setActiveWorkspaceId(null));
                }

                dispatch(closeModal('workspaceSettings'));
            } catch (err) {
                toast.dismissAll();
                toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete workspace.');
            }
        }
    };

    if (!isOpen || !currentWorkspace) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50 p-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200 relative shadow-2xl">
                <button 
                    className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer" 
                    onClick={() => dispatch(closeModal('workspaceSettings'))} 
                >
                    <X className="size-5" />
                </button>

                <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                    <Settings className="size-5 text-blue-500" /> 
                    {isAdmin ? 'Workspace Settings' : 'Workspace Details'}
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                    {isAdmin ? 'Manage your workspace name, description, branding, and status.' : 'View details of this workspace.'}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Workspace Name */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Workspace Name</label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            disabled={!isAdmin}
                            placeholder="Workspace name" 
                            className="w-full px-3 py-2 rounded bg-zinc-55 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 mt-1 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60" 
                            required 
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Description</label>
                        <textarea 
                            value={formData.description} 
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                            disabled={!isAdmin}
                            placeholder="Workspace description" 
                            className="w-full px-3 py-2 rounded bg-zinc-55 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 mt-1 text-zinc-900 dark:text-zinc-200 text-sm h-20 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60" 
                            maxLength={250}
                        />
                    </div>

                    {/* Logo Section */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Workspace Logo</label>
                        <div className="mt-2 flex items-center gap-4">
                            <div className="size-12 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex-shrink-0">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo preview" className="size-full object-cover" />
                                ) : (
                                    <Briefcase className="size-5 text-zinc-400" />
                                )}
                            </div>
                            {isAdmin ? (
                                <div className="flex flex-col gap-1.5">
                                    <input 
                                        type="file" 
                                        accept="image/png, image/jpeg, image/jpg" 
                                        onChange={handleLogoChange}
                                        className="hidden" 
                                        id="edit-workspace-logo-file"
                                    />
                                    <label 
                                        htmlFor="edit-workspace-logo-file"
                                        className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer select-none"
                                    >
                                        Choose Image
                                    </label>
                                    {logoPreview && (
                                        <button
                                            type="button"
                                            onClick={handleRemoveLogo}
                                            className="text-[10px] text-red-500 hover:underline text-left cursor-pointer font-medium"
                                        >
                                            Remove Logo
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <span className="text-xs text-zinc-500 dark:text-zinc-450 italic">
                                    Logo updates require Admin privileges.
                                </span>
                            )}
                        </div>
                        {isAdmin && (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-450 mt-1">
                                PNG, JPG, or JPEG. Max size 2 MB.
                            </p>
                        )}
                    </div>

                    {/* Dangerous Zone for Admin */}
                    {isAdmin && (
                        <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                            <h4 className="text-xs font-bold text-red-500 mb-1 flex items-center gap-1">
                                <Trash2 className="size-3.5" /> Danger Zone
                            </h4>
                            <button
                                type="button"
                                onClick={handleDeleteWorkspace}
                                className="mt-1 px-3 py-1.5 rounded border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-650 dark:text-red-400 text-xs font-semibold cursor-pointer transition-colors"
                            >
                                Delete Workspace
                            </button>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-end gap-3 pt-2 text-xs font-semibold">
                        <button 
                            type="button" 
                            onClick={() => dispatch(closeModal('workspaceSettings'))} 
                            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-800 text-zinc-750 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer" 
                        >
                            {isAdmin ? 'Cancel' : 'Close'}
                        </button>
                        {isAdmin && (
                            <button 
                                type="submit"
                                disabled={updateWorkspaceMutation.isPending} 
                                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition cursor-pointer" 
                            >
                                {updateWorkspaceMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WorkspaceSettingsDialog;
