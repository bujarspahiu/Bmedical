import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { demoAppointments, demoPatients, demoServices, demoStaff } from '@/data/demoData';
import { toast } from '@/components/ui/use-toast';

const Appointments: React.FC = () => {
  const [appts, setAppts] = useState(demoAppointments);
  const [date, setDate] = useState('2026-04-21');
  const [view, setView] = useState<'day' | 'week'>('day');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ patientId: '', therapist: '', time: '09:00', service: '', room: 'Room 1' });

  const todayList = appts.filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const hours = Array.from({ length: 10 }, (_, i) => `${8 + i}:00`);

  const shift = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  const create = () => {
    if (!form.patientId || !form.therapist || !form.service) return toast({ title: 'Missing fields' });
    const patient = demoPatients.find(p => p.id === form.patientId);
    const service = demoServices.find(s => s.id === form.service);
    setAppts([...appts, {
      id: 'a' + Date.now(), patientId: form.patientId, patientName: `${patient?.firstName} ${patient?.lastName}`,
      therapist: form.therapist, date, time: form.time, duration: service?.duration || 45,
      service: service?.name || '', status: 'booked', room: form.room,
    }]);
    setOpen(false);
    toast({ title: 'Appointment created', description: 'Patient will receive email confirmation.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Appointments</h1>
          <p className="text-sm text-slate-500">{todayList.length} appointments · {date}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-[#2C5F7C] hover:bg-[#234e66]">
          <Plus className="w-4 h-4 mr-2" /> New appointment
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shift(-1)}><ChevronLeft className="w-4 h-4" /></Button>
            <div className="px-3 py-1.5 bg-slate-50 rounded-lg font-medium text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> {new Date(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <Button variant="outline" size="icon" onClick={() => shift(1)}><ChevronRight className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setDate('2026-04-21')}>Today</Button>
          </div>
          <div className="flex gap-1">
            {(['day', 'week'] as const).map(v => (
              <Button key={v} size="sm" variant={view === v ? 'default' : 'outline'} onClick={() => setView(v)} className={view === v ? 'bg-[#2C5F7C]' : ''}>
                {v[0].toUpperCase() + v.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-[80px_1fr] gap-2">
            {hours.map(h => {
              const inSlot = todayList.filter(a => a.time.startsWith(h.split(':')[0].padStart(2, '0')));
              return (
                <React.Fragment key={h}>
                  <div className="text-xs text-slate-400 pt-1 text-right pr-2 border-r border-slate-100">{h}</div>
                  <div className="min-h-[60px] py-1">
                    {inSlot.length === 0 && <div className="h-full border border-dashed border-slate-100 rounded-lg" />}
                    <div className="space-y-1.5">
                      {inSlot.map(a => (
                        <div key={a.id} className="p-2.5 rounded-lg bg-[#2C5F7C]/5 border-l-4 border-[#2C5F7C] hover:bg-[#2C5F7C]/10 cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-sm text-[#1F2937]">{a.patientName}</div>
                              <div className="text-xs text-slate-500">{a.time} · {a.duration}min · {a.service}</div>
                              <div className="text-xs text-slate-500">{a.therapist} · {a.room}</div>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white text-[#2C5F7C] border border-[#2C5F7C]/20">{a.status.replace('_', ' ')}</span>
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
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Patient</Label>
              <select className="w-full h-10 px-3 rounded-md border border-slate-200" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
                <option value="">Select patient</option>
                {demoPatients.map(p => <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Therapist</Label>
                <select className="w-full h-10 px-3 rounded-md border border-slate-200" value={form.therapist} onChange={(e) => setForm({ ...form, therapist: e.target.value })}>
                  <option value="">Select</option>
                  {demoStaff.map(s => <option key={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div><Label>Time</Label><Input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Service</Label>
                <select className="w-full h-10 px-3 rounded-md border border-slate-200" value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })}>
                  <option value="">Select</option>
                  {demoServices.map(s => <option key={s.id} value={s.id}>{s.name} · €{s.price}</option>)}
                </select>
              </div>
              <div>
                <Label>Room</Label>
                <select className="w-full h-10 px-3 rounded-md border border-slate-200" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}>
                  {['Room 1', 'Room 2', 'Room 3'].map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} className="bg-[#2C5F7C]">Book appointment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Appointments;
