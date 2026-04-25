import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Building2, Hospital, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Brand from '@/components/Brand';

const Login: React.FC = () => {
  const [params] = useSearchParams();
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const requestedType = params.get('type') || 'clinic';
  const type = requestedType === 'ordinance' ? 'clinic' : requestedType;
  const defaults = useMemo<Record<string, string>>(
    () => ({
      clinic: 'clinic@bmedical.com',
      hospital: 'hospital@bmedical.com',
    }),
    [],
  );
  const defaultCredential = defaults[type] || defaults.clinic;
  const [email, setEmail] = useState(defaultCredential);
  const [password, setPassword] = useState(defaultCredential);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const next = defaults[type] || defaults.clinic;
    setEmail(next);
    setPassword(next);
  }, [defaults, type]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (!r.success) return toast({ title: t.login.errorTitle, description: r.message });
    toast({ title: t.login.successTitle, description: t.login.successBody });
    navigate('/dashboard');
  };

  const titles: Record<string, string> = {
    clinic: t.login.ordinance,
    hospital: t.login.hospital,
  };

  const accent = type === 'hospital' ? 'from-[#1F4E79] via-[#2C5F7C] to-[#4A90A4]' : 'from-[#21455f] via-[#2C5F7C] to-[#7CB7C9]';
  const WorkspaceIcon = type === 'hospital' ? Hospital : Building2;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(74,144,164,0.16),_transparent_34%),linear-gradient(180deg,#f8fbfd_0%,#ffffff_46%,#f4f8fb_100%)] px-4 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#2C5F7C]">
            <ArrowLeft className="h-4 w-4" /> {t.login.back}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="grid overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_30px_100px_-40px_rgba(15,23,42,0.45)] lg:grid-cols-[1.05fr_0.95fr]">
          <div className={`relative overflow-hidden bg-gradient-to-br ${accent} p-8 text-white lg:p-12`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_28%)]" />
            <div className="relative z-10 flex h-full flex-col">
              <Brand theme="dark" compact showTagline className="mb-8" />

              <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur">
                <WorkspaceIcon className="h-3.5 w-3.5" />
                {titles[type] || t.login.default}
              </div>

              <div className="max-w-md">
                <h1 className="text-3xl font-bold leading-tight lg:text-5xl">{t.login.welcome}</h1>
                <p className="mt-4 text-base leading-7 text-white/82 lg:text-lg">{t.login.description}</p>
              </div>

              <div className="mt-8 grid gap-3 text-sm text-white/90">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <ShieldCheck className="h-4 w-4" />
                    Secure workspace access
                  </div>
                  <div className="text-white/78">Patients, appointments and clinical records stay in one calm, protected flow.</div>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <div className="mb-1 flex items-center gap-2 font-semibold">
                    <Sparkles className="h-4 w-4" />
                    Faster daily routine
                  </div>
                  <div className="text-white/78">Designed to get doctors into the workday quickly, without noisy dashboards or confusing steps.</div>
                </div>
              </div>

              <div className="mt-auto pt-8 text-sm text-white/78">
                Demo access is pre-filled on local testing so you can enter the workspace immediately.
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 lg:p-12">
            <div className="mx-auto max-w-md">
              <div className="mb-8">
                <div className="text-sm font-medium text-[#2C5F7C]">{titles[type] || t.login.default}</div>
                <h2 className="mt-2 text-3xl font-bold text-[#1F2937]">{t.login.signIn}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use your workspace email and password to continue to the dashboard.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-5">
                <div className="space-y-2">
                  <Label>{t.login.username}</Label>
                  <Input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-[#2C5F7C]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/60 focus-visible:ring-[#2C5F7C]"
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                  <div className="font-medium text-slate-800">Quick local testing</div>
                  <div className="mt-1">For local demo mode, the pre-filled email and password are the same.</div>
                </div>

                <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#2C5F7C] text-white hover:bg-[#234e66]">
                  {loading ? t.login.signingIn : t.login.signIn}
                </Button>
              </form>

              <div className="mt-8 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
                Need a new workspace?{' '}
                <Link to="/register" className="font-medium text-[#2C5F7C]">
                  {t.nav.signUp}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
