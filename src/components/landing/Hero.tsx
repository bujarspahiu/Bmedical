import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, ShieldCheck, Users, CalendarClock, TrendingUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const Hero: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(74,144,164,0.08),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(44,95,124,0.08),transparent_50%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2C5F7C]/10 border border-[#2C5F7C]/20 text-[#2C5F7C] text-xs font-semibold mb-6">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t.hero.badge}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1F2937] leading-tight tracking-tight">
              {t.hero.titleStart}
              <span className="text-[#2C5F7C]"> {t.hero.titleAccent}</span>
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">{t.hero.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate('/register')} className="bg-[#2C5F7C] hover:bg-[#234e66] text-white h-12 px-6">
                {t.hero.startTrial} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} className="h-12 px-6 border-slate-300">
                <Play className="w-4 h-4 mr-2" /> {t.hero.requestDemo}
              </Button>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
              <div>
                <div className="text-2xl font-bold text-[#2C5F7C]">2,400+</div>
                <div className="text-xs text-slate-500">{t.hero.clinics}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#2C5F7C]">1.8M</div>
                <div className="text-xs text-slate-500">{t.hero.sessions}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#2C5F7C]">99.9%</div>
                <div className="text-xs text-slate-500">{t.hero.uptime}</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-[#2C5F7C]/10 to-[#4A90A4]/10 rounded-3xl blur-2xl" />
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-[#2C5F7C] to-[#4A90A4] px-5 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <div className="text-xs text-white/80 ml-3">app.bmedical.health/dashboard</div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-xs text-slate-500">{t.hero.overview}</div>
                    <div className="text-lg font-bold text-[#1F2937]">MediRehab Clinic</div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">{t.hero.live}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <StatCard icon={<CalendarClock className="w-4 h-4" />} label={t.hero.appointments} value="24" color="bg-blue-50 text-blue-700" />
                  <StatCard icon={<Users className="w-4 h-4" />} label={t.hero.waitingRoom} value="6" color="bg-amber-50 text-amber-700" />
                  <StatCard icon={<TrendingUp className="w-4 h-4" />} label={t.hero.revenueToday} value="€1,842" color="bg-emerald-50 text-emerald-700" />
                  <StatCard icon={<ShieldCheck className="w-4 h-4" />} label={t.hero.completed} value="18 / 24" color="bg-slate-100 text-slate-700" />
                </div>
                <div className="space-y-2">
                  {[
                    { tme: '09:00', n: 'Marco Rossi', s: t.hero.therapy, st: t.hero.completed },
                    { tme: '10:00', n: 'Sofia Romano', s: t.hero.rehab, st: t.hero.inTreatment },
                    { tme: '11:00', n: 'Chiara Ricci', s: t.hero.electrotherapy, st: t.hero.waiting },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-semibold text-[#2C5F7C] w-10">{r.tme}</div>
                        <div>
                          <div className="text-sm font-medium text-[#1F2937]">{r.n}</div>
                          <div className="text-xs text-slate-500">{r.s}</div>
                        </div>
                      </div>
                      <span className={`text-[10px] px-2 py-1 rounded-full font-semibold ${
                        r.st === t.hero.completed ? 'bg-emerald-100 text-emerald-700' :
                        r.st === t.hero.inTreatment ? 'bg-blue-100 text-blue-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{r.st}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: string; color: string }> = ({ icon, label, value, color }) => (
  <div className={`rounded-lg p-3 ${color}`}>
    <div className="flex items-center gap-1.5 mb-1 opacity-70">{icon}<span className="text-[10px] font-semibold uppercase tracking-wide">{label}</span></div>
    <div className="text-xl font-bold">{value}</div>
  </div>
);

export default Hero;
