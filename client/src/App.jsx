import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import { Toaster } from "react-hot-toast";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import { useSocketSync } from "./hooks/useSocketSync";

// Route-level code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const Team = lazy(() => import("./pages/Team"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const TaskDetails = lazy(() => import("./pages/TaskDetails"));

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const GoogleCallback = lazy(() => import("./pages/GoogleCallback"));
const CheckEmail = lazy(() => import("./pages/CheckEmail"));

const PageLoader = () => (
  <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-[#0d1117]">
    <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
  </div>
);

const App = () => {
    useSocketSync();
    return (
        <>
            <Toaster />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    {/* Public Auth Routes */}
                    <Route element={<PublicRoute />}>
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/check-email" element={<CheckEmail />} />
                    </Route>

                    {/* Verification/Callback Routes */}
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/google-callback" element={<GoogleCallback />} />

                    {/* Gated Application Routes */}
                    <Route element={<ProtectedRoute />}>
                        <Route element={<Layout />}>
                            <Route path="/dashboard" element={<Dashboard />} />
                            <Route path="/team" element={<Team />} />
                            <Route path="/projects" element={<Projects />} />
                            <Route path="/projectsDetail" element={<ProjectDetails />} />
                            <Route path="/taskDetails" element={<TaskDetails />} />
                        </Route>
                    </Route>
                </Routes>
            </Suspense>
        </>
    );
};

export default App;
