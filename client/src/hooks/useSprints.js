import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

/**
 * Fetch all sprints in a project.
 */
export const useProjectSprintsQuery = (projectId) => {
  return useQuery({
    queryKey: ['sprints', projectId],
    queryFn: async () => {
      const response = await apiClient.get(`/sprints/project/${projectId}`);
      return response.data.data;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Create a sprint.
 */
export const useCreateSprintMutation = (projectId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sprintData) => {
      const response = await apiClient.post('/sprints', {
        ...sprintData,
        projectId,
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
};

/**
 * Update sprint.
 */
export const useUpdateSprintMutation = (sprintId, projectId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (updateData) => {
      const response = await apiClient.put(`/sprints/${sprintId}`, updateData);
      return response.data.data;
    },
    onSuccess: () => {
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      }
    },
  });
};

/**
 * Delete a sprint.
 */
export const useDeleteSprintMutation = (projectId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sprintId) => {
      const response = await apiClient.delete(`/sprints/${sprintId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });
};
