import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';

/**
 * Fetch details of the currently logged-in user profile.
 */
export const useProfile = () => {
  return useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await apiClient.get('/auth/me');
      return response.data.data;
    },
    retry: false, // Don't retry auth checks repeatedly if user is not logged in
    staleTime: 5 * 60 * 1000, // Profile stays fresh for 5 mins
  });
};

/**
 * Log in mutation
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials) => {
      const response = await apiClient.post('/auth/login', credentials);
      return response.data.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('user', JSON.stringify(data.user));
      // Save CSRF token returned by login to session storage or rely on cookies
      queryClient.setQueryData(['profile'], data.user);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
  });
};

/**
 * Register mutation
 */
export const useRegister = () => {
  return useMutation({
    mutationFn: async (userData) => {
      const response = await apiClient.post('/auth/register', userData);
      return response.data;
    },
  });
};

/**
 * Log out mutation
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/auth/logout');
      return response.data;
    },
    onSuccess: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('currentWorkspaceId');
      queryClient.clear(); // Clear all cached queries upon logout
      window.location.href = '/login';
    },
  });
};

/**
 * Email verification mutation
 */
export const useVerifyEmail = () => {
  return useMutation({
    mutationFn: async (token) => {
      const response = await apiClient.post('/auth/verify-email', { token });
      return response.data;
    },
  });
};

/**
 * Resend verification email mutation
 */
export const useResendVerification = () => {
  return useMutation({
    mutationFn: async (email) => {
      const response = await apiClient.post('/auth/resend-verification', { email });
      return response.data;
    },
  });
};

/**
 * Forgot password mutation
 */
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email) => {
      const response = await apiClient.post('/auth/forgot-password', { email });
      return response.data;
    },
  });
};

/**
 * Reset password mutation
 */
export const useResetPassword = () => {
  return useMutation({
    mutationFn: async ({ token, newPassword }) => {
      const response = await apiClient.post('/auth/reset-password', { token, newPassword });
      return response.data;
    },
  });
};

/**
 * Change password mutation (active profile settings)
 */
export const useChangePassword = () => {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }) => {
      const response = await apiClient.put('/users/password', { currentPassword, newPassword });
      return response.data;
    },
  });
};

/**
 * Update user display profile settings
 */
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileData) => {
      const response = await apiClient.put('/users/profile', profileData);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

/**
 * Upload avatar image file mutation
 */
export const useUploadAvatar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('avatar', file);
      const response = await apiClient.post('/users/profile/avatar', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

/**
 * Remove avatar image mutation
 */
export const useRemoveAvatar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.delete('/users/profile/avatar');
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

/**
 * Update theme, language, and notification toggles preferences
 */
export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (preferences) => {
      const response = await apiClient.put('/users/preferences', preferences);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
};

/**
 * Soft delete account (30-day deactivation)
 */
export const useDeactivateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password) => {
      const response = await apiClient.delete('/users/account', { data: { password } });
      return response.data;
    },
    onSuccess: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('currentWorkspaceId');
      queryClient.clear();
      window.location.href = '/login';
    },
  });
};

/**
 * Permanently delete account immediately
 */
export const useDeleteAccountPermanently = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (password) => {
      const response = await apiClient.delete('/users/account/permanent', { data: { password } });
      return response.data;
    },
    onSuccess: () => {
      localStorage.removeItem('user');
      localStorage.removeItem('currentWorkspaceId');
      queryClient.clear();
      window.location.href = '/login';
    },
  });
};

/**
 * Recover account mutation
 */
export const useRecoverAccount = () => {
  return useMutation({
    mutationFn: async ({ email, password }) => {
      const response = await apiClient.post('/users/account/recover', { email, password });
      return response.data;
    },
  });
};
