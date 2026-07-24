import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

/**
 * Fetch notifications list.
 */
export const useNotificationsQuery = (unreadOnly = false) => {
  return useQuery({
    queryKey: ['notifications', { unreadOnly }],
    queryFn: async () => {
      const response = await apiClient.get('/notifications', {
        params: { unread: unreadOnly }
      });
      return response.data.data;
    },
    staleTime: 30 * 1000, // Fresh for 30s
  });
};

/**
 * Mark a single notification as read.
 */
export const useMarkNotificationReadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId) => {
      const response = await apiClient.put(`/notifications/${notificationId}/read`);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

/**
 * Mark all user notifications as read.
 */
export const useMarkAllNotificationsReadMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.put('/notifications/read-all');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
