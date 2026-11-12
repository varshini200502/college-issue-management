import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, PlusCircle, Ticket, BarChart3, AlertOctagon, 
  Building2, FileText, CheckCircle2, LifeBuoy, Users
} from 'lucide-react';

export const Sidebar = () => {
  const { isReporter, isDeptAdmin, isPrincipal, user } = useAuth();

  const navItems = [];

  if (isReporter) {
    navItems.push(
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/tickets/new', label: 'Raise New Issue', icon: PlusCircle },
      { to: '/tickets', label: 'My Tickets', icon: Ticket }
    );
  } else if (isDeptAdmin) {
    navItems.push(
      { to: '/dashboard', label: 'Department Dashboard', icon: LayoutDashboard },
      { to: '/tickets', label: 'Department Tickets', icon: Ticket },
      { to: '/analytics', label: 'Performance Analytics', icon: BarChart3 }
    );
  } else if (isPrincipal) {
    navItems.push(
      { to: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
      { to: '/tickets', label: 'College-wide Tickets', icon: Ticket },
      { to: '/departments-comparison', label: 'Department Comparison', icon: Building2 },
      { to: '/unresolved-justifications', label: 'Unresolved Justifications', icon: AlertOctagon },
      { to: '/principal/users', label: 'User Management', icon: Users }
    );
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-[calc(100vh-4rem)] border-r border-slate-800 flex-shrink-0 select-none">
      {/* Department/Role Header */}
      <div className="p-5 border-b border-slate-800/80 bg-slate-950/40">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300">
          Current Workspace
        </div>
        <div className="text-sm font-semibold text-white mt-1 truncate">
          {isPrincipal && 'Executive Office (All Departments)'}
          {isDeptAdmin && (user?.department?.name || 'Department Administration')}
          {isReporter && `${user?.reporter_type?.toUpperCase() || 'REPORTER'} PORTAL`}
        </div>
        <div className="text-[11px] text-slate-300 mt-0.5">
          {isPrincipal ? 'Supervisor Read-Only' : 'Authorized Access'}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="p-4 space-y-1.5 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-300 px-3 py-1">
          Menu
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info Box */}
      <div className="p-4 m-4 rounded-xl bg-slate-800/50 border border-slate-800 text-xs">
        <div className="flex items-center gap-2 text-slate-300 font-medium">
          <LifeBuoy className="w-4 h-4 text-brand-400" />
          <span>Support Desk</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Logged issues are tracked with SLAs and institutional accountability.
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
