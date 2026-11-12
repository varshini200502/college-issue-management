import React from 'react';

const priorityConfig = {
  LOW: {
    label: 'Low',
    bg: 'bg-slate-100 text-slate-700 border-slate-200',
    bar: 'bg-slate-400',
  },
  MEDIUM: {
    label: 'Medium',
    bg: 'bg-blue-50 text-blue-700 border-blue-200',
    bar: 'bg-blue-500',
  },
  HIGH: {
    label: 'High',
    bg: 'bg-orange-50 text-orange-700 border-orange-200',
    bar: 'bg-orange-500',
  },
  CRITICAL: {
    label: 'Critical',
    bg: 'bg-red-50 text-red-700 border-red-200 font-semibold',
    bar: 'bg-red-600',
  },
};

export const PriorityBadge = ({ priority }) => {
  const normPriority = (priority || 'MEDIUM').toUpperCase();
  const config = priorityConfig[normPriority] || priorityConfig.MEDIUM;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${config.bg}`}
    >
      <span className={`w-1 h-3 rounded-sm ${config.bar}`} />
      {config.label}
    </span>
  );
};

export default PriorityBadge;
