import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Users, Shield, GraduationCap, Building2, Key, CheckCircle2, AlertCircle } from 'lucide-react'

// Demo accounts panel is controlled via VITE_ENABLE_DEMO_ACCOUNTS
const isDemoEnabled = import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true'

const DEMO_CATEGORIES = [
  {
    id: 'reporters',
    title: 'Reporters',
    icon: GraduationCap,
    badgeColor: 'bg-blue-600',
    description: 'Students, Faculty & Staff submitting facility and administrative grievances',
    accounts: [
      { role: 'Student Reporter', type: 'reporter', name: 'Alex Rivera', email: 'student.alex@college.edu', password: 'Demo_Student@2026', label: 'Student' },
      { role: 'Faculty Reporter', type: 'reporter', name: 'Prof. Sarah Jenkins', email: 'faculty.sarah@college.edu', password: 'Demo_Faculty@2026', label: 'Faculty' },
      { role: 'Staff Reporter', type: 'reporter', name: 'David Miller', email: 'staff.david@college.edu', password: 'Demo_Staff@2026', label: 'Staff' },
    ]
  },
  {
    id: 'admins',
    title: 'Department Administrators',
    icon: Building2,
    badgeColor: 'bg-emerald-600',
    description: 'Department officers managing resolution queues, status & justifications',
    accounts: [
      { role: 'IT Admin', type: 'department_admin', name: 'Rajesh Sharma', email: 'it.admin@college.edu', password: 'Demo_IT@2026', label: 'IT Administration' },
      { role: 'Finance Admin', type: 'department_admin', name: 'Priya Sundaram', email: 'finance.admin@college.edu', password: 'Demo_Fin@2026', label: 'Finance' },
      { role: 'HR Admin', type: 'department_admin', name: 'Anita Desai', email: 'hr.admin@college.edu', password: 'Demo_HR@2026', label: 'Human Resources' },
      { role: 'Infra Admin', type: 'department_admin', name: 'Vikram Singh', email: 'infra.admin@college.edu', password: 'Demo_Infra@2026', label: 'Infrastructure' },
      { role: 'Academics Admin', type: 'department_admin', name: 'Dr. Meenakshi Iyer', email: 'academics.admin@college.edu', password: 'Demo_Acad@2026', label: 'Academics' },
      { role: 'Library Admin', type: 'department_admin', name: 'Suresh Raman', email: 'library.admin@college.edu', password: 'Demo_Lib@2026', label: 'Library' },
      { role: 'Hostel Admin', type: 'department_admin', name: 'Rakesh Verma', email: 'hostel.admin@college.edu', password: 'Demo_Hostel@2026', label: 'Hostel' },
      { role: 'Transport Admin', type: 'department_admin', name: 'Gopal Krishnan', email: 'transport.admin@college.edu', password: 'Demo_Trans@2026', label: 'Transport' },
    ]
  },
  {
    id: 'executive',
    title: 'Executive',
    icon: Shield,
    badgeColor: 'bg-purple-600',
    description: 'College-wide supervision, SLA compliance oversight & User Management',
    accounts: [
      { role: 'Principal (Executive)', type: 'principal', name: 'Dr. Arthur Pendelton', email: 'principal@college.edu', password: 'Demo_Principal@2026', label: 'Executive Office' },
    ]
  }
]

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
    title: 'Principal Portal (Supervisor & User Admin)',
    subtitle: 'Institution-wide metrics, SLA oversight & user management',
    badge: 'Principal Access',
    badgeColor: 'bg-purple-600',
  },
  all: {
    title: 'Sign in to your account',
    subtitle: 'Select your role or enter your institutional credentials',
    badge: 'Centralized Portal',
    badgeColor: 'bg-indigo-600',
  },
}

