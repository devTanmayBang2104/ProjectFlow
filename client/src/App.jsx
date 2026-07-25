import { Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import { Toaster } from "react-hot-toast";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Team from "./pages/Team";
import ProjectDetails from "./pages/ProjectDetails";
import TaskDetails from "./pages/TaskDetails";

import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import GoogleCallback from "./pages/GoogleCallback";
import CheckEmail from "./pages/CheckEmail";
import { useSocketSync } from "./hooks/useSocketSync";

import Landing from "./pages/Landing";

const App = () => {
    useSocketSync();
    return (
        <>
            <Toaster />
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
        </>
    );
};

export default App;
