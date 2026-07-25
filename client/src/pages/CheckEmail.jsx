import React from 'react';
import { Link } from 'react-router-dom';
import { Kanban, Mail } from 'lucide-react';

const CheckEmail = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-slate-900 transition-colors duration-200">
      <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-8 shadow-xl border border-slate-100 dark:bg-slate-955 dark:border-slate-800 text-center">
        <div>
          {/* Brand Logo */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
            <Kanban className="size-6" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Check your email
          </h2>
        </div>

        <div className="mt-8 space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
            <Mail className="h-8 w-8" />
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-slate-650 dark:text-slate-350 leading-relaxed">
              We have sent a secure verification link to your registered email address. 
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Please click the link in the email to verify your email address and activate your account. Once verified, you will be able to log in.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/login"
              className="flex w-full justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/10 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckEmail;
