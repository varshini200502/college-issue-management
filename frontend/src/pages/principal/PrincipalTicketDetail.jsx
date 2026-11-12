import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { useToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import TicketTimeline from '../../components/tickets/TicketTimeline';
import JustificationCard from '../../components/tickets/JustificationCard';
import { 
  ArrowLeft, Building2, Tag, Calendar, User, Clock, 
  Shield, CheckCircle2, ShieldAlert, Mail, Phone, Lock, Eye 
} from 'lucide-react';

export default function PrincipalTicketDetail() {
  const { id } = useParams();
  const { addToast } = useToast();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketService.getTicketById(id);
      setTicket(data);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error Loading Ticket',
        message: err?.response?.data?.detail || 'Ticket not found.',
      });
    } finally {
      setLoading(false);
    }
  }, [id, addToast]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" text="Loading supervisor audit view..." />
      </div>
    );
  }

  if (!ticket) return null;

  const isOverdue = ticket.is_overdue;

  const normalizedHistory = (ticket.status_history || []).map((h) => ({
    status: (h.to_status || '').toLowerCase(),
    previous_status: h.from_status ? h.from_status.toLowerCase() : null,
    changed_by_name: h.changed_by?.full_name || 'System / Admin',
    created_at: h.created_at,
    comment: h.note,
  }));

  const comments = ticket.comments || [];

  const normalizedJustification = ticket.justification ? {
    reason_code: ticket.justification.reason_code,
    explanation: ticket.justification.explanation,
    actions_attempted: ticket.justification.actions_attempted,
    challenges: ticket.justification.challenges_encountered || ticket.justification.challenges,
    requires_external: ticket.justification.external_support_required || ticket.justification.requires_external,
    next_action: ticket.justification.next_proposed_action || ticket.justification.next_action,
    submitted_at: ticket.justification.created_at || ticket.justification.submitted_at,
    submitted_by_name: ticket.justification.admin_name || ticket.justification.admin?.full_name || 'Department Administrator',
  } : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/principal/tickets"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to College-wide Tickets
        </Link>
        <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
          <Lock className="w-3.5 h-3.5" />
          Supervisor Read-Only Inspection Mode
        </div>
      </div>

      {/* Main Ticket Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-md border border-purple-200">
                {ticket.ticket_number}
              </span>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full">
                  <Clock className="w-3.5 h-3.5" />
                  SLA OVERDUE
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              Reported on {new Date(ticket.created_at).toLocaleString()}
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-4 tracking-tight">
            {ticket.title}
          </h1>
        </div>

        {/* Informational Read-Only Banner */}
        <div className="p-3 bg-purple-50/70 border-b border-purple-100 flex items-center justify-between px-6 text-xs text-purple-800">
          <div className="flex items-center gap-2 font-medium">
            <Shield className="w-4 h-4 text-purple-600" />
            <span>As Principal, you have complete institutional read access across all departments, ticket comments, and internal justifications.</span>
          </div>
          <span className="text-purple-600 font-semibold italic">Mutations disabled</span>
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b border-slate-100 bg-slate-50/20">
          {/* Department Handling */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Assigned Department</span>
            <div className="flex items-center gap-2 mt-1">
              <Building2 className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-slate-900 text-sm">{ticket.department?.name || '—'}</span>
            </div>
            <div className="text-xs text-slate-500 pt-1">
              Category: <strong className="text-slate-700">{ticket.category?.name}</strong>
              {ticket.subcategory && (
                <p className="mt-0.5">Subcategory: {ticket.subcategory.name}</p>
              )}
            </div>
          </div>

          {/* Reporter Details */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reporter Information</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs">
                {(ticket.reporter?.full_name || 'U')[0]}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{ticket.reporter?.full_name}</p>
                <span className="text-xs text-slate-500 capitalize bg-slate-100 px-2 py-0.5 rounded font-medium">
                  {ticket.reporter_role || ticket.reporter?.reporter_type || 'User'}
                </span>
              </div>
            </div>
            <div className="pt-2 text-xs text-slate-600 space-y-1">
              <p className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                {ticket.reporter?.email}
              </p>
              {ticket.reporter?.phone && (
                <p className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  {ticket.reporter?.phone}
                </p>
              )}
            </div>
          </div>

          {/* SLA Performance */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SLA & Resolution State</span>
            <div className="text-xs space-y-1.5">
              <div>
                <span className="text-slate-400">Current Status:</span>
                <p className="font-semibold text-slate-800 text-sm">{ticket.status}</p>
              </div>
              <div>
                <span className="text-slate-400">SLA Breach:</span>
                <p className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                  {isOverdue ? 'Yes (Overdue target)' : 'No (Within compliance)'}
                </p>
              </div>
              {ticket.resolved_at && (
                <div>
                  <span className="text-slate-400">Resolved Date:</span>
                  <p className="text-slate-700">{new Date(ticket.resolved_at).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Issue Description */}
        <div className="p-6 space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Original Issue Description</h2>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

        {/* Resolution Notes */}
        {ticket.status === 'RESOLVED' && ticket.resolution_notes && (
          <div className="mx-6 mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Recorded Department Resolution Description
            </div>
            <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap bg-white/70 p-3 rounded-lg border border-emerald-200/60">
              {ticket.resolution_notes}
            </p>
          </div>
        )}

        {/* Hold Reason */}
        {ticket.status === 'ON_HOLD' && ticket.hold_reason && (
          <div className="mx-6 mb-6 p-4 bg-slate-100 border border-slate-300 rounded-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Active Hold Reason</p>
            <p className="text-sm text-slate-800 italic">{ticket.hold_reason}</p>
          </div>
        )}

        {/* Formal Unresolved Justification */}
        {normalizedJustification && (
          <div className="mx-6 mb-6">
            <div className="mb-2 flex items-center gap-2 text-amber-800 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              Department Formal Justification (Unresolved Issue)
            </div>
            <JustificationCard justification={normalizedJustification} />
          </div>
        )}
      </div>

      {/* Two Columns: Read-only Comment Feed and Status History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Comments Feed (Read-Only) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">Communication & Activity Trail</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Read-only feed of all department notes and reporter correspondence.
            </p>
          </div>

          {comments.length === 0 ? (
            <p className="text-sm text-slate-400 italic text-center py-6">No comments or notes recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className={`p-4 rounded-xl border text-sm ${
                    c.is_internal
                      ? 'bg-purple-50/60 border-purple-200'
                      : c.is_info_request
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{c.author_name || 'User'}</span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase bg-slate-200/80 px-2 py-0.5 rounded">
                        {c.author_role || 'User'}
                      </span>
                      {c.is_internal && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          🔒 Internal Staff Note
                        </span>
                      )}
                      {c.is_info_request && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                          ❓ Information Request
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-800 whitespace-pre-wrap text-sm leading-relaxed">
                    {c.comment_text}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status History */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">Status History</h2>
            <p className="text-xs text-slate-500 mt-0.5">Audit log of all transitions.</p>
          </div>

          <TicketTimeline history={normalizedHistory} />
        </div>
      </div>
    </div>
  );
}
