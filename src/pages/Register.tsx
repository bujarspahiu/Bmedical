import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, MailCheck, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PlanType, useAuth, RegisterData } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Brand from '@/components/Brand';

const Register: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [form, setForm] = useState<RegisterData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    password: '',
    plan: (params.get('plan') === 'enterprise' ? 'enterprise' : 'professional') as PlanType,
    agreedTerms: false,
  });

  const planCards = useMemo(
    () => [
      {
        code: 'professional' as const,
        name: 'Professional',
        subtitle: 'Clinic / Ordinance',
        monthly: 'EUR 20 / month',
        yearly: 'EUR 200 / year',
        extra: '+ EUR 20 per extra user / month',
      },
      {
        code: 'enterprise' as const,
        name: 'Enterprise',
        subtitle: 'Hospital / Multi-location',
        monthly: 'EUR 50 / month',
        yearly: 'EUR 500 / year',
        extra: '+ EUR 50 per extra user / month',
      },
    ],
    [],
  );

  const update = <K extends keyof RegisterData>(key: K, value: RegisterData[K]) => setForm((current) => ({ ...current, [key]: value }));

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
                {' '}Once the email is verified, the client goes straight to the payment page and stays in the same calm checkout flow.
              </p>

              {canUseLocalShortcut ? (
                <div className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-6 text-left">
                  <div className="text-sm font-semibold text-slate-900">Local testing shortcut</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Development mode can still open the verification link directly when you are testing locally.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button className="rounded-xl bg-[#2C5F7C] hover:bg-[#234e66]" onClick={() => navigate(`/verify-email?token=${encodeURIComponent(new URL(verificationUrl).searchParams.get('token') || '')}`)}>
                      Open verification
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => window.open(verificationUrl, '_blank', 'noopener,noreferrer')}>
                      Open raw link
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

              <div className="mt-8 text-sm text-slate-500">
                Need to start over?{' '}
                <Link to="/register" className="font-medium text-[#2C5F7C]">
                  Create a different workspace
                </Link>
              </div>
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
                  Ask only for the essentials now. Email verification comes next, then the customer stays inside one checkout page with simple payment choices.
                </p>
              </div>

              <div className="mt-8 space-y-3">
                {[
                  'Only the key details needed to create the workspace',
                  'Verify email first, then continue to payment',
                  'Checkout stays inside BMedical without confusing redirects',
                  'Professional and Enterprise plans include 1 user by default',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span className="text-sm text-white/92">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-2">
                {planCards.map((plan) => (
                  <div key={plan.code} className={`rounded-2xl border p-4 ${form.plan === plan.code ? 'border-white/30 bg-white/16' : 'border-white/12 bg-white/8'}`}>
                    <div className="text-xs uppercase tracking-wider text-white/70">{plan.name}</div>
                    <div className="mt-2 text-lg font-semibold">{plan.subtitle}</div>
                    <div className="mt-2 text-sm text-white/78">{plan.monthly}</div>
                    <div className="mt-1 text-sm text-white/78">{plan.yearly}</div>
                    <div className="mt-1 text-xs text-white/65">Includes 1 user</div>
                  </div>
                ))}
              </div>

              <div className="mt-auto pt-8 text-sm text-white/78">
                Doctors should feel invited by the product, not slowed down by it.
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
                  First create the workspace. After email verification, the customer goes directly to checkout and chooses a payment method inside the same page.
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
                              <div className="mt-3 text-sm text-slate-700">{plan.monthly}</div>
                              <div className="mt-1 text-sm text-slate-500">{plan.yearly}</div>
                              <div className="mt-2 text-xs text-slate-500">{plan.extra}</div>
                            </div>
                            {selected ? <Check className="h-5 w-5 text-[#2C5F7C]" /> : null}
                          </div>
                        </button>
                      );
                    })}
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

                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-600">
                  Already have an account?{' '}
                  <Link to="/login" className="font-medium text-[#2C5F7C]">
                    Sign in
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
