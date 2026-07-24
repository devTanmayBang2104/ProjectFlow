import React, { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '../api/apiClient';
import { toast } from 'react-hot-toast';

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasTriggered = useRef(false);

  useEffect(() => {
    // Avoid double trigger in React StrictMode
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      toast.error('Google authorization code missing.');
      navigate('/login');
      return;
    }

    const processLogin = async () => {
      try {
        const response = await apiClient.post('/auth/google/callback', { code, state });
        const { user } = response.data.data;

        localStorage.setItem('user', JSON.stringify(user));
        queryClient.setQueryData(['profile'], user);
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        queryClient.invalidateQueries({ queryKey: ['workspaces'] });

        toast.success('Logged in with Google successfully!');
        navigate('/');
      } catch (err) {
        console.error('[Google Callback Error] Failed to complete login:', err);
        const errMsg = err.response?.data?.error?.message || 'Google authentication failed.';
        toast.error(errMsg);
        navigate('/login');
      }
    };

    processLogin();
  }, [searchParams, navigate, queryClient]);

  return (
    <div className="flex min-h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <div className="text-center space-y-4">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300">
          Completing Google sign-in, please wait...
        </p>
      </div>
    </div>
  );
};

export default GoogleCallback;
