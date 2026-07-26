import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Kanban, SearchIcon, PanelLeft, MoonIcon, SunIcon, LogOut, Settings, Folder, CheckSquare } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleTheme } from '../features/themeSlice';
import { openModal } from '../features/uiSlice';
import { useProfile, useLogout } from '../hooks/useAuth';
import { useActiveWorkspace } from '../hooks/useActiveWorkspace';
import { assets } from '../assets/assets';

const Navbar = ({ setIsSidebarOpen }) => {
    const dispatch = useDispatch();
    const { theme } = useSelector(state => state.theme);
    const { data: user } = useProfile();
    const logoutMutation = useLogout();

    const { currentWorkspace } = useActiveWorkspace();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const searchDropdownRef = useRef(null);

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu & search dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target)) {
                setIsSearchFocused(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const projects = currentWorkspace?.projects || [];
    
    const filteredProjects = searchQuery.trim() === '' ? [] : projects.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);

    const filteredTasks = searchQuery.trim() === '' ? [] : projects.flatMap(p => p.tasks || []).filter(t => 
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.description || '').toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 5);

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
                    <button onClick={() => setIsSidebarOpen((prev) => !prev)} className="sm:hidden p-2 rounded-lg transition-colors text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-zinc-800 flex-shrink-0" >
                        <PanelLeft size={20} />
                    </button>

                    {/* ProjectFlow Logo */}
                    <Link to="/dashboard" className="flex items-center gap-2 mr-2 flex-shrink-0 select-none cursor-pointer">
                        <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-500/10">
                            <Kanban className="size-4" />
                        </div>
                        <span className="text-base font-bold tracking-tight text-zinc-900 dark:text-white max-sm:hidden">
                            ProjectFlow
                        </span>
                    </Link>

                    {/* Search Input */}
                    <div className="relative flex-1 max-w-sm" ref={searchDropdownRef}>
                        <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-400 size-3.5" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            placeholder="Search projects, tasks..."
                            className="pl-8 pr-4 py-2 w-full bg-white dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                        {isSearchFocused && searchQuery.trim() !== '' && (
                            <div className="absolute left-0 mt-2 w-full bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-900 rounded-xl shadow-2xl z-50 overflow-hidden max-h-96 overflow-y-auto py-2">
                                {filteredProjects.length === 0 && filteredTasks.length === 0 ? (
                                    <div className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-500 text-center">
                                        No results found for "{searchQuery}"
                                    </div>
                                ) : (
                                    <>
                                        {filteredProjects.length > 0 && (
                                            <div>
                                                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                                                    Projects
                                                </div>
                                                {filteredProjects.map(p => (
                                                    <Link 
                                                        key={p.id}
                                                        to={`/projectsDetail?id=${p.id}`}
                                                        onClick={() => { setSearchQuery(''); setIsSearchFocused(false); }}
                                                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-750 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900/60 transition cursor-pointer"
                                                    >
                                                        <Folder className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                                                        <span className="font-medium truncate">{p.name}</span>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                        {filteredProjects.length > 0 && filteredTasks.length > 0 && (
                                            <hr className="border-gray-100/50 dark:border-zinc-900/50 my-1.5" />
                                        )}
                                        {filteredTasks.length > 0 && (
                                            <div>
                                                <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                                                    Tasks
                                                </div>
                                                {filteredTasks.map(t => (
                                                    <Link 
                                                        key={t.id}
                                                        to={`/taskDetails?projectId=${t.projectId}&taskId=${t.id}`}
                                                        onClick={() => { setSearchQuery(''); setIsSearchFocused(false); }}
                                                        className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-750 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900/60 transition cursor-pointer"
                                                    >
                                                        <CheckSquare className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-medium truncate">{t.title}</div>
                                                            <div className="text-[9px] text-gray-400 dark:text-zinc-500 lowercase truncate">
                                                                Status: {t.status.replace('_', ' ')}
                                                            </div>
                                                        </div>
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
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
                            <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-900 rounded-xl shadow-2xl py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                                {/* User Info Header */}
                                <div className="px-4 py-2 flex items-center gap-3">
                                    <img 
                                        src={user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0284c7&color=fff`} 
                                        alt="User Avatar" 
                                        className="size-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-zinc-800 flex-shrink-0" 
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                            {user?.name || "User"}
                                        </p>
                                        <p className="text-[10px] text-gray-500 dark:text-zinc-400 truncate">
                                            {user?.email || ""}
                                        </p>
                                    </div>
                                </div>

                                <hr className="border-gray-100/50 dark:border-zinc-900/50 my-2" />

                                {/* Menu Items */}
                                <div className="px-1.5">
                                    <button 
                                        onClick={handleSettingsClick}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-750 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-900/85 rounded-lg transition text-left cursor-pointer"
                                    >
                                        <Settings className="w-4 h-4 text-zinc-400" />
                                        Manage Account
                                    </button>

                                    <hr className="border-gray-100/50 dark:border-zinc-900/50 my-1.5" />

                                    <button 
                                        onClick={handleLogoutClick}
                                        disabled={logoutMutation.isPending}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition text-left cursor-pointer disabled:opacity-50"
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
