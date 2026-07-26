import React, { useState, useEffect } from 'react';
import { X, User, Shield, AlertTriangle, Key } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { closeModal } from '../features/uiSlice';
import { 
    useProfile, 
    useUpdateProfile, 
    useChangePassword, 
    useDeactivateAccount,
    useDeleteAccountPermanently
} from '../hooks/useAuth';

const UserSettingsDialog = () => {
    const dispatch = useDispatch();
    const isOpen = useSelector((state) => state.ui.modals.settings);
    const { data: user } = useProfile();

    const updateProfileMutation = useUpdateProfile();
    const changePasswordMutation = useChangePassword();
    const deactivateAccountMutation = useDeactivateAccount();
    const deleteAccountPermanentlyMutation = useDeleteAccountPermanently();

    const [activeTab, setActiveTab] = useState('profile');

    const [profileForm, setProfileForm] = useState({
        name: '',
        username: '',
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: '',
    });

    const [deactivatePassword, setDeactivatePassword] = useState('');
    const [deletePassword, setDeletePassword] = useState('');

    // Pre-populate profile form when user details are available
    useEffect(() => {
        if (user) {
            setProfileForm({
                name: user.name || '',
                username: user.username || '',
            });
        }
    }, [user, isOpen]);

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        if (!profileForm.name.trim()) {
            toast.error('Name cannot be empty.');
            return;
        }

        try {
            toast.loading('Saving profile changes...');
            await updateProfileMutation.mutateAsync({
                name: profileForm.name,
                username: profileForm.username || undefined,
            });
            toast.dismissAll();
            toast.success('Profile updated successfully!');
        } catch (err) {
            toast.dismissAll();
            toast.error(err.response?.data?.error?.message || err.message || 'Failed to update profile.');
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!passwordForm.currentPassword || !passwordForm.newPassword) {
            toast.error('All password fields are required.');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
            toast.error('New passwords do not match.');
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            toast.error('Password must be at least 6 characters long.');
            return;
        }

        try {
            toast.loading('Changing password...');
            await changePasswordMutation.mutateAsync({
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            toast.dismissAll();
            toast.success('Password changed successfully!');
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmNewPassword: '',
            });
        } catch (err) {
            toast.dismissAll();
            toast.error(err.response?.data?.error?.message || err.message || 'Failed to change password.');
        }
    };

    const handleDeactivateSubmit = async (e) => {
        e.preventDefault();
        if (user?.passwordHash && !deactivatePassword) {
            toast.error('Please enter your password to confirm deactivation.');
            return;
        }

        if (!confirm('Are you sure you want to deactivate your account? Access will be temporarily disabled for 30 days.')) {
            return;
        }

        try {
            toast.loading('Deactivating account...');
            await deactivateAccountMutation.mutateAsync(deactivatePassword);
            toast.dismissAll();
            toast.success('Account deactivated successfully.');
            dispatch(closeModal('settings'));
        } catch (err) {
            toast.dismissAll();
            toast.error(err.response?.data?.error?.message || err.message || 'Failed to deactivate account.');
        }
    };

    const handleDeletePermanentlySubmit = async (e) => {
        e.preventDefault();
        if (user?.passwordHash && !deletePassword) {
            toast.error('Please enter your password to confirm permanent deletion.');
            return;
        }

        if (!confirm('WARNING: Are you absolutely sure you want to permanently delete your account? This action is immediate, irreversible, and will delete all your workspaces, projects, and data.')) {
            return;
        }

        try {
            toast.loading('Deleting account permanently...');
            await deleteAccountPermanentlyMutation.mutateAsync(deletePassword);
            toast.dismissAll();
            toast.success('Account deleted permanently.');
            dispatch(closeModal('settings'));
        } catch (err) {
            toast.dismissAll();
            toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete account.');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/20 dark:bg-black/60 backdrop-blur flex items-center justify-center text-left z-50 p-4">
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-2xl text-zinc-900 dark:text-zinc-200 flex flex-col md:flex-row shadow-2xl overflow-hidden min-h-[450px]">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-48 bg-zinc-50 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 p-4 flex flex-row md:flex-col gap-1 flex-shrink-0">
                    <button 
                        onClick={() => setActiveTab('profile')}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition text-left cursor-pointer w-full ${activeTab === 'profile' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'}`}
                    >
                        <User className="w-4 h-4" /> Profile Info
                    </button>
                    <button 
                        onClick={() => setActiveTab('security')}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition text-left cursor-pointer w-full ${activeTab === 'security' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'}`}
                    >
                        <Shield className="w-4 h-4" /> Security
                    </button>
                    <button 
                        onClick={() => setActiveTab('danger')}
                        className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-md transition text-left cursor-pointer w-full ${activeTab === 'danger' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400'}`}
                    >
                        <AlertTriangle className="w-4 h-4" /> Danger Zone
                    </button>
                </div>

                {/* Content Panel */}
                <div className="flex-1 p-6 relative flex flex-col justify-between">
                    <button 
                        className="absolute top-3 right-3 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer" 
                        onClick={() => dispatch(closeModal('settings'))} 
                    >
                        <X className="size-5" />
                    </button>

                    <div className="flex-1">
                        {/* Tab 1: Profile */}
                        {activeTab === 'profile' && (
                            <div>
                                <h3 className="text-md font-bold mb-1">Profile Information</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">Update your display name and choose a unique username.</p>

                                <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Email Address (Read-only)</label>
                                        <input 
                                            type="text" 
                                            value={user?.email || ''} 
                                            disabled 
                                            className="w-full px-3 py-2 rounded bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-zinc-400 text-sm focus:outline-none cursor-not-allowed" 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Full Name</label>
                                        <input 
                                            type="text" 
                                            value={profileForm.name} 
                                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} 
                                            placeholder="Enter your name" 
                                            className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                            required 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Username</label>
                                        <input 
                                            type="text" 
                                            value={profileForm.username} 
                                            onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value.toLowerCase().replace(/\s+/g, '') })} 
                                            placeholder="Choose a username" 
                                            className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={updateProfileMutation.isPending}
                                        className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded transition cursor-pointer disabled:opacity-50 mt-2"
                                    >
                                        {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Tab 2: Security */}
                        {activeTab === 'security' && (
                            <div>
                                <h3 className="text-md font-bold mb-1">Change Password</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">Ensure your account is using a secure and robust password.</p>

                                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Current Password</label>
                                        <input 
                                            type="password" 
                                            value={passwordForm.currentPassword} 
                                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
                                            className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                            required 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">New Password</label>
                                        <input 
                                            type="password" 
                                            value={passwordForm.newPassword} 
                                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
                                            className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                            required 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">Confirm New Password</label>
                                        <input 
                                            type="password" 
                                            value={passwordForm.confirmNewPassword} 
                                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmNewPassword: e.target.value })} 
                                            className="w-full px-3 py-2 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                            required 
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={changePasswordMutation.isPending}
                                        className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded transition cursor-pointer disabled:opacity-50 mt-2 flex items-center gap-1.5"
                                    >
                                        <Key className="w-3.5 h-3.5" />
                                        {changePasswordMutation.isPending ? 'Updating...' : 'Change Password'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* Tab 3: Danger Zone */}
                        {activeTab === 'danger' && (
                            <div className="space-y-8 overflow-y-auto max-h-[380px] pr-2 no-scrollbar">
                                {/* Section 1: Deactivate */}
                                <div className="border-b border-zinc-150 dark:border-zinc-800 pb-6">
                                    <h3 className="text-sm font-bold mb-1 text-red-600 dark:text-red-400">Deactivate Account</h3>
                                    <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-3">
                                        Temporarily disable access. You can recover it within 30 days before permanent deletion.
                                    </p>
                                    <form onSubmit={handleDeactivateSubmit} className="space-y-3 max-w-md">
                                        <input 
                                            type="password" 
                                            value={deactivatePassword} 
                                            onChange={(e) => setDeactivatePassword(e.target.value)} 
                                            placeholder="Enter password to confirm deactivation"
                                            className="w-full px-3 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" 
                                            required={!!user?.passwordHash} 
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={deactivateAccountMutation.isPending}
                                            className="px-3.5 py-1.5 text-xs font-semibold bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-red-650 dark:text-red-400 rounded transition cursor-pointer disabled:opacity-50"
                                        >
                                            {deactivateAccountMutation.isPending ? 'Deactivating...' : 'Deactivate Account'}
                                        </button>
                                    </form>
                                </div>

                                {/* Section 2: Permanent Delete */}
                                <div>
                                    <h3 className="text-sm font-bold mb-1 text-red-650 dark:text-red-500">Delete Account Permanently</h3>
                                    <p className="text-xs text-zinc-550 dark:text-zinc-400 mb-3">
                                        Immediate and irreversible. This will instantly delete your profile, workspaces, projects, and all data.
                                    </p>
                                    <form onSubmit={handleDeletePermanentlySubmit} className="space-y-3 max-w-md">
                                        <input 
                                            type="password" 
                                            value={deletePassword} 
                                            onChange={(e) => setDeletePassword(e.target.value)} 
                                            placeholder="Enter password to confirm permanent deletion"
                                            className="w-full px-3 py-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-zinc-200 text-xs focus:outline-none focus:ring-1 focus:ring-red-500" 
                                            required={!!user?.passwordHash} 
                                        />
                                        <button 
                                            type="submit" 
                                            disabled={deleteAccountPermanentlyMutation.isPending}
                                            className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-500 text-white rounded transition cursor-pointer disabled:opacity-50"
                                        >
                                            {deleteAccountPermanentlyMutation.isPending ? 'Deleting...' : 'Delete Account Permanently'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserSettingsDialog;