export default function Login({ roleHint }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  // Determine active portal mode from prop or path
  let defaultPortal = roleHint
  if (!defaultPortal) {
    if (location.pathname.includes('/reporter')) defaultPortal = 'reporter'
    else if (location.pathname.includes('/department') || location.pathname.includes('/dept')) defaultPortal = 'department_admin'
    else if (location.pathname.includes('/principal')) defaultPortal = 'principal'
    else defaultPortal = 'all'
  }

  const [activePortal, setActivePortal] = useState(defaultPortal)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDemo, setSelectedDemo] = useState(null)
  const [activeDemoCategory, setActiveDemoCategory] = useState('reporters')

  const meta = PORTAL_META[activePortal] || PORTAL_META.all

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
          'Invalid credentials. Please verify your email and password.'
      )
    } finally {
      setLoading(false)
    }
  }

  const selectDemoAccount = (acc) => {
    setEmail(acc.email)
    setPassword(acc.password)
    setActivePortal(acc.type)
    setSelectedDemo(acc)
    setError('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 px-4 py-8">
      <div className="w-full max-w-xl">
        {/* Branding Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2 select-none">🎓</div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            College Issue Management System
          </h1>
          <p className="text-blue-200 mt-1 text-xs sm:text-sm">
            Centralized Grievance Tracking, Resolution Workflow & Institutional Oversight
          </p>
        </div>

        {/* Portal Role Tabs */}
        <div className="flex bg-blue-950/60 p-1 rounded-xl mb-4 text-xs font-semibold backdrop-blur-sm border border-blue-800/50">
          <button
            type="button"
            onClick={() => setActivePortal('all')}
            className={`flex-1 text-center py-2 rounded-lg transition-colors ${
              activePortal === 'all'
                ? 'bg-white text-indigo-900 shadow-sm'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            All Roles
          </button>
          <button
            type="button"
            onClick={() => setActivePortal('reporter')}
            className={`flex-1 text-center py-2 rounded-lg transition-colors ${
              activePortal === 'reporter'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            Reporter
          </button>
          <button
            type="button"
            onClick={() => setActivePortal('department_admin')}
            className={`flex-1 text-center py-2 rounded-lg transition-colors ${
              activePortal === 'department_admin'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            Dept Admin
          </button>
          <button
            type="button"
            onClick={() => setActivePortal('principal')}
            className={`flex-1 text-center py-2 rounded-lg transition-colors ${
              activePortal === 'principal'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-blue-200 hover:text-white'
            }`}
          >
            Principal
          </button>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-slate-100">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-lg font-bold text-slate-800">{meta.title}</h2>
              <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${meta.badgeColor}`}>
                {meta.badge}
              </span>
            </div>
            <p className="text-xs text-slate-500">{meta.subtitle}</p>
          </div>

          {selectedDemo && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-indigo-950">Active Demo Account: </span>
                  <span className="text-indigo-800">{selectedDemo.name} ({selectedDemo.role})</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setSelectedDemo(null); setEmail(''); setPassword(''); }}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                Clear
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
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

          {/* Evaluator Demo Experience */}
          {isDemoEnabled && (
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Key className="w-3.5 h-3.5 text-amber-500" />
                  <span>Try Demo Accounts – Explore the Application</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">12 Personas</span>
              </div>

              {/* Category Selector Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg mb-3 text-[11px] font-medium">
                {DEMO_CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setActiveDemoCategory(cat.id)}
                      className={`py-1.5 px-2 rounded-md transition-all flex items-center justify-center gap-1.5 ${
                        activeDemoCategory === cat.id
                          ? 'bg-white text-slate-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span className="truncate">{cat.title.split(' ')[0]}</span>
                    </button>
                  )
                })}
              </div>

              {/* Active Category Account List */}
              {(() => {
                const currentCat = DEMO_CATEGORIES.find(c => c.id === activeDemoCategory) || DEMO_CATEGORIES[0]
                return (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {currentCat.accounts.map((acc, idx) => {
                      const isSelected = selectedDemo?.email === acc.email
                      return (
                        <div
                          key={idx}
                          onClick={() => selectDemoAccount(acc)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200'
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 truncate">{acc.name}</span>
                              <span className={`text-[9px] font-bold text-white px-1.5 py-0.2 rounded ${currentCat.badgeColor}`}>
                                {acc.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono truncate mt-0.5">{acc.email}</div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); selectDemoAccount(acc); }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? 'Selected' : 'Use Account'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Mandatory Demo Disclaimer */}
              <div className="mt-3.5 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 leading-relaxed flex items-start gap-2">
                <span className="text-amber-500 font-bold mt-0.5">ℹ</span>
                <p>
                  <strong>Demo Access:</strong> These accounts are provided for evaluation and testing purposes. Real college users must use their personal institutional credentials.
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-blue-200/80 text-xs mt-5">
          Campus Issue & Ticket Management System • Institutional Access Only
        </p>
      </div>
    </div>
  )
}
