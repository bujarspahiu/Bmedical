import React from 'react';
import { Users, CalendarClock, Activity, DollarSign, AlertCircle, Clock, CheckCircle2, XCircle, TrendingUp, ArrowUpRight } from 'lucide-react';
import { demoAppointments, demoWaitingRoom, demoInvoices } from '@/data/demoData';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const todayAppts = demoAppointments.filter(a => a.date === '2026-04-21');
  const completed = todayAppts.filter(a => a.status === 'completed').length;
  const revenue = demoInvoices.filter(i => i.date === '2026-04-21').reduce((s, i) => s + i.total, 0);
  const unpaid = demoInvoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Good afternoon, Dr. Moretti</h1>
          <p className="text-sm text-slate-500">Tuesday, 21 April 2026 · Here's what's happening today</p>
        </div>
        <Button onClick={() => navigate('/appointments')} className="bg-[#2C5F7C] hover:bg-[#234e66]">
          <CalendarClock className="w-4 h-4 mr-2" /> New appointment
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<CalendarClock className="w-5 h-5" />} label="Today's Appointments" value={todayAppts.length.toString()} change="+12%" color="text-blue-600" bg="bg-blue-50" />
        <Kpi icon={<Users className="w-5 h-5" />} label="Patients Today" value="18" change="+5%" color="text-[#2C5F7C]" bg="bg-cyan-50" />
        <Kpi icon={<DollarSign className="w-5 h-5" />} label="Revenue Today" value={`€${revenue.toFixed(2)}`} change="+24%" color="text-emerald-600" bg="bg-emerald-50" />
        <Kpi icon={<AlertCircle className="w-5 h-5" />} label="Outstanding" value={`€${unpaid.toFixed(2)}`} change="-8%" color="text-amber-600" bg="bg-amber-50" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-[#1F2937]">Upcoming appointments</div>
              <div className="text-xs text-slate-500">Next 8 bookings today</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')}>View all <ArrowUpRight className="w-3 h-3 ml-1" /></Button>
          </div>
          <div className="space-y-2">
            {todayAppts.slice(0, 6).map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-bold text-[#2C5F7C] w-14">{a.time}</div>
                  <div>
                    <div className="font-medium text-sm text-[#1F2937]">{a.patientName}</div>
                    <div className="text-xs text-slate-500">{a.service} · {a.therapist} · {a.room}</div>
                  </div>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Waiting Room */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-[#1F2937]">Waiting room</div>
              <div className="text-xs text-slate-500">Live queue</div>
            </div>
            <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{demoWaitingRoom.filter(w => w.status === 'waiting').length} waiting</Badge>
          </div>
          <div className="space-y-2">
            {demoWaitingRoom.map(w => (
              <div key={w.id} className="p-3 rounded-lg bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm text-[#1F2937]">{w.patientName}</div>
                  <StatusBadge status={w.status} />
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>Booked {w.appointmentTime}</span>
                  {w.estWait > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{w.estWait}m</span>}
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => navigate('/waiting-room')}>Open waiting room</Button>
        </div>
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportCard label="Daily" value={`€${revenue.toFixed(0)}`} sub="Revenue today" />
        <ReportCard label="Weekly" value="€8,420" sub="Last 7 days" />
        <ReportCard label="Monthly" value="€32,180" sub="April 2026" />
        <ReportCard label="Yearly" value="€287,540" sub="2026 so far" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-[#1F2937] mb-3">Today's overview</div>
          <div className="space-y-2.5 text-sm">
            <Row icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Completed" value={`${completed} / ${todayAppts.length}`} />
            <Row icon={<Activity className="w-4 h-4 text-blue-500" />} label="In treatment" value={todayAppts.filter(a => a.status === 'in_treatment').length.toString()} />
            <Row icon={<Clock className="w-4 h-4 text-amber-500" />} label="Waiting" value={demoWaitingRoom.filter(w => w.status === 'waiting').length.toString()} />
            <Row icon={<XCircle className="w-4 h-4 text-slate-400" />} label="Cancellations" value="1" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-[#1F2937] mb-3">Most used services</div>
          <div className="space-y-2.5 text-sm">
            {[
              { n: 'Manual Therapy', p: 34, c: 'bg-[#2C5F7C]' },
              { n: 'Rehabilitation Therapy', p: 28, c: 'bg-[#4A90A4]' },
              { n: 'Electrotherapy', p: 18, c: 'bg-emerald-500' },
              { n: 'Sports Rehabilitation', p: 14, c: 'bg-amber-500' },
            ].map((s, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1"><span>{s.n}</span><span className="font-semibold">{s.p}%</span></div>
                <div className="h-1.5 bg-slate-100 rounded-full"><div className={`h-full rounded-full ${s.c}`} style={{ width: `${s.p}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-[#1F2937] mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" /> Staff activity</div>
          <div className="space-y-3 text-sm">
            {[
              { n: 'Dr. Elena Moretti', s: 8, t: 'sessions today' },
              { n: 'Dr. Marco Bianchi', s: 6, t: 'sessions today' },
              { n: 'Dr. Sara Greco', s: 4, t: 'sessions today' },
            ].map((s, i) => (
              <div key={i} className="flex justify-between items-center">
                <div>
                  <div className="font-medium">{s.n}</div>
                  <div className="text-xs text-slate-500">{s.t}</div>
                </div>
                <div className="text-lg font-bold text-[#2C5F7C]">{s.s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Kpi: React.FC<{ icon: React.ReactNode; label: string; value: string; change: string; color: string; bg: string }> = ({ icon, label, value, change, color, bg }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${bg} ${color}`}>{icon}</div>
      <span className="text-xs text-emerald-600 font-semibold">{change}</span>
    </div>
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-2xl font-bold text-[#1F2937]">{value}</div>
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
  return <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${map[status] || 'bg-slate-100'}`}>{status.replace('_', ' ')}</span>;
};

const ReportCard: React.FC<{ label: string; value: string; sub: string }> = ({ label, value, sub }) => (
  <div className="bg-gradient-to-br from-[#2C5F7C] to-[#4A90A4] rounded-xl p-5 text-white">
    <div className="text-xs uppercase tracking-wider opacity-80">{label} report</div>
    <div className="text-2xl font-bold mt-2">{value}</div>
    <div className="text-xs opacity-80 mt-1">{sub}</div>
  </div>
);

const Row: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">{icon}<span>{label}</span></div>
    <span className="font-semibold">{value}</span>
  </div>
);

export default Dashboard;
