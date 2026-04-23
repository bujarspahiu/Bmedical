import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth, RegisterData } from '@/contexts/AuthContext';
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
    businessName: '', ownerName: '', email: '', phone: '', password: '',
    address: '', city: '', country: 'Kosovo', taxNumber: '',
    plan: (params.get('plan') as any) || 'professional', agreed: false,
  });

  const update = (k: keyof RegisterData, v: any) => setForm({ ...form, [k]: v });

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#2C5F7C]">
            <ArrowLeft className="w-4 h-4" /> {t.register.back}
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Brand compact showTagline={false} />
            <div>
              <h1 className="text-3xl font-bold text-[#1F2937] mb-3">{t.register.title}</h1>
              <p className="text-slate-600">{t.register.description}</p>
            </div>
            <div className="space-y-3 pt-4">
              {t.register.bullets.map((x, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-slate-700"><Check className="w-4 h-4 text-emerald-500" />{x}</div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <form onSubmit={submit} className="space-y-4">
              <div><Label>{t.register.business}</Label><Input value={form.businessName} onChange={(e) => update('businessName', e.target.value)} required /></div>
              <div><Label>{t.register.owner}</Label><Input value={form.ownerName} onChange={(e) => update('ownerName', e.target.value)} required /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>{t.register.email}</Label><Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required /></div>
                <div><Label>{t.register.phone}</Label><Input value={form.phone} onChange={(e) => update('phone', e.target.value)} required /></div>
              </div>
              <div><Label>{t.register.password}</Label><Input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} /></div>
              <div><Label>{t.register.address}</Label><Input value={form.address} onChange={(e) => update('address', e.target.value)} required /></div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div><Label>{t.register.city}</Label><Input value={form.city} onChange={(e) => update('city', e.target.value)} required /></div>
                <div><Label>{t.register.country}</Label><Input value={form.country} onChange={(e) => update('country', e.target.value)} required /></div>
                <div><Label>{t.register.tax}</Label><Input value={form.taxNumber} onChange={(e) => update('taxNumber', e.target.value)} required /></div>
              </div>
              <div>
                <Label className="mb-2 block">{t.register.plan}</Label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {(['professional', 'enterprise'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => update('plan', p)}
                      className={`p-4 text-left rounded-lg border-2 transition ${form.plan === p ? 'border-[#2C5F7C] bg-[#2C5F7C]/5' : 'border-slate-200'}`}
                    >
                      <div className="font-semibold capitalize text-[#1F2937]">{p}</div>
                      <div className="text-xs text-slate-500 mt-1">{p === 'professional' ? t.register.professionalMeta : t.register.enterpriseMeta}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-2 pt-2">
                <Checkbox id="a" checked={form.agreed} onCheckedChange={(c) => update('agreed', !!c)} />
                <label htmlFor="a" className="text-sm text-slate-600 leading-relaxed">
                  {t.register.agreeStart}<Link to="/legal/terms" className="text-[#2C5F7C] underline">{t.register.terms}</Link> / <Link to="/legal/privacy" className="text-[#2C5F7C] underline">{t.register.privacy}</Link>.
                </label>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 bg-[#2C5F7C] hover:bg-[#234e66] text-white">
                {loading ? t.register.creating : t.register.create}
              </Button>
              <div className="text-center text-sm text-slate-600">
                {t.register.haveAccount} <Link to="/login" className="text-[#2C5F7C] font-medium">{t.register.signIn}</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
