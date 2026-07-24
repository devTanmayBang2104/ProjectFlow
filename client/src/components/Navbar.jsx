import React, { useState, useRef, useEffect } from 'react';
import { SearchIcon, PanelLeft, MoonIcon, SunIcon, LogOut, Settings } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../features/themeSlice';
import { openModal } from '../features/uiSlice';
import { useProfile, useLogout } from '../hooks/useAuth';
import { assets } from '../assets/assets';

const Navbar = ({ setIsSidebarOpen }) => {
    const dispatch = useDispatch();
    const { theme } = useSelector(state => state.theme);
    const { data: user } = useProfile();
    const logoutMutation = useLogout();

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSettingsClick = () => {
        dispatch(openModal('settings'));
        setIsMenuOpen(false);
    };

    const handleLogoutClick = () => {
        logoutMutation.mutate();
    };

    return (
        <div className="w-full bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 xl:px-16 py-3 flex-shrink-0">
            <div className="flex items-center justify-between max-w-6xl mx-auto">
                {/* Left section */}
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    {/* Sidebar Trigger */}
                    <button onClick={() => setIsSidebarOpen((prev) => !prev)} className="sm:hidden p-2 rounded-lg transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800" >
                        <PanelLeft size={20} />
                    </button>

                    {/* Search Input */}
                    <div className="relative flex-1 max-w-sm">
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3.5" />
                        <input
                            type="text"
                            placeholder="Search projects, tasks..."
                            className="pl-8 pr-4 py-2 w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-3">
                    {/* Theme Toggle */}
                    <button onClick={() => dispatch(toggleTheme())} className="size-8 flex items-center justify-center bg-white dark:bg-zinc-800 shadow rounded-lg transition hover:scale-105 active:scale-95 cursor-pointer">
                        {
                            theme === "light"
                                ? (<MoonIcon className="size-4 text-gray-800 dark:text-gray-200" />)
                                : (<SunIcon className="size-4 text-yellow-400" />)
                        }
                    </button>

                    {/* User Profile Button and Dropdown */}
                    <div className="relative" ref={menuRef}>
                        <button 
                            onClick={() => setIsMenuOpen((prev) => !prev)}
                            className="flex items-center justify-center size-8 rounded-full border border-gray-200 dark:border-zinc-800 hover:ring-2 hover:ring-blue-500/50 transition cursor-pointer overflow-hidden focus:outline-none"
                        >
                            <img 
                                src={user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0284c7&color=fff`} 
                                alt="User Avatar" 
                                className="w-full h-full object-cover" 
                            />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850 rounded-lg shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                {/* User Info Header */}
                                <div className="px-4 py-2.5 border-b border-gray-100 dark:border-zinc-850">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                        {user?.name || "User"}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                        {user?.email || ""}
                                    </p>
                                </div>

                                {/* Menu Items */}
                                <div className="p-1">
                                    <button 
                                        onClick={handleSettingsClick}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900 rounded-md transition text-left cursor-pointer"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Profile Settings
                                    </button>

                                    <hr className="border-gray-100 dark:border-zinc-850 my-1" />

                                    <button 
                                        onClick={handleLogoutClick}
                                        disabled={logoutMutation.isPending}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition text-left cursor-pointer disabled:opacity-50"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        {logoutMutation.isPending ? "Logging out..." : "Log Out"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
