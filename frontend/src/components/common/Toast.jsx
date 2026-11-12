import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// ─── Types & colours ────────────────────────────────────────────────────────

const TYPE_STYLES = {
  success: {
    bg: 'bg-green-50 border-green-400',
    icon: '✅',
    title: 'text-green-800',
    body: 'text-green-700',
    bar: 'bg-green-400',
  },
  error: {
    bg: 'bg-red-50 border-red-400',
    icon: '❌',
    title: 'text-red-800',
    body: 'text-red-700',
    bar: 'bg-red-400',
  },
  warning: {
    bg: 'bg-yellow-50 border-yellow-400',
    icon: '⚠️',
    title: 'text-yellow-800',
    body: 'text-yellow-700',
    bar: 'bg-yellow-400',
  },
  info: {
    bg: 'bg-blue-50 border-blue-400',
    icon: 'ℹ️',
    title: 'text-blue-800',
    body: 'text-blue-700',
    bar: 'bg-blue-400',
  },
}

const AUTO_DISMISS_MS = 4000
const MAX_TOASTS = 3

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext(null)

// ─── Single Toast item ────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }) {
  const styles = TYPE_STYLES[toast.type] ?? TYPE_STYLES.info
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS)
    return () => clearTimeout(timerRef.current)
  }, [toast.id, onDismiss])

  return (
    <div
      role="alert"
      className={`flex flex-col w-full max-w-sm rounded-lg border shadow-lg overflow-hidden pointer-events-auto ${styles.bg} animate-slide-in`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="text-lg leading-none mt-0.5 shrink-0" aria-hidden="true">
          {styles.icon}
        </span>
        <div className="flex-1 min-w-0">
          {toast.title && (
            <p className={`text-sm font-semibold ${styles.title}`}>{toast.title}</p>
          )}
          {toast.message && (
            <p className={`text-sm mt-0.5 ${styles.body}`}>{toast.message}</p>
          )}
        </div>
        <button
          onClick={() => onDismiss(toast.id)}
          className="shrink-0 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-400 rounded"
          aria-label="Dismiss notification"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      {/* progress bar */}
      <div className="h-1 w-full bg-gray-200">
        <div
          className={`h-full ${styles.bar}`}
          style={{ animation: `shrink ${AUTO_DISMISS_MS}ms linear forwards` }}
        />
      </div>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counterRef = useRef(0)

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((type, message, title) => {
    const id = ++counterRef.current
    setToasts((prev) => {
      const next = [...prev, { id, type, message, title }]
      return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next
    })
  }, [])

  const value = {
    success: (msg, title) => toast('success', msg, title),
    error:   (msg, title) => toast('error',   msg, title),
    warning: (msg, title) => toast('warning', msg, title),
    info:    (msg, title) => toast('info',    msg, title),
    dismiss,
    toast,
    addToast: (optionsOrMsg, maybeTitle) => {
      if (typeof optionsOrMsg === 'object' && optionsOrMsg !== null) {
        const { type = 'info', message = '', title = '' } = optionsOrMsg;
        toast(type, message, title);
      } else {
        toast('info', String(optionsOrMsg || ''), maybeTitle || '');
      }
    },
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%;   }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(2rem); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        .animate-slide-in { animation: slide-in 0.25s ease-out; }
      `}</style>
    </ToastContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
