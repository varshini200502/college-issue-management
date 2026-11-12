import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { departmentService } from '../../services/departmentService';
import { reportService } from '../../services/reportService';
import { useToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import { 
  Ticket as TicketIcon, Search, Download, Building2, 
  ChevronLeft, ChevronRight, Filter, Clock, Eye 
} from 'lucide-react';

export default function PrincipalTicketList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addToast } = useToast();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Departments & Categories for filter dropdowns
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);

  // Filter states (syncing with URL params)
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [departmentId, setDepartmentId] = useState(searchParams.get('department_id') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category_id') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [priority, setPriority] = useState(searchParams.get('priority') || '');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [depts, cats] = await Promise.all([
          departmentService.getDepartments(),
          departmentService.getCategories(),
        ]);
        setDepartments(depts || []);
        setCategories(cats || []);
      } catch (err) {
        // Silent fail for dropdowns
      }
    };
    loadMetadata();
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        skip: (page - 1) * pageSize,
        limit: pageSize,
      };

      if (departmentId) params.department_id = departmentId;
      if (categoryId) params.category_id = categoryId;
      if (status) params.status = status;
      if (priority) params.priority = priority;
      if (search.trim()) params.search = search.trim();
      if (searchParams.get('overdue') === 'true') params.is_overdue = true;

      const data = await ticketService.getTickets(params);
      setTickets(data?.items || data || []);
      setTotalCount(data?.total || (data?.items ? data.items.length : data?.length || 0));
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error Loading College Tickets',
        message: err?.response?.data?.detail || 'Could not fetch college-wide tickets.',
      });
    } finally {
      setLoading(false);
    }
  }, [page, departmentId, categoryId, status, priority, search, searchParams, addToast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    const newParams = {};
    if (search.trim()) newParams.search = search.trim();
    if (departmentId) newParams.department_id = departmentId;
    if (categoryId) newParams.category_id = categoryId;
    if (status) newParams.status = status;
    if (priority) newParams.priority = priority;
    setSearchParams(newParams);
    fetchTickets();
  };

  const handleReset = () => {
    setSearch('');
    setDepartmentId('');
    setCategoryId('');
    setStatus('');
    setPriority('');
    setSearchParams({});
    setPage(1);
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const filters = {};
      if (departmentId) filters.department_id = departmentId;
      if (categoryId) filters.category_id = categoryId;
      if (status) filters.status = status;
      if (priority) filters.priority = priority;
      if (search.trim()) filters.search = search.trim();

      await reportService.exportCSV(filters);
      addToast({
        type: 'success',
        title: 'CSV Export Initiated',
        message: 'Your report download has completed.',
      });
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Export Failed',
        message: err?.response?.data?.detail || 'Could not export ticket report.',
      });
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded">
              College-wide Executive Oversight
            </span>
            <span className="text-xs text-slate-400 font-medium">(Supervisor Read-Only)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
            All College Tickets
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Audit issues across every department, view progress updates, and inspect justifications.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white rounded-lg text-sm font-semibold transition shadow-sm self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          {exporting ? 'Generating CSV...' : 'Export Audit CSV'}
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, title, or reporter..."
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Department */}
          <div>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_INFO">Waiting for Information</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-sm font-semibold transition"
            >
              Filter
            </button>
            {(search || departmentId || categoryId || status || priority) && (
              <button
                type="button"
                onClick={handleReset}
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
            <LoadingSpinner size="lg" text="Loading college-wide tickets..." />
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<TicketIcon className="w-12 h-12 text-slate-300" />}
              title="No Tickets Found"
              description="No tickets match the selected filters across the institution."
              action={{ label: 'Reset Filters', onClick: handleReset }}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-xs uppercase font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Ticket ID</th>
                    <th className="py-3.5 px-4">Title & Details</th>
                    <th className="py-3.5 px-4">Department</th>
                    <th className="py-3.5 px-4">Reporter</th>
                    <th className="py-3.5 px-4">Priority</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Date Reported</th>
                    <th className="py-3.5 px-4 text-right">Inspection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tickets.map((t) => {
                    const isOverdue = t.is_overdue;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => navigate(`/principal/tickets/${t.id}`)}
                        className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                          isOverdue ? 'bg-red-50/20' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 font-mono font-semibold text-purple-700 whitespace-nowrap">
                          {t.ticket_number}
                          {isOverdue && (
                            <span className="ml-2 inline-flex items-center text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                              OVERDUE
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="font-semibold text-slate-900 truncate">{t.title}</p>
                          <p className="text-xs text-slate-500 truncate mt-0.5">{t.category?.name || t.category_name || '—'}</p>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            {t.department?.name || t.department_name || '—'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <p className="font-medium text-slate-800">{t.reporter?.full_name || t.reporter_name || '—'}</p>
                          <p className="text-xs text-slate-400 capitalize">{t.reporter_role || t.reporter?.reporter_type || 'User'}</p>
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
                              navigate(`/principal/tickets/${t.id}`);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium text-xs rounded transition border border-purple-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
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
                  Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} records
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
