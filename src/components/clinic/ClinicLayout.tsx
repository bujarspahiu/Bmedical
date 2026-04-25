import React, { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  CalendarClock,
  ChevronRight,
  ClipboardList,
  FileText,
  Headphones,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  Receipt,
  Search,
  Settings,
  Sparkles,
  Stethoscope,
  UserCog,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Brand from '@/components/Brand';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/waiting-room', label: 'Waiting Room', icon: Headphones },
  { to: '/appointments', label: 'Appointments', icon: CalendarClock },
  { to: '/anamnesis', label: 'Anamnesis', icon: ClipboardList },
  { to: '/diagnoses', label: 'Diagnoses', icon: Stethoscope },
  { to: '/treatment-plans', label: 'Treatment Plans', icon: ListChecks },
  { to: '/sessions', label: 'Sessions', icon: Activity },
  { to: '/offers', label: 'Offers', icon: FileText },
  { to: '/invoices', label: 'Invoices', icon: Receipt },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/staff', label: 'Staff', icon: UserCog },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const ClinicLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(74,144,164,0.10),_transparent_35%),linear-gradient(180deg,#f8fbfc_0%,#f1f5f9_100%)] flex">
      <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0`}>
        <div className="border-b border-slate-100 p-5">
          <Link to="/dashboard">
            <Brand compact showTagline={false} />
          </Link>
          <div className="mt-2 text-[10px] text-slate-500">v2.4 | Production</div>

          <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-2.5">
            <div className="flex items-center gap-2 text-xs">
              <Building2 className="h-3.5 w-3.5 text-[#2C5F7C]" />
              <div className="truncate font-semibold text-[#1F2937]">{user.tenantName}</div>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <Badge
                variant="outline"
                className={`h-5 text-[10px] ${user.plan === 'enterprise' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300'}`}
              >
                {user.plan === 'enterprise' ? 'Enterprise' : 'Professional'}
              </Badge>
              {user.plan === 'professional' && (
                <button
                  onClick={() => navigate('/settings')}
                  className="text-[10px] font-semibold text-[#2C5F7C]"
                >
                  Upgrade
                </button>
              )}
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? 'bg-[#2C5F7C] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#2C5F7C]'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#4A90A4] to-[#2C5F7C] text-sm font-semibold text-white">
              {user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-[#1F2937]">{user.name}</div>
              <div className="text-[10px] capitalize text-slate-500">{user.role}</div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              void logout();
              navigate('/');
            }}
          >
            <LogOut className="mr-2 h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen((current) => !current)}>
              <Menu className="h-5 w-5" />
            </button>

            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search patients, invoices, sessions..." className="w-80 border-slate-200 bg-slate-50 pl-9" />
            </div>

            <div className="hidden xl:flex items-center gap-2 rounded-full border border-[#2C5F7C]/10 bg-[#2C5F7C]/5 px-3 py-1.5 text-xs text-[#2C5F7C]">
              <Sparkles className="h-3.5 w-3.5" />
              Fast, clear, clinic-first workspace
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-1 text-xs text-slate-500 md:flex">
              <ChevronRight className="h-3 w-3" />
              Workspace online
            </div>
            <button className="relative rounded-lg p-2 hover:bg-slate-100">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ClinicLayout;
