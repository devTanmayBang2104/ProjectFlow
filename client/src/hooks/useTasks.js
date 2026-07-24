import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

/**
 * Fetch detailed task info (includes subtasks, comments, attachments).
 */
export const useTaskDetailsQuery = (taskId) => {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const response = await apiClient.get(`/tasks/${taskId}`);
      return response.data.data;
    },
    enabled: !!taskId,
    staleTime: 1 * 60 * 1000,
  });
};

/**
 * Create a new task.
 */
export const useCreateTaskMutation = (projectId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskData) => {
      const response = await apiClient.post('/tasks', {
        ...taskData,
        projectId,
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      queryClient.setQueryData(['task', data.id], data);
    },
  });
};

/**
 * Update task settings (status, priority, due date, etc.).
 */
export const useUpdateTaskMutation = (projectId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, ...updateData }) => {
      const response = await apiClient.put(`/tasks/${taskId}`, updateData);
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      if (projectId) {
        queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      }
    },
  });
};

/**
 * Delete a task.
 */
export const useDeleteTaskMutation = (projectId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId) => {
      const response = await apiClient.delete(`/tasks/${taskId}`);
      return response.data;
    },
    onSuccess: (data, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      queryClient.removeQueries({ queryKey: ['task', taskId] });
    },
  });
};

// --- SUBTASKS CHECKLIST ---

/**
 * Add a checklist subtask to a task.
 */
export const useAddSubtaskMutation = (taskId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title) => {
      const response = await apiClient.post(`/tasks/${taskId}/subtasks`, { title });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

/**
 * Update/toggle subtask completion state.
 */
export const useUpdateSubtaskMutation = (taskId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ subtaskId, title, isCompleted }) => {
      const response = await apiClient.put(`/tasks/subtasks/${subtaskId}`, { title, isCompleted });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

/**
 * Delete a subtask from a task.
 */
export const useDeleteSubtaskMutation = (taskId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (subtaskId) => {
      const response = await apiClient.delete(`/tasks/subtasks/${subtaskId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

// --- DISCUSSION COMMENTS ---

/**
 * Add a comment to a task.
 */
export const useAddCommentMutation = (taskId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (content) => {
      const response = await apiClient.post(`/tasks/${taskId}/comments`, { content });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

/**
 * Delete a comment from a task.
 */
export const useDeleteCommentMutation = (taskId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (commentId) => {
      const response = await apiClient.delete(`/tasks/comments/${commentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

// --- ATTACHMENTS ---

/**
 * Upload an attachment file to a task.
 */
export const useUploadAttachmentMutation = (taskId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post(`/tasks/${taskId}/attachments`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

/**
 * Delete an attachment from a task.
 */
export const useDeleteAttachmentMutation = (taskId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (attachmentId) => {
      const response = await apiClient.delete(`/tasks/attachments/${attachmentId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
    },
  });
};

// --- LABELS / TAGS ---

/**
 * Create a new workspace label.
 */
export const useCreateLabelMutation = (workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, color }) => {
      const response = await apiClient.post(`/tasks/workspace/${workspaceId}/labels`, { name, color });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', workspaceId] });
    },
  });
};

/**
 * Fetch all labels for a workspace.
 */
export const useWorkspaceLabelsQuery = (workspaceId) => {
  return useQuery({
    queryKey: ['labels', workspaceId],
    queryFn: async () => {
      const response = await apiClient.get(`/tasks/workspace/${workspaceId}/labels`);
      return response.data.data;
    },
    enabled: !!workspaceId,
    staleTime: 10 * 60 * 1000,
  });
};

/**
 * Delete workspace label.
 */
export const useDeleteLabelMutation = (workspaceId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (labelId) => {
      const response = await apiClient.delete(`/tasks/labels/${labelId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['labels', workspaceId] });
    },
  });
};
