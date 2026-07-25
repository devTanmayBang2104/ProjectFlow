import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '../services/socket';
import { useProfile } from './useAuth';
import { toast } from 'react-hot-toast';

export const useSocketSync = () => {
  const { data: user } = useProfile();
  const activeWorkspaceId = useSelector((state) => state.ui.activeWorkspaceId);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) {
      if (socket.connected) {
        socket.disconnect();
      }
      return;
    }

    // Connect socket if not already connected
    if (!socket.connected) {
      socket.connect();
    }

    // Listen to real-time events from server
    
    // 1. Personal Notification Received
    socket.on('notification:new', (notification) => {
      toast(notification.message || 'New notification received', {
        icon: '🔔',
        duration: 4000,
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // 2. Activity Log Added
    socket.on('activity:new', (log) => {
      if (log.workspaceId === activeWorkspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId, 'activities'] });
      }
    });

    // 3. Task Created, Updated, or Deleted
    socket.on('task:changed', ({ taskId, action, taskData }) => {
      // Invalidate the specific task query
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      
      // Invalidate the project query if a projectId is provided in the task details
      const projectId = taskData?.projectId || taskData?.project?.id;
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      }
      
      // Invalidate the active workspace data to refresh kanban/lists
      if (activeWorkspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId] });
      }
    });

    // Cleanup listeners on unmount or dependency change
    return () => {
      socket.off('notification:new');
      socket.off('activity:new');
      socket.off('task:changed');
    };
  }, [user, activeWorkspaceId, queryClient]);
};
