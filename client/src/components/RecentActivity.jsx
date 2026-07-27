import React from "react";
import { Clock, Plus, Trash2, Edit, UserPlus, ShieldAlert } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useSelector } from "react-redux";
import { useWorkspaceActivitiesQuery } from "../hooks/useWorkspaces";

const actionIcons = {
  CREATE: { icon: Plus, color: "text-green-600 bg-green-550/10 dark:text-green-400 dark:bg-green-500/10" },
  UPDATE: { icon: Edit, color: "text-blue-600 bg-blue-550/10 dark:text-blue-400 dark:bg-blue-500/10" },
  DELETE: { icon: Trash2, color: "text-red-600 bg-red-550/10 dark:text-red-400 dark:bg-red-500/10" },
  INVITE: { icon: UserPlus, color: "text-emerald-600 bg-emerald-550/10 dark:text-emerald-400 dark:bg-emerald-500/10" },
};

const getActionMessage = (log) => {
  if (log.details) {
    return log.details;
  }
  const label = log.entityType ? log.entityType.toLowerCase() : "item";
  return `performed action: ${log.action} on ${label}`;
};

const RecentActivity = () => {
    const activeWorkspaceId = useSelector((state) => state.ui.activeWorkspaceId);
    const { data, isLoading } = useWorkspaceActivitiesQuery(activeWorkspaceId);
    
    const logs = data?.data || [];

    if (isLoading) {
        return (
            <div className="h-64 animate-pulse bg-slate-100 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800" />
        );
    }

    return (
        <div className="bg-white/80 dark:bg-zinc-900/30 backdrop-blur-sm border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-xl transition-all overflow-hidden shadow-sm">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
                <h2 className="text-sm font-bold text-zinc-900 dark:text-white">Recent Activity</h2>
            </div>

            <div className="p-0">
                {logs.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                            <Clock className="w-8 h-8 text-zinc-600 dark:text-zinc-500" />
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400">No recent activity</p>
                    </div>
                ) : (
                    <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {logs.slice(0, 5).map((log) => {
                            const config = actionIcons[log.action] || { icon: ShieldAlert, color: "text-zinc-500 bg-zinc-500/10" };
                            const Icon = config.icon;

                            return (
                                <div key={log.id} className="p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/40 transition-colors">
                                    <div className="flex items-start gap-4">
                                        {/* Avatar with overlapping action icon badge */}
                                        <div className="relative flex-shrink-0">
                                            <img 
                                                src={log.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(log.user?.name || 'User')}&background=0284c7&color=fff`} 
                                                className="w-8 h-8 rounded-full object-cover border border-zinc-200 dark:border-zinc-800" 
                                                alt="user avatar" 
                                                referrerPolicy="no-referrer"
                                            />
                                            <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full border border-white dark:border-zinc-950 ${config.color} shadow-sm flex items-center justify-center`}>
                                                <Icon className="w-2.5 h-2.5" />
                                            </div>
                                        </div>

                                        {/* Activity Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline justify-between gap-2">
                                                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
                                                    <span className="font-semibold text-zinc-900 dark:text-white mr-0.5">
                                                        {log.user?.name || 'Someone'}
                                                    </span>{' '}
                                                    {getActionMessage(log)}
                                                </p>
                                                <span className="text-xs text-zinc-400 dark:text-zinc-550 whitespace-nowrap flex-shrink-0 font-medium">
                                                    {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-medium truncate">
                                                {log.user?.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentActivity;
