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

  const filteredCandidates = candidates.filter((candidate) =>
    candidate.patientName.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const waitingCount = entries.filter((entry) => entry.status === 'waiting').length;
  const inTreatmentCount = entries.filter((entry) => entry.status === 'in_treatment').length;
  const completedCount = entries.filter((entry) => entry.status === 'completed').length;
  const avgWait = entries.length
    ? Math.round(entries.reduce((sum, entry) => sum + entry.estWait, 0) / entries.length)
    : 0;

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
    setDemoRows((current) =>
      current.map((entry) => (entry.id === entryId ? { ...entry, status, estWait: status === 'waiting' ? entry.estWait : 0 } : entry)),
    );
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
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">Waiting room · Live queue</h1>
        <p className="text-sm text-slate-500">Reception board · {date}</p>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="In waiting room" value={waitingCount.toString()} color="bg-amber-50 text-amber-700" />
        <StatCard label="In treatment" value={inTreatmentCount.toString()} color="bg-blue-50 text-blue-700" />
        <StatCard label="Completed today" value={completedCount.toString()} color="bg-emerald-50 text-emerald-700" />
        <StatCard label="Avg wait time" value={`${avgWait} min`} color="bg-slate-100 text-slate-700" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="font-semibold text-[#1F2937] flex items-center gap-2"><Users className="w-4 h-4" /> Current queue</div>
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{waitingCount} waiting</Badge>
          </div>

          {isLoading ? (
            <div className="p-8 text-sm text-slate-500 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading waiting room...
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {entries.length === 0 && <div className="p-12 text-center text-slate-400">No patients in queue</div>}
              {entries.map((entry) => (
                <div key={entry.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#4A90A4]/15 text-[#2C5F7C] flex items-center justify-center font-semibold">
                      {entry.patientName.split(' ').map((part) => part[0]).join('')}
                    </div>
                    <div>
                      <div className="font-semibold text-[#1F2937]">{entry.patientName}</div>
                      <div className="text-xs text-slate-500">Booked {entry.appointmentTime} · Checked in {entry.checkedInAt} · {entry.therapist}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {entry.status === 'waiting' && entry.estWait > 0 && (
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />~{entry.estWait}m</span>
                    )}
                    <StatusPill status={entry.status} />
                    <div className="flex gap-1">
                      {entry.status === 'waiting' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(entry.id, 'in_treatment')} className="h-8 bg-blue-600 hover:bg-blue-700">
                          <Play className="w-3 h-3 mr-1" /> Start
                        </Button>
                      )}
                      {entry.status === 'in_treatment' && (
                        <Button size="sm" onClick={() => handleStatusUpdate(entry.id, 'completed')} className="h-8 bg-emerald-600 hover:bg-emerald-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Complete
                        </Button>
                      )}
                      {entry.status !== 'completed' && entry.status !== 'canceled' && (
                        <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(entry.id, 'canceled')} className="h-8">
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-100">
            <div className="font-semibold text-[#1F2937] mb-2">Check-in patient</div>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <Input placeholder="Find appointment..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
            {filteredCandidates.length === 0 && <div className="p-6 text-sm text-slate-400">No check-in candidates found.</div>}
            {filteredCandidates.map((candidate) => (
              <div key={candidate.id} className="p-3 flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium text-sm">{candidate.patientName}</div>
                  <div className="text-xs text-slate-500">{candidate.appointmentTime} · {candidate.service}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => handleCheckIn(candidate.id)} className="h-8">
                  <UserCheck className="w-3 h-3 mr-1" /> Check in
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
  <div className={`rounded-xl p-5 ${color}`}>
    <div className="text-xs font-medium opacity-80">{label}</div>
    <div className="text-3xl font-bold mt-1">{value}</div>
  </div>
);

const StatusPill: React.FC<{ status: WaitingRoomStatus }> = ({ status }) => {
  const classes: Record<WaitingRoomStatus, string> = {
    waiting: 'bg-amber-100 text-amber-700',
    in_treatment: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    canceled: 'bg-red-100 text-red-700',
  };

  return <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${classes[status]}`}>{status.replace('_', ' ')}</span>;
};

export default WaitingRoom;
