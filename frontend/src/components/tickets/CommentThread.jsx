import React, { useState, useRef } from 'react'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

function avatarColor(name = '') {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500',
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
  ]
  let hash = 0
  for (const ch of name) hash = (hash + ch.charCodeAt(0)) % colors.length
  return colors[hash]
}

// ─── Single comment bubble ────────────────────────────────────────────────────

function CommentBubble({ comment, isOwn }) {
  const isInternal = comment.is_internal_note
  const isInfoRequest = comment.comment_type === 'info_request'

  let wrapperClass = 'bg-white border border-gray-200'
  let label = null

  if (isInternal) {
    wrapperClass = 'bg-purple-50 border border-purple-200'
    label = (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700">
        🔒 Internal Note
      </span>
    )
  } else if (isInfoRequest) {
    wrapperClass = 'bg-amber-50 border border-amber-300'
    label = (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        ❓ Info Requested
      </span>
    )
  }

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${avatarColor(comment.author_name)}`}
        title={comment.author_name}
      >
        {getInitials(comment.author_name)}
      </div>

      {/* Bubble */}
      <div className={`max-w-[80%] rounded-xl px-4 py-3 shadow-sm ${wrapperClass}`}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-semibold text-gray-700">{comment.author_name}</span>
          {label}
          <span className="ml-auto text-xs text-gray-400">{formatDate(comment.created_at)}</span>
        </div>
        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{comment.text}</p>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

/**
 * CommentThread
 *
 * @param {Object}   props
 * @param {Array}    props.comments         - Array of comment objects
 * @param {number|string} props.currentUserId
 * @param {Function} props.onAddComment     - (text: string, isInternalNote: boolean) => Promise<void>
 * @param {boolean}  [props.canAddInternal] - Show internal note toggle (dept admin)
 * @param {boolean}  [props.isSubmitting]   - External loading state
 */
export default function CommentThread({
  comments = [],
  currentUserId,
  onAddComment,
  canAddInternal = false,
  isSubmitting = false,
}) {
  const [text, setText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [localSubmitting, setLocalSubmitting] = useState(false)
  const textareaRef = useRef(null)

  const submitting = isSubmitting || localSubmitting

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setLocalSubmitting(true)
    try {
      await onAddComment(trimmed, isInternal)
      setText('')
      setIsInternal(false)
      textareaRef.current?.focus()
    } finally {
      setLocalSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Comment list */}
      {comments.length === 0 ? (
        <p className="text-center text-sm text-gray-400 italic py-6">
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((c, idx) => (
            <CommentBubble
              key={c.id ?? idx}
              comment={c}
              isOwn={String(c.author_id) === String(currentUserId)}
            />
          ))}
        </div>
      )}

      {/* Input form */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e)
          }}
          placeholder="Add a comment… (Ctrl+Enter to submit)"
          rows={3}
          disabled={submitting}
          className="w-full resize-y px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none disabled:bg-gray-50"
        />

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50 px-4 py-2">
          {/* Internal note toggle — dept admin only */}
          {canAddInternal && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isInternal}
                onChange={(e) => setIsInternal(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              />
              <span className="text-xs font-medium text-gray-600">
                🔒 Internal note (not visible to reporter)
              </span>
            </label>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:inline">Ctrl+Enter</span>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
                text.trim() && !submitting
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {submitting && (
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              )}
              Post Comment
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
