import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, isSameDay, isBefore, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths } from "date-fns";
import { CalendarIcon, Clock, ChevronLeft, ChevronRight, ChevronUp, ArrowRight } from "lucide-react";

const typeColors = {
    BUG: "bg-red-200 text-red-800 dark:bg-red-500 dark:text-red-900",
    FEATURE: "bg-blue-200 text-blue-800 dark:bg-blue-500 dark:text-blue-900",
    TASK: "bg-green-200 text-green-800 dark:bg-green-500 dark:text-green-900",
    IMPROVEMENT: "bg-purple-200 text-purple-800 dark:bg-purple-500 dark:text-purple-900",
    OTHER: "bg-amber-200 text-amber-800 dark:bg-amber-500 dark:text-amber-900",
};

const statusColors = {
    TODO: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700",
    IN_PROGRESS: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50",
    DONE: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50",
};

const priorityBorders = {
    LOW: "border-zinc-300 dark:border-zinc-600",
    MEDIUM: "border-amber-300 dark:border-amber-500",
    HIGH: "border-orange-300 dark:border-orange-500",
};

const ProjectCalendar = ({ tasks }) => {
    const navigate = useNavigate();
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [showAllOverdue, setShowAllOverdue] = useState(false);

    const today = new Date();
    const getTasksForDate = (date) => tasks.filter((task) => isSameDay(task.due_date, date));

    const upcomingTasks = tasks
        .filter((task) => task.due_date && !isBefore(task.due_date, today) && task.status !== "DONE")
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5);

    const overdueTasks = tasks.filter((task) => task.due_date && isBefore(task.due_date, today) && task.status !== "DONE");

    const daysInMonth = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth),
    });

    const handleMonthChange = (direction) => {
        setCurrentMonth((prev) => (direction === "next" ? addMonths(prev, 1) : subMonths(prev, 1)));
    };

    const handleTaskClick = (task) => {
        navigate(`/taskDetails?taskId=${task.id}${task.projectId ? `&projectId=${task.projectId}` : ''}`);
    };

    return (
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Calendar View */}
            <div className="lg:col-span-2">
                <div className="not-dark:bg-white dark:bg-gradient-to-br dark:from-zinc-800/70 dark:to-zinc-900/50 border border-zinc-300 dark:border-zinc-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-zinc-900 dark:text-white text-md flex gap-2 items-center max-sm:hidden">
                            <CalendarIcon className="size-5" /> Task Calendar
                        </h2>
                        <div className="flex gap-2 items-center">
                            <button
                                type="button"
                                onClick={() => handleMonthChange("prev")}
                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                            >
                                <ChevronLeft className="size-5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white" />
                            </button>
                            <span className="text-zinc-900 dark:text-white font-medium">{format(currentMonth, "MMMM yyyy")}</span>
                            <button
                                type="button"
                                onClick={() => handleMonthChange("next")}
                                className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                            >
                                <ChevronRight className="size-5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 text-xs text-zinc-600 dark:text-zinc-400 mb-2 text-center font-medium">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                            <div key={day}>{day}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                        {daysInMonth.map((day) => {
                            const dayTasks = getTasksForDate(day);
                            const isSelected = isSameDay(day, selectedDate);
                            const isCurrentDay = isSameDay(day, today);

                            return (
                                <button
                                    type="button"
                                    key={day.toString()}
                                    onClick={() => setSelectedDate(day)}
                                    className={`min-h-14 p-1.5 text-left border rounded transition-all cursor-pointer ${
                                        isSelected
                                            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
                                            : "border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30"
                                    }`}
                                >
                                    <span
                                        className={`text-xs font-semibold px-1.5 py-0.5 rounded-full inline-block ${
                                            isCurrentDay
                                                ? "bg-blue-600 text-white"
                                                : "text-zinc-700 dark:text-zinc-300"
                                        }`}
                                    >
                                        {format(day, "d")}
                                    </span>
                                    {dayTasks.length > 0 && (
                                        <div className="mt-1 space-y-0.5">
                                            {dayTasks.slice(0, 2).map((task) => (
                                                <div
                                                    key={task.id}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleTaskClick(task);
                                                    }}
                                                    className={`text-[10px] px-1 py-0.5 rounded truncate font-medium ${typeColors[task.type]}`}
                                                    title={task.title}
                                                >
                                                    {task.title}
                                                </div>
                                            ))}
                                            {dayTasks.length > 2 && (
                                                <div className="text-[9px] text-zinc-500 dark:text-zinc-400 font-semibold px-1">
                                                    +{dayTasks.length - 2} more
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Side Details Panel */}
            <div className="space-y-6">
                {/* Selected Date Tasks */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg p-4">
                    <h3 className="text-zinc-900 dark:text-white text-sm font-semibold mb-3">
                        Tasks for {format(selectedDate, "MMM d, yyyy")}
                    </h3>
                    {getTasksForDate(selectedDate).length === 0 ? (
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No tasks scheduled for this day</p>
                    ) : (
                        <div className="space-y-2">
                            {getTasksForDate(selectedDate).map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => handleTaskClick(task)}
                                    className={`p-3 rounded-lg border-l-4 transition cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 ${priorityBorders[task.priority]} ${statusColors[task.status]}`}
                                    title="Click to view task details"
                                >
                                    <div className="flex justify-between items-start text-sm">
                                        <span className="font-medium text-zinc-900 dark:text-white truncate">{task.title}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded ml-2 flex-shrink-0 font-semibold ${typeColors[task.type]}`}>
                                            {task.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 capitalize">
                                        {task.status.toLowerCase().replace("_", " ")} • {task.priority.toLowerCase()} priority
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upcoming Tasks */}
                <div className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded-lg p-4">
                    <h3 className="text-zinc-900 dark:text-white text-sm font-semibold flex items-center gap-2 mb-3">
                        <Clock className="w-4 h-4 text-blue-500" /> Upcoming Tasks
                    </h3>
                    {upcomingTasks.length === 0 ? (
                        <p className="text-zinc-500 dark:text-zinc-400 text-sm text-center py-4">No upcoming tasks</p>
                    ) : (
                        <div className="space-y-2">
                            {upcomingTasks.map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => handleTaskClick(task)}
                                    className="bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-850 p-3 rounded-lg transition cursor-pointer"
                                    title="Click to view task details"
                                >
                                    <div className="flex justify-between items-start text-sm">
                                        <span className="text-zinc-900 dark:text-white font-medium truncate">{task.title}</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded ml-2 flex-shrink-0 font-semibold ${typeColors[task.type]}`}>
                                            {task.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Due {format(task.due_date, "MMM d")}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Overdue Tasks */}
                {overdueTasks.length > 0 && (
                    <div className="bg-white dark:bg-zinc-950 border border-red-300 dark:border-red-500/50 border-l-4 rounded-lg p-4">
                        <h3 className="text-red-700 dark:text-red-400 text-sm font-semibold flex items-center gap-2 mb-3">
                            <Clock className="w-4 h-4" /> Overdue Tasks ({overdueTasks.length})
                        </h3>
                        <div className="space-y-2">
                            {(showAllOverdue ? overdueTasks : overdueTasks.slice(0, 5)).map((task) => (
                                <div
                                    key={task.id}
                                    onClick={() => handleTaskClick(task)}
                                    className="bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 p-3 rounded-lg transition cursor-pointer"
                                    title="Click to view task details"
                                >
                                    <div className="flex justify-between items-start text-sm text-zinc-900 dark:text-white">
                                        <span className="font-medium truncate">{task.title}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-red-200 dark:bg-red-500 text-red-900 font-semibold ml-2 flex-shrink-0">
                                            {task.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                                        Due {format(task.due_date, "MMM d")}
                                    </p>
                                </div>
                            ))}
                            {overdueTasks.length > 5 && (
                                <button
                                    type="button"
                                    onClick={() => setShowAllOverdue(prev => !prev)}
                                    className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline text-center w-full py-1.5 cursor-pointer flex items-center justify-center gap-1 mt-1"
                                >
                                    {showAllOverdue ? (
                                        <span className="flex items-center gap-1">Show less <ChevronUp className="size-3.5" /></span>
                                    ) : (
                                        <span className="flex items-center gap-1">+{overdueTasks.length - 5} more <ArrowRight className="size-3.5" /></span>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectCalendar;
