import React, { useState, useRef, useMemo } from "react";
import { Send, CornerDownLeft, AtSign } from "lucide-react";

/**
 * Robust Comment & Reply Editor with Native Textarea & Live @Mentions Autocomplete.
 * Allows instant typing and posting of plain comments WITHOUT requiring mentions.
 * Typing '@' triggers a floating suggestions dropdown of actual project & workspace members.
 */
export default function CommentEditor({
  onSubmit,
  isSubmitting = false,
  members = [],
  placeholder = "Write a comment... (type @ to mention a teammate)",
  replyingTo = null,
  onCancelReply = null,
}) {
  const [content, setContent] = useState("");
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef(null);

  // Filter members list based on query typed after '@'
  const filteredMembers = useMemo(() => {
    if (!mentionQuery) return members.slice(0, 8);
    const q = mentionQuery.toLowerCase();
    return members
      .filter(
        (m) =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.username && m.username.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [members, mentionQuery]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setContent(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAtMatch = textBeforeCursor.match(/(?:^|\s)@([a-zA-Z0-9._-]*)$/);

    if (lastAtMatch) {
      setMentionQuery(lastAtMatch[1]);
      setShowMentions(true);
      setSelectedIndex(0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);

    // Replace the '@query' before the cursor with '@Name'
    const mentionTag = `@${member.username || member.name.replace(/\s+/g, "")} `;
    const newTextBefore = textBeforeCursor.replace(/(?:^|\s)@([a-zA-Z0-9._-]*)$/, (match) => {
      const startsWithSpace = match.startsWith(" ");
      return (startsWithSpace ? " " : "") + mentionTag;
    });

    const newContent = newTextBefore + textAfterCursor;
    setContent(newContent);
    setShowMentions(false);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const nextPos = newTextBefore.length;
        textareaRef.current.setSelectionRange(nextPos, nextPos);
      }
    }, 0);
  };

  const triggerAtMention = () => {
    if (!textareaRef.current) return;
    const newContent = content ? (content.endsWith(" ") ? content + "@" : content + " @") : "@";
    setContent(newContent);
    setMentionQuery("");
    setShowMentions(true);
    setSelectedIndex(0);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const len = newContent.length;
        textareaRef.current.setSelectionRange(len, len);
      }
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (showMentions && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(filteredMembers[selectedIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    // Ctrl+Enter or Cmd+Enter to submit
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!content.trim() || isSubmitting) return;
    onSubmit(content.trim());
    setContent("");
    setShowMentions(false);
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
              type="button"
              onClick={onCancelReply}
              className="text-xs hover:underline text-blue-600 dark:text-blue-400 font-medium cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Direct Native Input Textarea */}
      <textarea
        ref={textareaRef}
        value={content}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={2}
        className="w-full bg-transparent px-3 py-2.5 text-sm text-gray-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 resize-none focus:outline-none"
      />

      {/* Action Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-gray-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 rounded-b-lg">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={triggerAtMention}
            className="text-[11px] text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <AtSign className="size-3" /> Type <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono">@</kbd> to mention
          </button>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">
            • <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] font-mono">Ctrl+Enter</kbd> to post
          </span>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-sm"
        >
          <Send className="size-3" />
          <span>{replyingTo ? "Reply" : "Post"}</span>
        </button>
      </div>

      {/* Floating Mentions Autocomplete Box */}
      {showMentions && (
        <div
          className="absolute z-50 w-72 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 shadow-2xl overflow-hidden py-1.5 bottom-full left-2 mb-2"
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span>Project & Team Members</span>
            <span>{filteredMembers.length} found</span>
          </div>
          {filteredMembers.length > 0 ? (
            <div className="max-h-48 overflow-y-auto">
              {filteredMembers.map((member, idx) => (
                <button
                  key={member.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent losing textarea focus
                    insertMention(member);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left cursor-pointer transition-colors ${
                    idx === selectedIndex
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <img
                    src={
                      member.image ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name || "Member")}&background=random`
                    }
                    alt={member.name}
                    className="size-6 rounded-full object-cover flex-shrink-0"
                  />
                  <div className="truncate min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold truncate text-zinc-800 dark:text-zinc-100">
                        {member.name}
                      </span>
                      {member.username && (
                        <span className="text-[10px] text-zinc-400 font-mono">@{member.username}</span>
                      )}
                    </div>
                    {member.email && (
                      <span className="block text-[10px] text-zinc-400 truncate">{member.email}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-xs text-zinc-400 dark:text-zinc-500 text-center">
              {members.length === 0 ? "No project members found" : `No members matching "@${mentionQuery}"`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
