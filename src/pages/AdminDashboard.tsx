import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Bell,
  Building2,
  CalendarClock,
  Database,
  Download,
  DollarSign,
  HardDriveDownload,
  LogOut,
  RefreshCcw,
  Search,
  Settings as SettingsIcon,
  ShieldCheck,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { api, apiDownload } from '@/lib/api';
import Brand from '@/components/Brand';
import { toast } from '@/components/ui/use-toast';
import { demoTenants } from '@/data/demoData';
import { Label } from '@/components/ui/label';

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

type BackupRecord = {
  id: string;
  triggerType: 'manual' | 'scheduled';
  scheduleId: string | null;
  backupKind: string;
  engine: string;
  format: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  fileName: string | null;
  fileSizeBytes: number;
  retentionDays: number;
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  downloadPath: string | null;
};

type BackupSchedule = {
  id: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  hour: number;
  minute: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  retentionDays: number;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
};

type BackupLog = {
  id: string;
  backupId: string | null;
  scheduleId: string | null;
  level: string;
  message: string;
  createdAt: string;
};

type BackupOverview = {
  backups: BackupRecord[];
  schedules: BackupSchedule[];
  logs: BackupLog[];
  summary: {
    totalBackups: number;
    latestCompletedAt: string | null;
    latestCompletedSizeBytes: number;
    activeSchedules: number;
  };
};

type BackupScheduleForm = {
  id?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  hour: string;
  minute: string;
  dayOfWeek: string;
  dayOfMonth: string;
  retentionDays: string;
  isActive: boolean;
};

type PricingRule = {
  id: string;
  code: 'professional' | 'enterprise';
  name: string;
  summary: string;
  monthlyPrice: number;
  yearlyPrice: number;
  includedUsers: number;
  extraUserMonthly: number;
  extraUserYearly: number;
};

type PaymentTransaction = {
  id: string;
  tenantId: string;
  customerEmail: string;
  customerName: string;
  planCode: string;
  billingCycle: string;
  seatCount: number;
  totalAmount: number;
  method: string;
  status: string;
  createdAt: string;
  referenceCode: string;
  bankRegion: string | null;
  proofNote: string;
};

type BillingSubscription = {
  tenantId: string;
  businessName: string;
  status: string;
  billingCycle: string;
  planCode: string;
  seatCount: number;
  totalAmount: number;
};

type BillingOverview = {
  pricingRules: PricingRule[];
  paymentSettings: PaymentSettings;
  pendingManualReviews: PaymentTransaction[];
  recentTransactions: PaymentTransaction[];
  subscriptions: BillingSubscription[];
};

type PaymentSettings = {
  bankKosovoProvider: string;
  bankKosovoBeneficiary: string;
  bankKosovoIban: string;
  bankKosovoBic: string;
  bankSepaProvider: string;
  bankSepaBeneficiary: string;
  bankSepaIban: string;
  bankSepaBic: string;
  bankReferencePrefix: string;
  cardLabel: string;
  cardHelpText: string;
  cardIsEnabled: boolean;
  cardIsComingSoon: boolean;
  paypalLabel: string;
  paypalHelpText: string;
  paypalIsEnabled: boolean;
  paypalIsComingSoon: boolean;
};

const defaultPaymentSettings: PaymentSettings = {
  bankKosovoProvider: 'Paysera',
  bankKosovoBeneficiary: 'BMedical',
  bankKosovoIban: '',
  bankKosovoBic: '',
  bankSepaProvider: 'Paysera',
  bankSepaBeneficiary: 'BMedical',
  bankSepaIban: '',
  bankSepaBic: '',
  bankReferencePrefix: 'BMD',
  cardLabel: 'Credit Card Payment',
  cardHelpText: 'Coming Soon. The future card flow will stay inside the same checkout experience.',
  cardIsEnabled: false,
  cardIsComingSoon: true,
  paypalLabel: 'PayPal',
  paypalHelpText: 'Coming Soon. PayPal will also stay inside the same checkout page experience.',
  paypalIsEnabled: false,
  paypalIsComingSoon: true,
};

