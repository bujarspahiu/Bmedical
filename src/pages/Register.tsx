import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { PlanType, useAuth, RegisterData } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Brand from '@/components/Brand';

const Register: React.FC = () => {
  const [params] = useSearchParams();
  const { register } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<RegisterData>({
    businessName: '',
    ownerName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    city: '',
    country: 'Kosovo',
    taxNumber: '',
    plan: (params.get('plan') === 'enterprise' ? 'enterprise' : 'professional') as PlanType,
    agreed: false,
  });

  const update = <K extends keyof RegisterData>(key: K, value: RegisterData[K]) => setForm({ ...form, [key]: value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = await register(form);
    setLoading(false);
    if (!r.success) return toast({ title: t.register.errorTitle, description: r.message });
    toast({ title: t.register.successTitle, description: t.register.successBody });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(74,144,164,0.14),_transparent_34%),linear-gradient(180deg,#f8fbfd_0%,#ffffff_48%,#f4f8fb_100%)] px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#2C5F7C]">
            <ArrowLeft className="h-4 w-4" /> {t.register.back}
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
                14-day guided setup
              </div>

              <div className="max-w-md">
                <h1 className="text-3xl font-bold leading-tight lg:text-5xl">{t.register.title}</h1>
                <p className="mt-4 text-base leading-7 text-white/82 lg:text-lg">{t.register.description}</p>
              </div>

              <div className="mt-8 space-y-3">
                {t.register.bullets.map((x, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <span className="text-sm text-white/92">{x}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-2">
                <div className={`rounded-2xl border p-4 ${form.plan === 'professional' ? 'border-white/30 bg-white/16' : 'border-white/12 bg-white/8'}`}>
                  <div className="text-xs uppercase tracking-wider text-white/70">Professional</div>
                  <div className="mt-2 text-lg font-semibold">Clinic / Ordinance</div>
                  <div className="mt-2 text-sm text-white/78">{t.register.professionalMeta}</div>
                </div>
                <div className={`rounded-2xl border p-4 ${form.plan === 'enterprise' ? 'border-white/30 bg-white/16' : 'border-white/12 bg-white/8'}`}>
                  <div className="text-xs uppercase tracking-wider text-white/70">Enterprise</div>
                  <div className="mt-2 text-lg font-semibold">Hospital / Multi-location</div>
                  <div className="mt-2 text-sm text-white/78">{t.register.enterpriseMeta}</div>
                </div>
              </div>

              <div className="mt-auto pt-8 text-sm text-white/78">
                Setup is intentionally simple so staff can start using the platform quickly, without training-heavy onboarding.
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-12">
            <div className="mx-auto max-w-2xl">
              <div className="mb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#2C5F7C]/8 px-3 py-1 text-sm font-medium text-[#2C5F7C]">
                  <ShieldCheck className="h-4 w-4" />
                  Secure workspace creation
                </div>
                <h2 className="mt-4 text-3xl font-bold text-[#1F2937]">Create your workspace</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Fill in the essentials once. After that, the platform is ready for patients, appointments and daily clinical work.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-8">
                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ChevronRight className="h-4 w-4 text-[#2C5F7C]" />
                    Workspace details
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>{t.register.business}</Label>
                      <Input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-[#2C5F7C]" />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.register.owner}</Label>
                      <Input value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-[#2C5F7C]" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t.register.email}</Label>
                        <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-[#2C5F7C]" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.register.phone}</Label>
                        <Input value={form.phone} onChange={(e) => update('phone', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-[#2C5F7C]" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.register.password}</Label>
                      <Input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} className="h-12 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-[#2C5F7C]" />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ChevronRight className="h-4 w-4 text-[#2C5F7C]" />
                    Billing and address
                  </div>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label>{t.register.address}</Label>
                      <Input value={form.address} onChange={(e) => update('address', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-[#2C5F7C]" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-2">
                        <Label>{t.register.city}</Label>
                        <Input value={form.city} onChange={(e) => update('city', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-[#2C5F7C]" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.register.country}</Label>
                        <Input value={form.country} onChange={(e) => update('country', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-[#2C5F7C]" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t.register.tax}</Label>
                        <Input value={form.taxNumber} onChange={(e) => update('taxNumber', e.target.value)} required className="h-12 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-[#2C5F7C]" />
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <ChevronRight className="h-4 w-4 text-[#2C5F7C]" />
                    {t.register.plan}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(['professional', 'enterprise'] as const).map((p) => {
                      const selected = form.plan === p;
                      const title = p === 'professional' ? 'Professional' : 'Enterprise';
                      const subtitle = p === 'professional' ? 'Clinic / Ordinance' : 'Hospital / Multi-location';
                      const meta = p === 'professional' ? t.register.professionalMeta : t.register.enterpriseMeta;

                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => update('plan', p)}
                          className={`rounded-2xl border-2 p-5 text-left transition ${
                            selected ? 'border-[#2C5F7C] bg-[#2C5F7C]/5 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-[#1F2937]">{title}</div>
                              <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
                            </div>
                            {selected && <Check className="h-5 w-5 text-[#2C5F7C]" />}
                          </div>
                          <div className="mt-3 text-xs text-slate-500">{meta}</div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox id="a" checked={form.agreed} onCheckedChange={(c) => update('agreed', !!c)} />
                    <label htmlFor="a" className="text-sm leading-relaxed text-slate-600">
                      {t.register.agreeStart}
                      <Link to="/legal/terms" className="text-[#2C5F7C] underline">
                        {t.register.terms}
                      </Link>{' '}
                      /{' '}
                      <Link to="/legal/privacy" className="text-[#2C5F7C] underline">
                        {t.register.privacy}
                      </Link>
                      .
                    </label>
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#2C5F7C] text-white hover:bg-[#234e66]">
                  {loading ? t.register.creating : t.register.create}
                </Button>

                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-600">
                  {t.register.haveAccount}{' '}
                  <Link to="/login" className="font-medium text-[#2C5F7C]">
                    {t.register.signIn}
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
