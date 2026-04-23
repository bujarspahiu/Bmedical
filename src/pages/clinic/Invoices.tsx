import React, { useState } from 'react';
import { Plus, Printer, Download, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { demoInvoices } from '@/data/demoData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

const Invoices: React.FC = () => {
  const { user } = useAuth();
  const [invoices] = useState(demoInvoices);
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<typeof demoInvoices[0] | null>(null);
  const [printFormat, setPrintFormat] = useState<'A4' | '80mm'>('A4');
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const filtered = invoices.filter(i => i.number.toLowerCase().includes(q.toLowerCase()) || i.patientName.toLowerCase().includes(q.toLowerCase()));
  const monthCount = invoices.length;
  const isPro = user?.plan === 'professional';
  const limit = 30;
  const atLimit = isPro && monthCount >= limit;

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.total, 0);

  const handlePrint = (fmt: 'A4' | '80mm') => {
    setPrintFormat(fmt);
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Invoices & Billing</h1>
          <p className="text-sm text-slate-500">{monthCount} invoices this month {isPro && `· limit ${limit}`}</p>
        </div>
        <Button onClick={() => atLimit ? setUpgradeOpen(true) : toast({ title: 'New invoice', description: 'Invoice creation form would open here.' })} className="bg-[#2C5F7C] hover:bg-[#234e66]">
          <Plus className="w-4 h-4 mr-2" /> New invoice
        </Button>
      </div>

      {isPro && monthCount >= limit - 5 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold text-amber-900">Approaching monthly invoice limit</div>
            <div className="text-sm text-amber-800">You've used {monthCount} of {limit} invoices this month on the Professional plan. Upgrade to Enterprise for unlimited invoices.</div>
          </div>
          <Button size="sm" onClick={() => setUpgradeOpen(true)} className="bg-amber-600 hover:bg-amber-700">Upgrade</Button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Total invoices" value={invoices.length.toString()} />
        <Card label="Paid" value={`€${totalRevenue.toFixed(2)}`} color="text-emerald-600" />
        <Card label="Outstanding" value={`€${outstanding.toFixed(2)}`} color="text-amber-600" />
        <Card label="This month" value={`${monthCount}${isPro ? '/' + limit : ''}`} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <Input placeholder="Search by number or patient..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Number</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Subtotal</TableHead>
              <TableHead>VAT</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-mono text-xs">{i.number}</TableCell>
                <TableCell className="font-medium">{i.patientName}</TableCell>
                <TableCell className="text-slate-600">{i.date}</TableCell>
                <TableCell>€{i.amount.toFixed(2)}</TableCell>
                <TableCell>€{i.tax.toFixed(2)}</TableCell>
                <TableCell className="font-semibold">€{i.total.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge className={
                    i.status === 'paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
                    i.status === 'partial' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' :
                    'bg-red-100 text-red-700 hover:bg-red-100'
                  }>{i.status}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="outline" onClick={() => setPreview(i)} className="h-7 text-xs">Open</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Invoice preview with print */}
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>Invoice preview</DialogTitle>
              </DialogHeader>
              <div className="flex gap-2 mb-3">
                <Button size="sm" variant={printFormat === 'A4' ? 'default' : 'outline'} onClick={() => setPrintFormat('A4')} className={printFormat === 'A4' ? 'bg-[#2C5F7C]' : ''}>A4 Professional</Button>
                <Button size="sm" variant={printFormat === '80mm' ? 'default' : 'outline'} onClick={() => setPrintFormat('80mm')} className={printFormat === '80mm' ? 'bg-[#2C5F7C]' : ''}>80mm Thermal Receipt</Button>
              </div>

              {printFormat === 'A4' ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="text-2xl font-bold text-[#2C5F7C]">{user?.tenantName}</div>
                      <div className="text-xs text-slate-500 mt-1">Via Dante 12, 20121 Milano<br />VAT IT12345678901 · +39 02 1234567</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">INVOICE</div>
                      <div className="font-mono text-lg font-bold">{preview.number}</div>
                      <div className="text-xs text-slate-500 mt-1">Date: {preview.date}</div>
                    </div>
                  </div>
                  <div className="mb-6 pb-4 border-b border-slate-200">
                    <div className="text-xs text-slate-500 mb-1">Bill to</div>
                    <div className="font-semibold">{preview.patientName}</div>
                  </div>
                  <table className="w-full text-sm mb-6">
                    <thead className="border-b border-slate-200"><tr><th className="text-left py-2">Service</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
                    <tbody><tr className="border-b border-slate-100"><td className="py-2">Physiotherapy Session</td><td className="text-right">1</td><td className="text-right">€{preview.amount.toFixed(2)}</td><td className="text-right">€{preview.amount.toFixed(2)}</td></tr></tbody>
                  </table>
                  <div className="flex justify-end">
                    <div className="w-64 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>€{preview.amount.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">VAT 22%</span><span>€{preview.tax.toFixed(2)}</span></div>
                      <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-base"><span>Total</span><span>€{preview.total.toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg p-3 mx-auto font-mono text-xs" style={{ width: 280 }}>
                  <div className="text-center font-bold">{user?.tenantName}</div>
                  <div className="text-center text-[10px] text-slate-600">Via Dante 12, Milano</div>
                  <div className="text-center text-[10px] text-slate-600">VAT IT12345678901</div>
                  <div className="border-t border-dashed border-slate-300 my-2" />
                  <div>Receipt: {preview.number}</div>
                  <div>Date: {preview.date}</div>
                  <div>Patient: {preview.patientName}</div>
                  <div className="border-t border-dashed border-slate-300 my-2" />
                  <div className="flex justify-between"><span>Physio Session</span><span>€{preview.amount.toFixed(2)}</span></div>
                  <div className="border-t border-dashed border-slate-300 my-2" />
                  <div className="flex justify-between"><span>Subtotal</span><span>€{preview.amount.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>VAT 22%</span><span>€{preview.tax.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold"><span>TOTAL</span><span>€{preview.total.toFixed(2)}</span></div>
                  <div className="border-t border-dashed border-slate-300 my-2" />
                  <div className="text-center text-[10px] mt-2">Thank you!</div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
                <Button variant="outline" onClick={() => toast({ title: 'PDF downloaded' })}><Download className="w-4 h-4 mr-1" /> PDF</Button>
                <Button onClick={() => handlePrint(printFormat)} className="bg-[#2C5F7C]"><Printer className="w-4 h-4 mr-1" /> Print {printFormat}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Upgrade prompt */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Upgrade to Enterprise</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-slate-600">Your Professional plan includes up to {limit} invoices per month. Upgrade to Enterprise to remove all limits and unlock:</p>
            <ul className="space-y-1.5 text-sm">
              {['Unlimited invoices', 'Unlimited staff accounts', 'Multi-location support', 'Custom PDF branding', 'Advanced analytics', 'Priority support'].map(x => (
                <li key={x} className="flex items-center gap-2">✓ {x}</li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>Not now</Button>
            <Button className="bg-[#2C5F7C]" onClick={() => { setUpgradeOpen(false); toast({ title: 'Upgrade request sent', description: 'Our sales team will contact you within 24h.' }); }}>Contact sales</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const Card: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <div className="text-xs text-slate-500">{label}</div>
    <div className={`text-2xl font-bold mt-1 ${color || 'text-[#1F2937]'}`}>{value}</div>
  </div>
);

export default Invoices;
