import React from 'react';

const statusConfig = {
  NEW: {
    label: 'New',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
  },
  ASSIGNED: {
    label: 'Assigned',
    bg: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  WAITING_FOR_INFO: {
    label: 'Waiting for Info',
    bg: 'bg-yellow-50 text-yellow-800 border-yellow-300',
    dot: 'bg-yellow-500',
  },
  ON_HOLD: {
    label: 'On Hold',
    bg: 'bg-gray-100 text-gray-700 border-gray-300',
    dot: 'bg-gray-500',
  },
  RESOLVED: {
    label: 'Resolved',
    bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  CLOSED: {
    label: 'Closed',
    bg: 'bg-teal-50 text-teal-800 border-teal-300',
    dot: 'bg-teal-600',
  },
  REOPENED: {
    label: 'Reopened',
    bg: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
};

export const StatusBadge = ({ status, size = 'sm' }) => {
  const normStatus = (status || 'NEW').toUpperCase();
  const config = statusConfig[normStatus] || statusConfig.NEW;

  const sizeClasses = size === 'xs' 
    ? 'text-[11px] px-2 py-0.5' 
    : size === 'md' 
    ? 'text-xs px-2.5 py-1 font-semibold' 
    : 'text-xs px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${config.bg} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
