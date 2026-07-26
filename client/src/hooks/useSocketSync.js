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

    socket.on('connect', () => {
      console.log(`[Socket] Connected successfully with ID: ${socket.id}`);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err);
    });

    // 1. Personal Notification Received
    socket.on('notification:new', (notification) => {
      console.log('[Socket] notification:new received:', notification);
      toast(notification.message || 'New notification received', {
        icon: '🔔',
        duration: 4000,
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // 2. Activity Log Added
    socket.on('activity:new', (log) => {
      console.log('[Socket] activity:new received:', log);
      if (log.workspaceId === activeWorkspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId, 'activities'] });
      }
    });

    // 3. Task Created, Updated, or Deleted
    socket.on('task:changed', ({ taskId, action, taskData }) => {
      console.log('[DEBUG CLIENT SOCKET] task:changed received for taskId:', taskId, 'action:', action, 'taskData:', taskData);
      
      // Invalidate the specific task query
      console.log('[DEBUG CLIENT SOCKET] Invalidating task details query for taskId:', taskId);
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      console.log('[DEBUG CLIENT SOCKET] Task details query invalidation triggered for taskId:', taskId);
      
      // Invalidate the project query if a projectId is provided in the task details
      const projectId = taskData?.projectId || taskData?.project?.id;
      if (projectId) {
        console.log('[DEBUG CLIENT SOCKET] Invalidating project query for projectId:', projectId);
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      }
      
      // Invalidate the active workspace data to refresh kanban/lists
      if (activeWorkspaceId) {
        console.log('[DEBUG CLIENT SOCKET] Invalidating workspace query for workspaceId:', activeWorkspaceId);
        queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId] });
      }
    });

    // Cleanup listeners on unmount or dependency change
    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('notification:new');
      socket.off('activity:new');
      socket.off('task:changed');
    };
  }, [user, activeWorkspaceId, queryClient]);
};
