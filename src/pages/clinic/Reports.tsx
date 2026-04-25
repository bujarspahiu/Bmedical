import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Loader2, Lock, TrendingUp } from 'lucide-react';
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

  const demoData = useMemo<ReportsSummary>(
    () => ({
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
    }),
    [range],
  );

  const summary = isDemoMode ? demoData : reportsQuery.data;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(74,144,164,0.18),_transparent_26%),linear-gradient(135deg,#f8fbfd_0%,#ffffff_42%,#eef7fa_100%)] p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[#2C5F7C] ring-1 ring-[#2C5F7C]/10">
              <TrendingUp className="h-3.5 w-3.5" />
              Business visibility
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1F2937]">Reports</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Revenue, productivity and growth indicators in a format that clinic owners can read quickly.</p>
          </div>
          <Button variant="outline" onClick={() => toast({ title: 'Export started', description: 'Use the browser print dialog or connect a PDF export job next.' })}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {([
            { k: 'day', l: 'Daily' },
            { k: 'week', l: 'Weekly' },
            { k: 'month', l: 'Monthly' },
            { k: 'year', l: 'Yearly' },
            { k: 'custom', l: 'Custom' },
          ] as const).map((item) => (
            <Button key={item.k} size="sm" variant={range === item.k ? 'default' : 'outline'} onClick={() => setRange(item.k)} className={range === item.k ? 'bg-[#2C5F7C]' : 'bg-white/80'}>
              {item.l}
            </Button>
          ))}
        </div>
      </div>

      {isDemoMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Demo mode is active. Reports are currently rendered from local demo values. Real tenant logins use PostgreSQL-backed report summaries.
        </div>
      )}

      {!isDemoMode && reportsQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load reports. {(reportsQuery.error as Error)?.message}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {!summary ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics...
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <KPI label="Revenue" value={formatCurrency(summary.metrics.revenue)} change="Live" />
              <KPI label="Appointments" value={summary.metrics.appointments.toString()} change="Live" />
              <KPI label="New patients" value={summary.metrics.newPatients.toString()} change="Live" />
              <KPI label="No-show rate" value={`${summary.metrics.noShowRate}%`} change="Live" positive={false} />
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-6">
              <div className="mb-4 font-semibold text-[#1F2937]">Service mix</div>
              <div className="flex h-64 items-end justify-around gap-4">
                {(summary.services.length > 0 ? summary.services : [{ name: 'No data', percentage: 0, count: 0 }]).map((service) => (
                  <div key={service.name} className="flex flex-1 flex-col items-center gap-2">
                    <div className="w-full rounded-t bg-gradient-to-t from-[#2C5F7C] to-[#4A90A4]" style={{ height: `${Math.max(service.percentage, 5)}%` }} />
                    <div className="text-center text-[10px] text-slate-500">{service.name}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 font-semibold text-[#1F2937]">Therapist productivity</div>
          {!summary ? (
            <div className="text-sm text-slate-400">Loading staff performance...</div>
          ) : (
            <div className="space-y-3">
              {summary.staff.length === 0 && <div className="text-sm text-slate-400">No staff data yet.</div>}
              {summary.staff.map((staff) => (
                <div key={staff.name} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                  <div>
                    <div className="text-sm font-medium">{staff.name}</div>
                    <div className="text-xs text-slate-500">{staff.sessions} sessions in selected range</div>
                  </div>
                  <div className="font-semibold text-[#2C5F7C]">{formatCurrency(staff.revenue)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 font-semibold text-[#1F2937]">Advanced financial analytics</div>
          {isPro && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/80 backdrop-blur-sm">
              <Lock className="h-8 w-8 text-slate-400" />
              <div className="text-sm font-semibold text-slate-700">Enterprise feature</div>
              <Button size="sm" className="bg-[#2C5F7C]">
                Upgrade to unlock
              </Button>
            </div>
          )}
          {!summary ? (
            <div className="text-sm text-slate-400">Loading financial metrics...</div>
          ) : (
            <div className="space-y-2.5 text-sm">
              <Row label="Average invoice value" value={formatCurrency(summary.metrics.appointments > 0 ? summary.metrics.revenue / summary.metrics.appointments : 0)} />
              <Row label="Patient lifetime value (proxy)" value={formatCurrency(summary.metrics.newPatients > 0 ? summary.metrics.revenue / summary.metrics.newPatients : 0)} />
              <Row label="Service mix coverage" value={`${summary.services.reduce((sum, service) => sum + service.percentage, 0)}%`} />
              <Row label="Cash collected" value={formatCurrency(summary.metrics.revenue)} />
              <Row label="No-show rate" value={`${summary.metrics.noShowRate}%`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const KPI: React.FC<{ label: string; value: string; change: string; positive?: boolean }> = ({ label, value, change, positive = true }) => (
  <div className="rounded-lg bg-slate-50 p-4">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-bold text-[#1F2937]">{value}</div>
    <div className={`mt-1 text-xs ${positive ? 'text-emerald-600' : 'text-red-600'}`}>{change}</div>
  </div>
);

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between border-b border-slate-100 py-1.5 last:border-0">
    <span className="text-slate-600">{label}</span>
    <span className="font-semibold">{value}</span>
  </div>
);

function formatCurrency(value: number) {
  return `EUR ${value.toFixed(2)}`;
}

export default Reports;
