import React, { useState } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { 
  CalendarIcon, MessageCircle, PenIcon, Loader2Icon, 
  CheckSquare, Plus, Trash2, Paperclip, Download, X 
} from "lucide-react";
import { useProfile } from "../hooks/useAuth";
import { 
  useTaskDetailsQuery, useAddCommentMutation, useDeleteCommentMutation,
  useAddSubtaskMutation, useUpdateSubtaskMutation, useDeleteSubtaskMutation,
  useUploadAttachmentMutation, useDeleteAttachmentMutation 
} from "../hooks/useTasks";

const TaskDetails = () => {
    const [searchParams] = useSearchParams();
    const taskId = searchParams.get("taskId");
    const navigate = useNavigate();

    const { data: user } = useProfile();
    const { data: task, isLoading: isTaskLoading } = useTaskDetailsQuery(taskId);

    const [newComment, setNewComment] = useState("");
    const [newSubtask, setNewSubtask] = useState("");
    const [uploading, setUploading] = useState(false);

    // Mutations
    const addCommentMutation = useAddCommentMutation(taskId);
    const deleteCommentMutation = useDeleteCommentMutation(taskId);
    const addSubtaskMutation = useAddSubtaskMutation(taskId);
    const updateSubtaskMutation = useUpdateSubtaskMutation(taskId);
    const deleteSubtaskMutation = useDeleteSubtaskMutation(taskId);
    const uploadAttachmentMutation = useUploadAttachmentMutation(taskId);
    const deleteAttachmentMutation = useDeleteAttachmentMutation(taskId);

    const handleAddComment = async () => {
        if (!newComment.trim()) return;
        try {
            toast.loading("Posting comment...");
            await addCommentMutation.mutateAsync(newComment);
            setNewComment("");
            toast.dismissAll();
            toast.success("Comment added.");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.error?.message || error.message);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Delete this comment?")) return;
        try {
            toast.loading("Deleting comment...");
            await deleteCommentMutation.mutateAsync(commentId);
            toast.dismissAll();
            toast.success("Comment deleted.");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.error?.message || error.message);
        }
    };

    const handleAddSubtask = async (e) => {
        e.preventDefault();
        if (!newSubtask.trim()) return;
        try {
            toast.loading("Adding item...");
            await addSubtaskMutation.mutateAsync(newSubtask);
            setNewSubtask("");
            toast.dismissAll();
            toast.success("Checklist item added.");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.error?.message || error.message);
        }
    };

    const handleToggleSubtask = async (subtaskId, title, isCompleted) => {
        try {
            await updateSubtaskMutation.mutateAsync({
                subtaskId,
                title,
                isCompleted: !isCompleted
            });
        } catch (error) {
            toast.error("Failed to update checklist item.");
        }
    };

    const handleDeleteSubtask = async (subtaskId) => {
        try {
            await deleteSubtaskMutation.mutateAsync(subtaskId);
            toast.success("Item removed.");
        } catch (error) {
            toast.error("Failed to remove checklist item.");
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            toast.loading("Uploading attachment...");
            await uploadAttachmentMutation.mutateAsync(file);
            toast.dismissAll();
            toast.success("File uploaded successfully.");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.error?.message || error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteAttachment = async (attachmentId) => {
        if (!window.confirm("Remove this attachment?")) return;
        try {
            toast.loading("Removing attachment...");
            await deleteAttachmentMutation.mutateAsync(attachmentId);
            toast.dismissAll();
            toast.success("Attachment removed.");
        } catch (error) {
            toast.dismissAll();
            toast.error(error?.response?.data?.error?.message || error.message);
        }
    };

    if (isTaskLoading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2Icon className="size-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!task) {
        return (
            <div className="p-6 text-center text-zinc-900 dark:text-zinc-200">
                <p className="text-3xl font-bold mt-40">Task not found</p>
                <button 
                    onClick={() => navigate(-1)} 
                    className="mt-4 px-4 py-2 rounded bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-white dark:hover:bg-zinc-600"
                >
                    Go Back
                </button>
            </div>
        );
    }

    const project = task.project;
    const comments = task.comments || [];
    const subtasks = task.subtasks || [];
    const attachments = task.attachments || [];

    return (
        <div className="flex flex-col-reverse lg:flex-row gap-6 sm:p-4 text-gray-900 dark:text-zinc-100 max-w-6xl mx-auto">
            {/* Left: Comments & Checklist */}
            <div className="w-full lg:w-2/3 space-y-6">
                
                {/* Checklist / Subtasks */}
                <div className="p-5 rounded-md border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                    <h2 className="text-base font-semibold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
                        <CheckSquare className="size-5 text-blue-500" /> Checklist / Subtasks
                    </h2>
                    
                    {subtasks.length > 0 ? (
                        <div className="space-y-2.5 mb-4">
                            {subtasks.map((st) => (
                                <div key={st.id} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            checked={st.isCompleted}
                                            onChange={() => handleToggleSubtask(st.id, st.title, st.isCompleted)}
                                            className="size-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className={`text-sm ${st.isCompleted ? 'line-through text-slate-400 dark:text-zinc-500' : 'text-slate-800 dark:text-zinc-250'}`}>
                                            {st.title}
                                        </span>
                                    </div>
                                    <button onClick={() => handleDeleteSubtask(st.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500 dark:text-zinc-500 mb-4">No checklist subtasks added yet.</p>
                    )}

                    <form onSubmit={handleAddSubtask} className="flex gap-2">
                        <input 
                            type="text" 
                            placeholder="Add subtask..."
                            value={newSubtask}
                            onChange={(e) => setNewSubtask(e.target.value)}
                            className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded p-2 text-sm text-gray-900 dark:text-zinc-200 focus:outline-none"
                        />
                        <button type="submit" className="px-3.5 py-2 bg-zinc-800 text-white rounded text-sm font-medium hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-650 flex items-center gap-1.5 cursor-pointer">
                            <Plus className="size-4" /> Add
                        </button>
                    </form>
                </div>

                {/* Discussion Chatbox */}
                <div className="p-5 rounded-md border border-gray-300 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col min-h-[350px]">
                    <h2 className="text-base font-semibold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
                        <MessageCircle className="size-5 text-blue-500" /> Task Discussion ({comments.length})
                    </h2>

                    <div className="flex-1 overflow-y-auto max-h-96 pr-2 mb-4 space-y-4">
                        {comments.length > 0 ? (
                            comments.map((comment) => (
                                <div 
                                    key={comment.id} 
                                    className={`max-w-[85%] border p-3 rounded-xl ${comment.userId === user?.id ? "ml-auto bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30" : "mr-auto bg-slate-50 border-slate-200 dark:bg-zinc-900 dark:border-zinc-800"}`}
                                >
                                    <div className="flex items-center justify-between gap-4 mb-1 text-xs text-gray-500 dark:text-zinc-400">
                                        <div className="flex items-center gap-1.5">
                                            <img 
                                                src={comment.user?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user?.name || 'User')}&background=random`} 
                                                alt="avatar" 
                                                className="size-5 rounded-full object-cover" 
                                            />
                                            <span className="font-semibold text-slate-800 dark:text-zinc-200">{comment.user?.name}</span>
                                            <span className="text-[10px] text-slate-400 dark:text-zinc-650">
                                                • {format(new Date(comment.createdAt), "dd MMM, HH:mm")}
                                            </span>
                                        </div>
                                        {comment.userId === user?.id && (
                                            <button onClick={() => handleDeleteComment(comment.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                <X className="size-3" />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-800 dark:text-zinc-250 leading-relaxed whitespace-pre-line">{comment.content}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 dark:text-zinc-500 text-center py-8 text-sm">No comments yet. Start the conversation!</p>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-end gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 rounded-md p-2.5 text-sm text-gray-900 dark:text-zinc-200 resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows={2}
                        />
                        <button 
                            onClick={handleAddComment} 
                            disabled={!newComment.trim() || addCommentMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-500 transition-colors text-white text-sm px-5 py-2.5 rounded font-semibold disabled:opacity-50 cursor-pointer"
                        >
                            Post
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Task Metadata & Attachments */}
            <div className="w-full lg:w-1/3 flex flex-col gap-6">
                
                {/* Task Info */}
                <div className="p-5 rounded-md bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800">
                    <div className="mb-3">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-zinc-100">{task.title}</h1>
                        <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs uppercase font-medium">
                                {task.status.replace("_", " ")}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400 text-xs uppercase font-medium">
                                {task.type}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-xs uppercase font-medium">
                                {task.priority}
                            </span>
                        </div>
                    </div>

                    {task.description && (
                        <p className="text-sm text-gray-600 dark:text-zinc-400 leading-relaxed mb-4">{task.description}</p>
                    )}

                    <hr className="border-zinc-200 dark:border-zinc-850 my-4" />

                    <div className="space-y-3.5 text-sm text-gray-700 dark:text-zinc-300">
                        <div className="flex items-center gap-3">
                            <span className="text-zinc-400 w-20 text-xs">Assignee</span>
                            <div className="flex items-center gap-2">
                                 <img 
                                    src={task.assignee?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee?.name || 'U')}&background=random`} 
                                    className="size-5 rounded-full object-cover" 
                                    alt="avatar" 
                                 />
                                <span className="font-medium text-slate-800 dark:text-zinc-250">{task.assignee?.name || "Unassigned"}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-zinc-400 w-20 text-xs">Due Date</span>
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="size-4 text-zinc-400" />
                                <span className="font-medium text-slate-800 dark:text-zinc-250">
                                    {task.due_date ? format(new Date(task.due_date), "dd MMM yyyy") : "No due date"}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attachments Section */}
                <div className="p-5 rounded-md bg-white dark:bg-zinc-950 border border-gray-300 dark:border-zinc-800">
                    <h2 className="text-base font-semibold flex items-center gap-2 mb-4 text-gray-900 dark:text-white">
                        <Paperclip className="size-4.5 text-blue-500" /> Attachments ({attachments.length})
                    </h2>

                    <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                        {attachments.length > 0 ? (
                            attachments.map((file) => (
                                <div key={file.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-850">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <Paperclip className="size-4 text-zinc-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-800 dark:text-zinc-250 truncate max-w-44">
                                                {file.fileName}
                                            </p>
                                            <p className="text-[10px] text-zinc-500 dark:text-zinc-500">
                                                {(file.fileSize / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <a 
                                            href={file.fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="p-1 rounded text-zinc-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                                            title="Download file"
                                        >
                                            <Download className="size-3.5" />
                                        </a>
                                        <button 
                                            onClick={() => handleDeleteAttachment(file.id)} 
                                            className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                                            title="Delete file"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-xs text-zinc-500 dark:text-zinc-500 text-center py-4">No attachments uploaded.</p>
                        )}
                    </div>

                    <div className="relative">
                        <input 
                            type="file" 
                            id="file-upload"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                        <label 
                            htmlFor="file-upload" 
                            className={`flex items-center justify-center gap-2 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 py-3 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                            <Plus className="size-4" /> Upload Attachment
                        </label>
                    </div>
                </div>

                {/* Project Details Info Card */}
                {project && (
                    <div className="p-4 rounded-md bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 border border-gray-300 dark:border-zinc-800">
                        <p className="text-sm font-bold text-gray-900 dark:text-white mb-3">Project Details</p>
                        <h2 className="text-gray-900 dark:text-zinc-100 text-sm font-semibold flex items-center gap-2"> 
                            <PenIcon className="size-4 text-blue-500" /> {project.name}
                        </h2>
                        {project.start_date && (
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-500 mt-2">
                                Started: {format(new Date(project.start_date), "dd MMM yyyy")}
                            </p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-zinc-400 mt-3 border-t border-zinc-150 dark:border-zinc-850 pt-2.5">
                            <span>Status: {project.status ? project.status.replace("_", " ") : "N/A"}</span>
                            <span>Priority: {project.priority || "N/A"}</span>
                            <span>Progress: {project.progress || 0}%</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskDetails;
