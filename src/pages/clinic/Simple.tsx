import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Lock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { demoPatients, demoServices, demoStaff } from '@/data/demoData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

type AppointmentResources = {
  patients: Array<{ id: string; name: string; status?: string }>;
  staff: Array<{ id: string; name: string; role: string }>;
  services: Array<{ id: string; name: string; category: string; duration: number; price: number }>;
};

type AnamnesisRecord = {
  id: string;
  patientId: string;
  patientName: string;
  therapistId: string;
  therapistName: string;
  mainComplaint: string;
  painLocation: string;
  painIntensity: number | null;
  symptomsDuration: string;
  injuryHistory: string;
  medicalHistory: string;
  surgicalHistory: string;
  workFactors: string;
  sportFactors: string;
  mobilityLimits: string;
  observations: string;
  redFlags: string[];
  isDraft: boolean;
  createdAt: string;
};

type DiagnosisRecord = {
  id: string;
  patientId: string;
  patientName: string;
  therapistId: string;
  therapistName: string;
  icdCode: string;
  label: string;
  notes: string;
  diagnosedAt: string;
  createdAt: string;
};

type TreatmentPlanRecord = {
  id: string;
  patientId: string;
  patientName: string;
  therapistId: string;
  therapistName: string;
  title: string;
  goals: string;
  plannedSessions: number;
  completedSessions: number;
  techniques: string;
  homeExercises: string;
  startDate: string;
  endDate: string | null;
  status: string;
  progress: number;
};

type TreatmentSessionRecord = {
  id: string;
  treatmentPlanId: string | null;
  planTitle: string;
  patientId: string;
  patientName: string;
  therapistId: string;
  therapistName: string;
  performedAt: string;
  date: string;
  time: string;
  duration: number;
  techniques: string;
  bodyArea: string;
  painBefore: number | null;
  painAfter: number | null;
  notes: string;
  recommendations: string;
  followUpNeeded: boolean;
  painDelta: string | null;
};

type OfferRecord = { id: string; number: string; patientName: string; total: number; status: string; validUntil: string | null };
type StaffRecord = { id: string; name: string; role: string; email: string; phone: string; status: string; sessionsThisMonth: number };
type ClinicSettingsRecord = {
  clinicName: string;
  email: string;
  phone: string;
  taxNumber: string;
  address: string;
  city: string;
  country: string;
  currency: string;
  defaultVat: number;
  workingHours: Array<{ day: string; open: string; close: string; enabled: boolean }>;
};

const today = '2026-04-21';
const currentMonth = '2026-04';
const selectClassName = 'w-full h-10 px-3 rounded-md border border-slate-200 bg-white';
const redFlagOptions = [
  'Unexplained weight loss',
  'Night pain',
  'Fever',
  'Progressive neurological deficit',
  'History of cancer',
  'Bladder dysfunction',
];

const demoResources: AppointmentResources = {
  patients: demoPatients
    .filter((patient) => patient.status !== 'archived')
    .map((patient) => ({ id: patient.id, name: `${patient.firstName} ${patient.lastName}`, status: patient.status })),
  staff: demoStaff.map((staff) => ({ id: staff.id, name: staff.name, role: staff.role })),
  services: demoServices.map((service) => ({
    id: service.id,
    name: service.name,
    category: service.category,
    duration: service.duration,
    price: service.price,
  })),
};

const initialAnamnesisForm = {
  patientId: '',
  therapistId: '',
  mainComplaint: '',
  painLocation: '',
  painIntensity: '',
  symptomsDuration: '',
  injuryHistory: '',
  medicalHistory: '',
  surgicalHistory: '',
  workFactors: '',
  sportFactors: '',
  mobilityLimits: '',
  observations: '',
  redFlags: [] as string[],
};

const initialDiagnosisForm = {
  patientId: '',
  therapistId: '',
  icdCode: '',
  label: '',
  notes: '',
  diagnosedAt: today,
};

const initialPlanForm = {
  patientId: '',
  therapistId: '',
  title: '',
  goals: '',
  plannedSessions: '10',
  techniques: '',
  homeExercises: '',
  startDate: today,
  endDate: '',
  status: 'active',
};

const initialSessionForm = {
  patientId: '',
  therapistId: '',
  treatmentPlanId: '',
  performedAt: `${today}T09:00`,
  duration: '45',
  techniques: '',
  bodyArea: '',
  painBefore: '',
  painAfter: '',
  notes: '',
  recommendations: '',
  followUpNeeded: false,
};

const formatCurrency = (value: number) => `EUR ${value.toFixed(2)}`;

function useIsDemoMode() {
  const { user } = useAuth();
  return user?.id.startsWith('demo-') ?? false;
}

function useClinicResources(isDemoMode: boolean) {
  return useQuery({
    queryKey: ['appointments', 'resources'],
    queryFn: async () => api<AppointmentResources>('appointments_resources'),
    enabled: !isDemoMode,
  });
}

function Header({ title, subtitle, action }: { title: string; subtitle: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">{title}</h1>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {action && (
        <Button onClick={action.onClick} className="bg-[#2C5F7C] hover:bg-[#234e66]">
          <Plus className="mr-2 h-4 w-4" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      {label}
    </div>
  );
}

