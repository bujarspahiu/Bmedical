import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, DollarSign, AlertCircle, Search, LogOut, TrendingUp, Activity, Bell, Settings as SettingsIcon, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { demoTenants } from '@/data/demoData';
import Brand from '@/components/Brand';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [tenants, setTenants] = useState(demoTenants);

  if (!user?.isAdmin) {
    navigate('/Adminstaff');
    return null;
  }

  const filtered = tenants.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()) || t.city.toLowerCase().includes(q.toLowerCase()));
  const activeCount = tenants.filter((t) => t.status === 'active').length;
  const suspendedCount = tenants.filter((t) => t.status === 'suspended').length;
  const mrr = tenants.filter((t) => t.plan === 'professional' && t.status === 'active').length * 50;
  const yearlyRev = tenants.filter((t) => t.plan === 'enterprise' && t.status === 'active').reduce((s, t) => s + t.yearlyFee, 0);

  const toggleSuspend = (id: string) => {
    setTenants((prev) => prev.map((t) => t.id === id ? { ...t, status: t.status === 'active' ? 'suspended' : 'active' } : t));
  };

  const upgrade = (id: string) => {
    setTenants((prev) => prev.map((t) => t.id === id ? { ...t, plan: 'enterprise' as const, mrr: 0, yearlyFee: 4800 } : t));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white border-b border-slate-800">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between">
          <Brand theme="dark" compact showTagline={false} />
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-slate-400" />
            <SettingsIcon className="w-5 h-5 text-slate-400" />
            <div className="text-sm text-slate-300">{user.email}</div>
            <Button size="sm" variant="ghost" onClick={() => { logout(); navigate('/'); }} className="text-slate-300 hover:text-white hover:bg-slate-800">
              <LogOut className="w-4 h-4 mr-1" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1F2937]">Platform overview</h1>
          <p className="text-sm text-slate-600">Manage tenants, subscriptions and revenue across all clinics.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard icon={<Building2 className="w-5 h-5" />} label="Registered clinics" value={tenants.length.toString()} sub={`${activeCount} active`} color="text-[#2C5F7C]" bg="bg-[#2C5F7C]/10" />
          <MetricCard icon={<Activity className="w-5 h-5" />} label="Active subscriptions" value={activeCount.toString()} sub={`${suspendedCount} suspended`} color="text-emerald-600" bg="bg-emerald-50" />
          <MetricCard icon={<DollarSign className="w-5 h-5" />} label="Monthly MRR" value={`€${mrr.toLocaleString()}`} sub="Professional plans" color="text-amber-600" bg="bg-amber-50" />
          <MetricCard icon={<TrendingUp className="w-5 h-5" />} label="Yearly revenue" value={`€${yearlyRev.toLocaleString()}`} sub="Enterprise contracts" color="text-indigo-600" bg="bg-indigo-50" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MiniCard label="Expiring soon" value="3" tone="amber" />
          <MiniCard label="Unpaid tenants" value="1" tone="red" />
          <MiniCard label="New leads (7d)" value="14" tone="blue" />
          <MiniCard label="Demo requests" value="6" tone="emerald" />
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-[#1F2937]">Tenant management</div>
              <div className="text-xs text-slate-500">Full control over all registered clinics, hospitals and ordinances</div>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input placeholder="Search tenants..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9 w-64" />
              </div>
              <Button className="bg-[#2C5F7C] hover:bg-[#234e66]">
                <FileText className="w-4 h-4 mr-1" /> Export
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Patients</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-slate-600">{t.city}, {t.country}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={t.plan === 'enterprise' ? 'border-indigo-300 text-indigo-700 bg-indigo-50' : 'border-slate-300'}>
                        {t.plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={t.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.staffCount}</TableCell>
                    <TableCell>{t.patientsCount.toLocaleString()}</TableCell>
                    <TableCell>{t.plan === 'professional' ? `€${t.mrr}/mo` : `€${t.yearlyFee}/yr`}</TableCell>
                    <TableCell className="text-slate-600 text-xs">{t.joinedAt}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {t.plan === 'professional' && (
                          <Button size="sm" variant="outline" onClick={() => upgrade(t.id)} className="h-7 text-xs">Upgrade</Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => toggleSuspend(t.id)} className="h-7 text-xs">
                          {t.status === 'active' ? 'Suspend' : 'Activate'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4 mt-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="font-semibold text-[#1F2937] mb-3 flex items-center gap-2"><Bell className="w-4 h-4" /> Announcement center</div>
            <Input placeholder="Broadcast message to all tenants..." className="mb-3" />
            <Button className="bg-[#2C5F7C] hover:bg-[#234e66]">Send to all clinics</Button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="font-semibold text-[#1F2937] mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Plan limits configuration</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between p-2 bg-slate-50 rounded"><span>Professional · Staff limit</span><span className="font-semibold">3</span></div>
              <div className="flex justify-between p-2 bg-slate-50 rounded"><span>Professional · Invoices/month</span><span className="font-semibold">30</span></div>
              <div className="flex justify-between p-2 bg-slate-50 rounded"><span>Professional · Price</span><span className="font-semibold">€50/mo</span></div>
              <div className="flex justify-between p-2 bg-slate-50 rounded"><span>Enterprise · Limits</span><span className="font-semibold">Unlimited</span></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub: string; color: string; bg: string }> = ({ icon, label, value, sub, color, bg }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg} ${color}`}>{icon}</div>
    </div>
    <div className="text-xs text-slate-500 mb-1">{label}</div>
    <div className="text-2xl font-bold text-[#1F2937]">{value}</div>
    <div className="text-xs text-slate-500 mt-1">{sub}</div>
  </div>
);

const MiniCard: React.FC<{ label: string; value: string; tone: 'amber' | 'red' | 'blue' | 'emerald' }> = ({ label, value, tone }) => {
  const map = { amber: 'bg-amber-50 text-amber-700 border-amber-200', red: 'bg-red-50 text-red-700 border-red-200', blue: 'bg-blue-50 text-blue-700 border-blue-200', emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  return (
    <div className={`rounded-lg p-4 border ${map[tone]}`}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
};

export default AdminDashboard;
