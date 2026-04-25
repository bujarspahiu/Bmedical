import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Loader2, Plus, Stethoscope, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { demoAppointments, demoPatients, demoServices, demoStaff } from '@/data/demoData';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type AppointmentStatus =
  | 'booked'
  | 'confirmed'
  | 'checked_in'
  | 'waiting'
  | 'in_treatment'
  | 'completed'
  | 'canceled'
  | 'no_show';

type AppointmentRecord = {
  id: string;
  patientId: string;
  patientName: string;
  therapistId?: string;
  therapist: string;
  date: string;
  time: string;
  duration: number;
  serviceId?: string;
  service: string;
  status: AppointmentStatus;
  room: string;
  notes?: string;
};

type AppointmentResources = {
  patients: Array<{ id: string; name: string; status: string }>;
  staff: Array<{ id: string; name: string; role: string }>;
  services: Array<{ id: string; name: string; category: string; duration: number; price: number }>;
};

type AppointmentForm = {
  patientId: string;
  therapistId: string;
  serviceId: string;
  time: string;
  room: string;
  notes: string;
};

const initialForm: AppointmentForm = {
  patientId: '',
  therapistId: '',
  serviceId: '',
  time: '09:00',
  room: 'Room 1',
  notes: '',
};

const hours = Array.from({ length: 11 }, (_, index) => `${String(index + 8).padStart(2, '0')}:00`);

