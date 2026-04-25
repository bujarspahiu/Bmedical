import React from 'react';
import { Activity, CreditCard, Mail, BarChart3, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const icons: LucideIcon[] = [BarChart3, CreditCard, Mail];

const SpotlightSections: React.FC = () => {
  const { t } = useLanguage();

  return (
    <>
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#2C5F7C] bg-[#2C5F7C]/10 px-3 py-1 rounded-full mb-4">
                <Activity className="w-3.5 h-3.5" /> {t.spotlight.badge}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-5">{t.spotlight.title}</h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">{t.spotlight.description}</p>
              <ul className="space-y-3">
                {t.spotlight.bullets.map((x, i) => (
                  <li key={i} className="flex items-center gap-2 text-slate-700"><span className="w-1.5 h-1.5 bg-[#2C5F7C] rounded-full" />{x}</li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">{t.spotlight.waitingToday}</div>
              {[
                { n: 'Chiara Ricci', tme: '11:00', th: 'Dr. Moretti', w: 8, st: t.spotlight.waiting, c: 'bg-amber-100 text-amber-700' },
                { n: 'Luca Ferrari', tme: '11:30', th: 'Dr. Greco', w: 15, st: t.spotlight.waiting, c: 'bg-amber-100 text-amber-700' },
                { n: 'Sofia Romano', tme: '10:00', th: 'Dr. Bianchi', w: 0, st: t.spotlight.inTreatment, c: 'bg-blue-100 text-blue-700' },
                { n: 'Marco Rossi', tme: '09:00', th: 'Dr. Moretti', w: 0, st: t.spotlight.completed, c: 'bg-emerald-100 text-emerald-700' },
              ].map((r, i) => (
                <div key={i} className="bg-white rounded-lg p-3 mb-2 flex items-center justify-between border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#4A90A4]/10 text-[#2C5F7C] flex items-center justify-center text-xs font-bold">{r.n.split(' ').map((s) => s[0]).join('')}</div>
                    <div>
                      <div className="font-semibold text-sm text-[#1F2937]">{r.n}</div>
                      <div className="text-xs text-slate-500">{r.tme} · {r.th}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.w > 0 && <span className="text-xs text-slate-500">~{r.w}m</span>}
                    <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${r.c}`}>{r.st}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">{t.spotlight.rolesTitle}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {t.spotlight.cards.map(([title, bullets], i) => {
              const Icon = icons[i];
              return <SpotCard key={i} icon={Icon} title={title} bullets={bullets} />;
            })}
          </div>
        </div>
      </section>
    </>
  );
};

const SpotCard: React.FC<{ icon: LucideIcon; title: string; bullets: string[] }> = ({ icon: Icon, title, bullets }) => (
  <div className="bg-white rounded-xl p-7 shadow-sm border border-slate-200 hover:shadow-lg transition">
    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#2C5F7C] to-[#4A90A4] text-white flex items-center justify-center mb-5">
      <Icon className="w-6 h-6" />
    </div>
    <div className="text-xl font-bold text-[#1F2937] mb-3">{title}</div>
    <ul className="space-y-2">
      {bullets.map((b, i) => <li key={i} className="text-sm text-slate-600 flex items-center gap-2"><span className="w-1 h-1 bg-[#4A90A4] rounded-full" />{b}</li>)}
    </ul>
  </div>
);

export default SpotlightSections;
