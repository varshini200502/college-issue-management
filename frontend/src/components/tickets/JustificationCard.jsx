import React from 'react'

// ─── Reason code display map ──────────────────────────────────────────────────

const REASON_CODE_LABELS = {
  budget_constraints:   'Budget Constraints',
  pending_vendor:       'Pending Vendor / Supplier',
  infrastructure:       'Infrastructure Limitation',
  policy_approval:      'Policy / Approval Required',
  staff_shortage:       'Staff Shortage',
  technical_complexity: 'Technical Complexity',
  external_dependency:  'External Dependency',
  other:                'Other',
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-amber-700">{label}</dt>
      <dd className="mt-1 text-sm text-gray-800 leading-relaxed">{value}</dd>
    </div>
  )
}

/**
 * JustificationCard
 *
 * @param {Object} props
 * @param {{
 *   reason_code: string,
 *   explanation: string,
 *   actions_attempted: string,
 *   challenges: string,
 *   requires_external: boolean,
 *   next_action: string,
 *   submitted_at: string,
 *   submitted_by_name: string
 * }} props.justification
 */
export default function JustificationCard({ justification }) {
  if (!justification) return null

  const {
    reason_code,
    explanation,
    actions_attempted,
    challenges,
    requires_external,
    next_action,
    submitted_at,
    submitted_by_name,
  } = justification

  const reasonLabel = REASON_CODE_LABELS[reason_code] ?? reason_code ?? 'Unknown'

  return (
    <article className="rounded-xl border-2 border-amber-400 bg-amber-50 shadow-md overflow-hidden">
      {/* Header banner */}
      <div className="flex items-center gap-3 bg-amber-400 px-5 py-3">
        <span className="text-xl" aria-hidden="true">⚠️</span>
        <h3 className="text-base font-bold text-amber-900">Unresolved Justification</h3>
        <span className="ml-auto rounded-full bg-amber-200 px-3 py-0.5 text-xs font-semibold text-amber-900">
          {reasonLabel}
        </span>
      </div>

      {/* Body */}
      <div className="px-5 py-4">
        <dl className="space-y-4">
          <InfoRow label="Explanation" value={explanation} />
          <InfoRow label="Actions Attempted" value={actions_attempted} />
          <InfoRow label="Challenges / Blockers" value={challenges} />
          <InfoRow label="Next Planned Action" value={next_action} />
        </dl>

        {/* External dependency badge */}
        {requires_external && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-100 border border-orange-300 px-3 py-1 text-xs font-medium text-orange-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Requires External Action
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-amber-200 bg-amber-100 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-800">
        <span>
          Submitted by{' '}
          <span className="font-semibold">{submitted_by_name ?? 'Unknown'}</span>
        </span>
        <time dateTime={submitted_at}>{formatDate(submitted_at)}</time>
      </div>
    </article>
  )
}
