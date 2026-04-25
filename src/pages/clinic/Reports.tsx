import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type ReportRange = 'day' | 'week' | 'month' | 'year' | 'custom';

type ReportsSummary = {
  metrics: {
    revenue: number;
    appointments: number;
    newPatients: number;
    noShowRate: number;
  };
  services: Array<{
    name: string;
    count: number;
    percentage: number;
  }>;
  staff: Array<{
    name: string;
    sessions: number;
    revenue: number;
  }>;
};

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [range, setRange] = useState<ReportRange>('month');
  const isPro = user?.plan === 'professional';
  const isDemoMode = user?.id.startsWith('demo-') ?? false;

  const reportsQuery = useQuery({
    queryKey: ['reports', range],
    queryFn: async () => api<ReportsSummary>('reports_summary', { range }),
    enabled: !isDemoMode,
  });

  const demoData = useMemo<ReportsSummary>(() => ({
    metrics: {
      revenue: range === 'day' ? 842 : range === 'week' ? 8420 : range === 'month' ? 32180 : range === 'year' ? 287540 : 14200,
      appointments: range === 'day' ? 24 : range === 'week' ? 142 : range === 'month' ? 612 : range === 'year' ? 5480 : 215,
      newPatients: range === 'day' ? 4 : range === 'week' ? 18 : range === 'month' ? 76 : range === 'year' ? 612 : 29,
      noShowRate: 4.2,
    },
    services: [
      { name: 'Manual Therapy', count: 34, percentage: 34 },
      { name: 'Rehabilitation Therapy', count: 28, percentage: 28 },
      { name: 'Electrotherapy', count: 18, percentage: 18 },
      { name: 'Sports Rehabilitation', count: 14, percentage: 14 },
    ],
    staff: [
      { name: 'Dr. Elena Moretti', sessions: 142, revenue: 12280 },
      { name: 'Dr. Marco Bianchi', sessions: 118, revenue: 10140 },
      { name: 'Dr. Sara Greco', sessions: 96, revenue: 8420 },
    ],
  }), [range]);

  const summary = isDemoMode ? demoData : reportsQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Revenue, productivity, patients — {isPro ? 'basic reports (Professional)' : 'full advanced analytics (Enterprise)'}</p>
        </div>
        <Button variant="outline" onClick={() => toast({ title: 'Export started', description: 'Use the browser print dialog or connect a PDF export job next.' })}>
          <Download className="w-4 h-4 mr-2" /> Export
        </Button>
      </div>

      {isDemoMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Demo mode is active. Reports are currently rendered from local demo values. Real tenant logins now use PostgreSQL-backed report summaries.
        </div>
      )}

      {!isDemoMode && reportsQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load reports. {(reportsQuery.error as Error)?.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap gap-2 mb-5">
          {([
            { k: 'day', l: 'Daily' },
            { k: 'week', l: 'Weekly' },
            { k: 'month', l: 'Monthly' },
            { k: 'year', l: 'Yearly' },
            { k: 'custom', l: 'Custom' },
          ] as const).map((item) => (
            <Button key={item.k} size="sm" variant={range === item.k ? 'default' : 'outline'} onClick={() => setRange(item.k)} className={range === item.k ? 'bg-[#2C5F7C]' : ''}>
              {item.l}
            </Button>
          ))}
        </div>

        {!summary ? (
          <div className="py-8 text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics...
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-4 gap-4">
              <KPI label="Revenue" value={`€${summary.metrics.revenue.toLocaleString()}`} change="Live" />
              <KPI label="Appointments" value={summary.metrics.appointments.toString()} change="Live" />
              <KPI label="New patients" value={summary.metrics.newPatients.toString()} change="Live" />
              <KPI label="No-show rate" value={`${summary.metrics.noShowRate}%`} change="Live" positive={false} />
            </div>

            <div className="mt-6 h-64 bg-slate-50 rounded-lg flex items-end justify-around p-6">
              {(summary.services.length > 0 ? summary.services : [{ name: 'No data', percentage: 0, count: 0 }]).map((service) => (
                <div key={service.name} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full bg-gradient-to-t from-[#2C5F7C] to-[#4A90A4] rounded-t" style={{ height: `${Math.max(service.percentage, 5)}%` }} />
                  <div className="text-[10px] text-slate-500 text-center">{service.name}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-[#1F2937] mb-4">Therapist productivity</div>
          {!summary ? (
            <div className="text-sm text-slate-400">Loading staff performance...</div>
          ) : (
            <div className="space-y-3">
              {summary.staff.length === 0 && <div className="text-sm text-slate-400">No staff data yet.</div>}
              {summary.staff.map((staff) => (
                <div key={staff.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium text-sm">{staff.name}</div>
                    <div className="text-xs text-slate-500">{staff.sessions} sessions in selected range</div>
                  </div>
                  <div className="font-semibold text-[#2C5F7C]">€{staff.revenue.toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
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
          {!summary ? (
            <div className="text-sm text-slate-400">Loading financial metrics...</div>
          ) : (
            <div className="space-y-2.5 text-sm">
              <Row label="Average invoice value" value={`€${summary.metrics.appointments > 0 ? (summary.metrics.revenue / summary.metrics.appointments).toFixed(2) : '0.00'}`} />
              <Row label="Patient lifetime value (proxy)" value={`€${summary.metrics.newPatients > 0 ? (summary.metrics.revenue / summary.metrics.newPatients).toFixed(2) : '0.00'}`} />
              <Row label="Service mix coverage" value={`${summary.services.reduce((sum, service) => sum + service.percentage, 0)}%`} />
              <Row label="Cash collected" value={`€${summary.metrics.revenue.toLocaleString()}`} />
              <Row label="No-show rate" value={`${summary.metrics.noShowRate}%`} />
            </div>
          )}
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
