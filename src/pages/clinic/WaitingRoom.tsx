import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Loader2, Play, Search, UserCheck, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { demoAppointments, demoWaitingRoom } from '@/data/demoData';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type WaitingRoomStatus = 'waiting' | 'in_treatment' | 'completed' | 'canceled';

type WaitingRoomEntry = {
  id: string;
  appointmentId: string;
  patientName: string;
  appointmentTime: string;
  checkedInAt: string;
  status: WaitingRoomStatus;
  therapist: string;
  estWait: number;
};

type WaitingRoomCandidate = {
  id: string;
  patientName: string;
  appointmentTime: string;
  service: string;
  therapist: string;
};

type WaitingRoomResponse = {
  entries: WaitingRoomEntry[];
  candidates: WaitingRoomCandidate[];
};

const WaitingRoom: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isDemoMode = user?.id.startsWith('demo-') ?? false;
  const [date] = useState('2026-04-21');
  const [search, setSearch] = useState('');
  const [demoRows, setDemoRows] = useState<WaitingRoomEntry[]>(
    demoWaitingRoom.map((row, index) => ({
      id: row.id,
      appointmentId: demoAppointments[index]?.id || `appt-${row.id}`,
      patientName: row.patientName,
      appointmentTime: row.appointmentTime,
      checkedInAt: row.checkedInAt,
      status: row.status as WaitingRoomStatus,
      therapist: row.therapist,
      estWait: row.estWait,
    })),
  );

  const waitingRoomQuery = useQuery({
    queryKey: ['waiting-room', date],
    queryFn: async () => api<WaitingRoomResponse>('waiting_room_list', { date }),
    enabled: !isDemoMode,
  });

  const checkInMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      const response = await api<{ entry: WaitingRoomEntry }>('waiting_room_check_in', { appointmentId });
      return response.entry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waiting-room', date] });
      queryClient.invalidateQueries({ queryKey: ['appointments', date] });
      toast({ title: 'Patient checked in', description: 'The patient was added to the live waiting room.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not check in patient', description: error.message });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ entryId, status }: { entryId: string; status: WaitingRoomStatus }) => {
      const response = await api<{ entry: WaitingRoomEntry }>('waiting_room_update_status', { entryId, status });
      return response.entry;
    },
    onSuccess: (_entry, variables) => {
      queryClient.invalidateQueries({ queryKey: ['waiting-room', date] });
      queryClient.invalidateQueries({ queryKey: ['appointments', date] });
      toast({ title: 'Status updated', description: `Patient marked as ${variables.status.replace('_', ' ')}.` });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not update waiting room status', description: error.message });
    },
  });

  const demoCandidates = useMemo<WaitingRoomCandidate[]>(
    () =>
      demoAppointments
        .filter((appointment) => appointment.date === date && ['booked', 'confirmed'].includes(appointment.status))
        .map((appointment) => ({
          id: appointment.id,
          patientName: appointment.patientName,
          appointmentTime: appointment.time,
          service: appointment.service,
          therapist: appointment.therapist,
        })),
    [date],
  );

  const entries = isDemoMode ? demoRows : waitingRoomQuery.data?.entries ?? [];
  const candidates = isDemoMode ? demoCandidates : waitingRoomQuery.data?.candidates ?? [];

  const filteredCandidates = candidates.filter((candidate) => candidate.patientName.toLowerCase().includes(search.trim().toLowerCase()));

  const waitingCount = entries.filter((entry) => entry.status === 'waiting').length;
  const inTreatmentCount = entries.filter((entry) => entry.status === 'in_treatment').length;
  const completedCount = entries.filter((entry) => entry.status === 'completed').length;
  const avgWait = entries.length ? Math.round(entries.reduce((sum, entry) => sum + entry.estWait, 0) / entries.length) : 0;

  const checkInLocally = (candidate: WaitingRoomCandidate) => {
    setDemoRows((current) => [
      {
        id: `demo-entry-${Date.now()}`,
        appointmentId: candidate.id,
        patientName: candidate.patientName,
        appointmentTime: candidate.appointmentTime,
        checkedInAt: new Date().toISOString().slice(11, 16),
        status: 'waiting',
        therapist: candidate.therapist,
        estWait: 10,
      },
      ...current,
    ]);
    toast({ title: 'Demo check-in complete', description: `${candidate.patientName} was added locally.` });
  };

  const updateLocalStatus = (entryId: string, status: WaitingRoomStatus) => {
    setDemoRows((current) => current.map((entry) => (entry.id === entryId ? { ...entry, status, estWait: status === 'waiting' ? entry.estWait : 0 } : entry)));
    toast({ title: 'Demo status updated', description: `Patient marked as ${status.replace('_', ' ')}.` });
  };

  const handleCheckIn = async (appointmentId: string) => {
    if (isDemoMode) {
      const candidate = candidates.find((item) => item.id === appointmentId);
      if (candidate) checkInLocally(candidate);
      return;
    }

    await checkInMutation.mutateAsync(appointmentId);
  };

  const handleStatusUpdate = async (entryId: string, status: WaitingRoomStatus) => {
    if (isDemoMode) {
      updateLocalStatus(entryId, status);
      return;
    }

    await statusMutation.mutateAsync({ entryId, status });
  };

  const isLoading = !isDemoMode && waitingRoomQuery.isLoading;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(74,144,164,0.18),_transparent_26%),linear-gradient(135deg,#f8fbfd_0%,#ffffff_42%,#eef7fa_100%)] p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[#2C5F7C] ring-1 ring-[#2C5F7C]/10">
              <Users className="h-3.5 w-3.5" />
              Reception queue
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1F2937]">Waiting room</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">A calm live queue for reception, with instant check-in and clear treatment status changes.</p>
          </div>
          <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3 text-sm text-slate-600">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Board date</div>
            <div className="mt-1 font-semibold text-[#1F2937]">{date}</div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <StatCard label="In waiting room" value={waitingCount.toString()} color="bg-white/80 text-amber-700" />
          <StatCard label="In treatment" value={inTreatmentCount.toString()} color="bg-white/80 text-blue-700" />
          <StatCard label="Completed" value={completedCount.toString()} color="bg-white/80 text-emerald-700" />
          <StatCard label="Average wait" value={`${avgWait} min`} color="bg-white/80 text-slate-700" />
        </div>
      </div>

      {isDemoMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Demo mode is active. Waiting room changes are local only. Real tenant logins save check-ins and status changes in PostgreSQL.
        </div>
      )}

      {!isDemoMode && waitingRoomQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load waiting room data. {(waitingRoomQuery.error as Error)?.message}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div className="flex items-center gap-2 font-semibold text-[#1F2937]">
              <Users className="h-4 w-4" /> Current queue
            </div>
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{waitingCount} waiting</Badge>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading waiting room...
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.length === 0 && <div className="p-12 text-center text-slate-400">No patients in queue</div>}
              {entries.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4A90A4]/15 font-semibold text-[#2C5F7C]">
                      {entry.patientName
                        .split(' ')
                        .map((part) => part[0])
                        .join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-[#1F2937]">{entry.patientName}</div>
                      <div className="text-xs text-slate-500">Booked {entry.appointmentTime} · Checked in {entry.checkedInAt} · {entry.therapist}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {entry.status === 'waiting' && entry.estWait > 0 && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />~{entry.estWait}m
                      </span>
                    )}
                    <StatusPill status={entry.status} />
                    <div className="flex gap-1">
                      {entry.status === 'waiting' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(entry.id, 'in_treatment')} className="h-8 bg-blue-600 hover:bg-blue-700">
                          <Play className="mr-1 h-3 w-3" /> Start
                        </Button>
                      )}
                      {entry.status === 'in_treatment' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(entry.id, 'completed')} className="h-8 bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Complete
                        </Button>
                      )}
                      {entry.status !== 'completed' && entry.status !== 'canceled' && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(entry.id, 'canceled')} className="h-8">
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5">
            <div className="mb-2 font-semibold text-[#1F2937]">Check-in patient</div>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Find appointment..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {filteredCandidates.length === 0 && <div className="p-6 text-sm text-slate-400">No check-in candidates found.</div>}
            {filteredCandidates.map((candidate) => (
              <div key={candidate.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <div className="font-medium text-sm">{candidate.patientName}</div>
                  <div className="text-xs text-slate-500">{candidate.appointmentTime} · {candidate.service}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleCheckIn(candidate.id)} className="h-8">
                  <UserCheck className="mr-1 h-3 w-3" /> Check in
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div className={`rounded-2xl border border-white/70 p-4 ${color}`}>
    <div className="text-xs font-medium uppercase tracking-wide opacity-80">{label}</div>
    <div className="mt-1 text-2xl font-bold">{value}</div>
  </div>
);

const StatusPill: React.FC<{ status: WaitingRoomStatus }> = ({ status }) => {
  const classes: Record<WaitingRoomStatus, string> = {
    waiting: 'bg-amber-100 text-amber-700',
    in_treatment: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    canceled: 'bg-red-100 text-red-700',
  };

  return <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${classes[status]}`}>{status.replace('_', ' ')}</span>;
};

export default WaitingRoom;
