import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useVerifyEmail } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const verifyMutation = useVerifyEmail();
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'error'

  useEffect(() => {
    if (!token) {
      setStatus('error');
      toast.error('Invalid verification link: missing token.');
      return;
    }

    verifyMutation.mutate(token, {
      onSuccess: () => {
        setStatus('success');
        toast.success('Email verified successfully! You can now log in.');
      },
      onError: (err) => {
        setStatus('error');
        const errMsg = err.response?.data?.error?.message || 'Verification failed. The token may have expired.';
        toast.error(errMsg);
      },
    });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900 transition-colors duration-200">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl border border-slate-100 dark:bg-slate-950 dark:border-slate-800 text-center">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold text-xl">
            L
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Email Verification
          </h2>
        </div>

        <div className="mt-8 py-4">
          {status === 'verifying' && (
            <div className="space-y-4">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-slate-600 dark:text-slate-400">Verifying your email address, please wait...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-400">Your email has been verified! You can now log in using your account details.</p>
              <Link
                to="/login"
                className="mt-4 inline-flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 transition-colors"
              >
                Go to Sign In
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-slate-600 dark:text-slate-400">Verification failed. The link might be broken, invalid, or expired.</p>
              <Link
                to="/login"
                className="mt-4 inline-flex w-full justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
              >
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
