import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

/**
 * Fetch all workspaces the current user belongs to.
 */
export const useWorkspacesQuery = () => {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await apiClient.get('/workspaces');
      return response.data.data;
    },
    staleTime: 10 * 60 * 1000, // list of workspaces stays fresh for 10 mins
  });
};

/**
 * Fetch details of a single workspace by ID (includes member profiles).
 */
export const useWorkspaceDetailsQuery = (workspaceId) => {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: async () => {
      const response = await apiClient.get(`/workspaces/${workspaceId}`);
      return response.data.data;
    },
    enabled: !!workspaceId, // Only execute query if workspaceId is provided
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch workspace activity audit logs.
 */
export const useWorkspaceActivitiesQuery = (workspaceId, page = 1) => {
  return useQuery({
    queryKey: ['workspace', workspaceId, 'activities', page],
    queryFn: async () => {
      const response = await apiClient.get(`/workspaces/${workspaceId}/activities`, {
        params: { page, limit: 15 }
      });
      return response.data;
    },
    enabled: !!workspaceId,
    staleTime: 2 * 60 * 1000, // Activity log fresh for 2 mins
  });
};

/**
 * Create a workspace.
 */
export const useCreateWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (workspaceData) => {
      const response = await apiClient.post('/workspaces', workspaceData);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      // Proactively cache new workspace details
      queryClient.setQueryData(['workspace', data.id], data);
    },
  });
};

/**
 * Update workspace settings.
 */
export const useUpdateWorkspaceMutation = (workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updateData) => {
      const response = await apiClient.put(`/workspaces/${workspaceId}`, updateData);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.setQueryData(['workspace', workspaceId], data);
    },
  });
};

/**
 * Delete workspace.
 */
export const useDeleteWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (workspaceId) => {
      const response = await apiClient.delete(`/workspaces/${workspaceId}`);
      return response.data;
    },
    onSuccess: (data, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.removeQueries({ queryKey: ['workspace', workspaceId] });
    },
  });
};

/**
 * Invite and add a user to the workspace.
 */
export const useAddWorkspaceMemberMutation = (workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, role }) => {
      const response = await apiClient.post(`/workspaces/${workspaceId}/members`, { email, role });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    },
  });
};

/**
 * Remove a member from the workspace.
 */
export const useRemoveWorkspaceMemberMutation = (workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (memberId) => {
      const response = await apiClient.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    },
  });
};
