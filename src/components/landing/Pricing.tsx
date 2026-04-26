import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Minus, Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BillingCycle = 'monthly' | 'yearly';

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

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [users, setUsers] = useState(1);

  const currentUsers = Math.max(1, users);
  const updateUsers = (next: number) => setUsers(Math.max(1, next));

  const planTotals = useMemo(() => {
    return plans.map((plan) => {
      const extraUsers = Math.max(0, currentUsers - 1);
      const base = billingCycle === 'yearly' ? plan.yearly : plan.monthly;
      const extraPrice = billingCycle === 'yearly' ? plan.extraYearly : plan.extraMonthly;
      const extras = extraUsers * extraPrice;
      return {
        ...plan,
        extraUsers,
        total: base + extras,
        extraPrice,
      };
    });
  }, [billingCycle, currentUsers]);

  return (
    <section id="pricing" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-[#4A90A4]">Simple and transparent pricing</div>
          <h2 className="mb-4 text-3xl font-bold text-[#1F2937] md:text-4xl">Choose the billing cycle and user count before registration</h2>
          <p className="text-lg text-slate-600">
            Customers should see the real total before they create an account. Switch between monthly and yearly billing, then adjust the number of users live.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
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

            <div className="flex items-center gap-4 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
              <span className="text-sm font-medium text-slate-700">Users</span>
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateUsers(currentUsers - 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-[#2C5F7C] hover:text-[#2C5F7C]"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="min-w-10 text-center text-base font-semibold text-slate-900">{currentUsers}</div>
                <button
                  type="button"
                  onClick={() => updateUsers(currentUsers + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-[#2C5F7C] hover:text-[#2C5F7C]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
          {planTotals.map((plan) => (
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
                <div className="mt-4 grid gap-2 rounded-2xl border border-white/10 bg-black/5 p-4 text-sm">
                  <div className="flex items-center justify-between">
                    <span className={plan.highlighted ? 'text-white/80' : 'text-slate-600'}>Plan</span>
                    <span className={`font-semibold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>EUR {(billingCycle === 'yearly' ? plan.yearly : plan.monthly).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={plan.highlighted ? 'text-white/80' : 'text-slate-600'}>Included users</span>
                    <span className={`font-semibold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>1</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={plan.highlighted ? 'text-white/80' : 'text-slate-600'}>Extra users</span>
                    <span className={`font-semibold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>{plan.extraUsers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={plan.highlighted ? 'text-white/80' : 'text-slate-600'}>Extra user price</span>
                    <span className={`font-semibold ${plan.highlighted ? 'text-white' : 'text-slate-900'}`}>
                      EUR {plan.extraPrice.toFixed(2)} / {billingCycle === 'yearly' ? 'year' : 'month'}
                    </span>
                  </div>
                  <div className="border-t border-white/10 pt-3">
                    <div className="flex items-end justify-between">
                      <span className={plan.highlighted ? 'text-white/80' : 'text-slate-600'}>Total</span>
                      <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-[#1F2937]'}`}>
                        EUR {plan.total.toFixed(2)}
                      </span>
                    </div>
                    <div className={`mt-1 text-xs ${plan.highlighted ? 'text-white/75' : 'text-slate-500'}`}>
                      {billingCycle === 'yearly' ? 'per year' : 'per month'} for {currentUsers} user{currentUsers === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => navigate(`/register?plan=${plan.code}&billing=${billingCycle}&users=${currentUsers}`)}
                variant={plan.highlighted ? 'secondary' : 'outline'}
                className={`h-11 w-full ${plan.highlighted ? 'bg-white font-semibold text-[#2C5F7C] hover:bg-slate-100' : 'border-[#2C5F7C] text-[#2C5F7C] hover:bg-[#2C5F7C] hover:text-white'}`}
              >
                Continue with this setup
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
