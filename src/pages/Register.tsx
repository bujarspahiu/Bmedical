import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, MailCheck, Minus, Plus, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Brand from '@/components/Brand';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { PlanType, RegisterData, useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const planCards = [
  {
    code: 'professional' as const,
    name: 'Professional',
    subtitle: 'Clinic / Ordinance',
    monthlyLabel: 'EUR 20 / month',
    yearlyLabel: 'EUR 200 / year',
    monthlyValue: 20,
    yearlyValue: 200,
    extraMonthlyValue: 20,
    extraYearlyValue: 200,
  },
  {
    code: 'enterprise' as const,
    name: 'Enterprise',
    subtitle: 'Hospital / Multi-location',
    monthlyLabel: 'EUR 50 / month',
    yearlyLabel: 'EUR 500 / year',
    monthlyValue: 50,
    yearlyValue: 500,
    extraMonthlyValue: 50,
    extraYearlyValue: 500,
  },
];

const Register: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');

  const initialBilling = params.get('billing') === 'yearly' ? 'yearly' : 'monthly';
  const initialSeats = Math.max(1, Number(params.get('users') || 1) || 1);
  const initialPlan = (params.get('plan') === 'enterprise' ? 'enterprise' : 'professional') as PlanType;

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(initialBilling);
  const [seatCount, setSeatCount] = useState(initialSeats);
  const [form, setForm] = useState<RegisterData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    password: '',
    plan: initialPlan,
    billingCycle: initialBilling,
    seatCount: initialSeats,
    agreedTerms: false,
  });

  const activePlan = useMemo(
    () => planCards.find((plan) => plan.code === form.plan) ?? planCards[0],
    [form.plan],
  );
  const pricingSummary = useMemo(() => {
    const base = billingCycle === 'yearly' ? activePlan.yearlyValue : activePlan.monthlyValue;
    const extraUsers = Math.max(0, seatCount - 1);
    const extraUnit = billingCycle === 'yearly' ? activePlan.extraYearlyValue : activePlan.extraMonthlyValue;
    return {
      base,
      extraUsers,
      extraUnit,
      total: base + extraUsers * extraUnit,
    };
  }, [activePlan, billingCycle, seatCount]);

  const update = <K extends keyof RegisterData>(key: K, value: RegisterData[K]) => setForm((current) => ({ ...current, [key]: value }));
  const updateSeatCount = (next: number) => {
    const normalized = Math.max(1, next);
    setSeatCount(normalized);
    update('seatCount', normalized);
  };
  const updateBillingCycle = (next: 'monthly' | 'yearly') => {
    setBillingCycle(next);
    update('billingCycle', next);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await register(form);
    setLoading(false);
    if (!result.success) {
      return toast({ title: 'Registration failed', description: result.message });
    }

    setRegistrationSubmitted(true);
    setVerificationUrl(result.verificationUrl || '');
    setRegisteredEmail(result.email || form.email);
    toast({
      title: 'Almost there',
      description: 'Your workspace was prepared. Verify the email to continue to checkout.',
    });
  };

  const canUseLocalShortcut = import.meta.env.DEV && Boolean(verificationUrl);

  if (registrationSubmitted) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(74,144,164,0.16),_transparent_34%),linear-gradient(180deg,#f8fbfd_0%,#ffffff_46%,#f4f8fb_100%)] px-4 py-10">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_100px_-40px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
            <div className="flex items-center justify-between">
              <Brand />
              <LanguageSwitcher />
            </div>
          </div>

          <div className="p-8 sm:p-10">
            <div className="mx-auto max-w-xl text-center">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <MailCheck className="h-8 w-8" />
              </div>
              <h1 className="text-3xl font-bold text-slate-900">Verify your email to continue</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                We prepared your workspace for <span className="font-medium text-slate-900">{registeredEmail}</span>.
                {' '}After verification, the customer goes directly to the payment page.
              </p>

              <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left">
                <div className="text-sm font-semibold text-slate-900">Selected setup</div>
                <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="flex justify-between gap-6"><span>Plan</span><span className="font-medium text-slate-900">{activePlan.name}</span></div>
                  <div className="flex justify-between gap-6"><span>Billing</span><span className="font-medium text-slate-900">{billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</span></div>
                  <div className="flex justify-between gap-6"><span>Users</span><span className="font-medium text-slate-900">{seatCount}</span></div>
                  <div className="flex justify-between gap-6"><span>Total</span><span className="font-semibold text-slate-900">EUR {pricingSummary.total.toFixed(2)}</span></div>
                </div>
              </div>

              {canUseLocalShortcut ? (
                <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left">
                  <div className="text-sm font-semibold text-slate-900">Local testing shortcut</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Development mode can still open the verification link directly while you test locally.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button className="rounded-xl bg-[#2C5F7C] hover:bg-[#234e66]" onClick={() => navigate(`/verify-email?token=${encodeURIComponent(new URL(verificationUrl).searchParams.get('token') || '')}`)}>
                      Open verification
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left">
                  <div className="text-sm font-semibold text-slate-900">Check your inbox</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    A verification email has been sent to this address. Open that link to continue safely to checkout.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(74,144,164,0.14),_transparent_34%),linear-gradient(180deg,#f8fbfd_0%,#ffffff_48%,#f4f8fb_100%)] px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#2C5F7C]">
            <ArrowLeft className="h-4 w-4" /> Back to website
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="grid overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_30px_100px_-40px_rgba(15,23,42,0.45)] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden bg-gradient-to-br from-[#1E4057] via-[#2C5F7C] to-[#6AA6B9] p-8 text-white lg:p-12">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_28%)]" />
            <div className="relative z-10 flex h-full flex-col">
              <Brand theme="dark" compact showTagline className="mb-8" />
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Calm onboarding for non-technical teams
              </div>
              <div className="max-w-md">
                <h1 className="text-3xl font-bold leading-tight lg:text-5xl">Create your workspace without friction</h1>
                <p className="mt-4 text-base leading-7 text-white/82 lg:text-lg">
                  The customer already knows the plan, billing cycle and user count before registering. This step only captures the essentials.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                {[
                  'Only the key details needed to create the workspace',
                  'Verify email first, then continue to payment',
                  'Checkout stays inside BMedical without confusing redirects',
                  'Billing and user totals are already clear before checkout',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span className="text-sm text-white/92">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="text-sm font-semibold text-white">Selected setup</div>
                <div className="mt-4 grid gap-2 text-sm text-white/82">
                  <div className="flex justify-between"><span>Plan</span><span>{activePlan.name}</span></div>
                  <div className="flex justify-between"><span>Billing</span><span>{billingCycle === 'yearly' ? 'Yearly' : 'Monthly'}</span></div>
                  <div className="flex justify-between"><span>Users</span><span>{seatCount}</span></div>
                  <div className="flex justify-between"><span>Total</span><span className="font-semibold text-white">EUR {pricingSummary.total.toFixed(2)}</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-12">
            <div className="mx-auto max-w-2xl">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#2C5F7C]/8 px-3 py-1 text-sm font-medium text-[#2C5F7C]">
                  <ShieldCheck className="h-4 w-4" />
                  Minimal registration
                </div>
                <h2 className="mt-4 text-3xl font-bold text-[#1F2937]">Start with the essentials</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Confirm the setup, add the owner details, then continue to verification and payment.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-8">
                <section className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => update('phone', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business name (optional)</Label>
                    <Input id="businessName" value={form.businessName || ''} onChange={(e) => update('businessName', e.target.value)} className="h-12 rounded-xl border-slate-200 bg-slate-50/60" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} className="h-12 rounded-xl border-slate-200 bg-slate-50/60" />
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="text-sm font-semibold text-slate-800">Choose your plan</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {planCards.map((plan) => {
                      const selected = form.plan === plan.code;
                      return (
                        <button
                          key={plan.code}
                          type="button"
                          onClick={() => update('plan', plan.code)}
                          className={`rounded-2xl border-2 p-5 text-left transition ${
                            selected ? 'border-[#2C5F7C] bg-[#2C5F7C]/5 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-semibold text-[#1F2937]">{plan.name}</div>
                              <div className="mt-1 text-sm text-slate-500">{plan.subtitle}</div>
                              <div className="mt-3 text-sm text-slate-700">{plan.monthlyLabel}</div>
                              <div className="mt-1 text-sm text-slate-500">{plan.yearlyLabel}</div>
                            </div>
                            {selected ? <Check className="h-5 w-5 text-[#2C5F7C]" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5 md:grid-cols-[1fr_auto_auto] md:items-end">
                  <div>
                    <div className="text-sm font-semibold text-slate-800">Billing cycle</div>
                    <div className="mt-3 inline-flex rounded-full border border-slate-200 bg-white p-1">
                      <button type="button" onClick={() => updateBillingCycle('monthly')} className={`rounded-full px-4 py-2 text-sm font-medium ${billingCycle === 'monthly' ? 'bg-[#2C5F7C] text-white' : 'text-slate-600'}`}>Monthly</button>
                      <button type="button" onClick={() => updateBillingCycle('yearly')} className={`rounded-full px-4 py-2 text-sm font-medium ${billingCycle === 'yearly' ? 'bg-[#2C5F7C] text-white' : 'text-slate-600'}`}>Yearly</button>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-800">Users</div>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
                      <button type="button" onClick={() => updateSeatCount(seatCount - 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700">
                        <Minus className="h-4 w-4" />
                      </button>
                      <div className="min-w-10 text-center text-base font-semibold text-slate-900">{seatCount}</div>
                      <button type="button" onClick={() => updateSeatCount(seatCount + 1)} className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white px-4 py-4 text-sm text-slate-600">
                    <div className="flex justify-between gap-6"><span>Included users</span><span className="font-medium text-slate-900">1</span></div>
                    <div className="mt-2 flex justify-between gap-6"><span>Extra users</span><span className="font-medium text-slate-900">{pricingSummary.extraUsers}</span></div>
                    <div className="mt-2 flex justify-between gap-6 border-t border-slate-100 pt-2"><span>Total</span><span className="font-semibold text-slate-900">EUR {pricingSummary.total.toFixed(2)}</span></div>
                  </div>
                </section>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox id="agreedTerms" checked={form.agreedTerms} onCheckedChange={(checked) => update('agreedTerms', !!checked)} />
                    <label htmlFor="agreedTerms" className="text-sm leading-relaxed text-slate-600">
                      I agree to the{' '}
                      <Link to="/legal/terms" className="font-medium text-[#2C5F7C] underline">
                        Terms & Conditions
                      </Link>
                      . I understand that a live demo is available before purchase and that subscriptions are generally non-refundable after activation, except where applicable law requires otherwise.
                    </label>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#2C5F7C] text-white hover:bg-[#234e66]">
                  {loading ? 'Preparing workspace...' : 'Create workspace'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
