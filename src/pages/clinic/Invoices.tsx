import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, Loader2, Plus, Printer } from 'lucide-react';
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
  const filtered = invoices.filter((invoice) =>
    [invoice.number, invoice.patientName].join(' ').toLowerCase().includes(q.trim().toLowerCase()),
  );

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Invoices & Billing</h1>
          <p className="text-sm text-slate-500">{invoices.length} invoices this month</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-[#2C5F7C] hover:bg-[#234e66]">
          <Plus className="w-4 h-4 mr-2" /> New invoice
        </Button>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Total invoices" value={invoices.length.toString()} />
        <Card label="Paid" value={`€${totalRevenue.toFixed(2)}`} color="text-emerald-600" />
        <Card label="Outstanding" value={`€${outstanding.toFixed(2)}`} color="text-amber-600" />
        <Card label="This month" value={month} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <Input placeholder="Search by number or patient..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
        </div>
        {invoicesQuery.isLoading && !isDemoMode ? (
          <div className="p-8 text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading invoices...
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
                  <TableCell colSpan={8} className="py-10 text-center text-slate-500">No invoices found.</TableCell>
                </TableRow>
              )}
              {filtered.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-mono text-xs">{invoice.number}</TableCell>
                  <TableCell className="font-medium">{invoice.patientName}</TableCell>
                  <TableCell className="text-slate-600">{invoice.date}</TableCell>
                  <TableCell>€{invoice.amount.toFixed(2)}</TableCell>
                  <TableCell>€{invoice.tax.toFixed(2)}</TableCell>
                  <TableCell className="font-semibold">€{invoice.total.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={invoice.status === 'paid' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : invoice.status === 'partial' ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-red-100 text-red-700 hover:bg-red-100'}>
                      {invoice.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setPreview(invoice)} className="h-7 text-xs">Open</Button>
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
              <select className="w-full h-10 px-3 rounded-md border border-slate-200" value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}>
                <option value="">Select patient</option>
                {resources.patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>{patient.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Service</Label>
              <select className="w-full h-10 px-3 rounded-md border border-slate-200" value={form.serviceId} onChange={(e) => setForm({ ...form, serviceId: e.target.value })}>
                <option value="">Select service</option>
                {resources.services.map((service) => (
                  <option key={service.id} value={service.id}>{service.name} · €{service.price}</option>
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
                Subtotal €{selectedService.price.toFixed(2)} · VAT 22% · Total €{(selectedService.price * 1.22).toFixed(2)}
              </div>
            )}
            <div>
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={submitCreate} disabled={createMutation.isPending} className="bg-[#2C5F7C]">
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
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
              <div className="flex gap-2 mb-3">
                <Button size="sm" variant={printFormat === 'A4' ? 'default' : 'outline'} onClick={() => setPrintFormat('A4')} className={printFormat === 'A4' ? 'bg-[#2C5F7C]' : ''}>A4 Professional</Button>
                <Button size="sm" variant={printFormat === '80mm' ? 'default' : 'outline'} onClick={() => setPrintFormat('80mm')} className={printFormat === '80mm' ? 'bg-[#2C5F7C]' : ''}>80mm Thermal Receipt</Button>
              </div>

              {printFormat === 'A4' ? (
                <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="text-2xl font-bold text-[#2C5F7C]">{user?.tenantName}</div>
                      <div className="text-xs text-slate-500 mt-1">Billing profile for your clinic workspace</div>
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
                    <thead className="border-b border-slate-200"><tr><th className="text-left py-2">Description</th><th className="text-right">Qty</th><th className="text-right">Price</th><th className="text-right">Total</th></tr></thead>
                    <tbody><tr className="border-b border-slate-100"><td className="py-2">{preview.notes || 'Clinical service invoice'}</td><td className="text-right">1</td><td className="text-right">€{preview.amount.toFixed(2)}</td><td className="text-right">€{preview.amount.toFixed(2)}</td></tr></tbody>
                  </table>
                  <div className="flex justify-end">
                    <div className="w-64 space-y-1 text-sm">
                      <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>€{preview.amount.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">VAT</span><span>€{preview.tax.toFixed(2)}</span></div>
                      <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-base"><span>Total</span><span>€{preview.total.toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-lg p-3 mx-auto font-mono text-xs" style={{ width: 280 }}>
                  <div className="text-center font-bold">{user?.tenantName}</div>
                  <div className="border-t border-dashed border-slate-300 my-2" />
                  <div>Receipt: {preview.number}</div>
                  <div>Date: {preview.date}</div>
                  <div>Patient: {preview.patientName}</div>
                  <div className="border-t border-dashed border-slate-300 my-2" />
                  <div className="flex justify-between"><span>Clinical service</span><span>€{preview.amount.toFixed(2)}</span></div>
                  <div className="border-t border-dashed border-slate-300 my-2" />
                  <div className="flex justify-between"><span>Subtotal</span><span>€{preview.amount.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>VAT</span><span>€{preview.tax.toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold"><span>TOTAL</span><span>€{preview.total.toFixed(2)}</span></div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setPreview(null)}>Close</Button>
                {preview.status !== 'paid' && (
                  <Button variant="outline" onClick={() => markAsPaid(preview)} disabled={markPaidMutation.isPending}>
                    {markPaidMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Mark paid
                  </Button>
                )}
                <Button variant="outline" onClick={() => toast({ title: 'PDF ready', description: 'Use the browser print dialog to save as PDF.' })}><Download className="w-4 h-4 mr-1" /> PDF</Button>
                <Button onClick={handlePrint} className="bg-[#2C5F7C]"><Printer className="w-4 h-4 mr-1" /> Print {printFormat}</Button>
              </DialogFooter>
            </>
          )}
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
