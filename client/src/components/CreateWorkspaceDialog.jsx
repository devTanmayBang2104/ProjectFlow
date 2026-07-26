import React, { useState } from 'react';
import { X, Globe, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCreateWorkspaceMutation } from '../hooks/useWorkspaces';
import { useDispatch, useSelector } from 'react-redux';
import { closeModal, setActiveWorkspaceId } from '../features/uiSlice';

const CreateWorkspaceDialog = () => {
    const dispatch = useDispatch();
    const isOpen = useSelector((state) => state.ui.modals.createWorkspace);
    const createWorkspaceMutation = useCreateWorkspaceMutation();

    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
    });
    const [logo, setLogo] = useState(null);
    const [logoPreview, setLogoPreview] = useState('');

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

    const handleNameChange = (e) => {
        const name = e.target.value;
        // Generate a standard slug: lowercase, replace spaces/specials with hyphens
        const generatedSlug = name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');

        setFormData((prev) => ({
            ...prev,
            name,
            slug: generatedSlug,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.slug.trim()) {
            toast.error('Workspace name and URL slug are required.');
            return;
        }

        // Slug validation (alphanumeric + hyphens only)
        if (!/^[a-z0-9-]+$/.test(formData.slug)) {
            toast.error('Slug can only contain lowercase letters, numbers, and hyphens.');
            return;
        }

        try {
            toast.loading('Creating workspace...');
            const newWorkspace = await createWorkspaceMutation.mutateAsync({
                name: formData.name,
                slug: formData.slug,
                description: formData.description || undefined,
                imageUrl: logo || undefined,
            });

            toast.dismissAll();
            toast.success('Workspace created successfully!');
            
            // Set the new workspace as active
            dispatch(setActiveWorkspaceId(newWorkspace.id));
            dispatch(closeModal('createWorkspace'));

            // Reset form
            setFormData({
                name: '',
                slug: '',
                description: '',
            });
            setLogo(null);
            setLogoPreview('');
        } catch (err) {
            toast.dismissAll();
            const errMsg = err.response?.data?.error?.message || err.message || 'Failed to create workspace.';
            toast.error(errMsg);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50 p-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 w-full max-w-md text-zinc-900 dark:text-zinc-200 relative shadow-2xl">
                <button 
                    className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer" 
                    onClick={() => dispatch(closeModal('createWorkspace'))} 
                >
                    <X className="size-5" />
                </button>

                <h2 className="text-xl font-bold flex items-center gap-2 mb-1">
                    <Briefcase className="size-5 text-blue-500" /> Create Workspace
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                    Set up a new space to organize your team, projects, and boards.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Workspace Name */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Workspace Name</label>
                        <input 
                            type="text" 
                            value={formData.name} 
                            onChange={handleNameChange}
                            placeholder="e.g. Acme Corporation, Marketing Team" 
                            className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 mt-1 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            required 
                        />
                    </div>

                    {/* Slug */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Workspace URL Slug</label>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
                                <Globe className="w-3.5 h-3.5" /> app/
                            </span>
                            <input 
                                type="text" 
                                value={formData.slug} 
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                placeholder="workspace-slug" 
                                className="w-full pl-14 pr-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                required 
                            />
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
                            Must be unique, containing only lowercase letters, numbers, and hyphens.
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Description (Optional)</label>
                        <textarea 
                            value={formData.description} 
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                            placeholder="Briefly describe the purpose of this workspace..." 
                            className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 mt-1 text-zinc-900 dark:text-zinc-200 text-sm h-20 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" 
                            maxLength={250}
                        />
                    </div>

                    {/* Workspace Logo (Optional) */}
                    <div>
                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Workspace Logo (Optional)</label>
                        <div className="mt-2 flex items-center gap-4">
                            <div className="size-12 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-900 flex-shrink-0">
                                {logoPreview ? (
                                    <img src={logoPreview} alt="Logo preview" className="size-full object-cover" />
                                ) : (
                                    <Briefcase className="size-5 text-zinc-400" />
                                )}
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <input 
                                    type="file" 
                                    accept="image/png, image/jpeg, image/jpg" 
                                    onChange={handleLogoChange}
                                    className="hidden" 
                                    id="workspace-logo-file"
                                />
                                <label 
                                    htmlFor="workspace-logo-file"
                                    className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer select-none"
                                >
                                    Choose Image
                                </label>
                                {logoPreview && (
                                    <button
                                        type="button"
                                        onClick={() => { setLogo(null); setLogoPreview(''); }}
                                        className="text-[10px] text-red-500 hover:underline text-left cursor-pointer font-medium"
                                    >
                                        Remove Logo
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-450 mt-1">
                            PNG, JPG, or JPEG. Max size 2 MB.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end gap-3 pt-2 text-xs font-semibold">
                        <button 
                            type="button" 
                            onClick={() => dispatch(closeModal('createWorkspace'))} 
                            className="px-4 py-2 rounded border border-zinc-300 dark:border-zinc-800 text-zinc-750 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer" 
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={createWorkspaceMutation.isPending} 
                            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition cursor-pointer" 
                        >
                            {createWorkspaceMutation.isPending ? 'Creating...' : 'Create Workspace'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateWorkspaceDialog;
