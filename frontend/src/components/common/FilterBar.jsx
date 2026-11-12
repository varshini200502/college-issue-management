import React from 'react'

/**
 * FilterBar
 *
 * @param {Object}  props
 * @param {Array<{key: string, label: string, type: 'select'|'text'|'date', options?: {value: string, label: string}[]}>} props.filters
 * @param {Object}  props.values   - { [key]: currentValue }
 * @param {Function} props.onChange - (key, value) => void
 * @param {Function} props.onReset  - () => void
 */
export default function FilterBar({ filters = [], values = {}, onChange, onReset }) {
  const hasActiveFilters = filters.some(
    (f) => values[f.key] !== undefined && values[f.key] !== ''
  )

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
      {filters.map((filter) => (
        <div key={filter.key} className="flex flex-col gap-1 min-w-[140px]">
          <label
            htmlFor={`filter-${filter.key}`}
            className="text-xs font-medium text-gray-600"
          >
            {filter.label}
          </label>

          {filter.type === 'select' && (
            <select
              id={`filter-${filter.key}`}
              value={values[filter.key] ?? ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All</option>
              {(filter.options ?? []).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {filter.type === 'text' && (
            <input
              id={`filter-${filter.key}`}
              type="text"
              value={values[filter.key] ?? ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              placeholder={`Search ${filter.label.toLowerCase()}…`}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          )}

          {filter.type === 'date' && (
            <input
              id={`filter-${filter.key}`}
              type="date"
              value={values[filter.key] ?? ''}
              onChange={(e) => onChange(filter.key, e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-800 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          )}
        </div>
      ))}

      {/* Reset */}
      <button
        type="button"
        onClick={onReset}
        disabled={!hasActiveFilters}
        className={`ml-auto flex items-center gap-1.5 self-end rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 ${
          hasActiveFilters
            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
        }`}
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Reset
      </button>
    </div>
  )
}
