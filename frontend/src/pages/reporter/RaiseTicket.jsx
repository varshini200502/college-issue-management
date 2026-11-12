import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { departmentService } from '../../services/departmentService';
import { ticketService } from '../../services/ticketService';
import { useToast } from '../../components/common/Toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PriorityBadge from '../../components/common/PriorityBadge';
import { 
  CheckCircle2, ArrowRight, ArrowLeft, Building2, Tag, 
  AlertTriangle, Shield, Check, Info, FileText 
} from 'lucide-react';

export default function RaiseTicket() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState(null); // { ticket } | null
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    subcategory_id: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchCats = async () => {
      try {
        setLoadingCats(true);
        const data = await departmentService.getCategories();
        setCategories(data || []);
      } catch (err) {
        addToast({
          type: 'error',
          title: 'Failed to load categories',
          message: err?.response?.data?.detail || 'Could not fetch issue categories.',
        });
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCats();
  }, [addToast]);

  const selectedCategory = categories.find((c) => c.id === Number(formData.category_id));
  const subcategories = selectedCategory?.subcategories || [];

  const validateStep1 = () => {
    const errs = {};
    if (!formData.category_id) errs.category_id = 'Please select an issue category.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!formData.title.trim()) {
      errs.title = 'Title is required.';
    } else if (formData.title.trim().length < 5) {
      errs.title = 'Title must be at least 5 characters.';
    }

    if (!formData.description.trim()) {
      errs.description = 'Description is required.';
    } else if (formData.description.trim().length < 15) {
      errs.description = 'Description must be at least 15 characters to provide sufficient detail.';
    }

    if (!formData.priority) errs.priority = 'Priority is required.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      // Duplicate check before proceeding to review
      if (!confirmDuplicate) {
        try {
          setCheckingDuplicate(true);
          const result = await ticketService.checkDuplicate(
            Number(formData.category_id),
            formData.title.trim()
          );
          if (result.is_duplicate && result.existing_ticket) {
            setDuplicateWarning(result.existing_ticket);
            return; // Stay on step 2, show warning
          }
        } catch {
          // Ignore check errors — allow submission
        } finally {
          setCheckingDuplicate(false);
        }
      }
      setDuplicateWarning(null);
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category_id: Number(formData.category_id),
        subcategory_id: formData.subcategory_id ? Number(formData.subcategory_id) : null,
        priority: formData.priority,
        confirm_duplicate: confirmDuplicate,
      };

      const newTicket = await ticketService.createTicket(payload);
      addToast({
        type: 'success',
        title: 'Ticket Submitted Successfully!',
        message: `Your issue ticket ${newTicket.ticket_number} has been routed to ${newTicket.department?.name || 'the responsible department'}.`,
      });
      navigate(`/reporter/tickets/${newTicket.id}`);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed to Submit Ticket',
        message: err?.response?.data?.detail || 'An error occurred while creating your ticket.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCats) {
    return (
      <div className="py-20 flex justify-center">
        <LoadingSpinner size="lg" text="Loading categories and routing directory..." />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Raise a New Issue</h1>
        <p className="text-sm text-slate-500 mt-1">
          Submit your complaint or request. Our automated routing system will immediately direct it to the authorized department.
        </p>
      </div>

      {/* Wizard Progress Stepper */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          {[
            { num: 1, label: 'Category & Department' },
            { num: 2, label: 'Issue Details' },
            { num: 3, label: 'Review & Submit' },
          ].map((s, idx, arr) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                    step === s.num
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : step > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Step {s.num}</p>
                  <p className={`text-sm font-medium ${step === s.num ? 'text-slate-900' : 'text-slate-500'}`}>
                    {s.label}
                  </p>
                </div>
              </div>
              {idx < arr.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${step > s.num ? 'bg-emerald-500' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Category & Department */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Select Category</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Choose the category that matches your problem. The responsible department will be automatically assigned.
            </p>
          </div>

          {errors.category_id && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
              {errors.category_id}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {categories.map((cat) => {
              const isSelected = formData.category_id === String(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => {
                    setFormData({
                      ...formData,
                      category_id: String(cat.id),
                      subcategory_id: '',
                    });
                    setErrors({ ...errors, category_id: null });
                  }}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-1 ring-blue-600/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900 text-base">{cat.name}</h3>
                      {cat.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
                      )}
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-slate-500">Auto-routes to:</span>
                    <span className="font-semibold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded">
                      {cat.department_name || 'Assigned Department'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedCategory && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-emerald-900">
                  Automated Department Routing Confirmed
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  Your ticket under category <strong>"{selectedCategory.name}"</strong> will be immediately routed to the{' '}
                  <strong>{selectedCategory.department_name}</strong> administrative queue for investigation.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition shadow-sm"
            >
              Continue to Issue Details
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Issue Details */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Issue Details</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Provide clear and detailed information to help the department resolve your request efficiently.
            </p>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Wi-Fi dropping in Library 2nd floor reading hall"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                  errors.title
                    ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
            </div>

            {/* Subcategory (optional) */}
            {subcategories.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Specific Subcategory (Optional)
                </label>
                <select
                  value={formData.subcategory_id}
                  onChange={(e) => setFormData({ ...formData, subcategory_id: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Select Specific Subcategory (if applicable) --</option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Priority Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Priority Level <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { level: 'LOW', label: 'Low', desc: 'Minor issue / Routine inquiry' },
                  { level: 'MEDIUM', label: 'Medium', desc: 'Standard operational impact' },
                  { level: 'HIGH', label: 'High', desc: 'Impacting class or work' },
                  { level: 'CRITICAL', label: 'Critical', desc: 'Emergency / Complete outage' },
                ].map((p) => {
                  const isChecked = formData.priority === p.level;
                  return (
                    <div
                      key={p.level}
                      onClick={() => setFormData({ ...formData, priority: p.level })}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        isChecked
                          ? 'border-blue-600 bg-blue-50/50 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <PriorityBadge priority={p.level} size="sm" />
                        {isChecked && <Check className="w-4 h-4 text-blue-600" />}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">{p.desc}</p>
                    </div>
                  );
                })}
              </div>
              {errors.priority && <p className="text-xs text-red-600 mt-1">{errors.priority}</p>}
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Detailed Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe exactly what happened, when it started, specific room or workstation number, and any steps already attempted..."
                className={`w-full px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 ${
                  errors.description
                    ? 'border-red-300 focus:ring-red-400 bg-red-50/20'
                    : 'border-slate-300 focus:ring-blue-500'
                }`}
              />
              <div className="flex justify-between items-center mt-1">
                {errors.description ? (
                  <p className="text-xs text-red-600">{errors.description}</p>
                ) : (
                  <p className="text-xs text-slate-400">Minimum 15 characters required</p>
                )}
                <span className="text-xs text-slate-400">{formData.description.length} chars</span>
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={checkingDuplicate}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm transition shadow-sm"
            >
              {checkingDuplicate ? 'Checking...' : 'Review Ticket'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {duplicateWarning && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">Possible Duplicate Ticket Detected</p>
                  <p className="text-xs text-amber-800 mt-1">
                    A similar ticket already exists:{' '}
                    <strong>{duplicateWarning.ticket_number}</strong> — "{duplicateWarning.title}" (
                    {(duplicateWarning.status || '').replace(/_/g, ' ')})
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDuplicateWarning(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDuplicate(true);
                    setDuplicateWarning(null);
                    setStep(3);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition"
                >
                  Submit Anyway
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Review & Confirmation</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Please verify your ticket summary before submitting.
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-2">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ticket Title</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">{formData.title}</h3>
              </div>
              <div>
                <PriorityBadge priority={formData.priority} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</span>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">{selectedCategory?.name}</p>
                {formData.subcategory_id && (
                  <p className="text-xs text-slate-500 mt-0.5">
                    Subcategory: {subcategories.find((s) => s.id === Number(formData.subcategory_id))?.name}
                  </p>
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Routed Department</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">{selectedCategory?.department_name}</span>
                </div>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</span>
              <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap bg-white p-3 rounded-lg border border-slate-200">
                {formData.description}
              </p>
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              Upon submission, you will receive a unique tracking ID (COL-2026-XXXX). You can track status updates, add comments, and respond if the department requests additional information.
            </p>
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={submitting}
              onClick={handleBack}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold text-sm transition shadow-sm"
            >
              {submitting ? (
                <>
                  <LoadingSpinner size="sm" />
                  Submitting Ticket...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Submit Issue Ticket
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
