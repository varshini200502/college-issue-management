import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { departmentService } from '../../services/departmentService';
import { useToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import JustificationCard from '../../components/tickets/JustificationCard';
import PriorityBadge from '../../components/common/PriorityBadge';
import { 
  AlertOctagon, Building2, Filter, ChevronDown, ChevronUp, 
  ExternalLink, ShieldAlert, ArrowLeft 
} from 'lucide-react';

export default function UnresolvedJustifications() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [justifiedTickets, setJustifiedTickets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedTickets, setExpandedTickets] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [ticketsData, depts] = await Promise.all([
          ticketService.getTickets({ has_justification: true, page_size: 100 }),
          departmentService.getDepartments(),
        ]);

        const allItems = ticketsData?.items || ticketsData || [];
        // Filter tickets that contain a formal justification
        const withJustifications = allItems.filter((t) => !!t.justification || t.has_justification);
        setJustifiedTickets(withJustifications);
        setDepartments(depts || []);

        // Expand first ticket by default
        if (withJustifications.length > 0) {
          setExpandedTickets({ [withJustifications[0].id]: true });
        }
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Error Loading Justifications',
          message: err?.response?.data?.detail || 'Could not fetch unresolved justifications.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [addToast]);

  const toggleExpand = (id) => {
    setExpandedTickets((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredTickets = selectedDept
    ? justifiedTickets.filter((t) => String(t.department_id) === String(selectedDept))
    : justifiedTickets;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Header */}
      <div>
        <Link
          to="/principal/dashboard"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Executive Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded">
            Supervisory Audit Registry
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
          Unresolved Issue Formal Justifications
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Review all issues where departments encountered resource, budget, or technical roadblocks requiring institutional oversight.
        </p>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Unresolved</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{justifiedTickets.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Departments Affected</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {new Set(justifiedTickets.map((t) => t.department_id)).size}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Requiring External Vendor</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">
              {justifiedTickets.filter((t) => t.justification?.external_support_required).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Department Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="">All Departments ({justifiedTickets.length})</option>
            {departments.map((d) => {
              const count = justifiedTickets.filter((t) => t.department_id === d.id).length;
              return (
                <option key={d.id} value={d.id}>
                  {d.name} ({count})
                </option>
              );
            })}
          </select>
        </div>

        <span className="text-xs text-slate-500 self-end sm:self-auto">
          Showing {filteredTickets.length} recorded justification{filteredTickets.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Justifications Cards List */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" text="Loading formal justifications..." />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12">
          <EmptyState
            icon={<ShieldAlert className="w-12 h-12 text-slate-300" />}
            title="No Unresolved Justifications Recorded"
            description={
              selectedDept
                ? "No unresolved justifications have been filed for the selected department."
                : "No department has filed an unresolved justification yet. All tickets are progressing normally or resolved."
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTickets.map((t) => {
            const isExpanded = expandedTickets[t.id];
            const j = t.justification || {};

            const normalizedJustification = {
              reason_code: j.reason_code,
              explanation: j.explanation,
              actions_attempted: j.actions_attempted,
              challenges: j.challenges_encountered || j.challenges,
              requires_external: j.external_support_required || j.requires_external,
              next_action: j.next_proposed_action || j.next_action,
              submitted_at: j.created_at || j.submitted_at,
              submitted_by_name: j.admin_name || j.admin?.full_name || 'Department Administrator',
            };

            return (
              <div
                key={t.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all"
              >
                {/* Summary Row / Header */}
                <div
                  onClick={() => toggleExpand(t.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 border-b border-slate-100"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded">
                        {t.ticket_number}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        {t.department?.name}
                      </span>
                      <PriorityBadge priority={t.priority} size="sm" />
                      <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                        {j.reason_code}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {t.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {j.explanation}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/principal/tickets/${t.id}`);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Inspect Full Ticket
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(t.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                    >
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Full Justification Card */}
                {isExpanded && (
                  <div className="p-5 bg-slate-50/50">
                    <JustificationCard justification={normalizedJustification} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
