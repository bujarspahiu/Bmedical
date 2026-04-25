import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, Loader2, Plus, Printer, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { demoInvoices, demoPatients, demoServices } from '@/data/demoData';

type InvoiceRecord = {
  id: string;
  number: string;
  patientId?: string;
  patientName: string;
  date: string;
  amount: number;
  tax: number;
  total: number;
  status: 'unpaid' | 'partial' | 'paid';
  method: string;
  notes?: string;
};

type InvoiceForm = {
  patientId: string;
  serviceId: string;
  issuedAt: string;
  paymentMethod: string;
  notes: string;
};

type InvoiceResources = {
  patients: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string; price: number }>;
};

type AppointmentResourcesResponse = {
  patients: Array<{ id: string; name: string; status: string }>;
  services: Array<{ id: string; name: string; category: string; duration: number; price: number }>;
};

const initialForm: InvoiceForm = {
  patientId: '',
  serviceId: '',
  issuedAt: '2026-04-21',
  paymentMethod: 'cash',
  notes: '',
};

const Invoices: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isDemoMode = user?.id.startsWith('demo-') ?? false;
  const month = '2026-04';
  const [q, setQ] = useState('');
  const [preview, setPreview] = useState<InvoiceRecord | null>(null);
  const [printFormat, setPrintFormat] = useState<'A4' | '80mm'>('A4');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<InvoiceForm>(initialForm);
  const [demoRows, setDemoRows] = useState<InvoiceRecord[]>(demoInvoices);

  const resourcesQuery = useQuery({
    queryKey: ['appointments', 'resources'],
    queryFn: async () => api<AppointmentResourcesResponse>('appointments_resources'),
    enabled: !isDemoMode,
  });

  const invoicesQuery = useQuery({
    queryKey: ['invoices', month],
    queryFn: async () => {
      const response = await api<{ invoices: InvoiceRecord[] }>('invoices_list', { month });
      return response.invoices;
    },
    enabled: !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: async (values: InvoiceForm) => {
      const response = await api<{ invoice: InvoiceRecord }>('invoice_create', {
        patientId: values.patientId,
        serviceId: values.serviceId,
        issuedAt: values.issuedAt,
        paymentMethod: values.paymentMethod,
        notes: values.notes.trim() || null,
      });
      return response.invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices', month] });
      setCreateOpen(false);
      setForm(initialForm);
      toast({ title: 'Invoice created', description: 'The invoice was saved to PostgreSQL.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not create invoice', description: error.message });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async ({ id, method }: { id: string; method: string }) => {
      const response = await api<{ invoice: InvoiceRecord }>('invoice_mark_paid', { id, method });
      return response.invoice;
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['invoices', month] });
      setPreview(invoice);
      toast({ title: 'Invoice marked as paid', description: 'A payment record was created.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not update invoice', description: error.message });
    },
  });

  const resources: InvoiceResources = useMemo(() => {
    if (isDemoMode) {
      return {
        patients: demoPatients.map((patient) => ({ id: patient.id, name: `${patient.firstName} ${patient.lastName}` })),
        services: demoServices.map((service) => ({ id: service.id, name: service.name, price: service.price })),
      };
    }

    const data = resourcesQuery.data;
    return {
      patients: data?.patients?.map((patient) => ({ id: patient.id, name: patient.name })) ?? [],
      services: data?.services?.map((service) => ({ id: service.id, name: service.name, price: service.price })) ?? [],
    };
  }, [isDemoMode, resourcesQuery.data]);

  const invoices = isDemoMode ? demoRows : invoicesQuery.data ?? [];
  const filtered = invoices.filter((invoice) => [invoice.number, invoice.patientName].join(' ').toLowerCase().includes(q.trim().toLowerCase()));

  const totalRevenue = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + invoice.total, 0);
  const outstanding = invoices.filter((invoice) => invoice.status !== 'paid').reduce((sum, invoice) => sum + invoice.total, 0);
  const selectedService = resources.services.find((service) => service.id === form.serviceId);

  const createLocalInvoice = () => {
    const patient = resources.patients.find((item) => item.id === form.patientId);
    const service = resources.services.find((item) => item.id === form.serviceId);
    if (!patient || !service) {
      toast({ title: 'Missing fields', description: 'Choose a patient and service.' });
      return;
    }

    const amount = service.price;
    const tax = Number((amount * 0.22).toFixed(2));
    const total = Number((amount + tax).toFixed(2));

    const invoice: InvoiceRecord = {
      id: `demo-${Date.now()}`,
      number: `INV-2026-${String(demoRows.length + 1).padStart(4, '0')}`,
      patientId: patient.id,
      patientName: patient.name,
      date: form.issuedAt,
      amount,
      tax,
      total,
      status: 'unpaid',
      method: form.paymentMethod,
      notes: form.notes,
    };

    setDemoRows((current) => [invoice, ...current]);
    setCreateOpen(false);
    setForm(initialForm);
    toast({ title: 'Demo invoice created', description: 'The invoice exists locally in demo mode.' });
  };

  const submitCreate = async () => {
    if (!form.patientId || !form.serviceId) {
      toast({ title: 'Missing fields', description: 'Choose a patient and service.' });
      return;
    }

    if (isDemoMode) {
      createLocalInvoice();
      return;
    }

    await createMutation.mutateAsync(form);
  };

  const markAsPaid = async (invoice: InvoiceRecord) => {
    if (isDemoMode) {
      setDemoRows((current) => current.map((row) => (row.id === invoice.id ? { ...row, status: 'paid', method: 'cash' } : row)));
      setPreview({ ...invoice, status: 'paid', method: 'cash' });
      toast({ title: 'Demo invoice updated', description: 'Invoice marked as paid locally.' });
      return;
    }

    await markPaidMutation.mutateAsync({ id: invoice.id, method: invoice.method === 'pending' ? 'cash' : invoice.method || 'cash' });
  };

  const handlePrint = () => {
    setTimeout(() => window.print(), 100);
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(74,144,164,0.18),_transparent_26%),linear-gradient(135deg,#f8fbfd_0%,#ffffff_42%,#eef7fa_100%)] p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[#2C5F7C] ring-1 ring-[#2C5F7C]/10">
              <Receipt className="h-3.5 w-3.5" />
              Billing workspace
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1F2937]">Invoices</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Fast invoice creation, clean totals and printable outputs for daily clinic billing.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-[#2C5F7C] hover:bg-[#234e66]">
            <Plus className="mr-2 h-4 w-4" /> New invoice
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <TopStat label="Total invoices" value={String(invoices.length)} />
          <TopStat label="Paid" value={formatCurrency(totalRevenue)} />
          <TopStat label="Outstanding" value={formatCurrency(outstanding)} />
          <TopStat label="Period" value={month} />
        </div>
      </div>

      {isDemoMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Demo mode is active. Invoice changes are local only. Real tenant logins create invoices and payments in PostgreSQL.
        </div>
      )}

      {!isDemoMode && invoicesQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load invoices. {(invoicesQuery.error as Error)?.message}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <Input placeholder="Search by number or patient..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        </div>
        {invoicesQuery.isLoading && !isDemoMode ? (
          <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading invoices...
          </div>
        ) : (
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
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-slate-500">
                    No invoices found.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">{invoice.number}</TableCell>
                  <TableCell className="font-medium">{invoice.patientName}</TableCell>
                  <TableCell className="text-slate-600">{invoice.date}</TableCell>
                  <TableCell>{formatCurrency(invoice.amount)}</TableCell>
                  <TableCell>{formatCurrency(invoice.tax)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(invoice.total)}</TableCell>
                  <TableCell>
                    <Badge className={invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : invoice.status === 'partial' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setPreview(invoice)} className="h-7 text-xs">
                      Open
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Patient</Label>
              <select className="h-10 w-full rounded-md border border-slate-200 px-3" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
                <option value="">Select patient</option>
                {resources.patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label>Service</Label>
              <select className="h-10 w-full rounded-md border border-slate-200 px-3" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
                <option value="">Select service</option>
                {resources.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} · {formatCurrency(service.price)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Issued at</Label>
                <Input type="date" value={form.issuedAt} onChange={(e) => setForm({ ...form, issuedAt: e.target.value })} />
              </div>
              <div>
                <Label>Payment method</Label>
                <Input value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} />
              </div>
            </div>
            {selectedService && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                Subtotal {formatCurrency(selectedService.price)} · VAT 22% · Total {formatCurrency(selectedService.price * 1.22)}
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitCreate} disabled={createMutation.isPending} className="bg-[#2C5F7C]">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle>Invoice preview</DialogTitle>
              </DialogHeader>
              <div className="mb-3 flex gap-2">
                <Button size="sm" variant={printFormat === 'A4' ? 'default' : 'outline'} onClick={() => setPrintFormat('A4')} className={printFormat === 'A4' ? 'bg-[#2C5F7C]' : ''}>
                  A4 Professional
                </Button>
                <Button size="sm" variant={printFormat === '80mm' ? 'default' : 'outline'} onClick={() => setPrintFormat('80mm')} className={printFormat === '80mm' ? 'bg-[#2C5F7C]' : ''}>
                  80mm Thermal Receipt
                </Button>
              </div>

              {printFormat === 'A4' ? (
                <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <div className="text-2xl font-bold text-[#2C5F7C]">{user?.tenantName}</div>
                      <div className="mt-1 text-xs text-slate-500">Billing profile for your clinic workspace</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">INVOICE</div>
                      <div className="font-mono text-lg font-bold">{preview.number}</div>
                      <div className="mt-1 text-xs text-slate-500">Date: {preview.date}</div>
                    </div>
                  </div>
                  <div className="mb-6 border-b border-slate-200 pb-4">
                    <div className="mb-1 text-xs text-slate-500">Bill to</div>
                    <div className="font-semibold">{preview.patientName}</div>
                  </div>
                  <table className="mb-6 w-full text-sm">
                    <thead className="border-b border-slate-200">
                      <tr>
                        <th className="py-2 text-left">Description</th>
                        <th className="text-right">Qty</th>
                        <th className="text-right">Price</th>
                        <th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="py-2">{preview.notes || 'Clinical service invoice'}</td>
                        <td className="text-right">1</td>
                        <td className="text-right">{formatCurrency(preview.amount)}</td>
                        <td className="text-right">{formatCurrency(preview.amount)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="flex justify-end">
                    <div className="w-64 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Subtotal</span>
                        <span>{formatCurrency(preview.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">VAT</span>
                        <span>{formatCurrency(preview.tax)}</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(preview.total)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mx-auto w-[280px] rounded-lg border border-slate-200 bg-white p-3 font-mono text-xs">
                  <div className="text-center font-bold">{user?.tenantName}</div>
                  <div className="my-2 border-t border-dashed border-slate-300" />
                  <div>Receipt: {preview.number}</div>
                  <div>Date: {preview.date}</div>
                  <div>Patient: {preview.patientName}</div>
                  <div className="my-2 border-t border-dashed border-slate-300" />
                  <div className="flex justify-between">
                    <span>Clinical service</span>
                    <span>{formatCurrency(preview.amount)}</span>
                  </div>
                  <div className="my-2 border-t border-dashed border-slate-300" />
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCurrency(preview.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT</span>
                    <span>{formatCurrency(preview.tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>TOTAL</span>
                    <span>{formatCurrency(preview.total)}</span>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Close
                </Button>
                {preview.status !== 'paid' && (
                  <Button variant="outline" onClick={() => markAsPaid(preview)} disabled={markPaidMutation.isPending}>
                    {markPaidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Mark paid
                  </Button>
                )}
                <Button variant="outline" onClick={() => toast({ title: 'PDF ready', description: 'Use the browser print dialog to save as PDF.' })}>
                  <Download className="mr-1 h-4 w-4" /> PDF
                </Button>
                <Button onClick={handlePrint} className="bg-[#2C5F7C]">
                  <Printer className="mr-1 h-4 w-4" /> Print {printFormat}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TopStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-2xl font-bold text-[#1F2937]">{value}</div>
  </div>
);

function formatCurrency(value: number) {
  return `EUR ${value.toFixed(2)}`;
}

export default Invoices;
