import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

/**
 * Fetch all projects inside a specific workspace.
 */
export const useProjectsQuery = (workspaceId) => {
  return useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: async () => {
      const response = await apiClient.get(`/projects/workspace/${workspaceId}`);
      return response.data.data;
    },
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Fetch detailed single project board.
 */
export const useProjectDetailsQuery = (projectId) => {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/projects/${projectId}`);
      return response.data.data;
    },
    enabled: !!projectId,
    staleTime: 2 * 60 * 1000, // Board data fresh for 2 mins
  });
};

/**
 * Create a new project.
 */
export const useCreateProjectMutation = (workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectData) => {
      const response = await apiClient.post('/projects', {
        ...projectData,
        workspaceId,
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.setQueryData(['project', data.id], data);
    },
  });
};

/**
 * Update project details.
 */
export const useUpdateProjectMutation = (projectId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updateData) => {
      const response = await apiClient.put(`/projects/${projectId}`, updateData);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      if (data.workspaceId) {
        queryClient.invalidateQueries({ queryKey: ['projects', data.workspaceId] });
      }
    },
  });
};

/**
 * Delete a project.
 */
export const useDeleteProjectMutation = (workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (projectId) => {
      const response = await apiClient.delete(`/projects/${projectId}`);
      return response.data;
    },
    onSuccess: (data, projectId) => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      queryClient.removeQueries({ queryKey: ['project', projectId] });
    },
  });
};

/**
 * Assign a user to the project team.
 */
export const useAddProjectMemberMutation = (projectId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      const response = await apiClient.post(`/projects/${projectId}/members`, { userId });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
};

/**
 * Unassign a user from the project team.
 */
export const useRemoveProjectMemberMutation = (projectId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId) => {
      const response = await apiClient.delete(`/projects/${projectId}/members/${userId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
};