const defaultScheduleForm: BackupScheduleForm = {
  frequency: 'daily',
  hour: '2',
  minute: '0',
  dayOfWeek: '1',
  dayOfMonth: '1',
  retentionDays: '14',
  isActive: true,
};

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [activeTab, setActiveTab] = useState<'tenants' | 'backups' | 'billing'>('tenants');
  const [scheduleForm, setScheduleForm] = useState<BackupScheduleForm>(defaultScheduleForm);
  const [paymentSettingsForm, setPaymentSettingsForm] = useState<PaymentSettings>(defaultPaymentSettings);
  const isDemoAdminEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO_ADMIN === 'true';
  const isDemoAdmin = isDemoAdminEnabled && user?.id === 'demo-platform-admin';
  const [demoRows, setDemoRows] = useState<AdminTenant[]>(demoTenants.map((tenant) => ({ ...tenant })));

  const overviewQuery = useQuery({
    queryKey: ['admin-overview'],
    queryFn: async () => api<AdminOverview>('admin_tenants_overview'),
    enabled: !!user?.isAdmin && !isDemoAdmin,
  });

  const backupsQuery = useQuery({
    queryKey: ['admin-backups'],
    queryFn: async () => api<BackupOverview>('admin_backups_overview'),
    enabled: !!user?.isAdmin && !isDemoAdmin,
    refetchInterval: 30000,
  });

  const billingQuery = useQuery({
    queryKey: ['admin-billing'],
    queryFn: async () => api<BillingOverview>('admin_billing_overview'),
    enabled: !!user?.isAdmin && !isDemoAdmin,
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ tenantId, status }: { tenantId: string; status: 'active' | 'suspended' }) => api('admin_tenant_update_status', { tenantId, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    },
    onError: (error: Error) => toast({ title: 'Could not update tenant', description: error.message }),
  });

  const runBackupMutation = useMutation({
    mutationFn: async () => api<{ backup: BackupRecord }>('admin_backup_run_now'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-backups'] });
      toast({ title: 'Backup started', description: 'A new platform backup job is now running.' });
      setActiveTab('backups');
    },
    onError: (error: Error) => toast({ title: 'Could not start backup', description: error.message }),
  });

  const deleteBackupMutation = useMutation({
    mutationFn: async (id: string) => api('admin_backup_delete', { id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-backups'] });
      toast({ title: 'Backup deleted', description: 'The backup archive was removed.' });
    },
    onError: (error: Error) => toast({ title: 'Could not delete backup', description: error.message }),
  });

  const scheduleMutation = useMutation({
    mutationFn: async (payload: BackupScheduleForm) =>
      api<{ schedule: BackupSchedule }>('admin_backup_schedule_upsert', {
        id: payload.id,
        frequency: payload.frequency,
        hour: Number(payload.hour),
        minute: Number(payload.minute),
        dayOfWeek: payload.frequency === 'weekly' ? Number(payload.dayOfWeek) : null,
        dayOfMonth: payload.frequency === 'monthly' ? Number(payload.dayOfMonth) : null,
        retentionDays: Number(payload.retentionDays),
        isActive: payload.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-backups'] });
      setScheduleForm(defaultScheduleForm);
      toast({ title: 'Schedule saved', description: 'Backup schedule was updated successfully.' });
    },
    onError: (error: Error) => toast({ title: 'Could not save schedule', description: error.message }),
  });

  const manualReviewMutation = useMutation({
    mutationFn: async ({ transactionId, decision, notes }: { transactionId: string; decision: 'approve' | 'reject'; notes?: string }) =>
      api('admin_manual_payment_review', { transactionId, decision, notes }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-billing'] });
      queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
      toast({
        title: variables.decision === 'approve' ? 'Payment approved' : 'Payment rejected',
        description: variables.decision === 'approve' ? 'The tenant was activated and billing was recorded.' : 'The tenant returned to verified but unpaid status.',
      });
    },
    onError: (error: Error) => toast({ title: 'Could not review payment', description: error.message }),
  });

  const paymentSettingsMutation = useMutation({
    mutationFn: async (payload: PaymentSettings) => api<{ settings: PaymentSettings }>('admin_payment_settings_update', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-billing'] });
      toast({ title: 'Payment settings updated', description: 'Checkout and admin billing now use the new payment details.' });
    },
    onError: (error: Error) => toast({ title: 'Could not update payment settings', description: error.message }),
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
  const filtered = tenants.filter((tenant) => [tenant.name, tenant.city, tenant.country].join(' ').toLowerCase().includes(q.trim().toLowerCase()));
  const backupOverview = isDemoAdmin
    ? ({
        backups: [],
        schedules: [],
        logs: [],
        summary: { totalBackups: 0, latestCompletedAt: null, latestCompletedSizeBytes: 0, activeSchedules: 0 },
      } satisfies BackupOverview)
    : backupsQuery.data;

  const latestBackup = backupOverview?.backups.find((item) => item.status === 'completed') || null;
  const billingOverview = isDemoAdmin
    ? ({
        pricingRules: [],
        paymentSettings: defaultPaymentSettings,
        pendingManualReviews: [],
        recentTransactions: [],
        subscriptions: [],
      } satisfies BillingOverview)
    : billingQuery.data;

  useEffect(() => {
    if (billingOverview?.paymentSettings) {
      setPaymentSettingsForm(billingOverview.paymentSettings);
    }
  }, [billingOverview?.paymentSettings]);

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

  const downloadBackup = async (backup: BackupRecord) => {
    if (!backup.downloadPath) {
      toast({ title: 'Backup not ready', description: 'This backup cannot be downloaded yet.' });
      return;
    }
    const blob = await apiDownload(backup.downloadPath);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backup.fileName || 'BMedical-backup';
    link.click();
    URL.revokeObjectURL(url);
  };

  const editSchedule = (schedule: BackupSchedule) => {
    setScheduleForm({
      id: schedule.id,
      frequency: schedule.frequency,
      hour: String(schedule.hour),
      minute: String(schedule.minute),
      dayOfWeek: String(schedule.dayOfWeek ?? 1),
      dayOfMonth: String(schedule.dayOfMonth ?? 1),
      retentionDays: String(schedule.retentionDays),
      isActive: schedule.isActive,
    });
    setActiveTab('backups');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-800 bg-slate-900 text-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-3">
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

      <main className="mx-auto max-w-[1500px] space-y-6 p-6">
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(74,144,164,0.18),_transparent_26%),linear-gradient(135deg,#f8fbfd_0%,#ffffff_42%,#eef7fa_100%)] p-6 shadow-sm lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[#2C5F7C] ring-1 ring-[#2C5F7C]/10">
                <ShieldCheck className="h-3.5 w-3.5" />
                Platform control center
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-[#1F2937]">Admin panel</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">Manage tenants, revenue and full BMedical platform backups without entering the VPS manually.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant={activeTab === 'tenants' ? 'default' : 'outline'} onClick={() => setActiveTab('tenants')} className={activeTab === 'tenants' ? 'bg-[#2C5F7C]' : ''}>
                <Building2 className="mr-2 h-4 w-4" /> Tenants
              </Button>
              <Button variant={activeTab === 'backups' ? 'default' : 'outline'} onClick={() => setActiveTab('backups')} className={activeTab === 'backups' ? 'bg-[#2C5F7C]' : ''}>
                <Database className="mr-2 h-4 w-4" /> Backups
              </Button>
              <Button variant={activeTab === 'billing' ? 'default' : 'outline'} onClick={() => setActiveTab('billing')} className={activeTab === 'billing' ? 'bg-[#2C5F7C]' : ''}>
                <DollarSign className="mr-2 h-4 w-4" /> Billing
              </Button>
            </div>
          </div>
        </div>

        {activeTab === 'tenants' && (
          <>
            {!metrics ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">Loading admin overview...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <MetricCard icon={<Building2 className="h-5 w-5" />} label="Registered clinics" value={metrics.registeredClinics.toString()} sub={`${metrics.activeSubscriptions} active`} color="text-[#2C5F7C]" bg="bg-[#2C5F7C]/10" />
                  <MetricCard icon={<Activity className="h-5 w-5" />} label="Active subscriptions" value={metrics.activeSubscriptions.toString()} sub={`${metrics.suspendedCount} suspended`} color="text-emerald-600" bg="bg-emerald-50" />
                  <MetricCard icon={<DollarSign className="h-5 w-5" />} label="Monthly MRR" value={`EUR ${metrics.monthlyMrr.toLocaleString()}`} sub="Professional plans" color="text-amber-600" bg="bg-amber-50" />
                  <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Yearly revenue" value={`EUR ${metrics.yearlyRevenue.toLocaleString()}`} sub="Enterprise contracts" color="text-indigo-600" bg="bg-indigo-50" />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
                    <div>
                      <div className="font-semibold text-[#1F2937]">Tenant management</div>
                      <div className="text-xs text-slate-500">{isDemoAdmin ? 'Local demo tenant list' : 'Live tenant list from PostgreSQL'}</div>
                    </div>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input placeholder="Search tenants..." value={q} onChange={(event) => setQ(event.target.value)} className="w-64 pl-9" />
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
                              <Badge variant="outline" className={tenant.plan === 'enterprise' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-300'}>
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
                              <Button size="sm" variant="outline" onClick={() => void toggleStatus(tenant)} className="h-7 text-xs" disabled={updateStatusMutation.isPending}>
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
          </>
        )}

        {activeTab === 'backups' && (
          <div className="space-y-6">
            {isDemoAdmin ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                Backup management is disabled in demo admin mode. Use the real platform admin with a connected PostgreSQL database on your VPS.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <MetricCard icon={<Database className="h-5 w-5" />} label="Backup archives" value={String(backupOverview?.summary.totalBackups || 0)} sub="Stored for this platform" color="text-[#2C5F7C]" bg="bg-[#2C5F7C]/10" />
                  <MetricCard icon={<CalendarClock className="h-5 w-5" />} label="Active schedules" value={String(backupOverview?.summary.activeSchedules || 0)} sub="Automatic backup jobs" color="text-indigo-600" bg="bg-indigo-50" />
                  <MetricCard icon={<HardDriveDownload className="h-5 w-5" />} label="Latest size" value={formatBytes(backupOverview?.summary.latestCompletedSizeBytes || 0)} sub="Last completed backup" color="text-emerald-600" bg="bg-emerald-50" />
                  <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Latest completed" value={latestBackup ? formatDateTime(latestBackup.completedAt) : 'None'} sub="Download-ready archive" color="text-amber-600" bg="bg-amber-50" />
                </div>

                <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-[#1F2937]">Run backup now</div>
                          <div className="text-xs text-slate-500">Creates a backup only for the database linked by `DATABASE_URL`.</div>
                        </div>
                        <Button onClick={() => void runBackupMutation.mutateAsync()} className="bg-[#2C5F7C] hover:bg-[#234e66]" disabled={runBackupMutation.isPending}>
                          {runBackupMutation.isPending ? <RefreshCcw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                          Run backup
                        </Button>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                        The system will prefer `pg_dump` on the VPS. If it is not available, it falls back to an internal JSON snapshot of the current BMedical database.
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 font-semibold text-[#1F2937]">Backup schedule</div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <Label>Frequency</Label>
                          <select className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3" value={scheduleForm.frequency} onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value as BackupScheduleForm['frequency'] })}>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                          </select>
                        </div>
                        <div>
                          <Label>Retention days</Label>
                          <Input className="mt-1" value={scheduleForm.retentionDays} onChange={(e) => setScheduleForm({ ...scheduleForm, retentionDays: e.target.value })} />
                        </div>
                        <div>
                          <Label>Hour</Label>
                          <Input className="mt-1" value={scheduleForm.hour} onChange={(e) => setScheduleForm({ ...scheduleForm, hour: e.target.value })} />
                        </div>
                        <div>
                          <Label>Minute</Label>
                          <Input className="mt-1" value={scheduleForm.minute} onChange={(e) => setScheduleForm({ ...scheduleForm, minute: e.target.value })} />
                        </div>
                        {scheduleForm.frequency === 'weekly' && (
                          <div>
                            <Label>Day of week</Label>
                            <select className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3" value={scheduleForm.dayOfWeek} onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfWeek: e.target.value })}>
                              <option value="0">Sunday</option>
                              <option value="1">Monday</option>
                              <option value="2">Tuesday</option>
                              <option value="3">Wednesday</option>
                              <option value="4">Thursday</option>
                              <option value="5">Friday</option>
                              <option value="6">Saturday</option>
                            </select>
                          </div>
                        )}
                        {scheduleForm.frequency === 'monthly' && (
                          <div>
                            <Label>Day of month</Label>
                            <Input className="mt-1" value={scheduleForm.dayOfMonth} onChange={(e) => setScheduleForm({ ...scheduleForm, dayOfMonth: e.target.value })} />
                          </div>
                        )}
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={scheduleForm.isActive} onChange={(e) => setScheduleForm({ ...scheduleForm, isActive: e.target.checked })} />
                            Schedule active
                          </label>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button onClick={() => void scheduleMutation.mutateAsync(scheduleForm)} className="bg-[#2C5F7C]" disabled={scheduleMutation.isPending}>
                          {scheduleMutation.isPending ? 'Saving...' : scheduleForm.id ? 'Update schedule' : 'Create schedule'}
                        </Button>
                        {scheduleForm.id && (
                          <Button variant="outline" onClick={() => setScheduleForm(defaultScheduleForm)}>
                            Cancel edit
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 p-5">
                        <div className="font-semibold text-[#1F2937]">Scheduled backups</div>
                        <div className="text-xs text-slate-500">Automatic jobs that run directly on the server</div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {backupOverview?.schedules.length ? (
                          backupOverview.schedules.map((schedule) => (
                            <div key={schedule.id} className="flex items-center justify-between gap-3 p-4">
                              <div>
                                <div className="font-medium text-[#1F2937]">{schedule.frequency} at {pad2(schedule.hour)}:{pad2(schedule.minute)}</div>
                                <div className="text-xs text-slate-500">
                                  Retention {schedule.retentionDays} days · next {formatDateTime(schedule.nextRunAt)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={schedule.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
                                  {schedule.isActive ? 'active' : 'paused'}
                                </Badge>
                                <Button size="sm" variant="outline" onClick={() => editSchedule(schedule)}>
                                  Edit
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-5 text-sm text-slate-500">No schedules yet.</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 p-5">
                        <div className="font-semibold text-[#1F2937]">Backup archives</div>
                    <div className="text-xs text-slate-500">Manual and scheduled backups for the current BMedical database</div>
                      </div>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Started</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Engine</TableHead>
                              <TableHead>Size</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {backupOverview?.backups.length ? (
                              backupOverview.backups.map((backup) => (
                                <TableRow key={backup.id}>
                                  <TableCell className="text-xs text-slate-600">{formatDateTime(backup.startedAt)}</TableCell>
                                  <TableCell>{backup.triggerType}</TableCell>
                                  <TableCell>{backup.engine}</TableCell>
                                  <TableCell>{formatBytes(backup.fileSizeBytes)}</TableCell>
                                  <TableCell>
                                    <Badge className={backup.status === 'completed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : backup.status === 'failed' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                                      {backup.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button size="sm" variant="outline" disabled={!backup.downloadPath} onClick={() => void downloadBackup(backup)}>
                                        <Download className="mr-1 h-3 w-3" /> Download
                                      </Button>
                                      <Button size="sm" variant="outline" className="text-red-700" onClick={() => void deleteBackupMutation.mutateAsync(backup.id)}>
                                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={6} className="py-10 text-center text-slate-500">
                                  No backups created yet.
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-5">
                    <div className="font-semibold text-[#1F2937]">Backup logs</div>
                    <div className="text-xs text-slate-500">Latest backup activity and errors</div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {backupOverview?.logs.length ? (
                      backupOverview.logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between gap-3 p-4">
                          <div>
                            <div className={`font-medium ${log.level === 'error' ? 'text-red-700' : 'text-[#1F2937]'}`}>{log.message}</div>
                            <div className="text-xs text-slate-500">{log.backupId ? `Backup ${log.backupId.slice(0, 8)}` : 'Schedule event'}</div>
                          </div>
                          <div className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="p-5 text-sm text-slate-500">No backup logs yet.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="space-y-6">
            {isDemoAdmin ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                Billing management is disabled in demo admin mode. Use the real platform admin with PostgreSQL to review manual transfers and subscription records.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                  <MetricCard icon={<DollarSign className="h-5 w-5" />} label="Pending bank reviews" value={String(billingOverview?.pendingManualReviews.length || 0)} sub="Waiting for admin decision" color="text-amber-600" bg="bg-amber-50" />
                  <MetricCard icon={<TrendingUp className="h-5 w-5" />} label="Recent transactions" value={String(billingOverview?.recentTransactions.length || 0)} sub="Across all payment methods" color="text-emerald-600" bg="bg-emerald-50" />
                  <MetricCard icon={<Building2 className="h-5 w-5" />} label="Tracked subscriptions" value={String(billingOverview?.subscriptions.length || 0)} sub="Live platform billing rows" color="text-[#2C5F7C]" bg="bg-[#2C5F7C]/10" />
                  <MetricCard icon={<ShieldCheck className="h-5 w-5" />} label="Pricing rules" value={String(billingOverview?.pricingRules.length || 0)} sub="Professional and Enterprise" color="text-indigo-600" bg="bg-indigo-50" />
                </div>

                <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4">
                      <div className="font-semibold text-[#1F2937]">Pricing rules</div>
                      <div className="text-xs text-slate-500">The platform now uses clear plan pricing with 1 included user and extra user billing.</div>
                    </div>
                    <div className="space-y-4">
                      {billingOverview?.pricingRules.map((rule) => (
                        <div key={rule.id} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-slate-900">{rule.name}</div>
                              <div className="text-xs text-slate-500">{rule.summary}</div>
                            </div>
                            <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100">{rule.code}</Badge>
                          </div>
                          <div className="mt-4 grid gap-2 text-sm text-slate-600">
                            <div className="flex justify-between"><span>Monthly</span><span className="font-medium text-slate-900">EUR {rule.monthlyPrice.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Yearly</span><span className="font-medium text-slate-900">EUR {rule.yearlyPrice.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Included users</span><span className="font-medium text-slate-900">{rule.includedUsers}</span></div>
                            <div className="flex justify-between"><span>Extra user / month</span><span className="font-medium text-slate-900">EUR {rule.extraUserMonthly.toFixed(2)}</span></div>
                            <div className="flex justify-between"><span>Extra user / year</span><span className="font-medium text-slate-900">EUR {rule.extraUserYearly.toFixed(2)}</span></div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                      <div className="mb-4 font-semibold text-slate-900">Payment methods and bank details</div>
                      <div className="grid gap-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                            <div className="font-medium text-slate-900">Kosovo bank transfer</div>
                            <div><Label>Provider</Label><Input className="mt-1" value={paymentSettingsForm.bankKosovoProvider} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, bankKosovoProvider: e.target.value }))} /></div>
                            <div><Label>Beneficiary</Label><Input className="mt-1" value={paymentSettingsForm.bankKosovoBeneficiary} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, bankKosovoBeneficiary: e.target.value }))} /></div>
                            <div><Label>IBAN</Label><Input className="mt-1" value={paymentSettingsForm.bankKosovoIban} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, bankKosovoIban: e.target.value }))} /></div>
                            <div><Label>SWIFT / BIC</Label><Input className="mt-1" value={paymentSettingsForm.bankKosovoBic} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, bankKosovoBic: e.target.value }))} /></div>
                          </div>
                          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                            <div className="font-medium text-slate-900">SEPA bank transfer</div>
                            <div><Label>Provider</Label><Input className="mt-1" value={paymentSettingsForm.bankSepaProvider} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, bankSepaProvider: e.target.value }))} /></div>
                            <div><Label>Beneficiary</Label><Input className="mt-1" value={paymentSettingsForm.bankSepaBeneficiary} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, bankSepaBeneficiary: e.target.value }))} /></div>
                            <div><Label>IBAN</Label><Input className="mt-1" value={paymentSettingsForm.bankSepaIban} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, bankSepaIban: e.target.value }))} /></div>
                            <div><Label>SWIFT / BIC</Label><Input className="mt-1" value={paymentSettingsForm.bankSepaBic} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, bankSepaBic: e.target.value }))} /></div>
                          </div>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                            <div className="font-medium text-slate-900">Shared reference</div>
                            <div><Label>Reference prefix</Label><Input className="mt-1" value={paymentSettingsForm.bankReferencePrefix} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, bankReferencePrefix: e.target.value }))} /></div>
                          </div>
                          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                            <div className="font-medium text-slate-900">Credit Card</div>
                            <div><Label>Label</Label><Input className="mt-1" value={paymentSettingsForm.cardLabel} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, cardLabel: e.target.value }))} /></div>
                            <div><Label>Help text</Label><Input className="mt-1" value={paymentSettingsForm.cardHelpText} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, cardHelpText: e.target.value }))} /></div>
                          </div>
                          <div className="space-y-3 rounded-2xl border border-slate-200 p-4">
                            <div className="font-medium text-slate-900">PayPal</div>
                            <div><Label>Label</Label><Input className="mt-1" value={paymentSettingsForm.paypalLabel} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, paypalLabel: e.target.value }))} /></div>
                            <div><Label>Help text</Label><Input className="mt-1" value={paymentSettingsForm.paypalHelpText} onChange={(e) => setPaymentSettingsForm((current) => ({ ...current, paypalHelpText: e.target.value }))} /></div>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button className="bg-[#2C5F7C]" disabled={paymentSettingsMutation.isPending} onClick={() => void paymentSettingsMutation.mutateAsync(paymentSettingsForm)}>
                            {paymentSettingsMutation.isPending ? 'Saving...' : 'Save payment settings'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 p-5">
                        <div className="font-semibold text-[#1F2937]">Manual bank transfer verification</div>
                        <div className="text-xs text-slate-500">Approve or reject transfers that are waiting up to 3 business days for confirmation.</div>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {billingOverview?.pendingManualReviews.length ? (
                          billingOverview.pendingManualReviews.map((transaction) => (
                            <div key={transaction.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <div className="font-medium text-slate-900">{transaction.customerName}</div>
                                <div className="text-xs text-slate-500">
                                  {transaction.customerEmail} · {transaction.planCode} · {transaction.billingCycle} · {transaction.seatCount} users
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {transaction.bankRegion || 'bank transfer'} · ref {transaction.referenceCode || 'pending'} · {formatDateTime(transaction.createdAt)}
                                </div>
                                {transaction.proofNote ? <div className="mt-2 text-sm text-slate-600">{transaction.proofNote}</div> : null}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-slate-900">EUR {transaction.totalAmount.toFixed(2)}</div>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={manualReviewMutation.isPending} onClick={() => void manualReviewMutation.mutateAsync({ transactionId: transaction.id, decision: 'approve' })}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="text-red-700" disabled={manualReviewMutation.isPending} onClick={() => void manualReviewMutation.mutateAsync({ transactionId: transaction.id, decision: 'reject' })}>
                                  Reject
                                </Button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-5 text-sm text-slate-500">No manual transfer reviews are waiting right now.</div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                      <div className="border-b border-slate-100 p-5">
                        <div className="font-semibold text-[#1F2937]">Recent payment activity</div>
                        <div className="text-xs text-slate-500">Card, PayPal and bank transfer activity across the platform.</div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {billingOverview?.recentTransactions.length ? (
                            billingOverview.recentTransactions.map((transaction) => (
                              <TableRow key={transaction.id}>
                                <TableCell>
                                  <div className="font-medium text-slate-900">{transaction.customerName}</div>
                                  <div className="text-xs text-slate-500">{transaction.planCode} · {transaction.billingCycle}</div>
                                </TableCell>
                                <TableCell>{transaction.method}</TableCell>
                                <TableCell>
                                  <Badge className={transaction.status === 'completed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : transaction.status === 'pending_manual_review' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
                                    {transaction.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>EUR {transaction.totalAmount.toFixed(2)}</TableCell>
                                <TableCell className="text-xs text-slate-500">{formatDateTime(transaction.createdAt)}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="py-8 text-center text-sm text-slate-500">No payment activity yet.</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string; sub: string; color: string; bg: string }> = ({ icon, label, value, sub, color, bg }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-3 flex items-center justify-between">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${color}`}>{icon}</div>
    </div>
    <div className="mb-1 text-xs text-slate-500">{label}</div>
    <div className="text-2xl font-bold text-[#1F2937]">{value}</div>
    <div className="mt-1 text-xs text-slate-500">{sub}</div>
  </div>
);

function formatBytes(value: number) {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function formatDateTime(value: string | null) {
  if (!value) return 'Never';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

export default AdminDashboard;
