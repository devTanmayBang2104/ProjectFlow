import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon } from 'lucide-react'
import CreateWorkspaceDialog from '../components/CreateWorkspaceDialog'
import UserSettingsDialog from '../components/UserSettingsDialog'
import WorkspaceSettingsDialog from '../components/WorkspaceSettingsDialog'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const dispatch = useDispatch()

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [])

    return (
        <div className="flex bg-slate-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 relative min-h-screen overflow-hidden">
            {/* Background glowing radial gradients */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/5 dark:bg-purple-500/5 rounded-full blur-[150px] pointer-events-none"></div>

            <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col h-screen">
                <Navbar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
                <div className="flex-1 h-full p-6 xl:p-10 xl:px-16 overflow-y-scroll">
                    <Outlet />
                </div>
            </div>
            {/* Modal Dialogs */}
            <CreateWorkspaceDialog />
            <UserSettingsDialog />
            <WorkspaceSettingsDialog />
        </div>
    )
}

export default Layout
