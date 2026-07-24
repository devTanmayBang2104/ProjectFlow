import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Plus, UserPlus } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { setActiveWorkspaceId, openModal } from "../features/uiSlice";
import { useWorkspacesQuery } from "../hooks/useWorkspaces";
import { useNavigate } from "react-router-dom";
import InviteMemberDialog from "./InviteMemberDialog";

function WorkspaceDropdown() {
    const { data: workspaces = [], isLoading } = useWorkspacesQuery();
    const activeWorkspaceId = useSelector((state) => state.ui.activeWorkspaceId);
    
    // Find the currently active workspace object from fetched data
    const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;
    
    const [isOpen, setIsOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const dropdownRef = useRef(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // Auto-select the first workspace if none is currently selected
    useEffect(() => {
        if (workspaces.length > 0 && !activeWorkspaceId) {
            dispatch(setActiveWorkspaceId(workspaces[0].id));
        }
    }, [workspaces, activeWorkspaceId, dispatch]);

    const onSelectWorkspace = (id) => {
        dispatch(setActiveWorkspaceId(id));
        setIsOpen(false);
        navigate('/');
    };

    const handleCreateWorkspaceClick = () => {
        dispatch(openModal('createWorkspace'));
        setIsOpen(false);
    };

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (isLoading) {
        return (
            <div className="m-4 p-3 animate-pulse bg-slate-100 dark:bg-zinc-800 rounded h-14"></div>
        );
    }

    return (
        <div className="relative m-4" ref={dropdownRef}>
            <button onClick={() => setIsOpen(prev => !prev)} className="w-full flex items-center justify-between p-3 h-auto text-left rounded hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer" >
                <div className="flex items-center gap-3">
                    <img 
                        src={currentWorkspace?.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentWorkspace?.name || 'Workspace')}&background=3b82f6&color=fff`} 
                        alt={currentWorkspace?.name} 
                        className="w-8 h-8 rounded shadow object-cover" 
                    />
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                            {currentWorkspace?.name || "Select Workspace"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                            {workspaces.length} workspace{workspaces.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded shadow-lg top-full left-0 mt-1">
                    <div className="p-2 max-h-60 overflow-y-auto">
                        <p className="text-xs text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2 px-2">
                            Workspaces
                        </p>
                        {workspaces.map((ws) => (
                            <div key={ws.id} onClick={() => onSelectWorkspace(ws.id)} className="flex items-center gap-3 p-2 cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-zinc-800" >
                                <img 
                                    src={ws.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(ws.name)}&background=3b82f6&color=fff`} 
                                    alt={ws.name} 
                                    className="w-6 h-6 rounded object-cover" 
                                />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                                        {ws.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-zinc-400 truncate">
                                        {ws.slug}
                                    </p>
                                </div>
                                {activeWorkspaceId === ws.id && (
                                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-700" />

                    <div 
                        onClick={() => { setIsInviteOpen(true); setIsOpen(false); }}
                        className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800" 
                    >
                        <p className="flex items-center text-xs gap-2 my-1 w-full text-zinc-650 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white font-medium">
                            <UserPlus className="w-4 h-4 text-blue-500" /> Invite to Workspace
                        </p>
                    </div>

                    <hr className="border-gray-200 dark:border-zinc-700" />

                    <div 
                        onClick={handleCreateWorkspaceClick}
                        className="p-2 cursor-pointer rounded group hover:bg-gray-100 dark:hover:bg-zinc-800" 
                    >
                        <p className="flex items-center text-xs gap-2 my-1 w-full text-blue-600 dark:text-blue-400 group-hover:text-blue-500 dark:group-hover:text-blue-300 font-medium">
                            <Plus className="w-4 h-4" /> Create Workspace
                        </p>
                    </div>
                </div>
            )}

            <InviteMemberDialog isDialogOpen={isInviteOpen} setIsDialogOpen={setIsInviteOpen} />
        </div>
    );
}

export default WorkspaceDropdown;