const Appointments: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isDemoMode = user?.id.startsWith('demo-') ?? false;
  const [date, setDate] = useState('2026-04-21');
  const [view, setView] = useState<'day' | 'week'>('day');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<AppointmentForm>(initialForm);
  const [demoRows, setDemoRows] = useState<AppointmentRecord[]>(
    demoAppointments.map((appointment) => ({
      ...appointment,
      therapistId: demoStaff.find((staff) => staff.name === appointment.therapist)?.id,
      serviceId: demoServices.find((service) => service.name === appointment.service)?.id,
    })),
  );

  const resourcesQuery = useQuery({
    queryKey: ['appointments', 'resources'],
    queryFn: async () => api<AppointmentResources>('appointments_resources'),
    enabled: !isDemoMode,
  });

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', date],
    queryFn: async () => {
      const response = await api<{ appointments: AppointmentRecord[] }>('appointments_list', { date });
      return response.appointments;
    },
    enabled: !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: AppointmentForm) => {
      const response = await api<{ appointment: AppointmentRecord }>('appointment_create', {
        patientId: payload.patientId,
        therapistId: payload.therapistId,
        serviceId: payload.serviceId,
        date,
        time: payload.time,
        room: payload.room,
        notes: payload.notes.trim() || null,
      });
      return response.appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', date] });
      setOpen(false);
      setForm(initialForm);
      toast({ title: 'Appointment created', description: 'The booking was saved to PostgreSQL.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not create appointment', description: error.message });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: AppointmentStatus }) => {
      const response = await api<{ appointment: AppointmentRecord }>('appointment_update_status', { id, status });
      return response.appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments', date] });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not update appointment', description: error.message });
    },
  });

  const resources = useMemo<AppointmentResources>(() => {
    if (isDemoMode) {
      return {
        patients: demoPatients.filter((patient) => patient.status !== 'archived').map((patient) => ({ id: patient.id, name: `${patient.firstName} ${patient.lastName}`, status: patient.status })),
        staff: demoStaff.map((staff) => ({ id: staff.id, name: staff.name, role: staff.role })),
        services: demoServices.map((service) => ({
          id: service.id,
          name: service.name,
          category: service.category,
          duration: service.duration,
          price: service.price,
        })),
      };
    }

    return resourcesQuery.data ?? { patients: [], staff: [], services: [] };
  }, [isDemoMode, resourcesQuery.data]);

  const appointments = isDemoMode ? demoRows.filter((row) => row.date === date) : appointmentsQuery.data ?? [];

  const createLocalAppointment = () => {
    const patient = resources.patients.find((item) => item.id === form.patientId);
    const therapist = resources.staff.find((item) => item.id === form.therapistId);
    const service = resources.services.find((item) => item.id === form.serviceId);

    if (!patient || !therapist || !service) {
      toast({ title: 'Missing fields', description: 'Choose a patient, therapist and service.' });
      return;
    }

    const newAppointment: AppointmentRecord = {
      id: `demo-${Date.now()}`,
      patientId: patient.id,
      patientName: patient.name,
      therapistId: therapist.id,
      therapist: therapist.name,
      date,
      time: form.time,
      duration: service.duration,
      serviceId: service.id,
      service: service.name,
      status: 'booked',
      room: form.room,
      notes: form.notes,
    };

    setDemoRows((current) => [...current, newAppointment]);
    setOpen(false);
    setForm(initialForm);
    toast({ title: 'Demo appointment created', description: 'The booking exists locally for this session.' });
  };

  const submitCreate = async () => {
    if (!form.patientId || !form.therapistId || !form.serviceId) {
      toast({ title: 'Missing fields', description: 'Choose a patient, therapist and service.' });
      return;
    }

    if (isDemoMode) {
      createLocalAppointment();
      return;
    }

    await createMutation.mutateAsync(form);
  };

  const updateLocalStatus = (id: string, status: AppointmentStatus) => {
    setDemoRows((current) => current.map((row) => (row.id === id ? { ...row, status } : row)));
    toast({ title: 'Demo appointment updated', description: `Status changed to ${status.replace('_', ' ')}.` });
  };

  const updateStatus = async (id: string, status: AppointmentStatus) => {
    if (isDemoMode) {
      updateLocalStatus(id, status);
      return;
    }

    await statusMutation.mutateAsync({ id, status });
    toast({ title: 'Appointment updated', description: `Status changed to ${status.replace('_', ' ')}.` });
  };

  const shift = (days: number) => {
    const next = new Date(`${date}T00:00:00`);
    next.setUTCDate(next.getUTCDate() + days);
    setDate(next.toISOString().slice(0, 10));
  };

  const selectedService = resources.services.find((service) => service.id === form.serviceId);
  const isLoading = !isDemoMode && (appointmentsQuery.isLoading || resourcesQuery.isLoading);
  const completedCount = appointments.filter((item) => item.status === 'completed').length;
  const waitingCount = appointments.filter((item) => item.status === 'waiting' || item.status === 'checked_in').length;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(74,144,164,0.18),_transparent_26%),linear-gradient(135deg,#f8fbfd_0%,#ffffff_42%,#eef7fa_100%)] p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[#2C5F7C] ring-1 ring-[#2C5F7C]/10">
              <Stethoscope className="h-3.5 w-3.5" />
              Daily appointment flow
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1F2937]">Appointments</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">A focused agenda for the whole day, built to help reception and clinicians see the next patient fast.</p>
          </div>
          <Button onClick={() => setOpen(true)} className="bg-[#2C5F7C] hover:bg-[#234e66]">
            <Plus className="mr-2 h-4 w-4" /> New appointment
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <TopStat label="Appointments" value={String(appointments.length)} />
          <TopStat label="Completed" value={String(completedCount)} />
          <TopStat label="Waiting" value={String(waitingCount)} />
        </div>
      </div>

      {isDemoMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Demo mode is active. Appointment changes are local only. Real tenant logins use PostgreSQL-backed bookings.
        </div>
      )}

      {!isDemoMode && (appointmentsQuery.isError || resourcesQuery.isError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load appointment data. {((appointmentsQuery.error || resourcesQuery.error) as Error)?.message}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shift(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-sm font-medium">
              <CalendarDays className="h-4 w-4" />
              {new Date(`${date}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <Button variant="outline" size="icon" onClick={() => shift(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDate('2026-04-21')}>
              Today
            </Button>
          </div>
          <div className="flex gap-1">
            {(['day', 'week'] as const).map((nextView) => (
              <Button key={nextView} size="sm" variant={view === nextView ? 'default' : 'outline'} onClick={() => setView(nextView)} className={view === nextView ? 'bg-[#2C5F7C]' : ''}>
                {nextView[0].toUpperCase() + nextView.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {view === 'week' && (
          <div className="px-4 pt-4 text-sm text-slate-500">
            Week view still uses the same live day agenda beneath it for now. The backend is ready, so a visual weekly grid can be layered on top next.
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading appointments...
          </div>
        ) : (
          <div className="p-4">
            <div className="grid grid-cols-[80px_1fr] gap-2">
              {hours.map((hour) => {
                const inSlot = appointments.filter((appointment) => appointment.time.startsWith(hour.slice(0, 2)));
                return (
                  <React.Fragment key={hour}>
                    <div className="border-r border-slate-100 pr-2 pt-1 text-right text-xs text-slate-400">{hour}</div>
                    <div className="min-h-[68px] py-1">
                      {inSlot.length === 0 && <div className="h-full rounded-lg border border-dashed border-slate-100" />}
                      <div className="space-y-2">
                        {inSlot.map((appointment) => (
                          <div key={appointment.id} className="rounded-xl border-l-4 border-[#2C5F7C] bg-[#2C5F7C]/5 p-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-[#1F2937]">{appointment.patientName}</div>
                                <div className="text-xs text-slate-500">{appointment.time} · {appointment.duration} min · {appointment.service}</div>
                                <div className="text-xs text-slate-500">{appointment.therapist} · {appointment.room}</div>
                                {appointment.notes && <div className="mt-1 text-xs text-slate-500">{appointment.notes}</div>}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClassName(appointment.status)}`}>{appointment.status.replace('_', ' ')}</span>
                                <div className="flex gap-2">
                                  {appointment.status !== 'completed' && appointment.status !== 'canceled' && (
                                    <Button size="sm" variant="outline" onClick={() => updateStatus(appointment.id, 'completed')}>
                                      <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
                                    </Button>
                                  )}
                                  {appointment.status !== 'canceled' && appointment.status !== 'completed' && (
                                    <Button size="sm" variant="outline" onClick={() => updateStatus(appointment.id, 'canceled')}>
                                      <XCircle className="mr-1 h-3 w-3" /> Cancel
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>New appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Patient</Label>
              <select className="h-10 w-full rounded-md border border-slate-200 px-3" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
                <option value="">Select patient</option>
                {resources.patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Therapist</Label>
                <select className="h-10 w-full rounded-md border border-slate-200 px-3" value={form.therapistId} onChange={(e) => setForm({ ...form, therapistId: e.target.value })}>
                  <option value="">Select therapist</option>
                  {resources.staff.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Time</Label>
                <Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Service</Label>
                <select className="h-10 w-full rounded-md border border-slate-200 px-3" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
                  <option value="">Select service</option>
                  {resources.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} · {formatCurrency(service.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Room</Label>
                <Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
              </div>
            </div>

            {selectedService && (
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <Clock3 className="h-4 w-4 text-[#2C5F7C]" />
                {selectedService.duration} min · {selectedService.category} · {formatCurrency(selectedService.price)}
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional internal notes for the appointment..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={createMutation.isPending} className="bg-[#2C5F7C]">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Book appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TopStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-bold text-[#1F2937]">{value}</div>
  </div>
);

function statusClassName(status: AppointmentStatus) {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-700';
  if (status === 'in_treatment') return 'bg-blue-100 text-blue-700';
  if (status === 'waiting' || status === 'checked_in') return 'bg-amber-100 text-amber-700';
  if (status === 'canceled' || status === 'no_show') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
}

function formatCurrency(value: number) {
  return `EUR ${value.toFixed(0)}`;
}

export default Appointments;
