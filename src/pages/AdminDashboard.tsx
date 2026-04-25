import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Bell, Building2, DollarSign, LogOut, Search, Settings as SettingsIcon, TrendingUp } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Brand from '@/components/Brand';
import { toast } from '@/components/ui/use-toast';
import { demoTenants } from '@/data/demoData';

type AdminTenant = {
  id: string;
  name: string;
  city: string;
  country: string;
  plan: string;
  status: string;
  staffCount: number;
  patientsCount: number;
  mrr: number;
  yearlyFee: number;
  joinedAt: string;
};

type AdminOverview = {
  tenants: AdminTenant[];
  metrics: {
    registeredClinics: number;
    activeSubscriptions: number;
    suspendedCount: number;
    monthlyMrr: number;
    yearlyRevenue: number;
  };
};

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const isDemoAdminEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_ADMIN === 'true';
  const isDemoAdmin = isDemoAdminEnabled && user?.id === 'demo-platform-admin';
  const [demoRows, setDemoRows] = useState<AdminTenant[]>(demoTenants.map((tenant) => ({ ...tenant })));

  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => api<AdminOverview>('admin_tenants_overview'),
    enabled: !!user?.isAdmin && !isDemoAdmin,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ tenantId, status }: { tenantId: string; status: 'active' | 'suspended' }) =>
      api('admin_tenant_update_status', { tenantId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (error: Error) => toast({ title: 'Could not update tenant', description: error.message }),
  });

  if (!user?.isAdmin) {
    return <Navigate to="/Adminstaff" replace />;
  }

  const demoMetrics = {
    registeredClinics: demoRows.length,
    activeSubscriptions: demoRows.filter((tenant) => tenant.status === 'active').length,
    suspendedCount: demoRows.filter((tenant) => tenant.status === 'suspended').length,
    monthlyMrr: demoRows.reduce((sum, tenant) => sum + tenant.mrr, 0),
    yearlyRevenue: demoRows.reduce((sum, tenant) => sum + tenant.yearlyFee, 0),
  };

  const tenants = isDemoAdmin ? demoRows : overviewQuery.data?.tenants ?? [];
  const metrics = isDemoAdmin ? demoMetrics : overviewQuery.data?.metrics;
  const filtered = tenants.filter((tenant) =>
    [tenant.name, tenant.city, tenant.country].join(' ').toLowerCase().includes(q.trim().toLowerCase()),
  );

  const toggleStatus = async (tenant: AdminTenant) => {
    const nextStatus = tenant.status === 'active' ? 'suspended' : 'active';

    if (isDemoAdmin) {
      setDemoRows((current) =>
        current.map((row) =>
          row.id === tenant.id
            ? {
                ...row,
                status: nextStatus,
                mrr: row.plan === 'professional' ? (nextStatus === 'active' ? 50 : 0) : 0,
                yearlyFee: row.plan === 'enterprise' ? (nextStatus === 'active' ? row.yearlyFee || 4800 : 0) : 0,
              }
            : row,
        ),
      );
    } else {
      await updateStatusMutation.mutateAsync({ tenantId: tenant.id, status: nextStatus });
    }

    toast({ title: 'Tenant updated', description: `${tenant.name} is now ${nextStatus}.` });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
          <Brand theme="dark" compact showTagline={false} />
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-slate-400" />
            <SettingsIcon className="h-5 w-5 text-slate-400" />
            <div className="text-sm text-slate-300">{user.email}</div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                void logout();
                navigate('/');
              }}
              className="text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <LogOut className="mr-1 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Platform overview</h1>
          <p className="text-sm text-slate-600">Manage tenants, subscriptions and revenue across all clinics.</p>
          {isDemoAdmin && (
            <p className="mt-2 text-xs text-amber-700">
              Demo admin mode is active. Tenant actions are local only until PostgreSQL is connected.
            </p>
          )}
        </div>

        {!metrics ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
            Loading admin overview...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard
                icon={<Building2 className="h-5 w-5" />}
                label="Registered clinics"
                value={metrics.registeredClinics.toString()}
                sub={`${metrics.activeSubscriptions} active`}
                color="text-[#2C5F7C]"
                bg="bg-[#2C5F7C]/10"
              />
              <MetricCard
                icon={<Activity className="h-5 w-5" />}
                label="Active subscriptions"
                value={metrics.activeSubscriptions.toString()}
                sub={`${metrics.suspendedCount} suspended`}
                color="text-emerald-600"
                bg="bg-emerald-50"
              />
              <MetricCard
                icon={<DollarSign className="h-5 w-5" />}
                label="Monthly MRR"
                value={`EUR ${metrics.monthlyMrr.toLocaleString()}`}
                sub="Professional plans"
                color="text-amber-600"
                bg="bg-amber-50"
              />
              <MetricCard
                icon={<TrendingUp className="h-5 w-5" />}
                label="Yearly revenue"
                value={`EUR ${metrics.yearlyRevenue.toLocaleString()}`}
                sub="Enterprise contracts"
                color="text-indigo-600"
                bg="bg-indigo-50"
              />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                <div>
                  <div className="font-semibold text-[#1F2937]">Tenant management</div>
                  <div className="text-xs text-slate-500">
                    {isDemoAdmin ? 'Local demo tenant list' : 'Live tenant list from PostgreSQL'}
                  </div>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search tenants..."
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    className="w-64 pl-9"
                  />
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
                    {filtered.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-slate-500">
                          No tenants found.
                        </TableCell>
                      </TableRow>
                    )}
                    {filtered.map((tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium">{tenant.name}</TableCell>
                        <TableCell className="text-slate-600">{tenant.city}, {tenant.country}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={tenant.plan === 'enterprise' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300'}
                          >
                            {tenant.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={tenant.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                            {tenant.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{tenant.staffCount}</TableCell>
                        <TableCell>{tenant.patientsCount.toLocaleString()}</TableCell>
                        <TableCell>{tenant.plan === 'professional' ? `EUR ${tenant.mrr}/mo` : `EUR ${tenant.yearlyFee}/yr`}</TableCell>
                        <TableCell className="text-xs text-slate-600">{tenant.joinedAt}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void toggleStatus(tenant)}
                            className="h-7 text-xs"
                            disabled={updateStatusMutation.isPending}
                          >
                            {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub: string; color: string; bg: string }> = ({
  icon,
  label,
  value,
  sub,
  color,
  bg,
}) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex items-center justify-between">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${color}`}>{icon}</div>
    </div>
    <div className="mb-1 text-xs text-slate-500">{label}</div>
    <div className="text-2xl font-bold text-[#1F2937]">{value}</div>
    <div className="mt-1 text-xs text-slate-500">{sub}</div>
  </div>
);

export default AdminDashboard;
