import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import { 
  Ticket as TicketIcon, Search, AlertCircle, Clock, 
  ChevronLeft, ChevronRight, User, ShieldAlert 
} from 'lucide-react';

const STATUS_TABS = [
  { key: '', label: 'All Tickets' },
  { key: 'NEW', label: 'New' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'WAITING_FOR_INFO', label: 'Waiting for Info' },
  { key: 'ON_HOLD', label: 'On Hold' },
  { key: 'RESOLVED', label: 'Resolved' },
  { key: 'overdue', label: 'Overdue' },
];

export default function DeptTicketList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters from URL or state
  const currentTab = searchParams.get('status') || '';
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };

      if (currentTab === 'overdue') {
        params.is_overdue = true;
      } else if (currentTab) {
        params.status = currentTab;
      }

      if (priority) params.priority = priority;
      if (search.trim()) params.search = search.trim();

      const data = await ticketService.getTickets(params);
      setTickets(data?.items || data || []);
      setTotalCount(data?.total || (data?.items ? data.items.length : data?.length || 0));
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to load tickets',
        message: err?.response?.data?.detail || 'Could not fetch department tickets.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, currentTab, priority, search, addToast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleTabChange = (key) => {
    if (key) {
      setSearchParams({ status: key });
    } else {
      setSearchParams({});
    }
    setPage(1);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded">
            {user?.department?.name || 'Department'} Queue
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Department Tickets
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Manage, investigate, and resolve issues routed to your department.
        </p>
      </div>

      {/* Status Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-2 overflow-x-auto pb-px">
          {STATUS_TABS.map((tab) => {
            const isActive = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`py-3 px-4 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Search & Priority Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, title, or reporter..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition"
            >
              Apply Filter
            </button>
            {(search || priority) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPriority('');
                  setPage(1);
                }}
                className="px-3 py-2 text-sm text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="lg" text="Loading department tickets..." />
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<TicketIcon className="w-12 h-12 text-slate-300" />}
              title="No Tickets in this Queue"
              description="No tickets currently match the selected criteria in your department queue."
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Ticket ID</th>
                    <th className="py-3.5 px-4">Title & Description</th>
                    <th className="py-3.5 px-4">Reporter</th>
                    <th className="py-3.5 px-4">Category</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((t) => {
                    const isOverdue = t.is_overdue;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/dept/tickets/${t.id}`)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          isOverdue ? 'bg-red-50/20 border-l-4 border-l-red-500' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-blue-600 whitespace-nowrap">
                          {t.ticket_number}
                          {isOverdue && (
                            <span className="ml-2 inline-flex items-center text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                              OVERDUE
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-semibold text-slate-900 truncate">{t.title}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{t.description}</p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-medium text-slate-800">{t.reporter?.full_name || t.reporter_name || '—'}</p>
                          <p className="text-xs text-slate-400 capitalize">{t.reporter_role || t.reporter?.reporter_type || 'User'}</p>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                          {t.category?.name || t.category_name || '—'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <PriorityBadge priority={t.priority} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={t.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(t.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dept/tickets/${t.id}`);
                            }}
                            className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-xs rounded transition border border-blue-200"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between text-sm text-slate-600">
                <span>
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} tickets
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-semibold px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    className="p-1.5 border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
