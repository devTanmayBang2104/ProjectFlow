import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers, ShieldCheck, Activity, Kanban, Zap, MoonIcon, SunIcon, Github } from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { toggleTheme, loadTheme } from "../features/themeSlice";

export default function Landing() {
    const dispatch = useDispatch();
    const { theme } = useSelector((state) => state.theme);

    useEffect(() => {
        dispatch(loadTheme());
    }, [dispatch]);

    const githubUrl = "https://github.com/devTanmayBang2104/ProjectFlow";

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans selection:bg-blue-500 selection:text-white relative overflow-hidden transition-colors duration-200">
            {/* Background glowing radial gradients */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-purple-500/5 dark:bg-purple-500/5 rounded-full blur-[150px] pointer-events-none"></div>

            {/* Navbar */}
            <header className="sticky top-0 z-45 backdrop-blur-md bg-white/80 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 px-6 xl:px-16 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-600 rounded-lg text-white shadow-md shadow-blue-500/10">
                            <Kanban className="size-5" />
                        </div>
                        <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
                            ProjectFlow
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm font-semibold">
                        {/* Theme Toggle */}
                        <button 
                            onClick={() => dispatch(toggleTheme())} 
                            className="size-8 flex items-center justify-center bg-white dark:bg-zinc-800 shadow rounded-lg transition hover:scale-105 active:scale-95 cursor-pointer border border-zinc-200 dark:border-zinc-700 focus:outline-none"
                        >
                            {theme === "light" ? (
                                <MoonIcon className="size-4 text-zinc-800 dark:text-zinc-200" />
                            ) : (
                                <SunIcon className="size-4 text-yellow-400" />
                            )}
                        </button>

                        <Link 
                            to="/login" 
                            className="text-zinc-650 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition duration-200"
                        >
                            Log In
                        </Link>
                        <Link 
                            to="/register" 
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded transition duration-200 shadow-md shadow-blue-600/10"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-20 pb-16 px-6 xl:px-16 text-center max-w-6xl mx-auto">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 rounded-full px-3.5 py-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold shadow-sm w-fit mx-auto">
                        <Zap className="size-3.5" /> Full-Stack Multi-Tenant Application
                    </div>
                    <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-none">
                        Streamline Team Collaboration <br /> &  Sprint Workflows
                    </h1>
                    <p className="text-base sm:text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto font-medium">
                        A secure project workspace platform designed to manage product backlogs, assign sprint priorities, logs, and collaborate seamlessly.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Link 
                            to="/register" 
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded font-semibold transition shadow-lg shadow-blue-500/10 cursor-pointer text-sm"
                        >
                            Get Started for Free <ArrowRight className="size-4" />
                        </Link>
                        <a 
                            href={githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 px-6 py-3 rounded font-semibold transition cursor-pointer shadow-sm text-sm"
                        >
                            <Github className="size-4" /> View GitHub Repository
                        </a>
                    </div>
                </div>

                {/* Mock UI Showcase */}
                <div className="max-w-5xl mx-auto mt-16 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/20 backdrop-blur-sm shadow-2xl relative">
                    <div className="bg-white dark:bg-zinc-950 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-900 p-6 text-left space-y-6">
                        {/* Mock Title bar */}
                        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-900 pb-4">
                            <div className="flex items-center gap-3">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <span className="text-xs text-zinc-400 dark:text-zinc-500 font-mono">workspace://development-team</span>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/55 border border-blue-100 dark:border-blue-900/50 text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                                Sprint 3 Active
                            </span>
                        </div>

                        {/* Kanban Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Column 1 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-zinc-650"></span> To Do (2)
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
                                    <span className="px-2 py-0.5 text-[9px] rounded bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 font-semibold border border-purple-100 dark:border-purple-900/50">HIGH</span>
                                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Setup Neon Serverless Database</h4>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Initialize Prisma migrations and map relational schemas.</p>
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
                                    <span className="px-2 py-0.5 text-[9px] rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-semibold border border-blue-100 dark:border-blue-900/50">MEDIUM</span>
                                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Design Client Layout Wrapper</h4>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Configure responsive sidebar layouts and dark modes.</p>
                                </div>
                            </div>

                            {/* Column 2 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span> In Progress (1)
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg space-y-2 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
                                    <span className="px-2 py-0.5 text-[9px] rounded bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 font-semibold border border-red-100 dark:border-red-900/50">HIGH</span>
                                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-white">Integrate HttpOnly Cookie Auth</h4>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">Configure access/refresh token rotation and session tracking.</p>
                                </div>
                            </div>

                            {/* Column 3 */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span> Done (1)
                                </div>
                                <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-4 rounded-lg space-y-2 opacity-60 dark:opacity-50 hover:border-zinc-300 dark:hover:border-zinc-700 transition">
                                    <span className="px-2 py-0.5 text-[9px] rounded bg-green-50 dark:bg-green-950/50 text-green-600 dark:text-green-400 font-semibold border border-green-100 dark:border-green-900/50">LOW</span>
                                    <h4 className="text-xs font-semibold text-zinc-900 dark:text-white line-through">Configure CORS & CSRF</h4>
                                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium line-through font-semibold">Enforce double-submit cookie security on Express endpoints.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section className="max-w-6xl mx-auto py-16 px-6 xl:px-16 border-t border-zinc-200 dark:border-zinc-900 space-y-12">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                        Built for Professional Workflows
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                        High-impact features constructed with clean, robust architectural design.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Card 1 */}
                    <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3 hover:shadow-md dark:hover:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition duration-200">
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 w-fit">
                            <Layers className="size-5" />
                        </div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Multi-Tenant Workspaces</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Organize distinct projects, assignable members, and task backlogs in secure, access-isolated workspaces.
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3 hover:shadow-md dark:hover:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition duration-200">
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 w-fit">
                            <Kanban className="size-5" />
                        </div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Agile Sprints</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Formulate sprint cycles, direct status transitions, assign workloads, and track active project progress rates.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3 hover:shadow-md dark:hover:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition duration-200">
                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 w-fit">
                            <ShieldCheck className="size-5" />
                        </div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">HttpOnly Cookie Auth</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Double-token access/refresh system with database-backed Refresh Token Rotation (RTR) to prevent XSS.
                        </p>
                    </div>

                    {/* Card 4 */}
                    <div className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3 hover:shadow-md dark:hover:shadow-none hover:border-zinc-300 dark:hover:border-zinc-700 transition duration-200">
                        <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 w-fit">
                            <Activity className="size-5" />
                        </div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white">CSRF & Audit Trails</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                            Double-submit token protection on mutating endpoints, login failure lockout tracking, and in-app logs.
                        </p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-zinc-200 dark:border-zinc-900 py-10 px-6 xl:px-16 text-center text-xs text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-900/50">
                <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p>© 2026 ProjectFlow. Built by Tanmay Bange. All rights reserved.</p>
                    <div className="flex items-center gap-3 font-semibold text-zinc-500 dark:text-zinc-400">
                        <a href={githubUrl} target="_blank" rel="noopener noreferrer" className="hover:text-zinc-800 dark:hover:text-white transition">GitHub Repository</a>
                        <span>•</span>
                        <Link to="/login" className="hover:text-zinc-800 dark:hover:text-white transition">Access Platform</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
