import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Loader2, Mail, MapPin, Pencil, Phone, Search, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/components/ui/use-toast';
import { demoPatients } from '@/data/demoData';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type PatientStatus = 'active' | 'inactive' | 'archived';

type PatientRecord = {
  id: string;
  firstName: string;
  lastName: string;
  dob: string | null;
  gender: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  status: PatientStatus;
  condition: string;
  lastVisit: string | null;
  createdAt?: string;
};

type PatientFormValues = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  gender: string;
  dob: string;
  condition: string;
};

const emptyForm: PatientFormValues = {
  firstName: '',
  lastName: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  gender: '',
  dob: '',
  condition: '',
};

const Patients: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isDemoMode = user?.id.startsWith('demo-') ?? false;
  const [demoRows, setDemoRows] = useState<PatientRecord[]>(
    demoPatients.map((patient) => ({
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dob: patient.dob,
      gender: patient.gender,
      phone: patient.phone,
      email: patient.email,
      city: patient.city,
      address: '',
      status: patient.status as PatientStatus,
      condition: patient.condition,
      lastVisit: patient.lastVisit,
    })),
  );
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | PatientStatus>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [form, setForm] = useState<PatientFormValues>(emptyForm);

  const patientsQuery = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const response = await api<{ patients: PatientRecord[] }>('patients_list');
      return response.patients;
    },
    enabled: !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: async (values: PatientFormValues) => {
      const response = await api<{ patient: PatientRecord }>('patient_create', toPayload(values));
      return response.patient;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setFormOpen(false);
      setForm(emptyForm);
      toast({ title: 'Patient created', description: 'The patient profile was saved to the database.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not create patient', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: PatientFormValues }) => {
      const response = await api<{ patient: PatientRecord }>('patient_update', { id, ...toPayload(values) });
      return response.patient;
    },
    onSuccess: (patient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setEditingPatient(patient);
      setDetailId(patient.id);
      setFormOpen(false);
      toast({ title: 'Patient updated', description: 'Changes were saved successfully.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not update patient', description: error.message });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      await api('patient_archive', { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setDetailId(null);
      toast({ title: 'Patient archived', description: 'The patient was removed from the active workflow.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Could not archive patient', description: error.message });
    },
  });

  const patients = isDemoMode ? demoRows : patientsQuery.data ?? [];
  const selected = patients.find((patient) => patient.id === detailId) || null;
  const activeCount = patients.filter((patient) => patient.status === 'active').length;
  const archivedCount = patients.filter((patient) => patient.status === 'archived').length;
  const recentPatients = [...patients].sort((a, b) => `${b.createdAt || ''}`.localeCompare(a.createdAt || '')).slice(0, 3);

  const filtered = patients.filter((patient) => {
    if (filter !== 'all' && patient.status !== filter) return false;
    const search = q.trim().toLowerCase();
    if (!search) return true;

    return [patient.firstName, patient.lastName, patient.email, patient.phone, patient.city, patient.condition]
      .join(' ')
      .toLowerCase()
      .includes(search);
  });

  const submitForm = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ title: 'Missing fields', description: 'First name and last name are required.' });
      return;
    }

    if (isDemoMode) {
      if (editingPatient) {
        setDemoRows((current) =>
          current.map((patient) =>
            patient.id === editingPatient.id ? { ...patient, ...toDemoPatient(patient.id, form, patient.status, patient.lastVisit) } : patient,
          ),
        );
        setEditingPatient((current) => (current ? { ...current, ...toDemoPatient(current.id, form, current.status, current.lastVisit) } : current));
        toast({ title: 'Demo patient updated', description: 'Changes were saved locally in demo mode.' });
      } else {
        const newPatient = toDemoPatient(`demo-${Date.now()}`, form, 'active', null);
        setDemoRows((current) => [newPatient, ...current]);
        toast({ title: 'Demo patient created', description: 'The patient exists locally for this session.' });
      }
      setFormOpen(false);
      setForm(emptyForm);
      return;
    }

    if (editingPatient) {
      await updateMutation.mutateAsync({ id: editingPatient.id, values: form });
      return;
    }

    await createMutation.mutateAsync(form);
  };

  const archiveSelected = async () => {
    if (!selected) return;

    if (isDemoMode) {
      setDemoRows((current) => current.map((patient) => (patient.id === selected.id ? { ...patient, status: 'archived' } : patient)));
      setDetailId(null);
      toast({ title: 'Demo patient archived', description: 'Status was updated locally in demo mode.' });
      return;
    }

    await archiveMutation.mutateAsync(selected.id);
  };

  const openCreate = () => {
    setEditingPatient(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (patient: PatientRecord) => {
    setEditingPatient(patient);
    setForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone || '',
      email: patient.email || '',
      city: patient.city || '',
      address: patient.address || '',
      gender: patient.gender || '',
      dob: patient.dob || '',
      condition: patient.condition || '',
    });
    setFormOpen(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(74,144,164,0.18),_transparent_26%),linear-gradient(135deg,#f8fbfd_0%,#ffffff_42%,#eef7fa_100%)] p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-[#2C5F7C] ring-1 ring-[#2C5F7C]/10">
              <Users className="h-3.5 w-3.5" />
              Patient directory
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#1F2937]">Patients</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Fast access to active patients, contact details and core clinical context without opening heavy forms first.</p>
          </div>
          <Button onClick={openCreate} className="bg-[#2C5F7C] hover:bg-[#234e66]">
            <UserPlus className="mr-2 h-4 w-4" /> New patient
          </Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <TopStat label="Total" value={String(patients.length)} />
          <TopStat label="Active" value={String(activeCount)} />
          <TopStat label="Archived" value={String(archivedCount)} />
        </div>
      </div>

      {isDemoMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Demo mode is active. Patient changes are stored only in the browser session. Register or log in with a real tenant account to save data to PostgreSQL.
        </div>
      )}

      {!isDemoMode && patientsQuery.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load patients from the server. {(patientsQuery.error as Error)?.message}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Search by name, email, phone or city..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-1">
              {(['all', 'active', 'inactive', 'archived'] as const).map((status) => (
                <Button key={status} size="sm" variant={filter === status ? 'default' : 'outline'} onClick={() => setFilter(status)} className={filter === status ? 'bg-[#2C5F7C]' : ''}>
                  {status[0].toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {patientsQuery.isLoading && !isDemoMode ? (
            <div className="flex items-center gap-2 p-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading patients from PostgreSQL...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Condition</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Last visit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-slate-500">
                        No patients matched the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                  {filtered.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <button className="flex items-center gap-3 text-left" onClick={() => setDetailId(patient.id)}>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#4A90A4]/20 to-[#2C5F7C]/20 text-xs font-semibold text-[#2C5F7C]">
                            {patient.firstName[0]}
                            {patient.lastName[0]}
                          </div>
                          <div>
                            <div className="font-medium text-[#1F2937]">
                              {patient.firstName} {patient.lastName}
                            </div>
                            <div className="text-xs text-slate-500">{patient.gender || 'Not set'} · {patient.dob || 'No date of birth'}</div>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-slate-600">{patient.condition || 'No clinical summary yet'}</TableCell>
                      <TableCell>
                        <div className="text-xs text-slate-600">{patient.phone || 'No phone'}</div>
                        <div className="text-xs text-slate-500">{patient.email || 'No email'}</div>
                      </TableCell>
                      <TableCell className="text-slate-600">{patient.city || '-'}</TableCell>
                      <TableCell className="text-slate-600">{patient.lastVisit || 'No visits yet'}</TableCell>
                      <TableCell>
                        <Badge className={statusClassName(patient.status)}>{patient.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setDetailId(patient.id)}>
                            Open
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openEdit(patient)}>
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 font-semibold text-[#1F2937]">Recently added</div>
            <div className="space-y-3">
              {recentPatients.length === 0 && <div className="text-sm text-slate-400">No patient records yet.</div>}
              {recentPatients.map((patient) => (
                <button key={patient.id} onClick={() => setDetailId(patient.id)} className="flex w-full items-center justify-between rounded-xl bg-slate-50 p-3 text-left transition hover:bg-slate-100">
                  <div>
                    <div className="font-medium text-[#1F2937]">
                      {patient.firstName} {patient.lastName}
                    </div>
                    <div className="text-xs text-slate-500">{patient.city || 'No city'} · {patient.condition || 'No summary yet'}</div>
                  </div>
                  <Badge className={statusClassName(patient.status)}>{patient.status}</Badge>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 font-semibold text-[#1F2937]">Quick guidance</div>
            <div className="space-y-3 text-sm text-slate-600">
              <div className="rounded-xl bg-slate-50 p-4">Keep the patient profile minimal at first. You can add richer treatment context later from the clinical modules.</div>
              <div className="rounded-xl bg-slate-50 p-4">The fastest workflow is usually: create patient, book appointment, then continue inside treatment notes.</div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPatient ? 'Edit patient' : 'New patient'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>First name</Label>
              <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
            </div>
            <div>
              <Label>Last name</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
            <div>
              <Label>Date of birth</Label>
              <Input type="date" value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div>
              <Label>Gender</Label>
              <Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} placeholder="F, M, Female, Male..." />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Clinical summary / main condition</Label>
              <Textarea rows={4} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} placeholder="Short summary of the patient's main issue, notes or referral reason..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={isSaving} className="bg-[#2C5F7C]">
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPatient ? 'Save changes' : 'Create patient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {selected.firstName} {selected.lastName}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoCard label="Main condition" value={selected.condition || 'No summary added yet'} />
                <InfoCard label="Date of birth" value={selected.dob || 'Not set'} />
                <InfoCard label="Status" value={selected.status} />
                <InfoCard label="Last visit" value={selected.lastVisit || 'No completed visit yet'} />
                <InfoCard label="Phone" value={selected.phone || 'Not set'} icon={<Phone className="h-3 w-3" />} />
                <InfoCard label="Email" value={selected.email || 'Not set'} icon={<Mail className="h-3 w-3" />} />
                <InfoCard label="City" value={selected.city || 'Not set'} icon={<MapPin className="h-3 w-3" />} />
                <InfoCard label="Address" value={selected.address || 'Not set'} />
              </div>
              <DialogFooter className="sm:justify-between">
                <Button variant="outline" onClick={() => openEdit(selected)}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit patient
                </Button>
                <Button variant="outline" onClick={archiveSelected} disabled={archiveMutation.isPending} className="border-red-200 text-red-700 hover:bg-red-50">
                  {archiveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Archive className="mr-2 h-4 w-4" /> Archive patient
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

const InfoCard: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-lg bg-slate-50 p-3">
    <div className="mb-1 flex items-center gap-1 text-xs text-slate-500">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-sm font-medium text-[#1F2937]">{value}</div>
  </div>
);

function toPayload(values: PatientFormValues) {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    phone: emptyToNull(values.phone),
    email: emptyToNull(values.email),
    city: emptyToNull(values.city),
    address: emptyToNull(values.address),
    gender: emptyToNull(values.gender),
    dob: emptyToNull(values.dob),
    condition: emptyToNull(values.condition),
  };
}

function toDemoPatient(id: string, values: PatientFormValues, status: PatientStatus, lastVisit: string | null): PatientRecord {
  return {
    id,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    dob: emptyToNull(values.dob),
    gender: values.gender.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    city: values.city.trim(),
    address: values.address.trim(),
    status,
    condition: values.condition.trim(),
    lastVisit,
  };
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function statusClassName(status: PatientStatus) {
  if (status === 'active') return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100';
  if (status === 'inactive') return 'bg-amber-100 text-amber-700 hover:bg-amber-100';
  return 'bg-slate-100 text-slate-700 hover:bg-slate-100';
}

export default Patients;
