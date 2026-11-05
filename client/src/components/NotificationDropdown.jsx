import React, { useState, useRef, useEffect } from "react";
import { Bell, Check, ExternalLink, AtSign, CheckSquare, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  useNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from "../hooks/useNotifications";

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const { data: notifications = [] } = useNotificationsQuery();
  const markAsReadMutation = useMarkNotificationReadMutation();
  const markAllAsReadMutation = useMarkAllNotificationsReadMutation();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }
    setIsOpen(false);

    if (notification.entityType === "TASK" && notification.entityId) {
      navigate(`/taskDetails?taskId=${notification.entityId}`);
    } else if (notification.entityType === "PROJECT" && notification.entityId) {
      navigate(`/projectsDetail?id=${notification.entityId}`);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "TASK_MENTION":
        return <AtSign className="size-3.5 text-blue-500" />;
      case "TASK_ASSIGNED":
        return <CheckSquare className="size-3.5 text-emerald-500" />;
      default:
        return <MessageSquare className="size-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative size-8 flex items-center justify-center bg-white dark:bg-zinc-800 shadow rounded-lg transition hover:scale-105 active:scale-95 cursor-pointer border border-zinc-200 dark:border-zinc-700 focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="size-4 text-zinc-700 dark:text-zinc-200" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-900 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Floating Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 overflow-hidden py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-900 dark:text-white">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsReadMutation.mutate()}
                disabled={markAllAsReadMutation.isPending}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1 disabled:opacity-50"
              >
                <Check className="size-3" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${
                    !n.isRead
                      ? "bg-blue-50/40 dark:bg-blue-950/20"
                      : "bg-transparent"
                  }`}
                >
                  <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex-shrink-0 mt-0.5">
                    {getNotificationIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="size-2 rounded-full bg-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 mt-1">
                      {n.createdAt
                        ? formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })
                        : "just now"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-10 text-center px-4">
                <Bell className="size-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  No notifications yet
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  When teammates tag you in comments or assign tasks, they will appear here.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
