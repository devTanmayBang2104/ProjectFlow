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
    socket.on('notification_received', (notification) => {
      toast(notification.message || 'New notification received', {
        icon: '🔔',
        duration: 4000,
      });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    // 2. Activity Log Added
    socket.on('activity_logged', (log) => {
      if (log.workspaceId === activeWorkspaceId) {
        queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId, 'activities'] });
      }
    });

    // 3. Task Created
    socket.on('task_created', (task) => {
      queryClient.invalidateQueries({ queryKey: ['project', task.projectId] });
      queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId] });
    });

    // 4. Task Updated
    socket.on('task_updated', (task) => {
      queryClient.invalidateQueries({ queryKey: ['task', task.id] });
      queryClient.invalidateQueries({ queryKey: ['project', task.projectId] });
      queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId] });
    });

    // 5. Task Deleted
    socket.on('task_deleted', ({ taskId, projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['workspace', activeWorkspaceId] });
    });

    // Cleanup listeners on unmount or dependency change
    return () => {
      socket.off('notification_received');
      socket.off('activity_logged');
      socket.off('task_created');
      socket.off('task_updated');
      socket.off('task_deleted');
    };
  }, [user, activeWorkspaceId, queryClient]);
};
