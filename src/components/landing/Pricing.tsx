import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="text-sm font-semibold text-[#4A90A4] tracking-wider uppercase mb-3">{t.pricing.eyebrow}</div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">{t.pricing.title}</h2>
          <p className="text-lg text-slate-600">{t.pricing.description}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-8 hover:border-[#4A90A4] transition">
            <div className="mb-6">
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Professional</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-[#1F2937]">€50</span>
                <span className="text-slate-500">{t.pricing.perMonth}</span>
              </div>
              <div className="text-sm text-slate-500 mt-2">{t.pricing.professionalDesc}</div>
            </div>
            <Button onClick={() => navigate('/register?plan=professional')} variant="outline" className="w-full h-11 border-[#2C5F7C] text-[#2C5F7C] hover:bg-[#2C5F7C] hover:text-white">
              {t.pricing.startTrial}
            </Button>
            <div className="mt-6 space-y-3">
              {t.pricing.professional.map((feature, i) => {
                const included = i < 10;
                return (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    {included ? <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <X className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />}
                    <span className={included ? 'text-slate-700' : 'text-slate-400 line-through'}>{feature}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-[#2C5F7C] to-[#4A90A4] rounded-2xl p-8 text-white shadow-2xl">
            <div className="absolute -top-3 right-6 bg-amber-400 text-amber-950 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {t.pricing.mostPopular}
            </div>
            <div className="mb-6">
              <div className="text-sm font-semibold text-white/80 uppercase tracking-wider">Enterprise</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-bold">{t.pricing.custom}</span>
                <span className="text-white/70">{t.pricing.yearly}</span>
              </div>
              <div className="text-sm text-white/70 mt-2">{t.pricing.enterpriseDesc}</div>
            </div>
            <Button onClick={() => navigate('/register?plan=enterprise')} className="w-full h-11 bg-white text-[#2C5F7C] hover:bg-slate-100 font-semibold">
              {t.pricing.contactSales}
            </Button>
            <div className="mt-6 space-y-3">
              {t.pricing.enterprise.map((feature, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <Check className="w-5 h-5 text-emerald-300 shrink-0 mt-0.5" />
                  <span className="text-white/95">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
