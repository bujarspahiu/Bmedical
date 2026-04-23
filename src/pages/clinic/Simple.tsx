import React from 'react';
import { Plus, FileText, Stethoscope, ListChecks, Activity, UserCog, Settings as SettingsIcon, FileSearch, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { demoPatients, demoStaff } from '@/data/demoData';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/use-toast';

// Shared simple list components for less-complex clinic pages

export const Anamnesis: React.FC = () => {
  const [saved, setSaved] = React.useState(false);
  return (
    <div className="space-y-6">
      <Header title="Anamnesis / Medical Intake" subtitle="Structured intake form for new patients" />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div><Label>Patient</Label>
            <select className="w-full h-10 px-3 rounded-md border border-slate-200">
              {demoPatients.map(p => <option key={p.id}>{p.firstName} {p.lastName}</option>)}
            </select>
          </div>
          <div><Label>Main complaint</Label><Textarea rows={2} placeholder="e.g. Sharp lower back pain radiating to left leg..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Pain location</Label><Input placeholder="Lower back · L4-L5" /></div>
            <div><Label>Pain intensity (0-10)</Label><Input type="number" placeholder="7" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Symptoms duration</Label><Input placeholder="3 weeks" /></div>
            <div><Label>Injury history</Label><Input placeholder="Car accident 2019" /></div>
          </div>
          <div><Label>Previous treatments</Label><Textarea rows={2} /></div>
          <div><Label>Surgical & medical history</Label><Textarea rows={2} /></div>
          <div><Label>Work / lifestyle / sport factors</Label><Textarea rows={2} /></div>
          <div><Label>Therapist observations</Label><Textarea rows={3} /></div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setSaved(true); toast({ title: 'Saved as draft' }); }}>Save as draft</Button>
            <Button className="bg-[#2C5F7C]" onClick={() => toast({ title: 'Anamnesis completed', description: 'Record added to patient file.' })}>Complete & save</Button>
            <Button variant="outline" onClick={() => window.print()}>Print summary</Button>
          </div>
          {saved && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Draft saved locally</Badge>}
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-[#1F2937] mb-3">Red flags checklist</div>
          <div className="space-y-2 text-sm">
            {['Unexplained weight loss', 'Night pain', 'Fever', 'Progressive neurological deficit', 'History of cancer', 'Bladder dysfunction'].map(x => (
              <label key={x} className="flex items-center gap-2"><input type="checkbox" /> {x}</label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Diagnoses: React.FC = () => {
  const { user } = useAuth();
  const isPro = user?.plan === 'professional';
  const templates = isPro ? 5 : 42;
  return (
    <div className="space-y-6">
      <Header title="Diagnoses" subtitle={`ICD-ready diagnosis records · ${templates} templates available`} action={{ label: 'New diagnosis', onClick: () => toast({ title: 'Diagnosis form' }) }} />
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="space-y-3">
          {[
            { p: 'Marco Rossi', d: 'M54.5 - Low back pain', dt: '2026-04-15', t: 'Dr. Elena Moretti' },
            { p: 'Sofia Romano', d: 'S83.511A - ACL rupture right knee', dt: '2026-04-14', t: 'Dr. Marco Bianchi' },
            { p: 'Luca Ferrari', d: 'M75.41 - Rotator cuff syndrome right', dt: '2026-04-12', t: 'Dr. Sara Greco' },
            { p: 'Francesca Russo', d: 'M54.3 - Sciatica', dt: '2026-04-10', t: 'Dr. Elena Moretti' },
          ].map((r, i) => (
            <div key={i} className="p-4 bg-slate-50 rounded-lg flex justify-between items-center">
              <div>
                <div className="font-semibold text-[#1F2937]">{r.p}</div>
                <div className="text-sm text-slate-600">{r.d}</div>
                <div className="text-xs text-slate-500 mt-0.5">{r.dt} · {r.t}</div>
              </div>
              <Button size="sm" variant="outline">Open</Button>
            </div>
          ))}
        </div>
      </div>
      {isPro && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 flex items-center gap-3">
          <Lock className="w-5 h-5 text-indigo-600" />
          <div className="flex-1">
            <div className="font-semibold text-indigo-900">Unlock unlimited diagnosis templates</div>
            <div className="text-sm text-indigo-800">Enterprise customers get access to 42+ physiotherapy-specific templates.</div>
          </div>
          <Button size="sm" className="bg-[#2C5F7C]">Upgrade</Button>
        </div>
      )}
    </div>
  );
};

export const TreatmentPlans: React.FC = () => (
  <div className="space-y-6">
    <Header title="Treatment Plans" subtitle="Personalized rehabilitation programs" action={{ label: 'New plan', onClick: () => toast({ title: 'Plan builder' }) }} />
    <div className="grid md:grid-cols-2 gap-4">
      {[
        { p: 'Sofia Romano', g: 'Full ACL rehabilitation', s: 24, c: 8, start: '2026-03-15', st: 'active', pr: 33 },
        { p: 'Marco Rossi', g: 'Chronic lumbar pain relief', s: 12, c: 7, start: '2026-03-20', st: 'active', pr: 58 },
        { p: 'Luca Ferrari', g: 'Rotator cuff recovery', s: 16, c: 14, start: '2026-02-05', st: 'active', pr: 87 },
        { p: 'Francesca Russo', g: 'Sciatica management', s: 10, c: 10, start: '2026-01-10', st: 'completed', pr: 100 },
      ].map((t, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-semibold text-[#1F2937]">{t.p}</div>
              <div className="text-xs text-slate-500">Started {t.start}</div>
            </div>
            <Badge className={t.st === 'active' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'}>{t.st}</Badge>
          </div>
          <div className="text-sm text-slate-700 mb-3">{t.g}</div>
          <div className="mb-2 flex justify-between text-xs"><span className="text-slate-500">Progress</span><span className="font-semibold">{t.c}/{t.s} sessions</span></div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#2C5F7C] to-[#4A90A4] rounded-full" style={{ width: `${t.pr}%` }} /></div>
        </div>
      ))}
    </div>
  </div>
);

export const Sessions: React.FC = () => (
  <div className="space-y-6">
    <Header title="Treatment Sessions" subtitle="Session logs, techniques, progress notes" action={{ label: 'Log session', onClick: () => toast({ title: 'New session' }) }} />
    <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
      {[
        { p: 'Marco Rossi', t: '2026-04-21 09:00', th: 'Dr. Moretti', tech: 'Manual therapy + TENS', area: 'Lumbar', dur: 45, pain: '7→4' },
        { p: 'Sofia Romano', t: '2026-04-21 10:00', th: 'Dr. Bianchi', tech: 'ROM exercises + cryotherapy', area: 'Right knee', dur: 60, pain: '5→3' },
        { p: 'Luca Ferrari', t: '2026-04-20 16:30', th: 'Dr. Greco', tech: 'Mobilization + ultrasound', area: 'Right shoulder', dur: 45, pain: '6→3' },
        { p: 'Francesca Russo', t: '2026-04-19 14:00', th: 'Dr. Moretti', tech: 'McKenzie method', area: 'Lower back', dur: 45, pain: '8→5' },
      ].map((s, i) => (
        <div key={i} className="p-4 hover:bg-slate-50">
          <div className="flex justify-between items-start">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#2C5F7C]/10 text-[#2C5F7C] flex items-center justify-center"><Activity className="w-5 h-5" /></div>
              <div>
                <div className="font-semibold text-[#1F2937]">{s.p}</div>
                <div className="text-xs text-slate-500">{s.t} · {s.th} · {s.dur}min</div>
                <div className="text-sm text-slate-700 mt-1">{s.tech}</div>
                <div className="text-xs text-slate-500 mt-0.5">Area: {s.area} · Pain: {s.pain}</div>
              </div>
            </div>
            <Button size="sm" variant="outline">Details</Button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const Offers: React.FC = () => (
  <div className="space-y-6">
    <Header title="Offers / Quotations" subtitle="Professional PDF offers for patients" action={{ label: 'New offer', onClick: () => toast({ title: 'Offer builder' }) }} />
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[
        { n: 'OFF-2026-023', p: 'Andrea Conti', total: 680, st: 'sent', v: '2026-05-01' },
        { n: 'OFF-2026-022', p: 'Chiara Ricci', total: 420, st: 'accepted', v: '2026-04-25' },
        { n: 'OFF-2026-021', p: 'Giulia Bianchi', total: 1240, st: 'draft', v: '2026-05-10' },
        { n: 'OFF-2026-020', p: 'Luca Ferrari', total: 560, st: 'accepted', v: '2026-04-20' },
        { n: 'OFF-2026-019', p: 'Marco Rossi', total: 320, st: 'rejected', v: '2026-04-15' },
        { n: 'OFF-2026-018', p: 'Sofia Romano', total: 980, st: 'sent', v: '2026-04-28' },
      ].map((o, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-mono text-xs text-slate-500">{o.n}</div>
              <div className="font-semibold text-[#1F2937] mt-1">{o.p}</div>
            </div>
            <Badge className={
              o.st === 'accepted' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' :
              o.st === 'sent' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
              o.st === 'rejected' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
              'bg-slate-100 text-slate-700 hover:bg-slate-100'
            }>{o.st}</Badge>
          </div>
          <div className="text-2xl font-bold text-[#2C5F7C]">€{o.total}</div>
          <div className="text-xs text-slate-500 mt-1">Valid until {o.v}</div>
          <div className="flex gap-2 mt-4">
            <Button size="sm" variant="outline" className="flex-1">View</Button>
            <Button size="sm" variant="outline" className="flex-1">PDF</Button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const Staff: React.FC = () => {
  const { user } = useAuth();
  const isPro = user?.plan === 'professional';
  const limit = 3;
  const atLimit = isPro && demoStaff.length >= limit;
  return (
    <div className="space-y-6">
      <Header title="Staff management" subtitle={`${demoStaff.length} staff members ${isPro ? `· limit ${limit}` : '· unlimited (Enterprise)'}`} action={{ label: 'Add staff', onClick: () => atLimit ? toast({ title: 'Limit reached', description: 'Upgrade to Enterprise for unlimited staff.' }) : toast({ title: 'Add staff form' }) }} />
      {atLimit && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600" />
          <div className="flex-1"><div className="font-semibold text-amber-900">Staff limit reached</div><div className="text-sm text-amber-800">Professional plan includes up to 3 staff accounts. Upgrade to Enterprise for unlimited.</div></div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700">Upgrade</Button>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-4">
        {demoStaff.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#4A90A4]/20 to-[#2C5F7C]/20 text-[#2C5F7C] flex items-center justify-center font-semibold">
                {s.name.split(' ').map(x => x[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div className="font-semibold text-[#1F2937]">{s.name}</div>
                <div className="text-xs text-slate-500">{s.role}</div>
              </div>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div>{s.email}</div>
              <div>{s.phone}</div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <span className="text-xs text-slate-500">Sessions this month</span>
              <span className="font-bold text-[#2C5F7C]">{s.sessionsThisMonth}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Settings: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="space-y-6">
      <Header title="Clinic settings" subtitle="Profile, branding, preferences" />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="font-semibold text-[#1F2937]">Clinic profile</div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Clinic name</Label><Input defaultValue={user?.tenantName} /></div>
            <div><Label>VAT / Tax number</Label><Input defaultValue="IT12345678901" /></div>
            <div><Label>Email</Label><Input defaultValue={user?.email} /></div>
            <div><Label>Phone</Label><Input defaultValue="+39 02 1234567" /></div>
            <div className="col-span-2"><Label>Address</Label><Input defaultValue="Via Dante 12, 20121 Milano, Italy" /></div>
            <div><Label>Default currency</Label><Input defaultValue="EUR (€)" /></div>
            <div><Label>Default VAT rate</Label><Input defaultValue="22%" /></div>
          </div>
          <div className="pt-4 border-t border-slate-100">
            <div className="font-semibold text-[#1F2937] mb-3">Working hours</div>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="flex items-center justify-between py-2 text-sm">
                <div className="font-medium w-16">{d}</div>
                <div className="text-slate-500">08:00 – 19:00</div>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700">Open</Badge>
              </div>
            ))}
          </div>
          <Button className="bg-[#2C5F7C]">Save changes</Button>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="font-semibold text-[#1F2937] mb-3">Current plan</div>
          <Badge className={user?.plan === 'enterprise' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-100 text-slate-700 hover:bg-slate-100'}>
            {user?.plan === 'enterprise' ? 'Enterprise' : 'Professional · €50/mo'}
          </Badge>
          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <div>• Patients: <b>unlimited</b></div>
            <div>• Staff: <b>{user?.plan === 'enterprise' ? 'unlimited' : '3'}</b></div>
            <div>• Invoices/month: <b>{user?.plan === 'enterprise' ? 'unlimited' : '30'}</b></div>
            <div>• Templates: <b>{user?.plan === 'enterprise' ? 'unlimited' : '5'}</b></div>
          </div>
          {user?.plan === 'professional' && (
            <Button className="w-full mt-4 bg-[#2C5F7C]">Upgrade to Enterprise</Button>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            Next invoice: <b>01 May 2026</b><br />Payment method: <b>•••• 4242</b>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header: React.FC<{ title: string; subtitle: string; action?: { label: string; onClick: () => void } }> = ({ title, subtitle, action }) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold text-[#1F2937]">{title}</h1>
      <p className="text-sm text-slate-500">{subtitle}</p>
    </div>
    {action && <Button onClick={action.onClick} className="bg-[#2C5F7C] hover:bg-[#234e66]"><Plus className="w-4 h-4 mr-2" /> {action.label}</Button>}
  </div>
);
