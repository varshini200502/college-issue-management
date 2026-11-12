import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart2, CheckCircle, Clock, AlertTriangle, Layers, TrendingUp,
  RefreshCw, Filter, ChevronRight, AlertCircle, Calendar, Building2,
  Tag, Flag, Activity, Download, X,
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { reportService } from '../../services/reportService';
import api from '../../services/api';
import { KPICard } from '../../components/common/KPICard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { ResolutionDonut } from '../../components/charts/ResolutionDonut';
import { DepartmentBarChart } from '../../components/charts/DepartmentBarChart';
import { TrendsLineChart } from '../../components/charts/TrendsLineChart';
import { CategoriesBarChart } from '../../components/charts/CategoriesBarChart';
import { DepartmentStackedBar } from '../../components/charts/DepartmentStackedBar';
import { ResolutionTimeBar } from '../../components/charts/ResolutionTimeBar';
import { PriorityPieChart } from '../../components/charts/PriorityPieChart';

/* ─────────────── helpers ─────────────── */
const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    : '—';

const priorityOptions = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'new', label: 'New' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting_for_info', label: 'Waiting for Info' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'reopened', label: 'Reopened' },
];

/* ─────────────── ChartSection wrapper ─────────────── */
function ChartSection({ title, subtitle, children, fullWidth = false, className = '' }) {
  const [hasError, setHasError] = useState(false);
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${
        fullWidth ? 'col-span-2' : ''
      } ${className}`}
    >
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="p-4">
        {hasError ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-400 gap-2">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <p className="text-xs">Chart failed to load.</p>
            <button
              className="text-xs text-brand-600 underline"
              onClick={() => setHasError(false)}
            >
              Retry
            </button>
          </div>
        ) : (
          <ErrorBoundary onError={() => setHasError(true)}>{children}</ErrorBoundary>
        )}
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError?.();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/* ─────────────── Main Component ─────────────── */
export default function PrincipalDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Derive filter state from URL
  const getFiltersFromParams = useCallback(
    () => ({
      date_from: searchParams.get('date_from') || '',
      date_to: searchParams.get('date_to') || '',
      department_id: searchParams.get('department_id') || '',
      category_id: searchParams.get('category_id') || '',
      priority: searchParams.get('priority') || '',
      status: searchParams.get('status') || '',
    }),
    [searchParams]
  );

  const [filters, setFilters] = useState(getFiltersFromParams);
  const [pendingFilters, setPendingFilters] = useState(getFiltersFromParams);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [exporting, setExporting] = useState(false);

  // Load dropdown data
  useEffect(() => {
    api.get('/departments').then((r) => setDepartments(r.data || [])).catch(() => {});
    api.get('/categories').then((r) => setCategories(r.data || [])).catch(() => {});
  }, []);

  // Load analytics when filters change
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const result = await analyticsService.getPrincipalAnalytics(params);
      setData(result);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApplyFilters = () => {
    const newParams = {};
    Object.entries(pendingFilters).forEach(([k, v]) => { if (v) newParams[k] = v; });
    setSearchParams(newParams);
    setFilters(pendingFilters);
  };

  const handleResetFilters = () => {
    const empty = { date_from: '', date_to: '', department_id: '', category_id: '', priority: '', status: '' };
    setPendingFilters(empty);
    setFilters(empty);
    setSearchParams({});
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      await reportService.exportCSV(params);
    } catch {
      // silent – browser will show download error if any
    } finally {
      setExporting(false);
    }
  };

  // Chart click navigation
  const goToList = (extra = {}) => {
    const params = new URLSearchParams();
    Object.entries({ ...filters, ...extra }).forEach(([k, v]) => { if (v) params.set(k, v); });
    navigate(`/principal/tickets?${params.toString()}`);
  };

  const kpis = data?.kpis || {};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-600" />
            Principal Analytics Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">College-wide issue overview · Read-only</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 shadow-sm transition"
        >
          <Download className="w-3.5 h-3.5" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-6 space-y-6">
        {/* ── Filters Panel ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">Filters</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                From Date
              </label>
              <input
                type="date"
                value={pendingFilters.date_from}
                onChange={(e) => setPendingFilters((p) => ({ ...p, date_from: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                To Date
              </label>
              <input
                type="date"
                value={pendingFilters.date_to}
                onChange={(e) => setPendingFilters((p) => ({ ...p, date_to: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Department
              </label>
              <select
                value={pendingFilters.department_id}
                onChange={(e) => setPendingFilters((p) => ({ ...p, department_id: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Category
              </label>
              <select
                value={pendingFilters.category_id}
                onChange={(e) => setPendingFilters((p) => ({ ...p, category_id: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Priority
              </label>
              <select
                value={pendingFilters.priority}
                onChange={(e) => setPendingFilters((p) => ({ ...p, priority: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                {priorityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Status
              </label>
              <select
                value={pendingFilters.status}
                onChange={(e) => setPendingFilters((p) => ({ ...p, status: e.target.value }))}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              >
                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleApplyFilters}
              className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              Apply Filters
            </button>
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
            {Object.values(filters).some(Boolean) && (
              <span className="text-[11px] text-indigo-600 font-medium">Filters active</span>
            )}
          </div>
        </div>

        {/* ── Error State ── */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            <p className="text-sm text-rose-700">{error}</p>
            <button
              onClick={loadData}
              className="ml-auto inline-flex items-center gap-1 text-xs text-rose-600 font-semibold hover:underline"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          </div>
        )}

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse">
                <div className="h-3 bg-slate-200 rounded w-24 mb-4" />
                <div className="h-7 bg-slate-200 rounded w-16" />
              </div>
            ))
          ) : (
            <>
              <KPICard
                title="Total Tickets"
                value={kpis.total}
                icon={Layers}
                color="blue"
                clickable
                onClick={() => goToList({})}
                subtext="College-wide"
              />
              <KPICard
                title="Resolved"
                value={kpis.resolved}
                icon={CheckCircle}
                color="green"
                clickable
                onClick={() => goToList({ status: 'resolved' })}
                subtext={kpis.total ? `${Math.round((kpis.resolved / kpis.total) * 100)}% resolution rate` : ''}
              />
              <KPICard
                title="Pending"
                value={kpis.pending}
                icon={Clock}
                color="amber"
                clickable
                onClick={() => goToList({ status: 'new' })}
                subtext="Awaiting action"
              />
              <KPICard
                title="In Progress"
                value={kpis.in_progress}
                icon={Activity}
                color="purple"
                clickable
                onClick={() => goToList({ status: 'in_progress' })}
                subtext="Being handled"
              />
              <KPICard
                title="Overdue"
                value={kpis.overdue}
                icon={AlertTriangle}
                color="red"
                clickable
                onClick={() => navigate('/principal/tickets?overdue=true')}
                subtext="Past SLA deadline"
              />
              <KPICard
                title="Unresolved (Justified)"
                value={kpis.unresolved_justified}
                icon={TrendingUp}
                color="gray"
                clickable
                onClick={() => navigate('/principal/unresolved-justifications')}
                subtext="Formal justification on file"
              />
            </>
          )}
        </div>

        {/* ── Charts Grid ── */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 animate-pulse ${i >= 2 ? 'col-span-2' : ''}`}>
                <div className="h-3 bg-slate-200 rounded w-40 mb-4" />
                <div className="h-48 bg-slate-100 rounded-lg" />
              </div>
            ))}
          </div>
        ) : data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Row 1 */}
            <ChartSection title="Ticket Resolution Overview" subtitle="Current status breakdown">
              <ResolutionDonut
                data={data.donut_data}
                onSegmentClick={(status) => goToList({ status })}
              />
            </ChartSection>
            <ChartSection title="Issues by Department" subtitle="Total tickets per department">
              <DepartmentBarChart
                data={data.dept_bar}
                onBarClick={(dept) => goToList({ department_id: dept?.id })}
              />
            </ChartSection>

            {/* Row 2 – Full width */}
            <ChartSection title="Issue Trends (Last 30 Days)" subtitle="Daily ticket volume" fullWidth>
              <TrendsLineChart data={data.trends} />
            </ChartSection>

            {/* Row 3 */}
            <ChartSection title="Most Reported Categories" subtitle="Top issue categories">
              <CategoriesBarChart
                data={data.categories_bar}
                onBarClick={(cat) => goToList({ category_id: cat?.id })}
              />
            </ChartSection>
            <ChartSection title="Priority Distribution" subtitle="Tickets by priority level">
              <PriorityPieChart
                data={data.priority_dist}
                onSegmentClick={(priority) => goToList({ priority })}
              />
            </ChartSection>

            {/* Row 4 – Full width */}
            <ChartSection title="Department-wise Ticket Status" subtitle="Stacked by status per department" fullWidth>
              <DepartmentStackedBar
                data={data.dept_stacked}
                onBarClick={(dept) => goToList({ department_id: dept?.id })}
              />
            </ChartSection>

            {/* Row 5 – Full width */}
            <ChartSection title="Average Resolution Time by Department" subtitle="In hours" fullWidth>
              <ResolutionTimeBar data={data.resolution_time} />
            </ChartSection>
          </div>
        ) : null}

        {/* ── Recent Tickets Table ── */}
        {!loading && data?.recent_tickets?.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Recent Tickets</h3>
              <button
                onClick={() => navigate('/principal/tickets')}
                className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">ID</th>
                    <th className="py-2.5 px-4">Title</th>
                    <th className="py-2.5 px-4">Department</th>
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Priority</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Reporter</th>
                    <th className="py-2.5 px-4">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {data.recent_tickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => navigate(`/principal/tickets/${t.id}`)}
                      className="cursor-pointer hover:bg-indigo-50/50 transition-colors group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                        {t.ticket_number}
                        {t.is_overdue && (
                          <span className="ml-1 text-rose-500" title="Overdue">
                            <AlertCircle className="inline w-3 h-3" />
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-semibold text-slate-900 truncate block group-hover:text-indigo-700">
                          {t.title}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{t.department_name}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">{t.category_name}</td>
                      <td className="py-3 px-4 whitespace-nowrap"><PriorityBadge priority={t.priority} /></td>
                      <td className="py-3 px-4 whitespace-nowrap"><StatusBadge status={t.status} /></td>
                      <td className="py-3 px-4 whitespace-nowrap">{t.reporter_name}</td>
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400">{fmt(t.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Overdue Tickets Section ── */}
        {!loading && data?.overdue_tickets?.length > 0 && (
          <div className="bg-white rounded-xl border border-rose-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-rose-100 flex items-center gap-2 bg-rose-50">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="text-sm font-semibold text-rose-800">
                Overdue Tickets ({data.overdue_tickets.length})
              </h3>
              <span className="ml-auto text-xs text-rose-500 font-medium">Past SLA deadline</span>
            </div>
            <div className="divide-y divide-rose-100">
              {data.overdue_tickets.map((t) => (
                <div
                  key={t.id}
                  onClick={() => navigate(`/principal/tickets/${t.id}`)}
                  className="px-5 py-3 flex items-center gap-4 cursor-pointer hover:bg-rose-50/40 transition"
                >
                  <span className="font-mono text-xs font-bold text-rose-600">{t.ticket_number}</span>
                  <span className="text-sm font-semibold text-slate-800 flex-1 truncate">{t.title}</span>
                  <span className="text-xs text-slate-500">{t.department_name}</span>
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Top Pending Departments ── */}
        {!loading && data?.unresolved_depts?.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Highest pending workload */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-slate-800">Top Pending Departments</h3>
              </div>
              <div className="p-4 space-y-3">
                {data.unresolved_depts.slice(0, 5).map((dept, i) => {
                  const max = data.unresolved_depts[0]?.pending_count || 1;
                  const pct = Math.round((dept.pending_count / max) * 100);
                  return (
                    <div
                      key={dept.id || i}
                      className="cursor-pointer group"
                      onClick={() => goToList({ department_id: dept.id, status: 'in_progress' })}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
                          {dept.name}
                        </span>
                        <span className="text-xs font-bold text-slate-900">{dept.pending_count}</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Departments with Unresolved Issues */}
            <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-orange-100 flex items-center justify-between bg-orange-50">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-semibold text-orange-800">
                    Departments with Unresolved Issues
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/principal/unresolved-justifications')}
                  className="text-xs text-orange-600 font-semibold hover:underline flex items-center gap-1"
                >
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="divide-y divide-orange-50">
                {data.unresolved_depts
                  .filter((d) => d.unresolved_count > 0)
                  .slice(0, 5)
                  .map((dept, i) => (
                    <div
                      key={dept.id || i}
                      onClick={() =>
                        navigate(
                          `/principal/unresolved-justifications?department_id=${dept.id}`
                        )
                      }
                      className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-orange-50/60 transition group"
                    >
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-orange-700">
                        {dept.name}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 border border-orange-200">
                        {dept.unresolved_count} unresolved
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
