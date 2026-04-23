import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const AdminLogin: React.FC = () => {
  const { adminLogin } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const r = await adminLogin(email, password);
    setLoading(false);
    if (!r.success) return toast({ title: t.admin.errorTitle, description: r.message });
    toast({ title: t.admin.successTitle, description: t.admin.successBody });
    navigate('/admin');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(44,95,124,0.3),transparent_50%),radial-gradient(circle_at_80%_70%,rgba(74,144,164,0.2),transparent_50%)]" />
      <div className="w-full max-w-md relative">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> {t.admin.back}
          </Link>
          <LanguageSwitcher light />
        </div>
        <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="font-bold text-lg">{t.admin.title}</div>
              <div className="text-xs text-slate-400">{t.admin.badge}</div>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-6">{t.admin.area}</h1>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-slate-300">{t.admin.username}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="bg-slate-900 border-slate-700 text-white" />
            </div>
            <div>
              <Label className="text-slate-300">{t.admin.password}</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="bg-slate-900 border-slate-700 text-white" />
            </div>
            <Button type="submit" disabled={loading} className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold">
              {loading ? t.admin.signingIn : t.admin.signIn}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
