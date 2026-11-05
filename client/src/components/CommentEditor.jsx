import React, { useState, useEffect, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import { Send, CornerDownLeft } from "lucide-react";

/**
 * Tiptap Rich-Text Comment Editor with @Mentions support.
 */
export default function CommentEditor({
  onSubmit,
  isSubmitting = false,
  members = [],
  placeholder = "Write a comment... (type @ to mention a teammate)",
  replyingTo = null,
  onCancelReply = null,
}) {
  const [suggestionList, setSuggestionList] = useState([]);
  const [mentionPosition, setMentionPosition] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mentionCommandRef = useRef(null);

  // Filter members list based on query
  const searchMembers = (query) => {
    const q = (query || "").toLowerCase();
    return members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.username && m.username.toLowerCase().includes(q)) ||
          m.email.toLowerCase().includes(q)
      )
      .slice(0, 5);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
      }),
      Mention.configure({
        HTMLAttributes: {
          class:
            "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 font-semibold px-1.5 py-0.5 rounded text-xs inline-block",
        },
        suggestion: {
          items: ({ query }) => searchMembers(query),
          render: () => ({
            onStart: (props) => {
              mentionCommandRef.current = props.command;
              setSuggestionList(props.items);
              setSelectedIndex(0);
              const rect = props.clientRect?.();
              if (rect) {
                setMentionPosition({
                  top: rect.top - 160,
                  left: rect.left,
                });
              }
            },
            onUpdate: (props) => {
              mentionCommandRef.current = props.command;
              setSuggestionList(props.items);
              setSelectedIndex(0);
            },
            onKeyDown: (props) => {
              if (props.event.key === "ArrowDown") {
                setSelectedIndex((prev) => (prev + 1) % (suggestionList.length || 1));
                return true;
              }
              if (props.event.key === "ArrowUp") {
                setSelectedIndex(
                  (prev) => (prev - 1 + (suggestionList.length || 1)) % (suggestionList.length || 1)
                );
                return true;
              }
              if (props.event.key === "Enter" || props.event.key === "Tab") {
                const target = suggestionList[selectedIndex];
                if (target && mentionCommandRef.current) {
                  mentionCommandRef.current({ id: target.id, label: target.name });
                  setMentionPosition(null);
                  return true;
                }
              }
              if (props.event.key === "Escape") {
                setMentionPosition(null);
                return true;
              }
              return false;
            },
            onExit: () => {
              setMentionPosition(null);
              setSuggestionList([]);
            },
          }),
        },
      }),
    ],
    editorProps: {
      attributes: {
        class:
          "min-h-[70px] max-h-40 overflow-y-auto px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-0",
      },
    },
  });

  const handleSubmit = () => {
    if (!editor || editor.isEmpty) return;
    const textContent = editor.getText();
    if (!textContent.trim()) return;

    onSubmit(textContent);
    editor.commands.clearContent();
  };

  return (
    <div className="relative w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 transition-all focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
      {/* Replying Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-100 dark:border-blue-900/40 text-xs text-blue-700 dark:text-blue-300 rounded-t-lg">
          <div className="flex items-center gap-1.5">
            <CornerDownLeft className="size-3.5" />
            <span>
              Replying to <span className="font-semibold">{replyingTo.user?.name}</span>
            </span>
          </div>
          {onCancelReply && (
            <button
              onClick={onCancelReply}
              className="text-xs hover:underline text-blue-600 dark:text-blue-400 font-medium cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Editor Content */}
      <EditorContent editor={editor} placeholder={placeholder} />

      {/* Action Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 rounded-b-lg">
        <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
          Tip: Type <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono">@</kbd> to mention
        </span>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!editor || editor.isEmpty || isSubmitting}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
        >
          <Send className="size-3" />
          <span>{replyingTo ? "Reply" : "Post"}</span>
        </button>
      </div>

      {/* @Mention Floating Autocomplete Popup */}
      {mentionPosition && suggestionList.length > 0 && (
        <div
          className="absolute z-50 w-56 rounded-lg bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-xl overflow-hidden py-1"
          style={{ bottom: "100%", left: 8 }}
        >
          <div className="px-2.5 py-1 text-[10px] font-semibold uppercase text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
            Teammates
          </div>
          {suggestionList.map((member, idx) => (
            <button
              key={member.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                if (mentionCommandRef.current) {
                  mentionCommandRef.current({ id: member.id, label: member.name });
                  setMentionPosition(null);
                }
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left cursor-pointer transition-colors ${
                idx === selectedIndex
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <img
                src={
                  member.image ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random`
                }
                alt={member.name}
                className="size-5 rounded-full object-cover"
              />
              <div className="truncate">
                <span className="block truncate">{member.name}</span>
                {member.email && (
                  <span className="block text-[10px] text-zinc-400 truncate">{member.email}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
