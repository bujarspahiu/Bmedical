import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { demoAppointments, demoInvoices, demoWaitingRoom } from '@/data/demoData';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';

type DashboardSummary = {
  metrics: {
    appointmentsToday: number;
    patientsToday: number;
    completedToday: number;
    revenueToday: number;
    outstanding: number;
  };
  upcoming: Array<{
    id: string;
    patientName: string;
    time: string;
    service: string;
    therapist: string;
    room: string;
    status: string;
  }>;
  waitingRoom: Array<{
    patientName: string;
    status: string;
    estWait: number;
  }>;
  services: Array<{
    name: string;
    percentage: number;
    count: number;
  }>;
  staff: Array<{
    name: string;
    sessionsToday: number;
  }>;
};

type ReminderRecord = {
  id: string;
  patientId: string;
  patientName: string;
  type: string;
  channel: string;
  scheduledAt: string;
  status: string;
  notes: string;
};

type AuditLogRecord = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  actorName: string;
  actorType: string;
};

type ReminderForm = {
  patientId: string;
  type: 'appointment' | 'follow_up' | 'payment' | 'reevaluation';
  channel: 'email';
  scheduledAt: string;
  notes: string;
};

const dashboardDate = '2026-04-21';
const selectClassName = 'w-full h-10 rounded-md border border-slate-200 bg-white px-3';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDemoMode = user?.id.startsWith('demo-') ?? false;
  const [showReminderForm, setShowReminderForm] = React.useState(false);
  const [reminderForm, setReminderForm] = React.useState<ReminderForm>({
    patientId: '',
    type: 'appointment',
    channel: 'email',
    scheduledAt: `${dashboardDate}T16:00`,
    notes: '',
  });
  const [demoReminders, setDemoReminders] = React.useState<ReminderRecord[]>([
    {
      id: 'rem-1',
      patientId: 'demo-1',
      patientName: 'Marco Rossi',
      type: 'appointment',
      channel: 'email',
      scheduledAt: `${dashboardDate}T15:00:00Z`,
      status: 'pending',
      notes: 'Remind about tomorrow follow-up session.',
    },
    {
      id: 'rem-2',
      patientId: 'demo-2',
      patientName: 'Sofia Romano',
      type: 'payment',
      channel: 'email',
      scheduledAt: `${dashboardDate}T17:30:00Z`,
      status: 'sent',
      notes: 'Invoice due in 2 days.',
    },
  ]);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard', dashboardDate],
    queryFn: async () => api<DashboardSummary>('dashboard_summary', { date: dashboardDate }),
    enabled: !isDemoMode,
  });

  const resourcesQuery = useQuery({
    queryKey: ['appointments', 'resources'],
    queryFn: async () => api<{ patients: Array<{ id: string; name: string; status: string }> }>('appointments_resources'),
    enabled: !isDemoMode,
  });

  const remindersQuery = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const response = await api<{ reminders: ReminderRecord[] }>('reminders_list');
      return response.reminders;
    },
    enabled: !isDemoMode,
  });

  const auditQuery = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const response = await api<{ logs: AuditLogRecord[] }>('audit_logs_list', { limit: 12 });
      return response.logs;
    },
    enabled: !isDemoMode,
  });

  const createReminderMutation = useMutation({
    mutationFn: async (payload: ReminderForm) => {
      const response = await api<{ reminder: ReminderRecord }>('reminder_create', {
        patientId: payload.patientId,
        type: payload.type,
        channel: payload.channel,
        scheduledAt: payload.scheduledAt,
        notes: payload.notes.trim() || null,
      });
      return response.reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      setShowReminderForm(false);
      setReminderForm({ patientId: '', type: 'appointment', channel: 'email', scheduledAt: `${dashboardDate}T16:00`, notes: '' });
      toast({ title: 'Reminder scheduled', description: 'The reminder was added to the clinic queue.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not schedule reminder', description: error.message });
    },
  });

  const reminderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'pending' | 'sent' | 'canceled' }) => {
      const response = await api<{ reminder: ReminderRecord }>('reminder_update_status', { id, status });
      return response.reminder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not update reminder', description: error.message });
    },
  });

  const demoSummary: DashboardSummary = {
    metrics: {
      appointmentsToday: demoAppointments.filter((appointment) => appointment.date === dashboardDate).length,
      patientsToday: 18,
      completedToday: demoAppointments.filter((appointment) => appointment.date === dashboardDate && appointment.status === 'completed').length,
      revenueToday: demoInvoices.filter((invoice) => invoice.date === dashboardDate).reduce((sum, invoice) => sum + invoice.total, 0),
      outstanding: demoInvoices.filter((invoice) => invoice.status === 'unpaid').reduce((sum, invoice) => sum + invoice.total, 0),
    },
    upcoming: demoAppointments
      .filter((appointment) => appointment.date === dashboardDate)
      .slice(0, 8)
      .map((appointment) => ({
        id: appointment.id,
        patientName: appointment.patientName,
        time: appointment.time,
        service: appointment.service,
        therapist: appointment.therapist,
        room: appointment.room,
        status: appointment.status,
      })),
    waitingRoom: demoWaitingRoom.map((entry) => ({
      patientName: entry.patientName,
      status: entry.status,
      estWait: entry.estWait,
    })),
    services: [
      { name: 'Manual Therapy', percentage: 34, count: 34 },
      { name: 'Rehabilitation Therapy', percentage: 28, count: 28 },
      { name: 'Electrotherapy', percentage: 18, count: 18 },
      { name: 'Sports Rehabilitation', percentage: 14, count: 14 },
    ],
    staff: [
      { name: 'Dr. Elena Moretti', sessionsToday: 8 },
      { name: 'Dr. Marco Bianchi', sessionsToday: 6 },
      { name: 'Dr. Sara Greco', sessionsToday: 4 },
    ],
  };

  const summary = isDemoMode ? demoSummary : dashboardQuery.data;
  const patients = isDemoMode
    ? [
        { id: 'demo-1', name: 'Marco Rossi', status: 'active' },
        { id: 'demo-2', name: 'Sofia Romano', status: 'active' },
        { id: 'demo-3', name: 'Luca Ferrari', status: 'active' },
      ]
    : resourcesQuery.data?.patients ?? [];
  const reminders = isDemoMode ? demoReminders : remindersQuery.data ?? [];
  const auditLogs = isDemoMode
    ? [
        { id: 'log-1', action: 'create', entity: 'invoice', entityId: 'inv-1', metadata: { number: 'INV-2026-0004' }, createdAt: `${dashboardDate}T09:20:00Z`, actorName: user?.name || 'Team', actorType: 'tenant_user' },
        { id: 'log-2', action: 'update_status', entity: 'appointment', entityId: 'app-1', metadata: { status: 'completed' }, createdAt: `${dashboardDate}T10:10:00Z`, actorName: user?.name || 'Team', actorType: 'tenant_user' },
      ]
    : auditQuery.data ?? [];

  const submitReminder = async () => {
    const patient = patients.find((entry) => entry.id === reminderForm.patientId);
    if (!patient) {
      toast({ title: 'Missing patient', description: 'Choose a patient for the reminder.' });
      return;
    }

    if (isDemoMode) {
      setDemoReminders((current) => [
        {
          id: `demo-reminder-${Date.now()}`,
          patientId: patient.id,
          patientName: patient.name,
          type: reminderForm.type,
          channel: reminderForm.channel,
          scheduledAt: `${reminderForm.scheduledAt}:00Z`,
          status: 'pending',
          notes: reminderForm.notes,
        },
        ...current,
      ]);
      setShowReminderForm(false);
      setReminderForm({ patientId: '', type: 'appointment', channel: 'email', scheduledAt: `${dashboardDate}T16:00`, notes: '' });
      toast({ title: 'Demo reminder scheduled', description: 'Saved locally in demo mode.' });
      return;
    }

    await createReminderMutation.mutateAsync(reminderForm);
  };

  const updateReminderStatus = async (id: string, status: 'pending' | 'sent' | 'canceled') => {
    if (isDemoMode) {
      setDemoReminders((current) => current.map((item) => (item.id === id ? { ...item, status } : item)));
      return;
    }

    await reminderStatusMutation.mutateAsync({ id, status });
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(74,144,164,0.22),_transparent_28%),linear-gradient(135deg,#f8fbfd_0%,#ffffff_45%,#eef7fa_100%)] p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[#2C5F7C] ring-1 ring-[#2C5F7C]/10 backdrop-blur">
              <Activity className="h-3.5 w-3.5" />
              Live clinic pulse
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1F2937]">Good afternoon, {user?.name || 'team'}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Today&apos;s workspace highlights the next important actions for the clinic: arrivals, appointments, reminders and revenue.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="border-slate-300 bg-white/80 hover:bg-white" onClick={() => navigate('/waiting-room')}>
              <Clock className="mr-2 h-4 w-4" /> Open waiting room
            </Button>
            <Button onClick={() => navigate('/appointments')} className="bg-[#2C5F7C] hover:bg-[#234e66]">
              <CalendarClock className="mr-2 h-4 w-4" /> New appointment
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <HeroStat label="Date" value="Tuesday, 21 April 2026" />
          <HeroStat label="Workspace" value={user?.tenantName || 'Clinic workspace'} />
          <HeroStat label="Reminders" value={`${reminders.filter((item) => item.status === 'pending').length} pending`} />
        </div>
      </div>

      {isDemoMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Demo mode is active. Dashboard metrics are based on local demo data. Real tenant logins use PostgreSQL-backed summaries.
        </div>
      )}

      {!isDemoMode && dashboardQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load dashboard summary. {(dashboardQuery.error as Error)?.message}
        </div>
      )}

      {!summary ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading live dashboard...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi icon={<CalendarClock className="h-5 w-5" />} label="Today's Appointments" value={summary.metrics.appointmentsToday.toString()} change="Live" color="text-blue-600" bg="bg-blue-50" />
            <Kpi icon={<Users className="h-5 w-5" />} label="Patients Today" value={summary.metrics.patientsToday.toString()} change="Live" color="text-[#2C5F7C]" bg="bg-cyan-50" />
            <Kpi icon={<DollarSign className="h-5 w-5" />} label="Revenue Today" value={formatCurrency(summary.metrics.revenueToday)} change="Live" color="text-emerald-600" bg="bg-emerald-50" />
            <Kpi icon={<AlertCircle className="h-5 w-5" />} label="Outstanding" value={formatCurrency(summary.metrics.outstanding)} change="Live" color="text-amber-600" bg="bg-amber-50" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#1F2937]">Upcoming appointments</div>
                  <div className="text-xs text-slate-500">Next bookings today</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')}>
                  View all <ArrowUpRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
              <div className="space-y-2">
                {summary.upcoming.length === 0 && <div className="py-6 text-sm text-slate-400">No appointments booked yet for today.</div>}
                {summary.upcoming.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-14 text-sm font-bold text-[#2C5F7C]">{appointment.time}</div>
                      <div>
                        <div className="text-sm font-medium text-[#1F2937]">{appointment.patientName}</div>
                        <div className="text-xs text-slate-500">{appointment.service} · {appointment.therapist} · {appointment.room}</div>
                      </div>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#1F2937]">Waiting room</div>
                  <div className="text-xs text-slate-500">Live queue</div>
                </div>
                <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                  {summary.waitingRoom.filter((entry) => entry.status === 'waiting').length} waiting
                </Badge>
              </div>
              <div className="space-y-2">
                {summary.waitingRoom.length === 0 && <div className="py-6 text-sm text-slate-400">No patients currently checked in.</div>}
                {summary.waitingRoom.map((entry, index) => (
                  <div key={`${entry.patientName}-${index}`} className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-[#1F2937]">{entry.patientName}</div>
                      <StatusBadge status={entry.status} />
                    </div>
                    {entry.estWait > 0 && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />~{entry.estWait}m estimated wait
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={() => navigate('/waiting-room')}>
                Open waiting room
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <ReportCard label="Daily" value={formatCurrency(summary.metrics.revenueToday, 0)} sub="Revenue today" />
            <ReportCard label="Appointments" value={summary.metrics.appointmentsToday.toString()} sub="Scheduled today" />
            <ReportCard label="Completed" value={summary.metrics.completedToday.toString()} sub="Finished today" />
            <ReportCard label="Outstanding" value={formatCurrency(summary.metrics.outstanding, 0)} sub="Unpaid invoices" />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 font-semibold text-[#1F2937]">Today's overview</div>
              <div className="space-y-2.5 text-sm">
                <Row icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Completed" value={summary.metrics.completedToday.toString()} />
                <Row icon={<Activity className="h-4 w-4 text-blue-500" />} label="In treatment" value={summary.waitingRoom.filter((entry) => entry.status === 'in_treatment').length.toString()} />
                <Row icon={<Clock className="h-4 w-4 text-amber-500" />} label="Waiting" value={summary.waitingRoom.filter((entry) => entry.status === 'waiting').length.toString()} />
                <Row icon={<XCircle className="h-4 w-4 text-slate-400" />} label="Canceled" value={summary.upcoming.filter((appointment) => appointment.status === 'canceled').length.toString()} />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 font-semibold text-[#1F2937]">Most used services</div>
              <div className="space-y-2.5 text-sm">
                {summary.services.length === 0 && <div className="text-sm text-slate-400">No service usage data yet.</div>}
                {summary.services.map((service, index) => (
                  <div key={service.name}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span>{service.name}</span>
                      <span className="font-semibold">{service.percentage}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${serviceColor(index)}`} style={{ width: `${service.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-center gap-2 font-semibold text-[#1F2937]">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> Staff activity
              </div>
              <div className="space-y-3 text-sm">
                {summary.staff.length === 0 && <div className="text-sm text-slate-400">No staff activity recorded yet.</div>}
                {summary.staff.map((staff) => (
                  <div key={staff.name} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{staff.name}</div>
                      <div className="text-xs text-slate-500">sessions today</div>
                    </div>
                    <div className="text-lg font-bold text-[#2C5F7C]">{staff.sessionsToday}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-[#1F2937]">
                    <Bell className="h-4 w-4 text-[#2C5F7C]" /> Reminders
                  </div>
                  <div className="text-xs text-slate-500">Email reminders for appointments, follow-ups and payments</div>
                </div>
                <Button size="sm" className="bg-[#2C5F7C] hover:bg-[#234e66]" onClick={() => setShowReminderForm((current) => !current)}>
                  {showReminderForm ? 'Close' : 'Schedule'}
                </Button>
              </div>

              {showReminderForm && (
                <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                  <div>
                    <Label>Patient</Label>
                    <select className={selectClassName} value={reminderForm.patientId} onChange={(event) => setReminderForm({ ...reminderForm, patientId: event.target.value })}>
                      <option value="">Select patient</option>
                      {patients.map((patient) => (
                        <option key={patient.id} value={patient.id}>
                          {patient.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Type</Label>
                    <select className={selectClassName} value={reminderForm.type} onChange={(event) => setReminderForm({ ...reminderForm, type: event.target.value as ReminderForm['type'] })}>
                      <option value="appointment">Appointment</option>
                      <option value="follow_up">Follow-up</option>
                      <option value="payment">Payment</option>
                      <option value="reevaluation">Re-evaluation</option>
                    </select>
                  </div>
                  <div>
                    <Label>Channel</Label>
                    <select className={selectClassName} value={reminderForm.channel} onChange={(event) => setReminderForm({ ...reminderForm, channel: event.target.value as ReminderForm['channel'] })}>
                      <option value="email">Email</option>
                    </select>
                  </div>
                  <div>
                    <Label>Scheduled at</Label>
                    <Input type="datetime-local" value={reminderForm.scheduledAt} onChange={(event) => setReminderForm({ ...reminderForm, scheduledAt: event.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <Input value={reminderForm.notes} onChange={(event) => setReminderForm({ ...reminderForm, notes: event.target.value })} placeholder="Optional note for the reminder" />
                  </div>
                  <div className="flex gap-2 md:col-span-2">
                    <Button variant="outline" onClick={() => setShowReminderForm(false)}>
                      Cancel
                    </Button>
                    <Button className="bg-[#2C5F7C]" onClick={() => void submitReminder()} disabled={createReminderMutation.isPending}>
                      {createReminderMutation.isPending ? 'Saving...' : 'Create reminder'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {reminders.length === 0 && <div className="text-sm text-slate-400">No reminders scheduled yet.</div>}
                {reminders.map((reminder) => (
                  <div key={reminder.id} className="rounded-xl bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-[#1F2937]">{reminder.patientName}</div>
                        <div className="text-xs text-slate-500">
                          {reminder.type.replace('_', ' ')} | {reminder.channel} | {reminder.scheduledAt.slice(0, 16).replace('T', ' ')}
                        </div>
                        {reminder.notes && <div className="mt-1 text-sm text-slate-600">{reminder.notes}</div>}
                      </div>
                      <Badge className={reminder.status === 'sent' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : reminder.status === 'canceled' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-amber-100 text-amber-700 hover:bg-amber-100'}>
                        {reminder.status}
                      </Badge>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void updateReminderStatus(reminder.id, 'sent')}>
                        Mark sent
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => void updateReminderStatus(reminder.id, 'canceled')}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4 font-semibold text-[#1F2937]">Recent activity</div>
              <div className="space-y-3">
                {auditLogs.length === 0 && <div className="text-sm text-slate-400">No audit events recorded yet.</div>}
                {auditLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-[#1F2937]">{humanizeAudit(log.action, log.entity)}</div>
                      <div className="text-xs text-slate-500">{log.createdAt.slice(0, 16).replace('T', ' ')}</div>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">{log.actorName}</div>
                    <div className="mt-2 text-xs text-slate-500">{summarizeMetadata(log.metadata)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; change: string; color: string; bg: string }> = ({ icon, label, value, change, color, bg }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-5">
    <div className="mb-3 flex items-center justify-between">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} ${color}`}>{icon}</div>
      <span className="text-xs font-semibold text-emerald-600">{change}</span>
    </div>
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-2xl font-bold text-[#1F2937]">{value}</div>
  </div>
);

const HeroStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/70 bg-white/80 p-4 backdrop-blur">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-sm font-semibold text-[#1F2937]">{value}</div>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    in_treatment: 'bg-blue-100 text-blue-700',
    waiting: 'bg-amber-100 text-amber-700',
    checked_in: 'bg-cyan-100 text-cyan-700',
    confirmed: 'bg-indigo-100 text-indigo-700',
    booked: 'bg-slate-100 text-slate-700',
    canceled: 'bg-red-100 text-red-700',
    no_show: 'bg-red-100 text-red-700',
  };

  return <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${map[status] || 'bg-slate-100 text-slate-700'}`}>{status.replace('_', ' ')}</span>;
};

const ReportCard: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div className="rounded-xl bg-gradient-to-br from-[#2C5F7C] to-[#4A90A4] p-5 text-white">
    <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
    <div className="mt-2 text-2xl font-bold">{value}</div>
    <div className="mt-1 text-xs opacity-80">{sub}</div>
  </div>
);

const Row: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      {icon}
      <span>{label}</span>
    </div>
    <span className="font-semibold">{value}</span>
  </div>
);

function serviceColor(index: number) {
  return ['bg-[#2C5F7C]', 'bg-[#4A90A4]', 'bg-emerald-500', 'bg-amber-500'][index % 4];
}

function humanizeAudit(action: string, entity: string) {
  return `${action.replace('_', ' ')} ${entity.replace('_', ' ')}`;
}

function summarizeMetadata(metadata: Record<string, unknown>) {
  const entries = Object.entries(metadata || {}).slice(0, 3);
  if (entries.length === 0) return 'No extra metadata';
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join(' | ');
}

function formatCurrency(value: number, digits = 2) {
  return `EUR ${value.toFixed(digits)}`;
}

export default Dashboard;
