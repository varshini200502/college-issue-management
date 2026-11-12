import React from 'react'

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-4',
  lg: 'h-14 w-14 border-4',
}

/**
 * LoadingSpinner
 * @param {Object} props
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Spinner size
 * @param {string} [props.className] - Additional classes for the wrapper
 * @param {string} [props.color] - Tailwind border-color class, defaults to border-indigo-600
 */
export default function LoadingSpinner({ size = 'md', className = '', color = 'border-indigo-600' }) {
  const sizeClass = sizeMap[size] ?? sizeMap.md

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label="Loading"
    >
      <div
        className={`${sizeClass} animate-spin rounded-full border-solid ${color} border-t-transparent`}
      />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
