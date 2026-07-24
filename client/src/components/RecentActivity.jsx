import React from "react";
import { Clock, Square, Plus, Trash2, Edit, MessageSquare, UserPlus, UserMinus, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { useSelector } from "react-redux";
import { useWorkspaceActivitiesQuery } from "../hooks/useWorkspaces";

const actionIcons = {
  CREATE: { icon: Plus, color: "text-green-500 bg-green-500/10" },
  UPDATE: { icon: Edit, color: "text-blue-500 bg-blue-500/10" },
  DELETE: { icon: Trash2, color: "text-red-500 bg-red-500/10" },
  INVITE: { icon: UserPlus, color: "text-emerald-500 bg-emerald-500/10" },
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
        <div className="bg-white dark:bg-zinc-950 dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 rounded-lg transition-all overflow-hidden">
            <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
                <h2 className="text-md text-zinc-800 dark:text-zinc-300">Recent Activity</h2>
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
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {logs.slice(0, 5).map((log) => {
                            const config = actionIcons[log.action] || { icon: ShieldAlert, color: "text-gray-500 bg-gray-500/10" };
                            const Icon = config.icon;

                            return (
                                <div key={log.id} className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-2 rounded-lg ${config.color}`}>
                                            <Icon className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between">
                                                <p className="text-sm text-zinc-800 dark:text-zinc-300">
                                                    <span className="font-semibold text-zinc-900 dark:text-white">
                                                        {log.user?.name || 'Someone'}
                                                    </span>{' '}
                                                    {getActionMessage(log)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                                                <span>{log.user?.email}</span>
                                                <span>•</span>
                                                <span>
                                                    {format(new Date(log.createdAt), "MMM d, h:mm a")}
                                                </span>
                                            </div>
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
