import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../common/StatusBadge';
import { PriorityBadge } from '../common/PriorityBadge';
import { ChevronRight, AlertCircle, FileText, Clock } from 'lucide-react';

export const TicketTable = ({
  tickets = [],
  loading = false,
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
  emptyMessage = 'No tickets match the selected criteria.',
}) => {
  const navigate = useNavigate();
  const totalPages = Math.ceil(total / pageSize) || 1;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-12 text-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500 font-medium">Loading tickets data...</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm p-12 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">No Tickets Found</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Ticket ID</th>
              <th className="py-3 px-4">Title & Details</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Reporter</th>
              <th className="py-3 px-4">Priority</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Created</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {tickets.map((t) => (
              <tr
                key={t.id}
                onClick={() => navigate(`/tickets/${t.id}`)}
                className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <td className="py-3.5 px-4 font-mono font-bold text-brand-600 whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    {t.ticket_number}
                    {t.is_overdue && (
                      <span title="Overdue SLA" className="text-rose-600">
                        <AlertCircle className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4 max-w-xs">
                  <div className="font-semibold text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                    {t.title}
                  </div>
                  {t.has_justification && (
                    <span className="inline-block text-[10px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.5 rounded border border-amber-200 mt-0.5">
                      Formal Justification On File
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="font-medium text-slate-800">{t.department_name}</span>
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="text-slate-600">{t.category_name}</span>
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="font-medium text-slate-800">{t.reporter_name}</div>
                  <div className="text-[10px] text-slate-400 capitalize">{t.reporter_role || 'Reporter'}</div>
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <StatusBadge status={t.status} />
                </td>
                <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                  {new Date(t.created_at).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                  <span className="inline-flex items-center justify-center p-1 rounded-lg text-slate-400 group-hover:text-brand-600 group-hover:bg-brand-50 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing page <span className="font-bold text-slate-900">{page}</span> of{' '}
            <span className="font-bold text-slate-900">{totalPages}</span> ({total} total tickets)
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => onPageChange && onPageChange(page - 1)}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-700 shadow-sm"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => onPageChange && onPageChange(page + 1)}
              className="px-2.5 py-1 rounded border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-slate-700 shadow-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketTable;
