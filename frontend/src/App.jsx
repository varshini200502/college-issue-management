import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import LoadingSpinner from './components/common/LoadingSpinner';

// Pages
import Login from './pages/Login';
import ReporterDashboard from './pages/reporter/ReporterDashboard';
import RaiseTicket from './pages/reporter/RaiseTicket';
import TicketList from './pages/reporter/TicketList';
import TicketDetail from './pages/reporter/TicketDetail';

import DeptDashboard from './pages/dept/DeptDashboard';
import DeptTicketList from './pages/dept/DeptTicketList';
import DeptTicketDetail from './pages/dept/DeptTicketDetail';

import PrincipalDashboard from './pages/principal/PrincipalDashboard';
import PrincipalTicketList from './pages/principal/PrincipalTicketList';
import PrincipalTicketDetail from './pages/principal/PrincipalTicketDetail';
import UnresolvedJustifications from './pages/principal/UnresolvedJustifications';

// Role-protected route wrapper
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Authenticating..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = user?.role?.name;
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // Redirect to their own dashboard
    if (userRole === 'reporter') return <Navigate to="/reporter/dashboard" replace />;
    if (userRole === 'department_admin') return <Navigate to="/dept/dashboard" replace />;
    if (userRole === 'principal') return <Navigate to="/principal/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Layout for authenticated users
const AuthenticatedLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

// Root redirector based on authenticated role
const RootRedirect = () => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner size="lg" text="Loading college portal..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = user?.role?.name;
  if (role === 'reporter') return <Navigate to="/reporter/dashboard" replace />;
  if (role === 'department_admin') return <Navigate to="/dept/dashboard" replace />;
  if (role === 'principal') return <Navigate to="/principal/dashboard" replace />;

  return <Navigate to="/login" replace />;
};

// Generic /dashboard redirector
const DashboardRedirect = () => {
  const { user } = useAuth();
  const role = user?.role?.name;
  if (role === 'reporter') return <Navigate to="/reporter/dashboard" replace />;
  if (role === 'department_admin') return <Navigate to="/dept/dashboard" replace />;
  if (role === 'principal') return <Navigate to="/principal/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

// Generic /tickets redirector
const TicketsRedirect = () => {
  const { user } = useAuth();
  const role = user?.role?.name;
  if (role === 'reporter') return <Navigate to="/reporter/tickets" replace />;
  if (role === 'department_admin') return <Navigate to="/dept/tickets" replace />;
  if (role === 'principal') return <Navigate to="/principal/tickets" replace />;
  return <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/login/reporter" element={<Login roleHint="reporter" />} />
        <Route path="/login/department" element={<Login roleHint="department_admin" />} />
        <Route path="/login/dept" element={<Login roleHint="department_admin" />} />
        <Route path="/login/principal" element={<Login roleHint="principal" />} />

        {/* Index and generic redirects */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
        <Route path="/tickets" element={<ProtectedRoute><TicketsRedirect /></ProtectedRoute>} />
        <Route path="/tickets/new" element={<Navigate to="/reporter/raise" replace />} />

        {/* Reporter Routes */}
        <Route
          path="/reporter/dashboard"
          element={
            <ProtectedRoute allowedRoles={['reporter']}>
              <AuthenticatedLayout>
                <ReporterDashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reporter/raise"
          element={
            <ProtectedRoute allowedRoles={['reporter']}>
              <AuthenticatedLayout>
                <RaiseTicket />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reporter/tickets"
          element={
            <ProtectedRoute allowedRoles={['reporter']}>
              <AuthenticatedLayout>
                <TicketList />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reporter/tickets/:id"
          element={
            <ProtectedRoute allowedRoles={['reporter']}>
              <AuthenticatedLayout>
                <TicketDetail />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />

        {/* Department Admin Routes */}
        <Route
          path="/dept/dashboard"
          element={
            <ProtectedRoute allowedRoles={['department_admin']}>
              <AuthenticatedLayout>
                <DeptDashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/tickets"
          element={
            <ProtectedRoute allowedRoles={['department_admin']}>
              <AuthenticatedLayout>
                <DeptTicketList />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/tickets/:id"
          element={
            <ProtectedRoute allowedRoles={['department_admin']}>
              <AuthenticatedLayout>
                <DeptTicketDetail />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/dept/analytics"
          element={<Navigate to="/dept/dashboard" replace />}
        />

        {/* Principal (Read-Only) Routes */}
        <Route
          path="/principal/dashboard"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <AuthenticatedLayout>
                <PrincipalDashboard />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/tickets"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <AuthenticatedLayout>
                <PrincipalTicketList />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/tickets/:id"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <AuthenticatedLayout>
                <PrincipalTicketDetail />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/unresolved-justifications"
          element={
            <ProtectedRoute allowedRoles={['principal']}>
              <AuthenticatedLayout>
                <UnresolvedJustifications />
              </AuthenticatedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/principal/departments-comparison"
          element={<Navigate to="/principal/dashboard" replace />}
        />

        {/* Catch-all fallback */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </ToastProvider>
  );
}
