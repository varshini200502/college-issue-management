import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  Ticket,
  Clock,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import { KPICard } from '../../components/common/KPICard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { PriorityBadge } from '../../components/common/PriorityBadge';

const STATUS_COLORS = {
  NEW: '#3b82f6',
  ASSIGNED: '#a855f7',
  IN_PROGRESS: '#f59e0b',
  WAITING_FOR_INFO: '#eab308',
  ON_HOLD: '#6b7280',
  RESOLVED: '#10b981',
  CLOSED: '#14b8a6',
  REOPENED: '#f43f5e',
};

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent" />
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function ReporterDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await analyticsService.getReporterAnalytics();
        setData(result);
      } catch (err) {
        setError(err?.response?.data?.detail || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-10 h-10 text-rose-500" />
        <p className="text-slate-600 font-medium">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const recentTickets = data?.recent_tickets || [];
  const statusDistribution = data?.status_distribution || [];

  const pieData = statusDistribution
    .filter((s) => (s.value || s.count || 0) > 0)
    .map((s) => ({
      name: (s.name || s.status || '').replace(/_/g, ' '),
      value: s.value || s.count || 0,
      key: s.name || s.status || '',
    }));

  const kpis = [
    {
      title: 'Total Tickets',
      value: summary.total ?? data?.kpis?.total_tickets ?? 0,
      icon: Ticket,
      color: 'blue',
      subtext: 'All time',
    },
    {
      title: 'Open',
      value: (summary.new ?? 0) + (summary.assigned ?? 0),
      icon: Clock,
      color: 'purple',
      subtext: 'New + Assigned',
    },
    {
      title: 'In Progress',
      value: summary.in_progress ?? 0,
      icon: TrendingUp,
      color: 'amber',
      subtext: 'Being worked on',
    },
    {
      title: 'Resolved',
      value: (summary.resolved ?? 0) + (summary.closed ?? 0),
      icon: CheckCircle2,
      color: 'green',
      subtext: 'Resolved + Closed',
    },
    {
      title: 'Reopened',
      value: summary.reopened ?? 0,
      icon: RefreshCw,
      color: 'red',
      subtext: 'Requires attention',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track and manage your submitted issues
          </p>
        </div>
        <button
          onClick={() => navigate('/reporter/raise')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 active:bg-blue-800 shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Raise New Issue
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            color={kpi.color}
            subtext={kpi.subtext}
          />
        ))}
      </div>

      {/* Chart + Recent Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Status Distribution</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={STATUS_COLORS[entry.key] || '#94a3b8'}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-xs text-slate-600 capitalize">{value.toLowerCase()}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No tickets yet
            </div>
          )}
        </div>

        {/* Recent Tickets */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-700">Recent Tickets</h2>
            <Link
              to="/reporter/tickets"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              View all →
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Ticket className="w-10 h-10 text-slate-300" />
              <p className="text-sm text-slate-400">No tickets raised yet</p>
              <button
                onClick={() => navigate('/reporter/raise')}
                className="text-xs text-blue-600 hover:underline"
              >
                Raise your first issue
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      ID
                    </th>
                    <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Title
                    </th>
                    <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Priority
                    </th>
                    <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentTickets.slice(0, 5).map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 pr-3">
                        <Link
                          to={`/reporter/tickets/${ticket.id}`}
                          className="text-blue-600 hover:text-blue-800 font-mono text-xs font-medium"
                        >
                          #{ticket.id}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 max-w-[200px]">
                        <Link
                          to={`/reporter/tickets/${ticket.id}`}
                          className="text-slate-800 hover:text-blue-700 font-medium line-clamp-1"
                        >
                          {ticket.title}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="py-2.5 pr-3">
                        <StatusBadge status={ticket.status} />
                      </td>
                      <td className="py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(ticket.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
