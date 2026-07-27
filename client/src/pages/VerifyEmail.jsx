import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useVerifyEmail, useResendVerification } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { Kanban } from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const verifyMutation = useVerifyEmail();
  const resendMutation = useResendVerification();
  
  const [status, setStatus] = useState('verifying'); // 'verifying', 'success', 'expired', 'error'
  const [email, setEmail] = useState('');

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
        const errMsg = err.response?.data?.error?.message || 'Verification failed. The token may have expired.';
        if (errMsg.toLowerCase().includes('expired')) {
          setStatus('expired');
        } else {
          setStatus('error');
        }
        toast.error(errMsg);
      },
    });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 dark:bg-zinc-950 px-4 py-12 relative overflow-hidden transition-colors duration-200">
      {/* Background glowing radial gradients */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white/85 dark:bg-zinc-900/30 backdrop-blur-sm p-8 shadow-2xl border border-zinc-200 dark:border-zinc-800/80 text-center relative z-10">
        <div>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Kanban className="size-6" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Email Verification
          </h2>
        </div>

        <div className="mt-8 py-4">
          {status === 'verifying' && (
            <div className="space-y-4">
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">Verifying your email address, please wait...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium">Your email has been verified! You can now log in using your account details.</p>
              <Link
                to="/login"
                className="mt-4 inline-flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 transition-colors"
              >
                Go to Sign In
              </Link>
            </div>
          )}

          {status === 'expired' && (
            <div className="space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-zinc-900 dark:text-white font-semibold text-lg">Verification link expired</p>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed font-medium">
                Verification links expire after 24 hours. Please enter your email address to request a new link.
              </p>
              
              <div className="pt-2 text-left">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Address
                </label>
                <input 
                  type="email" 
                  placeholder="you@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-zinc-205 dark:border-zinc-800 rounded-lg text-sm bg-white/80 dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <button
                type="button"
                disabled={resendMutation.isPending}
                onClick={() => {
                  if (!email) {
                    toast.error('Please enter your email address.');
                    return;
                  }
                  resendMutation.mutate(email, {
                    onSuccess: () => {
                      toast.success('A new email verification link has been sent!');
                      navigate('/check-email');
                    },
                    onError: (resendErr) => {
                      const resendMsg = resendErr.response?.data?.error?.message || 'Failed to resend email. Please try again.';
                      toast.error(resendMsg);
                    }
                  });
                }}
                className="w-full justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {resendMutation.isPending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-zinc-650 dark:text-zinc-400 text-sm font-medium">Verification failed. The link might be broken or invalid.</p>
              <Link
                to="/login"
                className="mt-4 inline-flex w-full justify-center rounded-lg border border-zinc-300 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-300 dark:hover:bg-zinc-850 transition-colors"
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
