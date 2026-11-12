import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ticketService } from '../../services/ticketService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StatusBadge from '../../components/common/StatusBadge';
import PriorityBadge from '../../components/common/PriorityBadge';
import Modal from '../../components/common/Modal';
import TicketTimeline from '../../components/tickets/TicketTimeline';
import CommentThread from '../../components/tickets/CommentThread';
import JustificationCard from '../../components/tickets/JustificationCard';
import { 
  ArrowLeft, Building2, Tag, Calendar, User, Clock, 
  RotateCcw, CheckCircle2, AlertCircle, FileText, ShieldAlert 
} from 'lucide-react';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Reopen Modal
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopening, setReopening] = useState(false);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketService.getTicketById(id);
      setTicket(data);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error Loading Ticket',
        message: err?.response?.data?.detail || 'Ticket not found or access denied.',
      });
      navigate('/reporter/tickets');
    } finally {
      setLoading(false);
    }
  }, [id, addToast, navigate]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleAddComment = async (text, isInternal) => {
    try {
      await ticketService.addComment(ticket.id, {
        comment_text: text,
        is_internal: false, // Reporters can never post internal notes
        is_info_request: false,
      });
      addToast({
        type: 'success',
        title: 'Comment Posted',
        message: 'Your update or response was recorded.',
      });
      fetchTicket();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to Post Comment',
        message: err?.response?.data?.detail || 'An error occurred while posting your comment.',
      });
    }
  };

  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!reopenReason.trim() || reopenReason.trim().length < 5) {
      addToast({
        type: 'warning',
        title: 'Reopen Reason Required',
        message: 'Please provide at least 5 characters explaining why the issue persists.',
      });
      return;
    }

    try {
      setReopening(true);
      await ticketService.reopenTicket(ticket.id, reopenReason.trim());
      addToast({
        type: 'success',
        title: 'Ticket Reopened',
        message: 'The issue has been reopened and routed back to the department queue.',
      });
      setReopenOpen(false);
      setReopenReason('');
      fetchTicket();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to Reopen Ticket',
        message: err?.response?.data?.detail || 'An error occurred while reopening this ticket.',
      });
    } finally {
      setReopening(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" text="Loading ticket details & timeline..." />
      </div>
    );
  }

  if (!ticket) return null;

  const normalizedHistory = (ticket.status_history || []).map((h) => ({
    status: (h.to_status || '').toLowerCase(),
    previous_status: h.from_status ? h.from_status.toLowerCase() : null,
    changed_by_name: h.changed_by?.full_name || 'System / Admin',
    created_at: h.created_at,
    comment: h.note,
  }));

  const normalizedComments = (ticket.comments || []).map((c) => ({
    id: c.id,
    author_id: c.user_id,
    author_name: c.author_name || c.user?.full_name || 'User',
    author_role: c.author_role || c.user?.role?.name || 'reporter',
    comment_text: c.comment_text,
    text: c.comment_text,
    created_at: c.created_at,
    is_internal_note: c.is_internal,
    is_info_request: c.is_info_request,
    comment_type: c.is_info_request ? 'info_request' : 'comment',
  }));

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

  const canReopen = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/reporter/tickets"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to My Tickets
        </Link>
        {canReopen && (
          <button
            onClick={() => setReopenOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Reopen This Issue
          </button>
        )}
      </div>

      {/* Main Ticket Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Ticket Header Banner */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-blue-700 bg-blue-100/80 px-3 py-1 rounded-md border border-blue-200">
                {ticket.ticket_number}
              </span>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              <span>Reported on {new Date(ticket.created_at).toLocaleString()}</span>
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-4 tracking-tight">
            {ticket.title}
          </h1>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-6 bg-slate-50/20 border-b border-slate-100 text-xs">
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Responsible Department</span>
            <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-800 text-sm">
              <Building2 className="w-4 h-4 text-blue-600" />
              {ticket.department?.name || '—'}
            </div>
          </div>
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Category</span>
            <div className="flex items-center gap-1.5 mt-1 font-semibold text-slate-800 text-sm">
              <Tag className="w-4 h-4 text-slate-400" />
              {ticket.category?.name || '—'}
            </div>
          </div>
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Subcategory</span>
            <p className="mt-1 font-semibold text-slate-800 text-sm">
              {ticket.subcategory?.name || 'None specified'}
            </p>
          </div>
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider">Last Activity</span>
            <p className="mt-1 font-semibold text-slate-800 text-sm">
              {ticket.updated_at ? new Date(ticket.updated_at).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {/* Issue Description */}
        <div className="p-6 space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Detailed Description</h2>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

        {/* Resolution Notes (If Resolved) */}
        {ticket.status === 'RESOLVED' && ticket.resolution_notes && (
          <div className="mx-6 mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Official Resolution Description
            </div>
            <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap bg-white/70 p-3 rounded-lg border border-emerald-200/60">
              {ticket.resolution_notes}
            </p>
            {ticket.resolved_at && (
              <p className="text-xs text-emerald-700">
                Resolved on {new Date(ticket.resolved_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Formal Unresolved Justification (If Present) */}
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

      {/* Two Column Layout: Comments and Status History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Comments Thread (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">Communication & Updates</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Exchange comments with the department, ask questions, or provide requested details.
            </p>
          </div>

          <CommentThread
            comments={normalizedComments}
            currentUserId={user?.id}
            onAddComment={handleAddComment}
            canAddInternal={false}
          />
        </div>

        {/* Right Column: Status History Timeline (1 col) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">Status History</h2>
            <p className="text-xs text-slate-500 mt-0.5">Complete audit trail of progress transitions.</p>
          </div>

          <TicketTimeline history={normalizedHistory} />
        </div>
      </div>

      {/* Reopen Ticket Modal */}
      {reopenOpen && (
        <Modal
          isOpen={reopenOpen}
          onClose={() => setReopenOpen(false)}
          title="Reopen Issue Ticket"
        >
          <form onSubmit={handleReopenSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              If the problem was not satisfactorily resolved or has recurred, you may reopen this ticket. It will be returned directly to the responsible department.
            </p>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Reason for Reopening <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Explain why the resolution was incomplete or how the issue recurred..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <span className="text-xs text-slate-400">Minimum 5 characters required</span>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReopenOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={reopening}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-sm font-semibold transition"
              >
                {reopening ? 'Reopening...' : 'Confirm Reopen'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