export const Anamnesis: React.FC = () => {
  const isDemoMode = useIsDemoMode();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(initialAnamnesisForm);
  const [demoRecords, setDemoRecords] = React.useState<AnamnesisRecord[]>([
    {
      id: 'an-1',
      patientId: demoResources.patients[0]?.id || 'demo-p1',
      patientName: demoResources.patients[0]?.name || 'Marco Rossi',
      therapistId: demoResources.staff[0]?.id || 'demo-s1',
      therapistName: demoResources.staff[0]?.name || 'Dr. Elena Moretti',
      mainComplaint: 'Acute lower back pain after lifting heavy boxes.',
      painLocation: 'Lumbar L4-L5',
      painIntensity: 7,
      symptomsDuration: '3 weeks',
      injuryHistory: 'Similar episode in 2024 after sports activity.',
      medicalHistory: 'No major medical history reported.',
      surgicalHistory: 'None',
      workFactors: 'Long desk work and repetitive bending.',
      sportFactors: 'Recreational football once per week.',
      mobilityLimits: 'Reduced lumbar flexion and pain on rotation.',
      observations: 'Posture guarded, tenderness around left paraspinals.',
      redFlags: ['Night pain'],
      isDraft: false,
      createdAt: `${today}T08:30:00Z`,
    },
  ]);

  const resourcesQuery = useClinicResources(isDemoMode);
  const recordsQuery = useQuery({
    queryKey: ['anamnesis'],
    queryFn: async () => {
      const response = await api<{ records: AnamnesisRecord[] }>('anamnesis_list');
      return response.records;
    },
    enabled: !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      const response = await api<{ record: AnamnesisRecord }>('anamnesis_create', {
        patientId: form.patientId,
        therapistId: form.therapistId,
        mainComplaint: form.mainComplaint,
        painLocation: form.painLocation || null,
        painIntensity: form.painIntensity ? Number(form.painIntensity) : null,
        symptomsDuration: form.symptomsDuration || null,
        injuryHistory: form.injuryHistory || null,
        medicalHistory: form.medicalHistory || null,
        surgicalHistory: form.surgicalHistory || null,
        workFactors: form.workFactors || null,
        sportFactors: form.sportFactors || null,
        mobilityLimits: form.mobilityLimits || null,
        observations: form.observations || null,
        redFlags: form.redFlags,
        isDraft,
      });
      return response.record;
    },
    onSuccess: (_, isDraft) => {
      queryClient.invalidateQueries({ queryKey: ['anamnesis'] });
      setOpen(false);
      setForm(initialAnamnesisForm);
      toast({ title: isDraft ? 'Draft saved' : 'Anamnesis completed', description: 'The record was saved successfully.' });
    },
    onError: (error: Error) => toast({ title: 'Could not save anamnesis', description: error.message }),
  });

  const resources = isDemoMode ? demoResources : resourcesQuery.data ?? { patients: [], staff: [], services: [] };
  const records = isDemoMode ? demoRecords : recordsQuery.data ?? [];

  const toggleRedFlag = (value: string) => {
    setForm((current) => ({
      ...current,
      redFlags: current.redFlags.includes(value)
        ? current.redFlags.filter((item) => item !== value)
        : [...current.redFlags, value],
    }));
  };

  const saveDemoRecord = (isDraft: boolean) => {
    const patient = resources.patients.find((item) => item.id === form.patientId);
    const therapist = resources.staff.find((item) => item.id === form.therapistId);
    if (!patient || !therapist || !form.mainComplaint.trim()) {
      toast({ title: 'Missing fields', description: 'Choose patient, therapist and main complaint.' });
      return;
    }

    setDemoRecords((current) => [
      {
        id: `demo-an-${Date.now()}`,
        patientId: patient.id,
        patientName: patient.name,
        therapistId: therapist.id,
        therapistName: therapist.name,
        mainComplaint: form.mainComplaint,
        painLocation: form.painLocation,
        painIntensity: form.painIntensity ? Number(form.painIntensity) : null,
        symptomsDuration: form.symptomsDuration,
        injuryHistory: form.injuryHistory,
        medicalHistory: form.medicalHistory,
        surgicalHistory: form.surgicalHistory,
        workFactors: form.workFactors,
        sportFactors: form.sportFactors,
        mobilityLimits: form.mobilityLimits,
        observations: form.observations,
        redFlags: form.redFlags,
        isDraft,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    setOpen(false);
    setForm(initialAnamnesisForm);
    toast({ title: isDraft ? 'Demo draft saved' : 'Demo anamnesis saved', description: 'Stored locally in demo mode.' });
  };

  const submit = async (isDraft: boolean) => {
    if (isDemoMode) {
      saveDemoRecord(isDraft);
      return;
    }
    await createMutation.mutateAsync(isDraft);
  };

  return (
    <div className="space-y-6">
      <Header title="Anamnesis / Medical Intake" subtitle="Structured intake forms stored in the patient file" action={{ label: 'New intake', onClick: () => setOpen(true) }} />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {records.length === 0 ? (
            <EmptyState label="No anamnesis records yet." />
          ) : (
            records.map((record) => (
              <div key={record.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-[#1F2937]">{record.patientName}</div>
                    <div className="text-xs text-slate-500">{record.createdAt.slice(0, 10)} | {record.therapistName}</div>
                  </div>
                  <Badge className={record.isDraft ? 'bg-amber-100 text-amber-700 hover:bg-amber-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>
                    {record.isDraft ? 'Draft' : 'Completed'}
                  </Badge>
                </div>
                <div className="text-sm text-slate-800">{record.mainComplaint}</div>
                <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <div>Pain: {record.painLocation || 'Not specified'} {record.painIntensity !== null ? `| ${record.painIntensity}/10` : ''}</div>
                  <div>Symptoms duration: {record.symptomsDuration || 'Not specified'}</div>
                  <div>Mobility limits: {record.mobilityLimits || 'Not specified'}</div>
                  <div>Red flags: {record.redFlags.length > 0 ? record.redFlags.join(', ') : 'None reported'}</div>
                </div>
                {record.observations && <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{record.observations}</div>}
              </div>
            ))
          )}

          {open && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Patient</Label>
                  <select className={selectClassName} value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })}>
                    <option value="">Select patient</option>
                    {resources.patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>{patient.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Therapist</Label>
                  <select className={selectClassName} value={form.therapistId} onChange={(event) => setForm({ ...form, therapistId: event.target.value })}>
                    <option value="">Select therapist</option>
                    {resources.staff.map((staff) => (
                      <option key={staff.id} value={staff.id}>{staff.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label>Main complaint</Label>
                <Textarea rows={2} value={form.mainComplaint} onChange={(event) => setForm({ ...form, mainComplaint: event.target.value })} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Pain location</Label>
                  <Input value={form.painLocation} onChange={(event) => setForm({ ...form, painLocation: event.target.value })} />
                </div>
                <div>
                  <Label>Pain intensity (0-10)</Label>
                  <Input type="number" min="0" max="10" value={form.painIntensity} onChange={(event) => setForm({ ...form, painIntensity: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Symptoms duration</Label>
                  <Input value={form.symptomsDuration} onChange={(event) => setForm({ ...form, symptomsDuration: event.target.value })} />
                </div>
                <div>
                  <Label>Injury history</Label>
                  <Input value={form.injuryHistory} onChange={(event) => setForm({ ...form, injuryHistory: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Medical history</Label>
                  <Textarea rows={3} value={form.medicalHistory} onChange={(event) => setForm({ ...form, medicalHistory: event.target.value })} />
                </div>
                <div>
                  <Label>Surgical history</Label>
                  <Textarea rows={3} value={form.surgicalHistory} onChange={(event) => setForm({ ...form, surgicalHistory: event.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Work factors</Label>
                  <Textarea rows={3} value={form.workFactors} onChange={(event) => setForm({ ...form, workFactors: event.target.value })} />
                </div>
                <div>
                  <Label>Sport factors</Label>
                  <Textarea rows={3} value={form.sportFactors} onChange={(event) => setForm({ ...form, sportFactors: event.target.value })} />
                </div>
                <div>
                  <Label>Mobility limits</Label>
                  <Textarea rows={3} value={form.mobilityLimits} onChange={(event) => setForm({ ...form, mobilityLimits: event.target.value })} />
                </div>
              </div>
              <div>
                <Label>Therapist observations</Label>
                <Textarea rows={3} value={form.observations} onChange={(event) => setForm({ ...form, observations: event.target.value })} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 font-semibold text-[#1F2937]">Red flags checklist</div>
                <div className="grid gap-2 md:grid-cols-2">
                  {redFlagOptions.map((item) => (
                    <label key={item} className="flex items-center gap-2 text-sm text-slate-700">
                      <input type="checkbox" checked={form.redFlags.includes(item)} onChange={() => toggleRedFlag(item)} />
                      {item}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="outline" onClick={() => void submit(true)} disabled={createMutation.isPending}>Save as draft</Button>
                <Button className="bg-[#2C5F7C]" onClick={() => void submit(false)} disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Complete and save'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="font-semibold text-[#1F2937]">Clinical overview</div>
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex items-center justify-between"><span>Total intakes</span><b>{records.length}</b></div>
            <div className="flex items-center justify-between"><span>Drafts</span><b>{records.filter((item) => item.isDraft).length}</b></div>
            <div className="flex items-center justify-between"><span>Completed</span><b>{records.filter((item) => !item.isDraft).length}</b></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Diagnoses: React.FC = () => {
  const { user } = useAuth();
  const isDemoMode = useIsDemoMode();
  const isProfessionalPlan = user?.plan === 'professional';
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(initialDiagnosisForm);
  const [demoRows, setDemoRows] = React.useState<DiagnosisRecord[]>([
    {
      id: 'diag-1',
      patientId: demoResources.patients[0]?.id || 'demo-p1',
      patientName: demoResources.patients[0]?.name || 'Marco Rossi',
      therapistId: demoResources.staff[0]?.id || 'demo-s1',
      therapistName: demoResources.staff[0]?.name || 'Dr. Elena Moretti',
      icdCode: 'M54.5',
      label: 'Low back pain',
      notes: 'Mechanical back pain with moderate limitation on flexion.',
      diagnosedAt: today,
      createdAt: `${today}T10:00:00Z`,
    },
  ]);

  const resourcesQuery = useClinicResources(isDemoMode);
  const diagnosesQuery = useQuery({
    queryKey: ['diagnoses'],
    queryFn: async () => {
      const response = await api<{ records: DiagnosisRecord[] }>('diagnoses_list');
      return response.records;
    },
    enabled: !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await api<{ record: DiagnosisRecord }>('diagnosis_create', {
        patientId: form.patientId,
        therapistId: form.therapistId,
        icdCode: form.icdCode || null,
        label: form.label,
        notes: form.notes || null,
        diagnosedAt: form.diagnosedAt,
      });
      return response.record;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diagnoses'] });
      setOpen(false);
      setForm(initialDiagnosisForm);
      toast({ title: 'Diagnosis created', description: 'The diagnosis was added to the patient file.' });
    },
    onError: (error: Error) => toast({ title: 'Could not save diagnosis', description: error.message }),
  });

  const resources = isDemoMode ? demoResources : resourcesQuery.data ?? { patients: [], staff: [], services: [] };
  const rows = isDemoMode ? demoRows : diagnosesQuery.data ?? [];
  const templates = isProfessionalPlan ? 5 : 42;

  const submit = async () => {
    const patient = resources.patients.find((item) => item.id === form.patientId);
    const therapist = resources.staff.find((item) => item.id === form.therapistId);
    if (!patient || !therapist || !form.label.trim()) {
      toast({ title: 'Missing fields', description: 'Choose patient, therapist and diagnosis label.' });
      return;
    }

    if (isDemoMode) {
      setDemoRows((current) => [
        {
          id: `demo-diag-${Date.now()}`,
          patientId: patient.id,
          patientName: patient.name,
          therapistId: therapist.id,
          therapistName: therapist.name,
          icdCode: form.icdCode,
          label: form.label,
          notes: form.notes,
          diagnosedAt: form.diagnosedAt,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setOpen(false);
      setForm(initialDiagnosisForm);
      toast({ title: 'Demo diagnosis created', description: 'Stored locally in demo mode.' });
      return;
    }

    await createMutation.mutateAsync();
  };

  return (
    <div className="space-y-6">
      <Header title="Diagnoses" subtitle={`ICD-ready clinical diagnoses | ${templates} templates available`} action={{ label: 'New diagnosis', onClick: () => setOpen(true) }} />
      {open && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Patient</Label>
            <select className={selectClassName} value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })}>
              <option value="">Select patient</option>
              {resources.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Therapist</Label>
            <select className={selectClassName} value={form.therapistId} onChange={(event) => setForm({ ...form, therapistId: event.target.value })}>
              <option value="">Select therapist</option>
              {resources.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>ICD code</Label>
            <Input value={form.icdCode} onChange={(event) => setForm({ ...form, icdCode: event.target.value })} placeholder="e.g. M54.5" />
          </div>
          <div>
            <Label>Diagnosis date</Label>
            <Input type="date" value={form.diagnosedAt} onChange={(event) => setForm({ ...form, diagnosedAt: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Diagnosis label</Label>
            <Input value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Clinical notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-[#2C5F7C]" onClick={() => void submit()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save diagnosis'}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="space-y-3">
          {rows.length === 0 ? (
            <EmptyState label="No diagnoses recorded yet." />
          ) : (
            rows.map((record) => (
              <div key={record.id} className="rounded-lg bg-slate-50 p-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#1F2937]">{record.patientName}</div>
                  <div className="text-sm text-slate-700">{record.icdCode ? `${record.icdCode} - ` : ''}{record.label}</div>
                  <div className="text-xs text-slate-500 mt-1">{record.diagnosedAt} | {record.therapistName}</div>
                  {record.notes && <div className="mt-2 text-sm text-slate-600">{record.notes}</div>}
                </div>
                <Badge variant="outline">{record.icdCode || 'Custom'}</Badge>
              </div>
            ))
          )}
        </div>
      </div>

      {isProfessionalPlan && (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 flex items-center gap-3">
          <Lock className="h-5 w-5 text-indigo-600" />
          <div className="flex-1">
            <div className="font-semibold text-indigo-900">Unlock unlimited diagnosis templates</div>
            <div className="text-sm text-indigo-800">Enterprise clinics get expanded libraries and specialty templates.</div>
          </div>
          <Button size="sm" className="bg-[#2C5F7C]">Upgrade</Button>
        </div>
      )}
    </div>
  );
};

export const TreatmentPlans: React.FC = () => {
  const isDemoMode = useIsDemoMode();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(initialPlanForm);
  const [demoRows, setDemoRows] = React.useState<TreatmentPlanRecord[]>([
    {
      id: 'plan-1',
      patientId: demoResources.patients[1]?.id || 'demo-p2',
      patientName: demoResources.patients[1]?.name || 'Sofia Romano',
      therapistId: demoResources.staff[1]?.id || 'demo-s2',
      therapistName: demoResources.staff[1]?.name || 'Dr. Marco Bianchi',
      title: 'ACL rehabilitation',
      goals: 'Restore stability, ROM and strength for return to sport.',
      plannedSessions: 24,
      completedSessions: 8,
      techniques: 'Strength progressions, gait training, proprioception.',
      homeExercises: 'Quad sets, step-downs, balance drills.',
      startDate: '2026-03-15',
      endDate: '2026-06-15',
      status: 'active',
      progress: 33,
    },
  ]);

  const resourcesQuery = useClinicResources(isDemoMode);
  const plansQuery = useQuery({
    queryKey: ['treatment-plans'],
    queryFn: async () => {
      const response = await api<{ plans: TreatmentPlanRecord[] }>('treatment_plans_list');
      return response.plans;
    },
    enabled: !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await api<{ plan: TreatmentPlanRecord }>('treatment_plan_create', {
        patientId: form.patientId,
        therapistId: form.therapistId,
        title: form.title,
        goals: form.goals || null,
        plannedSessions: Number(form.plannedSessions),
        techniques: form.techniques || null,
        homeExercises: form.homeExercises || null,
        startDate: form.startDate,
        endDate: form.endDate || null,
        status: form.status,
      });
      return response.plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment-plans'] });
      setOpen(false);
      setForm(initialPlanForm);
      toast({ title: 'Treatment plan created', description: 'The rehabilitation plan is now active.' });
    },
    onError: (error: Error) => toast({ title: 'Could not create treatment plan', description: error.message }),
  });

  const resources = isDemoMode ? demoResources : resourcesQuery.data ?? { patients: [], staff: [], services: [] };
  const plans = isDemoMode ? demoRows : plansQuery.data ?? [];

  const submit = async () => {
    const patient = resources.patients.find((item) => item.id === form.patientId);
    const therapist = resources.staff.find((item) => item.id === form.therapistId);
    if (!patient || !therapist || !form.title.trim()) {
      toast({ title: 'Missing fields', description: 'Choose patient, therapist and plan title.' });
      return;
    }

    if (isDemoMode) {
      const plannedSessions = Number(form.plannedSessions);
      setDemoRows((current) => [
        {
          id: `demo-plan-${Date.now()}`,
          patientId: patient.id,
          patientName: patient.name,
          therapistId: therapist.id,
          therapistName: therapist.name,
          title: form.title,
          goals: form.goals,
          plannedSessions,
          completedSessions: 0,
          techniques: form.techniques,
          homeExercises: form.homeExercises,
          startDate: form.startDate,
          endDate: form.endDate || null,
          status: form.status,
          progress: 0,
        },
        ...current,
      ]);
      setOpen(false);
      setForm(initialPlanForm);
      toast({ title: 'Demo treatment plan created', description: 'Stored locally in demo mode.' });
      return;
    }

    await createMutation.mutateAsync();
  };

  return (
    <div className="space-y-6">
      <Header title="Treatment Plans" subtitle="Personalized rehabilitation programs with progress tracking" action={{ label: 'New plan', onClick: () => setOpen(true) }} />
      {open && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Patient</Label>
            <select className={selectClassName} value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })}>
              <option value="">Select patient</option>
              {resources.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Therapist</Label>
            <select className={selectClassName} value={form.therapistId} onChange={(event) => setForm({ ...form, therapistId: event.target.value })}>
              <option value="">Select therapist</option>
              {resources.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <Label>Plan title</Label>
            <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Goals</Label>
            <Textarea rows={3} value={form.goals} onChange={(event) => setForm({ ...form, goals: event.target.value })} />
          </div>
          <div>
            <Label>Planned sessions</Label>
            <Input type="number" min="1" value={form.plannedSessions} onChange={(event) => setForm({ ...form, plannedSessions: event.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <select className={selectClassName} value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="paused">Paused</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>
          <div>
            <Label>Start date</Label>
            <Input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
          </div>
          <div>
            <Label>End date</Label>
            <Input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
          </div>
          <div>
            <Label>Techniques</Label>
            <Textarea rows={3} value={form.techniques} onChange={(event) => setForm({ ...form, techniques: event.target.value })} />
          </div>
          <div>
            <Label>Home exercises</Label>
            <Textarea rows={3} value={form.homeExercises} onChange={(event) => setForm({ ...form, homeExercises: event.target.value })} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-[#2C5F7C]" onClick={() => void submit()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Create plan'}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {plans.length === 0 ? (
          <div className="md:col-span-2">
            <EmptyState label="No treatment plans yet." />
          </div>
        ) : (
          plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#1F2937]">{plan.patientName}</div>
                  <div className="text-xs text-slate-500">{plan.startDate} | {plan.therapistName}</div>
                </div>
                <Badge className={plan.status === 'active' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : plan.status === 'completed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
                  {plan.status}
                </Badge>
              </div>
              <div className="font-medium text-slate-800">{plan.title}</div>
              <div className="mt-2 text-sm text-slate-600">{plan.goals || 'No goal notes provided.'}</div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-slate-500">Progress</span>
                <span className="font-semibold">{plan.completedSessions}/{plan.plannedSessions} sessions</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-[#2C5F7C] to-[#4A90A4]" style={{ width: `${plan.progress}%` }} />
              </div>
              <div className="mt-4 grid gap-2 text-xs text-slate-500">
                <div>Techniques: {plan.techniques || 'Not specified'}</div>
                <div>Home exercises: {plan.homeExercises || 'Not specified'}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const Sessions: React.FC = () => {
  const isDemoMode = useIsDemoMode();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState(initialSessionForm);
  const [demoRows, setDemoRows] = React.useState<TreatmentSessionRecord[]>([
    {
      id: 'sess-1',
      treatmentPlanId: 'plan-1',
      planTitle: 'ACL rehabilitation',
      patientId: demoResources.patients[1]?.id || 'demo-p2',
      patientName: demoResources.patients[1]?.name || 'Sofia Romano',
      therapistId: demoResources.staff[1]?.id || 'demo-s2',
      therapistName: demoResources.staff[1]?.name || 'Dr. Marco Bianchi',
      performedAt: `${today}T10:00:00Z`,
      date: today,
      time: '10:00',
      duration: 60,
      techniques: 'ROM exercises and cryotherapy',
      bodyArea: 'Right knee',
      painBefore: 5,
      painAfter: 3,
      notes: 'Swelling reduced compared to previous visit.',
      recommendations: 'Continue quad activation and ice protocol.',
      followUpNeeded: true,
      painDelta: '5->3',
    },
  ]);

  const resourcesQuery = useClinicResources(isDemoMode);
  const plansQuery = useQuery({
    queryKey: ['treatment-plans'],
    queryFn: async () => {
      const response = await api<{ plans: TreatmentPlanRecord[] }>('treatment_plans_list');
      return response.plans;
    },
    enabled: !isDemoMode,
  });
  const sessionsQuery = useQuery({
    queryKey: ['treatment-sessions'],
    queryFn: async () => {
      const response = await api<{ sessions: TreatmentSessionRecord[] }>('treatment_sessions_list');
      return response.sessions;
    },
    enabled: !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await api<{ session: TreatmentSessionRecord }>('treatment_session_create', {
        patientId: form.patientId,
        therapistId: form.therapistId,
        treatmentPlanId: form.treatmentPlanId || null,
        performedAt: form.performedAt,
        duration: Number(form.duration),
        techniques: form.techniques,
        bodyArea: form.bodyArea || null,
        painBefore: form.painBefore ? Number(form.painBefore) : null,
        painAfter: form.painAfter ? Number(form.painAfter) : null,
        notes: form.notes || null,
        recommendations: form.recommendations || null,
        followUpNeeded: form.followUpNeeded,
      });
      return response.session;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['treatment-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['treatment-plans'] });
      setOpen(false);
      setForm(initialSessionForm);
      toast({ title: 'Treatment session saved', description: 'The clinical session log is now part of the patient history.' });
    },
    onError: (error: Error) => toast({ title: 'Could not save session', description: error.message }),
  });

  const resources = isDemoMode ? demoResources : resourcesQuery.data ?? { patients: [], staff: [], services: [] };
  const plans = isDemoMode
    ? [{ id: 'plan-1', title: 'ACL rehabilitation', patientId: demoResources.patients[1]?.id || 'demo-p2' }]
    : (plansQuery.data ?? []).map((plan) => ({ id: plan.id, title: plan.title, patientId: plan.patientId }));
  const rows = isDemoMode ? demoRows : sessionsQuery.data ?? [];

  const submit = async () => {
    const patient = resources.patients.find((item) => item.id === form.patientId);
    const therapist = resources.staff.find((item) => item.id === form.therapistId);
    const linkedPlan = plans.find((item) => item.id === form.treatmentPlanId);
    if (!patient || !therapist || !form.techniques.trim()) {
      toast({ title: 'Missing fields', description: 'Choose patient, therapist and techniques.' });
      return;
    }

    if (isDemoMode) {
      const painBefore = form.painBefore ? Number(form.painBefore) : null;
      const painAfter = form.painAfter ? Number(form.painAfter) : null;
      setDemoRows((current) => [
        {
          id: `demo-session-${Date.now()}`,
          treatmentPlanId: linkedPlan?.id || null,
          planTitle: linkedPlan?.title || '',
          patientId: patient.id,
          patientName: patient.name,
          therapistId: therapist.id,
          therapistName: therapist.name,
          performedAt: `${form.performedAt}:00Z`,
          date: form.performedAt.slice(0, 10),
          time: form.performedAt.slice(11, 16),
          duration: Number(form.duration),
          techniques: form.techniques,
          bodyArea: form.bodyArea,
          painBefore,
          painAfter,
          notes: form.notes,
          recommendations: form.recommendations,
          followUpNeeded: form.followUpNeeded,
          painDelta: painBefore !== null && painAfter !== null ? `${painBefore}->${painAfter}` : null,
        },
        ...current,
      ]);
      setOpen(false);
      setForm(initialSessionForm);
      toast({ title: 'Demo session saved', description: 'Stored locally in demo mode.' });
      return;
    }

    await createMutation.mutateAsync();
  };

  return (
    <div className="space-y-6">
      <Header title="Treatment Sessions" subtitle="Session logs, techniques and progress notes" action={{ label: 'Log session', onClick: () => setOpen(true) }} />
      {open && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Patient</Label>
            <select className={selectClassName} value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })}>
              <option value="">Select patient</option>
              {resources.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Therapist</Label>
            <select className={selectClassName} value={form.therapistId} onChange={(event) => setForm({ ...form, therapistId: event.target.value })}>
              <option value="">Select therapist</option>
              {resources.staff.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Treatment plan</Label>
            <select className={selectClassName} value={form.treatmentPlanId} onChange={(event) => setForm({ ...form, treatmentPlanId: event.target.value })}>
              <option value="">Standalone session</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>{plan.title}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Performed at</Label>
            <Input type="datetime-local" value={form.performedAt} onChange={(event) => setForm({ ...form, performedAt: event.target.value })} />
          </div>
          <div>
            <Label>Duration (min)</Label>
            <Input type="number" min="10" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} />
          </div>
          <div>
            <Label>Body area</Label>
            <Input value={form.bodyArea} onChange={(event) => setForm({ ...form, bodyArea: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Techniques</Label>
            <Textarea rows={3} value={form.techniques} onChange={(event) => setForm({ ...form, techniques: event.target.value })} />
          </div>
          <div>
            <Label>Pain before</Label>
            <Input type="number" min="0" max="10" value={form.painBefore} onChange={(event) => setForm({ ...form, painBefore: event.target.value })} />
          </div>
          <div>
            <Label>Pain after</Label>
            <Input type="number" min="0" max="10" value={form.painAfter} onChange={(event) => setForm({ ...form, painAfter: event.target.value })} />
          </div>
          <div>
            <Label>Session notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
          <div>
            <Label>Recommendations</Label>
            <Textarea rows={3} value={form.recommendations} onChange={(event) => setForm({ ...form, recommendations: event.target.value })} />
          </div>
          <div className="md:col-span-2 flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.followUpNeeded} onChange={(event) => setForm({ ...form, followUpNeeded: event.target.checked })} />
            Follow-up required
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-[#2C5F7C]" onClick={() => void submit()} disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Saving...' : 'Save session'}
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState label="No treatment sessions logged yet." />
          </div>
        ) : (
          rows.map((session) => (
            <div key={session.id} className="p-4 hover:bg-slate-50">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2C5F7C]/10 text-[#2C5F7C]">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#1F2937]">{session.patientName}</div>
                    <div className="text-xs text-slate-500">{session.date} | {session.time} | {session.therapistName} | {session.duration} min</div>
                    <div className="mt-1 text-sm text-slate-700">{session.techniques}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Area: {session.bodyArea || 'Not specified'}
                      {session.painDelta ? ` | Pain: ${session.painDelta}` : ''}
                      {session.planTitle ? ` | Plan: ${session.planTitle}` : ''}
                    </div>
                    {session.recommendations && <div className="mt-2 text-sm text-slate-600">{session.recommendations}</div>}
                  </div>
                </div>
                <Badge variant="outline">{session.followUpNeeded ? 'Follow-up' : 'Logged'}</Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const Offers: React.FC = () => {
  const isDemoMode = useIsDemoMode();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ patientId: '', serviceId: '', issuedAt: today, validUntil: '2026-05-01', notes: '' });
  const [demoOffers, setDemoOffers] = React.useState<OfferRecord[]>([
    { id: 'o1', number: 'OFF-2026-023', patientName: 'Andrea Conti', total: 680, status: 'sent', validUntil: '2026-05-01' },
    { id: 'o2', number: 'OFF-2026-022', patientName: 'Chiara Ricci', total: 420, status: 'accepted', validUntil: '2026-04-25' },
  ]);

  const resourcesQuery = useClinicResources(isDemoMode);
  const offersQuery = useQuery({
    queryKey: ['quotations', currentMonth],
    queryFn: async () => {
      const response = await api<{ quotations: OfferRecord[] }>('quotations_list', { month: currentMonth });
      return response.quotations;
    },
    enabled: !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: async () => api('quotation_create', {
      patientId: form.patientId,
      serviceId: form.serviceId,
      issuedAt: form.issuedAt,
      validUntil: form.validUntil || null,
      notes: form.notes || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations', currentMonth] });
      setOpen(false);
      setForm({ patientId: '', serviceId: '', issuedAt: today, validUntil: '2026-05-01', notes: '' });
      toast({ title: 'Offer created', description: 'Quotation saved successfully.' });
    },
    onError: (error: Error) => toast({ title: 'Could not create offer', description: error.message }),
  });

  const resources = isDemoMode ? demoResources : resourcesQuery.data ?? { patients: [], staff: [], services: [] };
  const offers = isDemoMode ? demoOffers : offersQuery.data ?? [];

  const submit = () => {
    if (!form.patientId || !form.serviceId) {
      toast({ title: 'Missing fields', description: 'Choose a patient and service.' });
      return;
    }

    if (isDemoMode) {
      const patient = resources.patients.find((item) => item.id === form.patientId);
      const service = resources.services.find((item) => item.id === form.serviceId);
      if (!patient || !service) return;
      setDemoOffers((current) => [
        {
          id: `demo-${Date.now()}`,
          number: `OFF-2026-${String(current.length + 1).padStart(3, '0')}`,
          patientName: patient.name,
          total: service.price,
          status: 'draft',
          validUntil: form.validUntil,
        },
        ...current,
      ]);
      setOpen(false);
      toast({ title: 'Demo offer created', description: 'Saved locally in demo mode.' });
      return;
    }

    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Header title="Offers / Quotations" subtitle="Professional quotations for patients" action={{ label: 'New offer', onClick: () => setOpen(true) }} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <div key={offer.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-xs text-slate-500">{offer.number}</div>
                <div className="mt-1 font-semibold text-[#1F2937]">{offer.patientName}</div>
              </div>
              <Badge className={offer.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : offer.status === 'sent' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : offer.status === 'rejected' ? 'bg-red-100 text-red-700 hover:bg-red-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
                {offer.status}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-[#2C5F7C]">{formatCurrency(offer.total)}</div>
            <div className="mt-1 text-xs text-slate-500">Valid until {offer.validUntil || '-'}</div>
          </div>
        ))}
      </div>
      {open && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Patient</Label>
            <select className={selectClassName} value={form.patientId} onChange={(event) => setForm({ ...form, patientId: event.target.value })}>
              <option value="">Select patient</option>
              {resources.patients.map((patient) => (
                <option key={patient.id} value={patient.id}>{patient.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Service</Label>
            <select className={selectClassName} value={form.serviceId} onChange={(event) => setForm({ ...form, serviceId: event.target.value })}>
              <option value="">Select service</option>
              {resources.services.map((service) => (
                <option key={service.id} value={service.id}>{service.name} | {formatCurrency(service.price)}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Issued at</Label>
            <Input type="date" value={form.issuedAt} onChange={(event) => setForm({ ...form, issuedAt: event.target.value })} />
          </div>
          <div>
            <Label>Valid until</Label>
            <Input type="date" value={form.validUntil} onChange={(event) => setForm({ ...form, validUntil: event.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-[#2C5F7C]" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Create offer'}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Staff: React.FC = () => {
  const { user } = useAuth();
  const isProfessionalPlan = user?.plan === 'professional';
  const isDemoMode = useIsDemoMode();
  const limit = 3;
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ fullName: '', email: '', phone: '', role: 'physio', password: 'changeme123' });
  const [demoRows, setDemoRows] = React.useState<StaffRecord[]>(demoStaff.map((item) => ({ ...item })));

  const staffQuery = useQuery({
    queryKey: ['staff'],
    queryFn: async () => {
      const response = await api<{ staff: StaffRecord[] }>('staff_list');
      return response.staff;
    },
    enabled: !isDemoMode,
  });

  const createMutation = useMutation({
    mutationFn: async () => api('staff_create', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setOpen(false);
      setForm({ fullName: '', email: '', phone: '', role: 'physio', password: 'changeme123' });
      toast({ title: 'Staff member added', description: 'Account created successfully.' });
    },
    onError: (error: Error) => toast({ title: 'Could not create staff member', description: error.message }),
  });

  const staffRows = isDemoMode ? demoRows : staffQuery.data ?? [];
  const atLimit = isProfessionalPlan && staffRows.length >= limit;

  const submit = () => {
    if (atLimit) {
      toast({ title: 'Limit reached', description: 'Upgrade to Enterprise for unlimited staff.' });
      return;
    }
    if (!form.fullName || !form.email) {
      toast({ title: 'Missing fields', description: 'Full name and email are required.' });
      return;
    }
    if (isDemoMode) {
      setDemoRows((current) => [...current, { id: `demo-${Date.now()}`, name: form.fullName, role: form.role, email: form.email, phone: form.phone, status: 'active', sessionsThisMonth: 0 }]);
      setOpen(false);
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <Header title="Staff management" subtitle={`${staffRows.length} staff members ${isProfessionalPlan ? `| limit ${limit}` : '| unlimited (Enterprise)'}`} action={{ label: 'Add staff', onClick: () => setOpen(true) }} />
      {atLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <Lock className="h-5 w-5 text-amber-600" />
          <div className="flex-1">
            <div className="font-semibold text-amber-900">Staff limit reached</div>
            <div className="text-sm text-amber-800">Professional plan includes up to 3 staff accounts. Upgrade to Enterprise for unlimited staff.</div>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700">Upgrade</Button>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        {staffRows.map((staff) => (
          <div key={staff.id} className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#4A90A4]/20 to-[#2C5F7C]/20 font-semibold text-[#2C5F7C]">
                {staff.name.split(' ').map((item) => item[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div className="font-semibold text-[#1F2937]">{staff.name}</div>
                <div className="text-xs text-slate-500">{staff.role}</div>
              </div>
            </div>
            <div className="space-y-1 text-xs text-slate-600">
              <div>{staff.email}</div>
              <div>{staff.phone}</div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-xs text-slate-500">Sessions this month</span>
              <span className="font-bold text-[#2C5F7C]">{staff.sessionsThisMonth}</span>
            </div>
          </div>
        ))}
      </div>
      {open && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 grid gap-4 md:grid-cols-2">
          <div>
            <Label>Full name</Label>
            <Input value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          </div>
          <div>
            <Label>Role</Label>
            <select className={selectClassName} value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
              <option value="physio">Physiotherapist</option>
              <option value="doctor">Doctor</option>
              <option value="receptionist">Receptionist</option>
              <option value="accountant">Accountant</option>
              <option value="assistant">Assistant</option>
              <option value="owner">Owner</option>
            </select>
          </div>
          <div>
            <Label>Temporary password</Label>
            <Input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} className="bg-[#2C5F7C]" disabled={createMutation.isPending}>{createMutation.isPending ? 'Saving...' : 'Create staff account'}</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const isDemoMode = useIsDemoMode();
  const queryClient = useQueryClient();
  const settingsQuery = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await api<{ settings: ClinicSettingsRecord }>('settings_get');
      return response.settings;
    },
    enabled: !isDemoMode,
  });
  const [form, setForm] = React.useState({
    clinicName: user?.tenantName || '',
    email: user?.email || '',
    phone: '+39 02 1234567',
    taxNumber: 'IT12345678901',
    address: 'Via Dante 12',
    city: 'Milano',
    country: 'Italy',
    currency: 'EUR',
    defaultVat: '22',
  });

  React.useEffect(() => {
    if (settingsQuery.data) {
      setForm({
        clinicName: settingsQuery.data.clinicName,
        email: settingsQuery.data.email,
        phone: settingsQuery.data.phone,
        taxNumber: settingsQuery.data.taxNumber,
        address: settingsQuery.data.address,
        city: settingsQuery.data.city,
        country: settingsQuery.data.country,
        currency: settingsQuery.data.currency,
        defaultVat: String(settingsQuery.data.defaultVat),
      });
    }
  }, [settingsQuery.data]);

  const updateMutation = useMutation({
    mutationFn: async () => api('settings_update', {
      clinicName: form.clinicName,
      email: form.email,
      phone: form.phone,
      taxNumber: form.taxNumber,
      address: form.address,
      city: form.city,
      country: form.country,
      currency: form.currency,
      defaultVat: Number(form.defaultVat),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Settings saved', description: 'Clinic profile updated successfully.' });
    },
    onError: (error: Error) => toast({ title: 'Could not save settings', description: error.message }),
  });

  const workingHours = settingsQuery.data?.workingHours || [
    { day: 'Mon', open: '08:00', close: '19:00', enabled: true },
    { day: 'Tue', open: '08:00', close: '19:00', enabled: true },
    { day: 'Wed', open: '08:00', close: '19:00', enabled: true },
    { day: 'Thu', open: '08:00', close: '19:00', enabled: true },
    { day: 'Fri', open: '08:00', close: '19:00', enabled: true },
    { day: 'Sat', open: '08:00', close: '13:00', enabled: true },
  ];

  return (
    <div className="space-y-6">
      <Header title="Clinic settings" subtitle="Profile, branding and preferences" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
          <div className="font-semibold text-[#1F2937]">Clinic profile</div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Clinic name</Label><Input value={form.clinicName} onChange={(event) => setForm({ ...form, clinicName: event.target.value })} /></div>
            <div><Label>VAT / Tax number</Label><Input value={form.taxNumber} onChange={(event) => setForm({ ...form, taxNumber: event.target.value })} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></div>
            <div><Label>Country</Label><Input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} /></div>
            <div><Label>Default currency</Label><Input value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value })} /></div>
            <div><Label>Default VAT rate</Label><Input value={form.defaultVat} onChange={(event) => setForm({ ...form, defaultVat: event.target.value })} /></div>
          </div>
          <div className="border-t border-slate-100 pt-4">
            <div className="mb-3 font-semibold text-[#1F2937]">Working hours</div>
            {workingHours.map((slot) => (
              <div key={slot.day} className="flex items-center justify-between py-2 text-sm">
                <div className="w-16 font-medium">{slot.day}</div>
                <div className="text-slate-500">{slot.open} - {slot.close}</div>
                <Badge variant="outline" className={slot.enabled ? 'border-emerald-300 text-emerald-700' : 'border-slate-300 text-slate-600'}>
                  {slot.enabled ? 'Open' : 'Closed'}
                </Badge>
              </div>
            ))}
          </div>
          <Button className="bg-[#2C5F7C]" onClick={() => isDemoMode ? toast({ title: 'Demo settings updated', description: 'Saved locally in demo mode.' }) : updateMutation.mutate()} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-3 font-semibold text-[#1F2937]">Current plan</div>
          <Badge className={user?.plan === 'enterprise' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
            {user?.plan === 'enterprise' ? 'Enterprise' : 'Professional | EUR 50/mo'}
          </Badge>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div>Patients: <b>unlimited</b></div>
            <div>Staff: <b>{user?.plan === 'enterprise' ? 'unlimited' : '3'}</b></div>
            <div>Invoices/month: <b>{user?.plan === 'enterprise' ? 'unlimited' : '30'}</b></div>
            <div>Templates: <b>{user?.plan === 'enterprise' ? 'unlimited' : '5'}</b></div>
          </div>
          {user?.plan === 'professional' && <Button className="mt-4 w-full bg-[#2C5F7C]">Upgrade to Enterprise</Button>}
          <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-500">
            Next invoice: <b>01 May 2026</b><br />
            Payment method: <b>**** 4242</b>
          </div>
        </div>
      </div>
    </div>
  );
};
