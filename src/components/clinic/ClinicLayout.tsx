import React, { useState } from 'react';
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom';
import { Activity, LayoutDashboard, Users, CalendarClock, ClipboardList, Stethoscope, ListChecks, Receipt, FileText, BarChart3, UserCog, Settings, LogOut, Bell, Search, Menu, Building2, ChevronRight, Headphones } from 'lucide-react';
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
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={`${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform`}>
        <div className="p-5 border-b border-slate-100">
          <Link to="/dashboard">
            <Brand compact showTagline={false} />
          </Link>
          <div className="text-[10px] text-slate-500 mt-2">v2.4 · Production</div>
          <div className="mt-4 p-2.5 bg-slate-50 rounded-lg border border-slate-100">
            <div className="flex items-center gap-2 text-xs">
              <Building2 className="w-3.5 h-3.5 text-[#2C5F7C]" />
              <div className="font-semibold text-[#1F2937] truncate">{user.tenantName}</div>
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <Badge variant="outline" className={`text-[10px] h-5 ${user.plan === 'enterprise' ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-slate-300'}`}>
                {user.plan === 'enterprise' ? 'Enterprise' : 'Professional'}
              </Badge>
              {user.plan === 'professional' && (
                <button onClick={() => navigate('/settings')} className="text-[10px] text-[#2C5F7C] font-semibold">Upgrade →</button>
              )}
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition ${
                isActive ? 'bg-[#2C5F7C] text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-[#2C5F7C]'
              }`}
            >
              <n.icon className="w-4 h-4" />
              <span>{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4A90A4] to-[#2C5F7C] text-white flex items-center justify-center font-semibold text-sm">
              {user.name.split(' ').map((s) => s[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#1F2937] truncate">{user.name}</div>
              <div className="text-[10px] text-slate-500 capitalize">{user.role}</div>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={() => { logout(); navigate('/'); }}>
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative hidden md:block">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input placeholder="Search patients, invoices, sessions..." className="pl-9 w-80 bg-slate-50 border-slate-200" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1 text-xs text-slate-500">
              <ChevronRight className="w-3 h-3" /> Workspace online
            </div>
            <button className="relative p-2 rounded-lg hover:bg-slate-100">
              <Bell className="w-5 h-5 text-slate-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default ClinicLayout;
