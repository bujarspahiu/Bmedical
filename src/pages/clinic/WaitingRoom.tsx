import React, { useState } from 'react';
import { Clock, Play, CheckCircle2, X, UserCheck, Search, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { demoWaitingRoom, demoAppointments } from '@/data/demoData';
import { toast } from '@/components/ui/use-toast';

const WaitingRoom: React.FC = () => {
  const [rows, setRows] = useState(demoWaitingRoom);
  const [search, setSearch] = useState('');

  const setStatus = (id: string, status: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, status, estWait: 0 } : r));
    toast({ title: 'Status updated', description: `Patient marked as ${status.replace('_', ' ')}.` });
  };

  const waitingCount = rows.filter(r => r.status === 'waiting').length;
  const inTreatment = rows.filter(r => r.status === 'in_treatment').length;

  const checkInCandidates = demoAppointments
    .filter(a => a.date === '2026-04-21' && ['booked', 'confirmed'].includes(a.status))
    .filter(a => a.patientName.toLowerCase().includes(search.toLowerCase()));

  const checkIn = (patientName: string, apptTime: string, therapist: string) => {
    setRows([{ id: 'w' + Date.now(), patientName, appointmentTime: apptTime, checkedInAt: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }), status: 'waiting', therapist, estWait: 10 }, ...rows]);
    toast({ title: 'Checked in', description: `${patientName} added to waiting room.` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">Waiting room · Live queue</h1>
        <p className="text-sm text-slate-500">Reception board · Tuesday, 21 April 2026</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="In waiting room" value={waitingCount.toString()} color="bg-amber-50 text-amber-700" />
        <StatCard label="In treatment" value={inTreatment.toString()} color="bg-blue-50 text-blue-700" />
        <StatCard label="Completed today" value="12" color="bg-emerald-50 text-emerald-700" />
        <StatCard label="Avg wait time" value="11 min" color="bg-slate-100 text-slate-700" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="font-semibold text-[#1F2937] flex items-center gap-2"><Users className="w-4 h-4" /> Current queue</div>
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{waitingCount} waiting</Badge>
          </div>
          <div className="divide-y divide-slate-100">
            {rows.length === 0 && <div className="p-12 text-center text-slate-400">No patients in queue</div>}
            {rows.map(r => (
              <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#4A90A4]/15 text-[#2C5F7C] flex items-center justify-center font-semibold">
                    {r.patientName.split(' ').map(s => s[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-[#1F2937]">{r.patientName}</div>
                    <div className="text-xs text-slate-500">Booked {r.appointmentTime} · Checked in {r.checkedInAt} · {r.therapist}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.status === 'waiting' && r.estWait > 0 && <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />~{r.estWait}m</span>}
                  <StatusPill status={r.status} />
                  <div className="flex gap-1">
                    {r.status === 'waiting' && <Button size="sm" onClick={() => setStatus(r.id, 'in_treatment')} className="h-8 bg-blue-600 hover:bg-blue-700"><Play className="w-3 h-3 mr-1" />Start</Button>}
                    {r.status === 'in_treatment' && <Button size="sm" onClick={() => setStatus(r.id, 'completed')} className="h-8 bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" />Complete</Button>}
                    {r.status !== 'completed' && r.status !== 'canceled' && <Button size="sm" variant="outline" onClick={() => setStatus(r.id, 'canceled')} className="h-8"><X className="w-3 h-3" /></Button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
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
            {checkInCandidates.map(a => (
              <div key={a.id} className="p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{a.patientName}</div>
                  <div className="text-xs text-slate-500">{a.time} · {a.service}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => checkIn(a.patientName, a.time, a.therapist)} className="h-8">
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

const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const m: Record<string, string> = {
    waiting: 'bg-amber-100 text-amber-700',
    in_treatment: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    canceled: 'bg-red-100 text-red-700',
  };
  return <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${m[status]}`}>{status.replace('_', ' ')}</span>;
};

export default WaitingRoom;
