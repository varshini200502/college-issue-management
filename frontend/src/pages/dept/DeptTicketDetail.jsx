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
  Play, HelpCircle, PauseCircle, CheckCircle2, AlertOctagon, 
  RotateCcw, ShieldAlert, Phone, Mail, FileText 
} from 'lucide-react';

const JUSTIFICATION_REASONS = [
  'Budget approval required',
  'Insufficient resources',
  'Technical limitations',
  'External vendor dependency',
  'Requires Principal/management approval',
  'Outside the department\'s responsibility',
  'Other',
];

export default function DeptTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modals
  const [activeModal, setActiveModal] = useState(null); // 'info' | 'hold' | 'resolve' | 'justify'

  // Modal form states
  const [infoRequestText, setInfoRequestText] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [justificationData, setJustificationData] = useState({
    reason_code: 'Budget approval required',
    explanation: '',
    actions_attempted: '',
    challenges_encountered: '',
    external_support_required: false,
    next_proposed_action: '',
  });

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const data = await ticketService.getTicketById(id);
      setTicket(data);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error Loading Ticket',
        message: err?.response?.data?.detail || 'Ticket not found or unauthorized department.',
      });
      navigate('/dept/tickets');
    } finally {
      setLoading(false);
    }
  }, [id, addToast, navigate]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  // Status transitions
  const handleStartWorking = async () => {
    try {
      setActionLoading(true);
      await ticketService.updateStatus(ticket.id, {
        status: 'IN_PROGRESS',
        note: `Work commenced by ${user?.full_name || 'Department Administrator'}.`,
      });
      addToast({
        type: 'success',
        title: 'Status Updated',
        message: 'Ticket status changed to In Progress.',
      });
      fetchTicket();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err?.response?.data?.detail || 'Could not update ticket status.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResumeWork = async () => {
    try {
      setActionLoading(true);
      await ticketService.updateStatus(ticket.id, {
        status: 'IN_PROGRESS',
        note: 'Resumed active investigation and work.',
      });
      addToast({
        type: 'success',
        title: 'Work Resumed',
        message: 'Ticket status returned to In Progress.',
      });
      fetchTicket();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Update Failed',
        message: err?.response?.data?.detail || 'Could not update ticket status.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfoSubmit = async (e) => {
    e.preventDefault();
    if (!infoRequestText.trim()) return;

    try {
      setActionLoading(true);
      // 1. Post info request comment
      await ticketService.addComment(ticket.id, {
        comment_text: infoRequestText.trim(),
        is_info_request: true,
        is_internal: false,
      });

      // 2. Transition status
      await ticketService.updateStatus(ticket.id, {
        status: 'WAITING_FOR_INFO',
        note: `Additional information requested from reporter: "${infoRequestText.trim()}"`,
      });

      addToast({
        type: 'success',
        title: 'Information Requested',
        message: 'Ticket status set to Waiting for Information and request sent to reporter.',
      });
      setActiveModal(null);
      setInfoRequestText('');
      fetchTicket();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err?.response?.data?.detail || 'Could not request information.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleHoldSubmit = async (e) => {
    e.preventDefault();
    if (!holdReason.trim() || holdReason.trim().length < 5) {
      addToast({
        type: 'warning',
        title: 'Hold Reason Required',
        message: 'Please provide at least 5 characters explaining why this ticket is placed on hold.',
      });
      return;
    }

    try {
      setActionLoading(true);
      await ticketService.updateStatus(ticket.id, {
        status: 'ON_HOLD',
        hold_reason: holdReason.trim(),
        note: `Ticket placed on hold. Reason: ${holdReason.trim()}`,
      });
      addToast({
        type: 'success',
        title: 'Ticket On Hold',
        message: 'Ticket status changed to On Hold with mandatory reason recorded.',
      });
      setActiveModal(null);
      setHoldReason('');
      fetchTicket();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err?.response?.data?.detail || 'Could not place ticket on hold.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!resolutionNotes.trim() || resolutionNotes.trim().length < 10) {
      addToast({
        type: 'warning',
        title: 'Resolution Description Required',
        message: 'A detailed resolution description (at least 10 characters) is mandatory to resolve an issue.',
      });
      return;
    }

    try {
      setActionLoading(true);
      await ticketService.resolveTicket(ticket.id, resolutionNotes.trim());
      addToast({
        type: 'success',
        title: 'Ticket Successfully Resolved',
        message: 'The issue has been marked as resolved and resolution description logged.',
      });
      setActiveModal(null);
      setResolutionNotes('');
      fetchTicket();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Resolution Failed',
        message: err?.response?.data?.detail || 'Could not resolve ticket.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleJustificationSubmit = async (e) => {
    e.preventDefault();
    if (!justificationData.explanation.trim() || justificationData.explanation.trim().length < 20) {
      addToast({
        type: 'warning',
        title: 'Detailed Explanation Required',
        message: 'Please provide a comprehensive explanation (at least 20 characters) explaining why this cannot be resolved.',
      });
      return;
    }

    try {
      setActionLoading(true);
      await ticketService.submitJustification(ticket.id, {
        reason_code: justificationData.reason_code,
        explanation: justificationData.explanation.trim(),
        actions_attempted: justificationData.actions_attempted.trim(),
        challenges_encountered: justificationData.challenges_encountered.trim(),
        external_support_required: justificationData.external_support_required,
        next_proposed_action: justificationData.next_proposed_action.trim() || null,
      });

      addToast({
        type: 'success',
        title: 'Formal Justification Submitted',
        message: 'Unresolved justification recorded and linked for executive supervisor review.',
      });
      setActiveModal(null);
      fetchTicket();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Submission Failed',
        message: err?.response?.data?.detail || 'Could not submit justification.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddComment = async (text, isInternal) => {
    try {
      await ticketService.addComment(ticket.id, {
        comment_text: text,
        is_internal: isInternal,
        is_info_request: false,
      });
      addToast({
        type: 'success',
        title: isInternal ? 'Internal Note Saved' : 'Comment Posted',
        message: isInternal ? 'Visible only to department administrators.' : 'Update posted to reporter.',
      });
      fetchTicket();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to Post',
        message: err?.response?.data?.detail || 'Could not save comment.',
      });
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" text="Loading department ticket workspace..." />
      </div>
    );
  }

  if (!ticket) return null;

  const status = ticket.status;
  const isOverdue = ticket.is_overdue;

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
    author_role: c.author_role || c.user?.role?.name || 'department_admin',
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

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/dept/tickets"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Department Queue
        </Link>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-md">
          {ticket.department?.name || 'Department Queue'}
        </span>
      </div>

      {/* Main Ticket Banner */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-md border border-blue-200">
                {ticket.ticket_number}
              </span>
              <PriorityBadge priority={ticket.priority} />
              <StatusBadge status={ticket.status} />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 border border-red-200 px-2.5 py-0.5 rounded-full animate-pulse">
                  <Clock className="w-3.5 h-3.5" />
                  SLA OVERDUE
                </span>
              )}
            </div>
            <div className="text-xs text-slate-500">
              Submitted on {new Date(ticket.created_at).toLocaleString()}
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-4 tracking-tight">
            {ticket.title}
          </h1>
        </div>

        {/* Action Panel */}
        <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Workflow Actions
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {/* Start Working */}
            {(status === 'NEW' || status === 'ASSIGNED' || status === 'REOPENED') && (
              <button
                disabled={actionLoading}
                onClick={handleStartWorking}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
              >
                <Play className="w-3.5 h-3.5" />
                Start Working
              </button>
            )}

            {/* Resume Work */}
            {(status === 'WAITING_FOR_INFO' || status === 'ON_HOLD') && (
              <button
                disabled={actionLoading}
                onClick={handleResumeWork}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition"
              >
                <Play className="w-3.5 h-3.5" />
                Resume Work
              </button>
            )}

            {/* Request Info */}
            {(status === 'IN_PROGRESS' || status === 'ASSIGNED') && (
              <button
                onClick={() => setActiveModal('info')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                Request Information
              </button>
            )}

            {/* Put On Hold */}
            {(status === 'IN_PROGRESS' || status === 'WAITING_FOR_INFO') && (
              <button
                onClick={() => setActiveModal('hold')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
              >
                <PauseCircle className="w-3.5 h-3.5 text-slate-400" />
                Put On Hold
              </button>
            )}

            {/* Resolve */}
            {status !== 'RESOLVED' && status !== 'CLOSED' && (
              <button
                onClick={() => setActiveModal('resolve')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolve Ticket
              </button>
            )}

            {/* Cannot Resolve / Formal Justification */}
            {status !== 'CLOSED' && (
              <button
                onClick={() => setActiveModal('justify')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition shadow-sm"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                Cannot Resolve (Submit Justification)
              </button>
            )}
          </div>
        </div>

        {/* Reporter & Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 border-b border-slate-100 bg-slate-50/20">
          {/* Reporter Profile */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reporter Contact</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                {(ticket.reporter?.full_name || 'U')[0]}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">{ticket.reporter?.full_name}</p>
                <span className="text-xs text-blue-600 capitalize bg-blue-50 px-2 py-0.5 rounded font-medium">
                  {ticket.reporter_role || ticket.reporter?.reporter_type || 'Reporter'}
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

          {/* Classification */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Classification</span>
            <div className="space-y-1.5 text-xs">
              <div>
                <span className="text-slate-400">Category:</span>
                <p className="font-semibold text-slate-800 text-sm">{ticket.category?.name}</p>
              </div>
              <div>
                <span className="text-slate-400">Subcategory:</span>
                <p className="font-medium text-slate-700">{ticket.subcategory?.name || 'None specified'}</p>
              </div>
            </div>
          </div>

          {/* Department & SLA */}
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Service Level</span>
            <div className="space-y-1.5 text-xs">
              <div>
                <span className="text-slate-400">Assigned Department:</span>
                <p className="font-semibold text-blue-700 text-sm">{ticket.department?.name}</p>
              </div>
              <div>
                <span className="text-slate-400">SLA Status:</span>
                <p className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-emerald-600'}`}>
                  {isOverdue ? 'Overdue (Target breached)' : 'Within target resolution window'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Issue Description */}
        <div className="p-6 space-y-2">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Issue Description</h2>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </div>
        </div>

        {/* Hold Reason Banner (if ON_HOLD) */}
        {ticket.status === 'ON_HOLD' && ticket.hold_reason && (
          <div className="mx-6 mb-6 p-4 bg-slate-100 border border-slate-300 rounded-xl">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">Current Hold Reason</p>
            <p className="text-sm text-slate-800 italic">{ticket.hold_reason}</p>
          </div>
        )}

        {/* Official Resolution Notes */}
        {ticket.status === 'RESOLVED' && ticket.resolution_notes && (
          <div className="mx-6 mb-6 p-5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Recorded Resolution Description
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

      {/* Two Column Section: Comments and Audit History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Communication & Internal Notes</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Reply to the reporter, ask questions, or log internal staff notes.
              </p>
            </div>
          </div>

          <CommentThread
            comments={normalizedComments}
            currentUserId={user?.id}
            onAddComment={handleAddComment}
            canAddInternal={true}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-base font-bold text-slate-900">Status History</h2>
            <p className="text-xs text-slate-500 mt-0.5">Complete audit trail of progress transitions.</p>
          </div>

          <TicketTimeline history={normalizedHistory} />
        </div>
      </div>

      {/* Modal 1: Request Information */}
      {activeModal === 'info' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Request Information from Reporter"
        >
          <form onSubmit={handleRequestInfoSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Specify what additional clarification, log files, or details you require from the reporter.
            </p>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Information Request Query <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={infoRequestText}
                onChange={(e) => setInfoRequestText(e.target.value)}
                placeholder="e.g. Please provide your laptop MAC address and room number..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition"
              >
                {actionLoading ? 'Sending...' : 'Send Request & Update Status'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 2: Put On Hold */}
      {activeModal === 'hold' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Place Ticket On Hold"
        >
          <form onSubmit={handleHoldSubmit} className="space-y-4">
            <p className="text-sm text-slate-600">
              Placing an issue on hold requires a formal recorded reason (e.g. waiting for spare parts shipment, campus power shutdown).
            </p>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Reason for Placing On Hold <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="Explain why work is temporarily paused..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition"
              >
                {actionLoading ? 'Updating...' : 'Confirm Hold'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 3: Resolve Ticket */}
      {activeModal === 'resolve' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Resolve Issue Ticket"
        >
          <form onSubmit={handleResolveSubmit} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 leading-relaxed">
              <strong>Mandatory Requirement:</strong> Provide an explicit description of the diagnosis and corrective actions taken to resolve the issue.
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Resolution Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Detail what was fixed, replaced, or configured..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
              <span className="text-xs text-slate-400">Minimum 10 characters required</span>
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition"
              >
                {actionLoading ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal 4: Formal Justification for Unresolved Issue */}
      {activeModal === 'justify' && (
        <Modal
          isOpen={true}
          onClose={() => setActiveModal(null)}
          title="Formal Justification (Cannot Resolve Issue)"
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleJustificationSubmit} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 leading-relaxed">
              When an issue cannot be resolved by the department, a structured formal justification is required. This justification will be audited by the Principal and visible to the reporter.
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Primary Reason Code <span className="text-red-500">*</span>
              </label>
              <select
                value={justificationData.reason_code}
                onChange={(e) => setJustificationData({ ...justificationData, reason_code: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                {JUSTIFICATION_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Detailed Explanation <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                value={justificationData.explanation}
                onChange={(e) => setJustificationData({ ...justificationData, explanation: e.target.value })}
                placeholder="Why could the issue not be resolved?"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
              <span className="text-xs text-slate-400">Minimum 20 characters required</span>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Actions Attempted <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={justificationData.actions_attempted}
                onChange={(e) => setJustificationData({ ...justificationData, actions_attempted: e.target.value })}
                placeholder="What diagnostic or repair steps did your department take?"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Challenges Encountered <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={justificationData.challenges_encountered}
                onChange={(e) => setJustificationData({ ...justificationData, challenges_encountered: e.target.value })}
                placeholder="What limitations, costs, or vendor barriers were faced?"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div className="flex items-center gap-4 py-1">
              <span className="text-sm font-semibold text-slate-700">Requires External Support / Vendor:</span>
              <label className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="radio"
                  name="ext_support"
                  checked={justificationData.external_support_required === true}
                  onChange={() => setJustificationData({ ...justificationData, external_support_required: true })}
                />
                Yes
              </label>
              <label className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                <input
                  type="radio"
                  name="ext_support"
                  checked={justificationData.external_support_required === false}
                  onChange={() => setJustificationData({ ...justificationData, external_support_required: false })}
                />
                No
              </label>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Next Proposed Action (Optional)
              </label>
              <input
                type="text"
                value={justificationData.next_proposed_action}
                onChange={(e) => setJustificationData({ ...justificationData, next_proposed_action: e.target.value })}
                placeholder="e.g. Purchase order drafted for principal review and procurement"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition"
              >
                {actionLoading ? 'Submitting...' : 'Submit Formal Justification'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
