import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Demo accounts are strictly for local development and disabled in production builds
const isDevDemoEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true'

const DEMO_ACCOUNTS = isDevDemoEnabled
  ? [
      { role: 'Student Reporter', type: 'reporter', name: 'Alex Rivera', email: 'student.alex@college.edu', password: 'Student@123' },
      { role: 'Faculty Reporter', type: 'reporter', name: 'Prof. Sarah Jenkins', email: 'faculty.sarah@college.edu', password: 'Faculty@123' },
      { role: 'Staff Reporter', type: 'reporter', name: 'David Miller', email: 'staff.david@college.edu', password: 'Staff@123' },
      { role: 'IT Admin', type: 'department_admin', name: 'Rajesh Sharma', email: 'it.admin@college.edu', password: 'Admin@123' },
      { role: 'Finance Admin', type: 'department_admin', name: 'Priya Sundaram', email: 'finance.admin@college.edu', password: 'Admin@123' },
      { role: 'Infra Admin', type: 'department_admin', name: 'Vikram Singh', email: 'infra.admin@college.edu', password: 'Admin@123' },
      { role: 'Principal (Read-Only)', type: 'principal', name: 'Dr. Arthur Pendelton', email: 'principal@college.edu', password: 'Admin@123' },
    ]
  : []

const ROLE_ROUTES = {
  reporter: '/reporter/dashboard',
  department_admin: '/dept/dashboard',
  principal: '/principal/dashboard',
}

const PORTAL_META = {
  reporter: {
    title: 'Reporter Portal Sign In',
    subtitle: 'For Students, Faculty & Staff to report and track issues',
    badge: 'Reporter Access',
    badgeColor: 'bg-blue-600',
  },
  department_admin: {
    title: 'Department Admin Sign In',
    subtitle: 'For Department Officers to manage resolution queues',
    badge: 'Department Admin',
    badgeColor: 'bg-emerald-600',
  },
  principal: {
    title: 'Principal Portal (Read-Only)',
    subtitle: 'Institution-wide metrics, SLA compliance & escalation oversight',
    badge: 'Principal Access',
    badgeColor: 'bg-purple-600',
  },
  all: {
    title: 'Sign in to your account',
    subtitle: 'Select your role or enter your credentials',
    badge: 'Centralized Portal',
    badgeColor: 'bg-indigo-600',
  },
}

export default function Login({ roleHint }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  // Determine active portal mode from prop or path
  let activeRole = roleHint
  if (!activeRole) {
    if (location.pathname.includes('/reporter')) activeRole = 'reporter'
    else if (location.pathname.includes('/department') || location.pathname.includes('/dept')) activeRole = 'department_admin'
    else if (location.pathname.includes('/principal')) activeRole = 'principal'
    else activeRole = 'all'
  }

  const meta = PORTAL_META[activeRole] || PORTAL_META.all

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [demoOpen, setDemoOpen] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await login(email, password)
      const role = user?.role?.name || ''
      const route = ROLE_ROUTES[role] || '/login'
      navigate(route, { replace: true })
    } catch (err) {
      setError(
        err?.response?.data?.detail ||
          err?.message ||
          'Invalid credentials. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (account) => {
    setEmail(account.email)
    setPassword(account.password)
    setDemoOpen(false)
  }

  const filteredDemoAccounts = activeRole === 'all' 
    ? DEMO_ACCOUNTS 
    : DEMO_ACCOUNTS.filter(a => a.type === activeRole)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 to-indigo-800 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Branding Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 select-none">🎓</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            College Issue Management
          </h1>
          <p className="text-blue-200 mt-1 text-xs sm:text-sm">
            Institutional grievance and facility tracking
          </p>
        </div>

        {/* Portal Role Tabs */}
        <div className="flex bg-blue-950/60 p-1 rounded-xl mb-4 text-xs font-semibold backdrop-blur-sm border border-blue-800/50">
          <Link
            to="/login"
            className={`flex-1 text-center py-2 rounded-lg transition-colors ${
              activeRole === 'all'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            All Roles
          </Link>
          <Link
            to="/login/reporter"
            className={`flex-1 text-center py-2 rounded-lg transition-colors ${
              activeRole === 'reporter'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            Reporter
          </Link>
          <Link
            to="/login/department"
            className={`flex-1 text-center py-2 rounded-lg transition-colors ${
              activeRole === 'department_admin'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            Dept Admin
          </Link>
          <Link
            to="/login/principal"
            className={`flex-1 text-center py-2 rounded-lg transition-colors ${
              activeRole === 'principal'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            Principal
          </Link>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-100">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-lg font-bold text-slate-800">{meta.title}</h2>
              <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${meta.badgeColor}`}>
                {meta.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500">{meta.subtitle}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider"
              >
                Institutional Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@college.edu"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Authenticating…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo Accounts Collapsible (Only rendered in local development when enabled) */}
          {isDevDemoEnabled && filteredDemoAccounts.length > 0 && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setDemoOpen((o) => !o)}
                className="flex items-center justify-between w-full text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                <span>🔑 Local Demo Accounts ({filteredDemoAccounts.length})</span>
                <span className="text-[11px] text-slate-400">{demoOpen ? '▲ hide' : '▼ show'}</span>
              </button>

              {demoOpen && (
                <div className="mt-3 overflow-x-auto max-h-56 overflow-y-auto border border-slate-100 rounded-lg">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-100 text-slate-500">
                      <tr>
                        <th className="py-1.5 px-2 font-semibold">Role</th>
                        <th className="py-1.5 px-2 font-semibold">Name</th>
                        <th className="py-1.5 px-2 font-semibold">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredDemoAccounts.map((acc, i) => (
                        <tr
                          key={i}
                          onClick={() => fillDemo(acc)}
                          className="hover:bg-indigo-50 cursor-pointer transition-colors"
                        >
                          <td className="py-1.5 px-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-white text-[9px] font-bold ${
                                acc.type === 'reporter'
                                  ? 'bg-blue-600'
                                  : acc.type === 'department_admin'
                                  ? 'bg-emerald-600'
                                  : 'bg-purple-600'
                              }`}
                            >
                              {acc.role}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-slate-700 font-medium whitespace-nowrap">{acc.name}</td>
                          <td className="py-1.5 px-2 text-slate-500 font-mono whitespace-nowrap">{acc.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="py-1.5 text-[10px] text-slate-400 text-center bg-slate-50 border-t border-slate-100">
                    Click any row to auto-populate credentials
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-blue-200 text-xs mt-5">
          Campus Issue & Ticket Management System • Institutional Access Only
        </p>
      </div>
    </div>
  )
}
