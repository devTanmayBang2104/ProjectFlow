import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'
import Sidebar from '../components/Sidebar'
import { Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { loadTheme } from '../features/themeSlice'
import { Loader2Icon } from 'lucide-react'
import CreateWorkspaceDialog from '../components/CreateWorkspaceDialog'
import UserSettingsDialog from '../components/UserSettingsDialog'

const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const dispatch = useDispatch()

    // Initial load of theme
    useEffect(() => {
        dispatch(loadTheme())
    }, [])

    return (
        <div className="flex bg-white dark:bg-zinc-950 text-gray-900 dark:text-slate-100">
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
        </div>
    )
}

export default Layout
