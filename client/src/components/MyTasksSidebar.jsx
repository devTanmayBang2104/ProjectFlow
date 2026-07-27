import { useEffect, useState } from 'react';
import { CheckSquareIcon, ChevronDownIcon, ChevronRightIcon } from 'lucide-react';
import { useActiveWorkspace } from '../hooks/useActiveWorkspace';
import { useProfile } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

function MyTasksSidebar() {
    const { currentWorkspace } = useActiveWorkspace();
    const { data: user } = useProfile();
    const [showMyTasks, setShowMyTasks] = useState(false);
    const [myTasks, setMyTasks] = useState([]);

    const toggleMyTasks = () => setShowMyTasks(prev => !prev);

    const getTaskStatusColor = (status) => {
        switch (status) {
            case 'DONE':
                return 'bg-green-500';
            case 'IN_PROGRESS':
                return 'bg-yellow-500';
            case 'TODO':
                return 'bg-gray-500 dark:bg-zinc-500';
            default:
                return 'bg-gray-400 dark:bg-zinc-400';
        }
    };

    const fetchUserTasks = () => {
        const userId = user?.id || '';
        if (!userId || !currentWorkspace) return;
        const currentWorkspaceTasks = (currentWorkspace.projects || []).flatMap((project) => {
            return (project.tasks || []).filter((task) => task?.assigneeId === userId);
        });

        setMyTasks(currentWorkspaceTasks);
    }

    useEffect(() => {
        fetchUserTasks()
    }, [currentWorkspace, user])

    return (
        <div className="mt-6 px-3">
            <div onClick={toggleMyTasks} className="flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900/40" >
                <div className="flex items-center gap-2">
                    <CheckSquareIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">My Tasks</h3>
                    <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 text-xs px-2 py-0.5 rounded">
                        {myTasks.length}
                    </span>
                </div>
                {showMyTasks ? (
                    <ChevronDownIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                ) : (
                    <ChevronRightIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                )}
            </div>

            {showMyTasks && (
                <div className="mt-2 pl-2">
                    <div className="space-y-1">
                        {myTasks.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-zinc-500 dark:text-zinc-500 text-center">
                                No tasks assigned
                            </div>
                        ) : (
                            myTasks.map((task, index) => (
                                <Link key={index} to={`/taskDetails?projectId=${task.projectId}&taskId=${task.id}`} className="w-full rounded-lg transition-all duration-200 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900/40 hover:text-zinc-900 dark:hover:text-white" >
                                    <div className="flex items-center gap-2 px-3 py-2 w-full min-w-0">
                                        <div className={`w-2 h-2 rounded-full ${getTaskStatusColor(task.status)} flex-shrink-0`} />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold truncate">
                                                {task.title}
                                            </p>
                                            <p className="text-xs text-zinc-500 dark:text-zinc-500 lowercase font-medium">
                                                {task.status.replace('_', ' ')}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyTasksSidebar;
