import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import Brand from '@/components/Brand';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await api('signup_verify', { token });
        if (cancelled) return;
        toast({ title: 'Email verified', description: 'Continuing to the payment page.' });
        navigate(`/checkout?token=${encodeURIComponent(token)}`, { replace: true });
      } catch (error) {
        if (cancelled) return;
        toast({
          title: 'Verification failed',
          description: error instanceof Error ? error.message : 'The verification link is invalid.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, token]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(74,144,164,0.16),_transparent_34%),linear-gradient(180deg,#f8fbfd_0%,#ffffff_46%,#f4f8fb_100%)] px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-slate-200 bg-white p-10 text-center shadow-[0_30px_100px_-40px_rgba(15,23,42,0.45)]">
        <div className="mb-6 flex justify-center">
          <Brand />
        </div>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <MailCheck className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold text-slate-900">Verifying your email</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          We are confirming the workspace email now. Once it is verified, the client stays inside BMedical and moves directly to the checkout page.
        </p>
        {!token ? (
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Missing verification token. Please open the email link again or return to{' '}
            <Link to="/register" className="font-medium underline">
              registration
            </Link>
            .
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VerifyEmail;
