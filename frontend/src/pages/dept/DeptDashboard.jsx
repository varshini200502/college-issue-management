import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analyticsService';
import { KPICard } from '../../components/common/KPICard';
import { ResolutionDonut } from '../../components/charts/ResolutionDonut';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Inbox,
  TrendingUp,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_DONUT_COLORS = {
  new: '#3b82f6',
  assigned: '#8b5cf6',
  in_progress: '#f59e0b',
  waiting_for_info: '#eab308',
  on_hold: '#94a3b8',
  resolved: '#10b981',
  closed: '#0d9488',
  reopened: '#f43f5e',
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── Overdue Alert Section ────────────────────────────────────────────────────

function OverdueAlert({ tickets, onViewAll }) {
  if (!tickets || tickets.length === 0) return null;
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-bold text-rose-800">
            {tickets.length} Overdue {tickets.length === 1 ? 'Ticket' : 'Tickets'} Require Attention
          </p>
          <p className="text-xs text-rose-700 mt-0.5">
            These tickets have exceeded their SLA deadline. Please take action immediately.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tickets.slice(0, 5).map((t) => (
              <button
                key={t.id}
                onClick={() => onViewAll(t.id)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 bg-white border border-rose-200 rounded-lg px-2.5 py-1 hover:bg-rose-100 transition-colors"
              >
                {t.ticket_number}
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
            {tickets.length > 5 && (
              <span className="text-xs text-rose-600 font-medium self-center">
                +{tickets.length - 5} more
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Recent Tickets Mini Table ─────────────────────────────────────────────────

function RecentTicketsTable({ tickets, onRowClick }) {
  if (!tickets || tickets.length === 0) {
    return (
      <div className="py-10 text-center text-sm text-slate-500">
        No recent tickets found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <th className="py-3 px-4">Ticket ID</th>
            <th className="py-3 px-4">Title</th>
            <th className="py-3 px-4">Priority</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Created</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
          {tickets.map((t) => (
            <tr
              key={t.id}
              onClick={() => onRowClick(t.id)}
              className={`cursor-pointer hover:bg-slate-50 transition-colors ${
                t.is_overdue ? 'border-l-2 border-l-rose-500' : ''
              }`}
            >
              <td className="py-3 px-4 font-mono font-bold text-indigo-600 whitespace-nowrap">
                <span className="flex items-center gap-1.5">
                  {t.ticket_number}
                  {t.is_overdue && (
                    <AlertTriangle className="w-3 h-3 text-rose-500" />
                  )}
                </span>
              </td>
              <td className="py-3 px-4 max-w-xs">
                <span className="font-semibold text-slate-900 truncate block hover:text-indigo-600">
                  {t.title}
                </span>
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                <PriorityBadge priority={t.priority} />
              </td>
              <td className="py-3 px-4 whitespace-nowrap">
                <StatusBadge status={t.status} />
              </td>
              <td className="py-3 px-4 whitespace-nowrap text-slate-500 text-[11px]">
                {formatDate(t.created_at)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Volume Bar Chart ─────────────────────────────────────────────────────────

function VolumeBarChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        No volume data for the last 14 days.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#64748b' }}
            interval={1}
            angle={-30}
            textAnchor="end"
          />
          <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: '#f8fafc' }}
            formatter={(value) => [`${value} tickets`, 'Volume']}
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              fontSize: '12px',
            }}
          />
          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DeptDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const departmentName = user?.department_name || 'Your Department';

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await analyticsService.getDepartmentAnalytics(user?.department_id);
      setAnalytics(data);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [user?.department_id]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // ── Derived data ────────────────────────────────────────────────────────────

  const kpis = analytics
    ? [
        {
          title: 'Total Tickets',
          value: analytics.total_tickets ?? 0,
          icon: Ticket,
          color: 'blue',
          subtext: 'All time in this department',
        },
        {
          title: 'New / Unread',
          value: analytics.new_tickets ?? 0,
          icon: Inbox,
          color: 'purple',
          subtext: 'Awaiting first action',
        },
        {
          title: 'In Progress',
          value: analytics.in_progress_tickets ?? 0,
          icon: Loader2,
          color: 'amber',
          subtext: 'Currently being worked on',
        },
        {
          title: 'Resolved',
          value: analytics.resolved_tickets ?? 0,
          icon: CheckCircle2,
          color: 'green',
          subtext: 'Successfully resolved',
        },
        {
          title: 'Pending',
          value:
            (analytics.assigned_tickets ?? 0) + (analytics.waiting_tickets ?? 0),
          icon: Clock,
          color: 'gray',
          subtext: 'Assigned or waiting for info',
        },
        {
          title: 'Overdue',
          value: analytics.overdue_tickets ?? 0,
          icon: AlertTriangle,
          color: 'red',
          subtext: 'Past SLA deadline',
          clickable: true,
        },
      ]
    : [];

  const donutData = analytics?.status_distribution
    ? (Array.isArray(analytics.status_distribution)
        ? analytics.status_distribution
            .filter((item) => (item.value || 0) > 0)
            .map((item) => ({
              name: (item.name || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
              value: item.value || 0,
              color: STATUS_DONUT_COLORS[(item.name || '').toLowerCase()] || '#94a3b8',
            }))
        : Object.entries(analytics.status_distribution)
            .filter(([, count]) => count > 0)
            .map(([status, count]) => ({
              name: status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
              value: count,
              color: STATUS_DONUT_COLORS[status.toLowerCase()] || '#94a3b8',
            }))
      )
    : [];

  const volumeData = analytics?.daily_volume ?? [];
  const recentTickets = analytics?.recent_tickets ?? [];
  const overdueTickets = analytics?.overdue_ticket_list ?? [];

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-rose-600 font-semibold text-sm">{error}</div>
        <button
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 text-xs px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {departmentName} Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back, {user?.name}. Here's the current status of your department's tickets.
          </p>
        </div>
        <button
          onClick={loadAnalytics}
          className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* ── Overdue Alert ── */}
      <OverdueAlert
        tickets={overdueTickets}
        onViewAll={(id) => navigate(`/dept/tickets/${id}`)}
      />

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            subtext={kpi.subtext}
            clickable={kpi.clickable}
            onClick={
              kpi.clickable
                ? () => navigate('/dept/tickets?status=overdue')
                : undefined
            }
          />
        ))}
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">Status Distribution</h2>
          </div>
          <ResolutionDonut
            data={donutData}
            onSegmentClick={(name) => {
              const status = name.toLowerCase().replace(/ /g, '_');
              navigate(`/dept/tickets?status=${status}`);
            }}
          />
        </div>

        {/* Bar Chart: Volume Last 14 Days */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Ticket Volume (Last 14 Days)
            </h2>
          </div>
          <VolumeBarChart data={volumeData} />
        </div>
      </div>

      {/* ── Recent Tickets ── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Ticket className="w-4 h-4 text-indigo-500" />
            <h2 className="text-sm font-bold text-slate-900">Recent Tickets</h2>
          </div>
          <button
            onClick={() => navigate('/dept/tickets')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            View All <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <RecentTicketsTable
          tickets={recentTickets}
          onRowClick={(id) => navigate(`/dept/tickets/${id}`)}
        />
      </div>
    </div>
  );
}
