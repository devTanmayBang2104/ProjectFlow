import { Plus } from 'lucide-react'
import { useState } from 'react'
import StatsGrid from '../components/StatsGrid'
import ProjectOverview from '../components/ProjectOverview'
import RecentActivity from '../components/RecentActivity'
import TasksSummary from '../components/TasksSummary'
import CreateProjectDialog from '../components/CreateProjectDialog'

import { useProfile } from '../hooks/useAuth'
import { useActiveWorkspace } from '../hooks/useActiveWorkspace'

const Dashboard = () => {
    const { data: user } = useProfile()
    const { isAdminOrOwner } = useActiveWorkspace()
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    return (
        <div className='max-w-6xl mx-auto'>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 ">
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-1"> Welcome back, {user?.name || 'User'} </h1>
                    <p className="text-gray-500 dark:text-zinc-400 text-sm"> Here's what's happening with your projects today </p>
                </div>

                {isAdminOrOwner && (
                    <button onClick={() => setIsDialogOpen(true)} className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white transition duration-200 shadow-md shadow-blue-500/10 cursor-pointer" >
                        <Plus size={16} /> New Project
                    </button>
                )}

                <CreateProjectDialog isDialogOpen={isDialogOpen} setIsDialogOpen={setIsDialogOpen} />
            </div>

            <StatsGrid />

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <ProjectOverview />
                    <RecentActivity />
                </div>
                <div>
                    <TasksSummary />
                </div>
            </div>
        </div>
    )
}

export default Dashboard
