import React, { useState } from 'react';
import { Download, BarChart3, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<'day' | 'week' | 'month' | 'year' | 'custom'>('month');
  const isPro = user?.plan === 'professional';

  const data = { day: 842, week: 8420, month: 32180, year: 287540, custom: 14200 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Revenue, productivity, patients — {isPro ? 'basic reports (Professional)' : 'full advanced analytics (Enterprise)'}</p>
        </div>
        <Button variant="outline" onClick={() => toast({ title: 'Export started', description: 'Report will be emailed to you as PDF and CSV.' })}>
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap gap-2 mb-5">
          {([
            { k: 'day', l: 'Daily' }, { k: 'week', l: 'Weekly' }, { k: 'month', l: 'Monthly' }, { k: 'year', l: 'Yearly' }, { k: 'custom', l: 'Custom' },
          ] as const).map(r => (
            <Button key={r.k} size="sm" variant={range === r.k ? 'default' : 'outline'} onClick={() => setRange(r.k)} className={range === r.k ? 'bg-[#2C5F7C]' : ''}>
              {r.l}
            </Button>
          ))}
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <KPI label="Revenue" value={`€${data[range].toLocaleString()}`} change="+12.4%" />
          <KPI label="Appointments" value={range === 'day' ? '24' : range === 'week' ? '142' : range === 'month' ? '612' : '5,480'} change="+8.2%" />
          <KPI label="New patients" value={range === 'day' ? '4' : range === 'week' ? '18' : range === 'month' ? '76' : '612'} change="+14%" />
          <KPI label="No-show rate" value="4.2%" change="-1.1%" positive={false} />
        </div>

        <div className="mt-6 h-64 bg-slate-50 rounded-lg flex items-end justify-around p-6">
          {[40, 65, 55, 78, 62, 88, 72, 95, 82, 90, 75, 100].map((h, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div className="w-full bg-gradient-to-t from-[#2C5F7C] to-[#4A90A4] rounded-t" style={{ height: `${h}%` }} />
              <div className="text-[10px] text-slate-500">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-[#1F2937] mb-4">Therapist productivity</div>
          <div className="space-y-3">
            {[
              { n: 'Dr. Elena Moretti', s: 142, r: 12280 },
              { n: 'Dr. Marco Bianchi', s: 118, r: 10140 },
              { n: 'Dr. Sara Greco', s: 96, r: 8420 },
            ].map((t, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">{t.n}</div>
                  <div className="text-xs text-slate-500">{t.s} sessions this month</div>
                </div>
                <div className="font-semibold text-[#2C5F7C]">€{t.r.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 relative">
          <div className="font-semibold text-[#1F2937] mb-4">Advanced financial analytics</div>
          {isPro && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-xl flex items-center justify-center flex-col gap-2 z-10">
              <Lock className="w-8 h-8 text-slate-400" />
              <div className="text-sm font-semibold text-slate-700">Enterprise feature</div>
              <Button size="sm" className="bg-[#2C5F7C]">Upgrade to unlock</Button>
            </div>
          )}
          <div className="space-y-2.5 text-sm">
            <Row label="Average invoice value" value="€148.20" />
            <Row label="Patient lifetime value" value="€892.40" />
            <Row label="Service margin" value="64.2%" />
            <Row label="Cash flow forecast" value="+€28,400 (30d)" />
            <Row label="Overdue receivables" value="€1,840" />
          </div>
        </div>
      </div>
    </div>
  );
};

const KPI: React.FC<{ label: string; value: string; change: string; positive?: boolean }> = ({ label, value, change, positive = true }) => (
  <div className="p-4 rounded-lg bg-slate-50">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-2xl font-bold text-[#1F2937] mt-1">{value}</div>
    <div className={`text-xs mt-1 ${positive ? 'text-emerald-600' : 'text-red-600'}`}>{change}</div>
  </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between py-1.5 border-b border-slate-100 last:border-0"><span className="text-slate-600">{label}</span><span className="font-semibold">{value}</span></div>
);

export default Reports;
