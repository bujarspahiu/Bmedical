import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
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
  const type = params.get('type') || 'clinic';
  const defaults: Record<string, string> = {
    clinic: 'clinic@bmedical.com',
    hospital: 'hospital@bmedical.com',
    ordinance: 'ordinance@bmedical.com',
  };
  const defaultCredential = defaults[type] || defaults.clinic;
  const [email, setEmail] = useState(defaultCredential);
  const [password, setPassword] = useState(defaultCredential);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const next = defaults[type] || defaults.clinic;
    setEmail(next);
    setPassword(next);
  }, [type]);

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
    clinic: t.login.clinic,
    ordinance: t.login.ordinance,
    hospital: t.login.hospital,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#2C5F7C]">
            <ArrowLeft className="w-4 h-4" /> {t.login.back}
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="mb-6">
            <Brand compact showTagline={false} />
            <div className="text-xs text-slate-500 mt-2">{titles[type] || t.login.default}</div>
          </div>
          <h1 className="text-2xl font-bold text-[#1F2937] mb-6">{titles[type] || t.login.default}</h1>
          <form onSubmit={submit} className="space-y-4">
            <div><Label>{t.login.username}</Label><Input type="text" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-[#2C5F7C] hover:bg-[#234e66] text-white">
              {loading ? t.login.signingIn : t.login.signIn}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
