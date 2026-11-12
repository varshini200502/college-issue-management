import React from 'react'

// ─── Status colour map (matches StatusBadge palette) ─────────────────────────

const STATUS_STYLES = {
  new:                   { dot: 'bg-blue-500',   label: 'New' },
  assigned:              { dot: 'bg-indigo-500', label: 'Assigned' },
  in_progress:           { dot: 'bg-yellow-500', label: 'In Progress' },
  waiting_for_info:      { dot: 'bg-orange-400', label: 'Waiting for Info' },
  on_hold:               { dot: 'bg-gray-400',   label: 'On Hold' },
  resolved:              { dot: 'bg-green-500',  label: 'Resolved' },
  closed:                { dot: 'bg-gray-600',   label: 'Closed' },
  cannot_resolve:        { dot: 'bg-red-500',    label: 'Cannot Resolve' },
  justification_needed:  { dot: 'bg-amber-500',  label: 'Justification Needed' },
  reopened:              { dot: 'bg-purple-500', label: 'Reopened' },
}

function statusStyle(status) {
  return STATUS_STYLES[status] ?? { dot: 'bg-gray-300', label: status ?? 'Unknown' }
}

function formatDate(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Single timeline entry ───────────────────────────────────────────────────

function TimelineEntry({ entry, isLast }) {
  const to = statusStyle(entry.status)
  const from = entry.previous_status ? statusStyle(entry.previous_status) : null

  return (
    <li className="relative flex gap-4">
      {/* Vertical connector */}
      {!isLast && (
        <span
          className="absolute left-3.5 top-7 -bottom-2 w-px bg-gray-200"
          aria-hidden="true"
        />
      )}

      {/* Status dot */}
      <div className="relative mt-1 flex h-7 w-7 shrink-0 items-center justify-center">
        <span className={`h-3 w-3 rounded-full ring-2 ring-white ${to.dot}`} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        {/* Status transition */}
        <div className="flex flex-wrap items-center gap-2">
          {from ? (
            <>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {from.label}
              </span>
              <svg className="h-3 w-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </>
          ) : null}
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${to.dot}`}>
            {to.label}
          </span>
        </div>

        {/* Meta */}
        <p className="mt-1 text-xs text-gray-500">
          <span className="font-medium text-gray-700">{entry.changed_by_name ?? 'System'}</span>
          {' · '}
          <time dateTime={entry.created_at}>{formatDate(entry.created_at)}</time>
        </p>

        {/* Optional comment */}
        {entry.comment && (
          <blockquote className="mt-2 rounded-md border-l-4 border-gray-300 bg-gray-50 px-3 py-2 text-sm italic text-gray-600">
            {entry.comment}
          </blockquote>
        )}
      </div>
    </li>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

/**
 * TicketTimeline
 * @param {Object} props
 * @param {Array}  props.history - Array of status-history entries
 */
export default function TicketTimeline({ history = [] }) {
  if (history.length === 0) {
    return (
      <p className="text-sm text-gray-400 italic py-4 text-center">No status history available.</p>
    )
  }

  // Newest first
  const sorted = [...history].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  )

  return (
    <ol className="space-y-0" aria-label="Ticket status timeline">
      {sorted.map((entry, idx) => (
        <TimelineEntry
          key={idx}
          entry={entry}
          isLast={idx === sorted.length - 1}
        />
      ))}
    </ol>
  )
}
