import { useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import MyTasksSidebar from './MyTasksSidebar'
import ProjectSidebar from './ProjectsSidebar'
import WorkspaceDropdown from './WorkspaceDropdown'
import { FolderOpenIcon, LayoutDashboardIcon, SettingsIcon, UsersIcon } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { openModal } from '../features/uiSlice'

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }) => {
    const dispatch = useDispatch();

    const menuItems = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboardIcon },
        { name: 'Projects', href: '/projects', icon: FolderOpenIcon },
        { name: 'Team', href: '/team', icon: UsersIcon },
    ]

    const sidebarRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
                setIsSidebarOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [setIsSidebarOpen]);

    return (
        <div ref={sidebarRef} className={`z-10 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md min-w-68 flex flex-col h-screen max-sm:absolute transition-all ${isSidebarOpen ? 'left-0' : '-left-full'} `} >
            <WorkspaceDropdown />
            <div className='flex-1 overflow-y-scroll no-scrollbar flex flex-col'>
                <div>
                    <div className='p-4'>
                        {menuItems.map((item) => (
                            <NavLink to={item.href} key={item.name} className={({ isActive }) => `flex items-center gap-3 py-2 px-4 text-zinc-800 dark:text-zinc-100 cursor-pointer rounded transition-all ${isActive ? 'bg-zinc-100/70 dark:bg-zinc-900/60 font-semibold text-blue-600 dark:text-blue-400 border-l-2 border-blue-600 pl-3.5' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900/40'}`} >
                                <item.icon size={16} />
                                <p className='text-sm truncate'>{item.name}</p>
                            </NavLink>
                        ))}
                        <button 
                            onClick={() => dispatch(openModal('settings'))}
                            className='flex w-full items-center gap-3 py-2 px-4 text-zinc-800 dark:text-zinc-100 cursor-pointer rounded hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-all'
                        >
                            <SettingsIcon size={16} />
                            <p className='text-sm truncate'>Settings</p>
                        </button>
                    </div>
                    <MyTasksSidebar />
                    <ProjectSidebar />
                </div>


            </div>

        </div>
    )
}

export default Sidebar
