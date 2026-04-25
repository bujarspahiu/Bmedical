import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const plans = [
    {
      code: 'professional',
      name: 'Professional',
      subtitle: 'Clinic / Ordinance',
      monthly: 20,
      yearly: 200,
      extraMonthly: 20,
      extraYearly: 200,
      features: [
        'Includes 1 user',
        'Patients, appointments and waiting room',
        'Anamnesis, diagnoses and treatment plans',
        'Invoices, reports and email reminders',
        'Beautiful daily workflow for smaller teams',
      ],
      highlighted: false,
    },
    {
      code: 'enterprise',
      name: 'Enterprise',
      subtitle: 'Hospital / Multi-location',
      monthly: 50,
      yearly: 500,
      extraMonthly: 50,
      extraYearly: 500,
      features: [
        'Includes 1 user',
        'Multi-location friendly workflow',
        'Admin-level oversight and stronger reporting',
        'Better fit for larger teams and operational complexity',
        'Priority setup for more demanding institutions',
      ],
      highlighted: true,
    },
  ] as const;

  return (
    <section id="pricing" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#4A90A4]">Simple and transparent pricing</div>
          <h2 className="mb-4 text-3xl font-bold text-[#1F2937] md:text-4xl">Two plans, clear costs, no confusing packaging</h2>
          <p className="text-lg text-slate-600">
            Keep pricing easy for clinics to understand: one included user, clear monthly or yearly billing, and predictable extra user pricing.
          </p>

          <div className="mt-8 inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${billingCycle === 'monthly' ? 'bg-[#2C5F7C] text-white shadow-sm' : 'text-slate-600'}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`rounded-full px-5 py-2 text-sm font-medium transition ${billingCycle === 'yearly' ? 'bg-[#2C5F7C] text-white shadow-sm' : 'text-slate-600'}`}
            >
              Yearly
            </button>
          </div>
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.code}
              className={`relative rounded-2xl border-2 p-8 transition ${
                plan.highlighted
                  ? 'border-transparent bg-gradient-to-br from-[#2C5F7C] to-[#4A90A4] text-white shadow-2xl'
                  : 'border-slate-200 bg-white hover:border-[#4A90A4]'
              }`}
            >
              {plan.highlighted ? (
                <div className="absolute -top-3 right-6 flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-bold text-amber-950">
                  <Sparkles className="h-3 w-3" /> Most flexible
                </div>
              ) : null}

              <div className="mb-6">
                <div className={`text-sm font-semibold uppercase tracking-wider ${plan.highlighted ? 'text-white/80' : 'text-slate-500'}`}>{plan.name}</div>
                <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${plan.highlighted ? 'bg-white/15 text-white/90' : 'bg-slate-100 text-slate-600'}`}>
                  {plan.subtitle}
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-5xl font-bold ${plan.highlighted ? 'text-white' : 'text-[#1F2937]'}`}>
                    EUR {billingCycle === 'yearly' ? plan.yearly : plan.monthly}
                  </span>
                  <span className={plan.highlighted ? 'text-white/70' : 'text-slate-500'}>
                    / {billingCycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>
                <div className={`mt-3 text-sm ${plan.highlighted ? 'text-white/78' : 'text-slate-600'}`}>
                  Includes 1 user. Each extra user costs EUR {billingCycle === 'yearly' ? plan.extraYearly : plan.extraMonthly} / {billingCycle === 'yearly' ? 'year' : 'month'}.
                </div>
              </div>

              <Button
                onClick={() => navigate(`/register?plan=${plan.code}`)}
                variant={plan.highlighted ? 'secondary' : 'outline'}
                className={`h-11 w-full ${plan.highlighted ? 'bg-white font-semibold text-[#2C5F7C] hover:bg-slate-100' : 'border-[#2C5F7C] text-[#2C5F7C] hover:bg-[#2C5F7C] hover:text-white'}`}
              >
                Start setup
              </Button>

              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className={`mt-0.5 h-5 w-5 shrink-0 ${plan.highlighted ? 'text-emerald-300' : 'text-emerald-500'}`} />
                    <span className={plan.highlighted ? 'text-white/95' : 'text-slate-700'}>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
