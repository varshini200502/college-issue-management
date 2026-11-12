import React, { Fragment } from 'react'
import Modal from './Modal'

const VARIANT_STYLES = {
  danger: {
    btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
    icon: (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
    ),
  },
  primary: {
    btn: 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 text-white',
    icon: (
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
        <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    ),
  },
}

/**
 * ConfirmDialog
 * @param {Object}   props
 * @param {boolean}  props.isOpen
 * @param {string}   props.title
 * @param {string}   props.message
 * @param {string}   [props.confirmLabel='Confirm']
 * @param {'danger'|'primary'} [props.confirmVariant='primary']
 * @param {Function} props.onConfirm
 * @param {Function} props.onCancel
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null

  const variant = VARIANT_STYLES[confirmVariant] ?? VARIANT_STYLES.primary

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="">
      <div className="sm:flex sm:items-start">
        {variant.icon}
        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
          <h3 className="text-base font-semibold leading-6 text-gray-900">{title}</h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">{message}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${variant.btn}`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
