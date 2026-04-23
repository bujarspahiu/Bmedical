import React from 'react';
import { Users, CalendarClock, ClipboardList, FileText, Receipt, BarChart3, Bell, Printer, Shield, Building2, Briefcase, Globe } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const icons = [Users, CalendarClock, ClipboardList, FileText, Receipt, BarChart3, Bell, Printer, Shield, Building2, Briefcase, Globe];

const Features: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-sm font-semibold text-[#4A90A4] tracking-wider uppercase mb-3">{t.features.eyebrow}</div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">{t.features.title}</h2>
          <p className="text-lg text-slate-600">{t.features.description}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {t.features.items.map(([title, desc], i) => {
            const Icon = icons[i];
            return (
              <div key={i} className="group bg-white border border-slate-200 rounded-xl p-6 hover:border-[#4A90A4] hover:shadow-lg hover:-translate-y-1 transition-all duration-200">
                <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-[#2C5F7C] to-[#4A90A4] flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-semibold text-[#1F2937] mb-1.5">{title}</div>
                <div className="text-sm text-slate-600 leading-relaxed">{desc}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
