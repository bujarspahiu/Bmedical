import React, { useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Expand,
  Landmark,
  LoaderCircle,
  Mail,
  Phone,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import Brand from '@/components/Brand';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/components/ui/use-toast';

type PricingRule = {
  id: string;
  code: 'professional' | 'enterprise';
  name: string;
  summary: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  includedUsers: number;
  extraUserMonthly: number;
  extraUserYearly: number;
  extraUserMonthlyCents: number;
  extraUserYearlyCents: number;
};

type CheckoutPayload = {
  token: string;
  tenant: {
    tenantId: string;
    businessName: string;
    ownerName: string;
    email: string;
    phone: string;
    status: string;
    plan: 'professional' | 'enterprise';
  };
  selectedPlan: PricingRule | null;
  pricingRules: PricingRule[];
  bankDetails: {
    kosovo: Record<string, string>;
    sepa: Record<string, string>;
  };
};

type PaymentMethod = 'bank_transfer' | 'card' | 'paypal';

const Checkout: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [seatCount, setSeatCount] = useState(1);
  const [activeMethod, setActiveMethod] = useState<PaymentMethod | null>(null);
  const [bankRegion, setBankRegion] = useState<'kosovo' | 'sepa'>('kosovo');
  const [paymentProofNote, setPaymentProofNote] = useState('');
  const [expanded, setExpanded] = useState(false);

  const checkoutQuery = useQuery({
    queryKey: ['signup-checkout', token],
    queryFn: async () => api<CheckoutPayload>('signup_checkout_get', { token }),
    enabled: Boolean(token),
  });

  const paymentMutation = useMutation({
    mutationFn: async (method: PaymentMethod) =>
      api<{
        transaction: {
          method: string;
          status: string;
        };
        accountStatus: string;
        loginReady: boolean;
        nextStepMessage: string;
      }>('signup_payment_submit', {
        token,
        method,
        billingCycle,
        seatCount,
        bankRegion,
        paymentProofNote,
        cardholderName: null,
        cardLast4: null,
        paypalEmail: null,
      }),
    onSuccess: (data) => {
      toast({
        title: data.loginReady ? 'Workspace activated' : 'Payment sent for review',
        description: data.nextStepMessage,
      });
      checkoutQuery.refetch();
      setActiveMethod(null);
    },
    onError: (error: Error) => {
      toast({ title: 'Payment could not be completed', description: error.message });
    },
  });

  const currentRule = useMemo(
    () => {
      const selectedPlan = checkoutQuery.data?.selectedPlan;
      const pricingRules = checkoutQuery.data?.pricingRules ?? [];
      return selectedPlan || pricingRules.find((item) => item.code === checkoutQuery.data?.tenant.plan) || null;
    },
    [checkoutQuery.data?.pricingRules, checkoutQuery.data?.selectedPlan, checkoutQuery.data?.tenant.plan],
  );

  const totals = useMemo(() => {
    if (!currentRule) return { extraUsers: 0, total: 0, base: 0, extras: 0 };
    const extraUsers = Math.max(0, seatCount - currentRule.includedUsers);
    const base = billingCycle === 'yearly' ? currentRule.yearlyPrice : currentRule.monthlyPrice;
    const extras = extraUsers * (billingCycle === 'yearly' ? currentRule.extraUserYearly : currentRule.extraUserMonthly);
    return { extraUsers, total: base + extras, base, extras };
  }, [billingCycle, currentRule, seatCount]);

  if (!token) return <Navigate to="/register" replace />;

  if (checkoutQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> Preparing checkout...
      </div>
    );
  }

  if (checkoutQuery.error || !checkoutQuery.data) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-2xl rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
          <Brand />
          <h1 className="mt-6 text-3xl font-bold text-slate-900">Checkout could not be opened</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {checkoutQuery.error instanceof Error ? checkoutQuery.error.message : 'The verification session is no longer valid.'}
          </p>
          <div className="mt-8">
            <Link to="/register" className="font-medium text-[#2C5F7C] underline">
              Return to registration
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tenant = checkoutQuery.data.tenant;
  const bankDetails = checkoutQuery.data.bankDetails;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(74,144,164,0.12),_transparent_34%),linear-gradient(180deg,#f8fbfd_0%,#ffffff_48%,#f4f8fb_100%)] px-4 py-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_30px_100px_-40px_rgba(15,23,42,0.45)]">
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <Brand />
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Email verified
                </div>
              </div>
            </div>

            <div className="p-6 sm:p-8 lg:p-10">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#2C5F7C]/8 px-3 py-1 text-sm font-medium text-[#2C5F7C]">
                  <ShieldCheck className="h-4 w-4" />
                  One-page checkout
                </div>
                <h1 className="mt-4 text-3xl font-bold text-slate-900">Choose the payment method without leaving the page</h1>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  This checkout stays inside BMedical. Each payment method opens in a compact modal, so the customer never feels lost or redirected away from the platform.
                </p>
              </div>

              <div className="mt-8 rounded-[28px] border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <div className="inline-flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#2C5F7C]" />
                    {tenant.businessName}
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4 text-[#2C5F7C]" />
                    {tenant.email}
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4 text-[#2C5F7C]" />
                    {tenant.phone}
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-2">
                <div className="rounded-[28px] border border-slate-200 p-5">
                  <div className="text-sm font-semibold text-slate-900">Billing cycle</div>
                  <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as 'monthly' | 'yearly')} className="mt-4">
                    <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100">
                      <TabsTrigger value="monthly" className="rounded-2xl">Monthly</TabsTrigger>
                      <TabsTrigger value="yearly" className="rounded-2xl">Yearly</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="mt-4 text-xs text-slate-500">
                    {billingCycle === 'yearly' ? 'Yearly billing keeps the checkout cleaner for clinics that want fewer renewals.' : 'Monthly billing keeps the starting cost light.'}
                  </div>
                </div>

                <div className="rounded-[28px] border border-slate-200 p-5">
                  <div className="text-sm font-semibold text-slate-900">Included and extra users</div>
                  <div className="mt-4 flex items-end gap-3">
                    <div className="w-28">
                      <Label htmlFor="seatCount">Users</Label>
                      <Input
                        id="seatCount"
                        type="number"
                        min={1}
                        value={seatCount}
                        onChange={(e) => setSeatCount(Math.max(1, Number(e.target.value) || 1))}
                        className="mt-2 h-12 rounded-xl border-slate-200 bg-slate-50/60"
                      />
                    </div>
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Includes {currentRule?.includedUsers || 1} user
                      <div className="mt-1 text-xs text-slate-500">
                        {currentRule
                          ? `Extra user: EUR ${billingCycle === 'yearly' ? currentRule.extraUserYearly : currentRule.extraUserMonthly} / ${billingCycle === 'yearly' ? 'year' : 'month'}`
                          : 'Extra user pricing loads from the plan'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <div className="mb-4 text-sm font-semibold text-slate-900">Payment methods</div>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    {
                      key: 'bank_transfer' as const,
                      title: 'Bank Transfer',
                      body: 'Manual verification in up to 3 business days with Kosovo and SEPA details inside the modal.',
                      icon: Landmark,
                    },
                    {
                      key: 'card' as const,
                      title: 'Credit Card Payment',
                      body: 'Coming Soon. The future card flow will stay inside the same checkout experience.',
                      icon: CreditCard,
                      soon: true,
                    },
                    {
                      key: 'paypal' as const,
                      title: 'PayPal',
                      body: 'Coming Soon. The future PayPal flow will also stay inside the same page experience.',
                      icon: WalletCards,
                      soon: true,
                    },
                  ].map((method) => {
                    const Icon = method.icon;
                    return (
                      <button
                        key={method.key}
                        type="button"
                        onClick={() => setActiveMethod(method.key)}
                        className="rounded-[28px] border border-slate-200 bg-white p-5 text-left transition hover:border-[#2C5F7C] hover:shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#2C5F7C]/10 text-[#2C5F7C]">
                            <Icon className="h-5 w-5" />
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="mt-4 text-base font-semibold text-slate-900">{method.title}</div>
                        <div className="mt-2 text-sm leading-6 text-slate-600">{method.body}</div>
                        {method.soon ? (
                          <div className="mt-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                            Coming Soon
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[32px] border border-slate-200 bg-gradient-to-br from-[#1E4057] via-[#2C5F7C] to-[#6AA6B9] p-6 text-white shadow-[0_30px_100px_-40px_rgba(15,23,42,0.45)]">
              <div className="text-sm uppercase tracking-[0.25em] text-white/65">{currentRule?.name || 'Plan summary'}</div>
              <h2 className="mt-3 text-3xl font-bold">{currentRule?.summary || tenant.plan}</h2>
              <p className="mt-3 text-sm leading-6 text-white/82">
                Keep the customer calm: all payment choices live here and open as small guided windows instead of pushing them into redirects.
              </p>
              <div className="mt-6 rounded-[24px] border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
                <div className="flex items-center justify-between text-sm text-white/75">
                  <span>Base plan</span>
                  <span>EUR {totals.base.toFixed(2)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-white/75">
                  <span>Extra users</span>
                  <span>EUR {totals.extras.toFixed(2)}</span>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm text-white/75">
                  <span>Included users</span>
                  <span>{currentRule?.includedUsers || 1}</span>
                </div>
                <div className="mt-5 border-t border-white/15 pt-5">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <div className="text-sm text-white/70">Total</div>
                      <div className="text-3xl font-bold">EUR {totals.total.toFixed(2)}</div>
                    </div>
                    <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white/85">
                      {billingCycle === 'yearly' ? 'Yearly billing' : 'Monthly billing'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">What happens next</div>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">1. The client chooses the payment method inside this page.</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">2. Bank transfer waits for admin review, while Credit Card and PayPal are marked as Coming Soon.</div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">3. After bank transfer approval, the workspace is ready for login and daily clinic work.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(activeMethod)} onOpenChange={(open) => !open && setActiveMethod(null)}>
        <DialogContent className={`${expanded ? 'max-w-5xl' : 'max-w-2xl'} rounded-[28px] border-slate-200 p-0`}>
          <div className="border-b border-slate-100 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <DialogHeader>
                <DialogTitle>
                  {activeMethod === 'bank_transfer' ? 'Bank Transfer' : activeMethod === 'card' ? 'Credit Card Payment' : 'PayPal'}
                </DialogTitle>
                <DialogDescription>
                  Stay inside the same checkout page. This modal can expand, but the customer never loses the context of the purchase.
                </DialogDescription>
              </DialogHeader>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setExpanded((value) => !value)}>
                <Expand className="mr-2 h-4 w-4" />
                {expanded ? 'Compact' : 'Expand'}
              </Button>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            {activeMethod === 'bank_transfer' ? (
              <>
                <Tabs value={bankRegion} onValueChange={(value) => setBankRegion(value as 'kosovo' | 'sepa')}>
                  <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-slate-100">
                    <TabsTrigger value="kosovo" className="rounded-2xl">Kosovo</TabsTrigger>
                    <TabsTrigger value="sepa" className="rounded-2xl">International / SEPA</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="grid gap-4 sm:grid-cols-2">
                  {Object.entries(bankDetails[bankRegion]).map(([key, value]) => (
                    <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">{key}</div>
                      <div className="mt-2 break-words text-sm font-medium text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proofNote">Proof or note (optional)</Label>
                  <Input
                    id="proofNote"
                    value={paymentProofNote}
                    onChange={(e) => setPaymentProofNote(e.target.value)}
                    placeholder="Reference number, proof note, payer name..."
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/60"
                  />
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Bank transfer payments stay pending until manual review. Verification can take up to 3 business days.
                </div>
              </>
            ) : null}

            {activeMethod === 'card' ? (
              <div className="grid gap-4">
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
                  <div className="text-base font-semibold">Credit Card Payment is Coming Soon</div>
                  <div className="mt-2 text-sm leading-6 text-amber-900">
                    The contained card experience is designed, but real provider processing is intentionally being added later. For now, use Bank Transfer to complete activation safely.
                  </div>
                </div>
              </div>
            ) : null}

            {activeMethod === 'paypal' ? (
              <div className="grid gap-4">
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
                  <div className="text-base font-semibold">PayPal is Coming Soon</div>
                  <div className="mt-2 text-sm leading-6 text-amber-900">
                    PayPal will later use the same contained modal experience. For now, Bank Transfer is the active checkout method that can move the customer to manual review and activation.
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Total to confirm: <span className="font-semibold text-slate-900">EUR {totals.total.toFixed(2)}</span>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
              <Button variant="outline" className="rounded-xl" onClick={() => setActiveMethod(null)}>
                Close
              </Button>
              <Button
                className="rounded-xl bg-[#2C5F7C] hover:bg-[#234e66]"
                disabled={paymentMutation.isPending || activeMethod === 'card' || activeMethod === 'paypal'}
                onClick={() => activeMethod && paymentMutation.mutate(activeMethod)}
              >
                {paymentMutation.isPending ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : activeMethod === 'card' || activeMethod === 'paypal' ? (
                  'Coming Soon'
                ) : activeMethod === 'bank_transfer' ? (
                  'Submit bank transfer'
                ) : (
                  'Continue'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Checkout;
