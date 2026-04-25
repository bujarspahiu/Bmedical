import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section id="pricing" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#4A90A4]">{t.pricing.eyebrow}</div>
          <h2 className="mb-4 text-3xl font-bold text-[#1F2937] md:text-4xl">{t.pricing.title}</h2>
          <p className="text-lg text-slate-600">{t.pricing.description}</p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-8 transition hover:border-[#4A90A4]">
            <div className="mb-6">
              <div className="text-sm font-semibold uppercase tracking-wider text-slate-500">Professional</div>
              <div className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                Clinic / Ordinance
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-bold text-[#1F2937]">EUR 50</span>
                <span className="text-slate-500">{t.pricing.perMonth}</span>
              </div>
              <div className="mt-2 text-sm text-slate-500">{t.pricing.professionalDesc}</div>
            </div>

            <Button
              onClick={() => navigate('/register?plan=professional')}
              variant="outline"
              className="h-11 w-full border-[#2C5F7C] text-[#2C5F7C] hover:bg-[#2C5F7C] hover:text-white"
            >
              {t.pricing.startTrial}
            </Button>

            <div className="mt-6 space-y-3">
              {t.pricing.professional.map((feature, i) => {
                const included = i < 10;
                return (
                  <div key={i} className="flex items-start gap-2.5 text-sm">
                    {included ? (
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <X className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
                    )}
                    <span className={included ? 'text-slate-700' : 'text-slate-400 line-through'}>{feature}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative rounded-2xl bg-gradient-to-br from-[#2C5F7C] to-[#4A90A4] p-8 text-white shadow-2xl">
            <div className="absolute -top-3 right-6 flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">
              <Sparkles className="h-3 w-3" /> {t.pricing.mostPopular}
            </div>
            <div className="mb-6">
              <div className="text-sm font-semibold uppercase tracking-wider text-white/80">Enterprise</div>
              <div className="mt-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/90">
                Hospital / Multi-location
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-5xl font-bold">{t.pricing.custom}</span>
                <span className="text-white/70">{t.pricing.yearly}</span>
              </div>
              <div className="mt-2 text-sm text-white/70">{t.pricing.enterpriseDesc}</div>
            </div>

            <Button
              onClick={() => navigate('/register?plan=enterprise')}
              className="h-11 w-full bg-white font-semibold text-[#2C5F7C] hover:bg-slate-100"
            >
              {t.pricing.contactSales}
            </Button>

            <div className="mt-6 space-y-3">
              {t.pricing.enterprise.map((feature, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
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
