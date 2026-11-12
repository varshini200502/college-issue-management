import React from 'react';

export const KPICard = ({
  title,
  value,
  subtext,
  icon: Icon,
  color = 'blue',
  onClick,
  clickable = false,
}) => {
  const colorStyles = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    red: 'bg-rose-50 text-rose-600 border-rose-100',
    gray: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const currentStyle = colorStyles[color] || colorStyles.blue;

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 p-5 shadow-sm transition-all duration-200 ${
        clickable ? 'cursor-pointer hover:shadow-md hover:border-slate-300 transform hover:-translate-y-0.5' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${currentStyle}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 tracking-tight">
          {value !== undefined && value !== null ? value : 0}
        </span>
      </div>
      {subtext && (
        <p className="mt-1 text-xs text-slate-500 flex items-center gap-1">
          {subtext}
        </p>
      )}
    </div>
  );
};

export default KPICard;
