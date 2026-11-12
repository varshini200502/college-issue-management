import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/common/Toast'
import api from '../../services/api'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  Users, Search, Plus, Shield, GraduationCap, Building2,
  CheckCircle2, XCircle, KeyRound, ChevronDown, ChevronUp,
  RefreshCw
} from 'lucide-react'

const ROLE_COLORS = {
  principal: 'bg-purple-100 text-purple-700',
  department_admin: 'bg-emerald-100 text-emerald-700',
  reporter: 'bg-blue-100 text-blue-700',
}

const REPORTER_TYPES = ['student', 'faculty', 'staff']

function RoleBadge({ role }) {
  const label = role === 'department_admin' ? 'Dept Admin' : role === 'principal' ? 'Principal' : 'Reporter'
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${ROLE_COLORS[role] || 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  )
}

// ─── Create User Modal ────────────────────────────────────────────────────────
function CreateUserModal({ departments, onClose, onCreated }) {
  const { addToast } = useToast()
  const [form, setForm] = useState({
    full_name: '', email: '', password: '', role_name: 'reporter',
    reporter_type: 'student', department_id: '', phone: '', is_demo: false,
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        department_id: form.department_id ? parseInt(form.department_id) : null,
        reporter_type: form.role_name === 'reporter' ? form.reporter_type : null,
      }
      await api.post('/users', payload)
      addToast('User created successfully', 'success')
      onCreated()
      onClose()
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Failed to create user', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-indigo-600" /> Create New User
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Full Name</label>
              <input required value={form.full_name} onChange={e => set('full_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Dr. Jane Smith" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Email</label>
              <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="user@college.edu" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Role</label>
              <select value={form.role_name} onChange={e => set('role_name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                <option value="reporter">Reporter</option>
                <option value="department_admin">Department Admin</option>
                <option value="principal">Principal</option>
              </select>
            </div>
            {form.role_name === 'reporter' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Type</label>
                <select value={form.reporter_type} onChange={e => set('reporter_type', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                  {REPORTER_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            )}
            {form.role_name === 'department_admin' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Department</label>
                <select required value={form.department_id} onChange={e => set('department_id', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white">
                  <option value="">Select department…</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Password</label>
              <input required type="password" minLength={8} value={form.password} onChange={e => set('password', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="Min 8 characters" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">Phone (optional)</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" placeholder="+1 (555) 000-0000" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none mt-1">
            <input type="checkbox" checked={form.is_demo} onChange={e => set('is_demo', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            <span className="text-xs text-slate-600">Mark as demo account <span className="text-slate-400">(isolated demo data)</span></span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold text-sm rounded-lg transition-colors">
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Reset Password Modal ─────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }) {
  const { addToast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/users/${user.id}/reset-password`, { new_password: newPassword })
      addToast(`Password reset for ${user.email}`, 'success')
      onClose()
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Failed to reset password', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-100">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-amber-600" /> Reset Password
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Resetting password for <strong>{user.full_name}</strong> <span className="text-slate-400">({user.email})</span>
          </p>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">New Password</label>
            <input required type="password" minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none" placeholder="Min 8 characters" />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold text-sm rounded-lg transition-colors">
              {saving ? 'Saving…' : 'Reset Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserManagement() {
  const { addToast } = useToast()
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [demoFilter, setDemoFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, total_pages: 1 })
  const [showCreate, setShowCreate] = useState(false)
  const [resetTarget, setResetTarget] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, page_size: 20 })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      if (demoFilter !== '') params.set('is_demo', demoFilter)
      const res = await api.get(`/users?${params}`)
      setUsers(res.data.items || [])
      setPagination({ total: res.data.total, total_pages: res.data.total_pages })
    } catch {
      addToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, search, roleFilter, demoFilter, addToast])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data || [])).catch(() => {})
  }, [])

  const toggleActive = async (user) => {
    setTogglingId(user.id)
    try {
      const action = user.is_active ? 'deactivate' : 'activate'
      await api.patch(`/users/${user.id}/${action}`)
      addToast(`${user.full_name} ${user.is_active ? 'deactivated' : 'activated'}`, 'success')
      fetchUsers()
    } catch (err) {
      addToast(err?.response?.data?.detail || 'Action failed', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            User Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {pagination.total} total accounts · Create, activate, deactivate, and reset passwords
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name or email…"
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <option value="">All Roles</option>
          <option value="reporter">Reporter</option>
          <option value="department_admin">Dept Admin</option>
          <option value="principal">Principal</option>
        </select>
        <select value={demoFilter} onChange={e => { setDemoFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none">
          <option value="">All Accounts</option>
          <option value="true">Demo Only</option>
          <option value="false">Real Only</option>
        </select>
        <button onClick={fetchUsers} className="px-3 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner text="Loading users…" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-3 text-slate-300" />
            <p className="font-medium">No users found</p>
            <p className="text-xs mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Department</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Type</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs flex-shrink-0">
                          {u.full_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800 text-sm">{u.full_name}</div>
                          <div className="text-xs text-slate-500 font-mono">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <RoleBadge role={u.role?.name} />
                        {u.is_demo && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded-full w-fit">DEMO</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-slate-600">{u.department?.name || '—'}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-slate-500 capitalize">{u.reporter_type || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          <XCircle className="w-3 h-3" /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleActive(u)}
                          disabled={togglingId === u.id}
                          title={u.is_active ? 'Deactivate' : 'Activate'}
                          className={`p-1.5 rounded-lg transition-colors text-xs ${
                            u.is_active
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          } disabled:opacity-50`}
                        >
                          {u.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => setResetTarget(u)}
                          title="Reset password"
                          className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 transition-colors"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50">
            <p className="text-xs text-slate-500">
              Page {page} of {pagination.total_pages} · {pagination.total} users
            </p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">
                ← Prev
              </button>
              <button disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-white transition-colors">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateUserModal
          departments={departments}
          onClose={() => setShowCreate(false)}
          onCreated={fetchUsers}
        />
      )}
      {resetTarget && (
        <ResetPasswordModal
          user={resetTarget}
          onClose={() => setResetTarget(null)}
        />
      )}
    </div>
  )
}
