import React from 'react';
import { Users2, CalendarDays, Activity, Receipt, Bell, BarChart2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const icons = [Users2, CalendarDays, Activity, Receipt, Bell, BarChart2];

const Modules: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <div className="text-sm font-semibold text-[#4A90A4] tracking-wider uppercase mb-3">{t.modules.eyebrow}</div>
            <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-5">{t.modules.title}</h2>
            <p className="text-lg text-slate-600 mb-8">{t.modules.description}</p>
            <div className="space-y-4">
              {t.modules.reasons.map(([title, desc], i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#2C5F7C] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</div>
                  <div>
                    <div className="font-semibold text-[#1F2937]">{title}</div>
                    <div className="text-sm text-slate-600">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative">
            <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&q=80" alt="Physiotherapy session" className="rounded-2xl shadow-xl w-full h-[520px] object-cover" />
          </div>
        </div>
      </div>

      <div id="modules" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="text-sm font-semibold text-[#4A90A4] tracking-wider uppercase mb-3">{t.modules.coreEyebrow}</div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">{t.modules.coreTitle}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.modules.cards.map(([title, desc], i) => {
            const Icon = icons[i];
            return (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition">
                <div className="w-12 h-12 rounded-lg bg-[#4A90A4]/10 text-[#2C5F7C] flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6" />
                </div>
                <div className="font-semibold text-lg text-[#1F2937] mb-2">{title}</div>
                <div className="text-sm text-slate-600 leading-relaxed">{desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Modules;
