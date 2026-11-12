import React from 'react'

/**
 * EmptyState
 * @param {Object}  props
 * @param {React.ReactNode} props.icon        - Emoji string or SVG element
 * @param {string}  props.title               - Bold heading
 * @param {string}  [props.description]       - Supporting text
 * @param {{label: string, onClick: Function}} [props.action] - Optional CTA button
 * @param {string}  [props.className]         - Extra wrapper classes
 */
export default function EmptyState({ icon, title, description, action, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
    >
      {icon && (
        <div className="mb-4 text-5xl leading-none select-none" aria-hidden="true">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>

      {description && (
        <p className="mt-2 text-sm text-gray-500 max-w-sm">{description}</p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
