import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const forgotPasswordMutation = useForgotPassword();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address.');
      return;
    }

    forgotPasswordMutation.mutate(email, {
      onSuccess: () => {
        setSubmitted(true);
        toast.success('Recovery link sent if the account exists.');
      },
      onError: (err) => {
        const errMsg = err.response?.data?.error?.message || 'Request failed. Please try again.';
        toast.error(errMsg);
      },
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-900 transition-colors duration-200">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl border border-slate-100 dark:bg-slate-950 dark:border-slate-800">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold text-xl">
            L
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Forgot Password
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Enter your email to receive a password reset link
          </p>
        </div>

        {!submitted ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={forgotPasswordMutation.isPending}
                className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-slate-950 transition-all cursor-pointer"
              >
                {forgotPasswordMutation.isPending ? 'Sending...' : 'Send Recovery Link'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-slate-600 dark:text-slate-400">
              If an account is associated with <strong>{email}</strong>, you will receive an email shortly containing a link to reset your password.
            </p>
          </div>
        )}

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:text-blue-500 dark:text-blue-400"
          >
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
