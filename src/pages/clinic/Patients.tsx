import React, { useState } from 'react';
import { Search, Plus, UserPlus, Mail, Phone, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { demoPatients } from '@/data/demoData';
import { toast } from '@/components/ui/use-toast';

const Patients: React.FC = () => {
  const [patients, setPatients] = useState(demoPatients);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<typeof demoPatients[0] | null>(null);
  const [newP, setNewP] = useState({ firstName: '', lastName: '', phone: '', email: '', city: '', condition: '' });

  const filtered = patients.filter(p => {
    if (filter !== 'all' && p.status !== filter) return false;
    const s = q.toLowerCase();
    return !s || p.firstName.toLowerCase().includes(s) || p.lastName.toLowerCase().includes(s) || p.email.toLowerCase().includes(s);
  });

  const addPatient = () => {
    if (!newP.firstName || !newP.lastName) return toast({ title: 'Missing fields' });
    setPatients([{ id: 'p' + Date.now(), dob: '1990-01-01', gender: 'M', address: '', status: 'active', lastVisit: '2026-04-21', ...newP }, ...patients]);
    setOpen(false);
    setNewP({ firstName: '', lastName: '', phone: '', email: '', city: '', condition: '' });
    toast({ title: 'Patient added', description: 'Patient profile has been created.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Patients</h1>
          <p className="text-sm text-slate-500">{patients.length} total patients · {patients.filter(p => p.status === 'active').length} active</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-[#2C5F7C] hover:bg-[#234e66]">
          <UserPlus className="w-4 h-4 mr-2" /> New patient
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input placeholder="Search by name or email..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1">
            {(['all', 'active', 'inactive'] as const).map(f => (
              <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className={filter === f ? 'bg-[#2C5F7C]' : ''}>
                {f[0].toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>
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
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4A90A4]/20 to-[#2C5F7C]/20 text-[#2C5F7C] flex items-center justify-center font-semibold text-xs">
                        {p.firstName[0]}{p.lastName[0]}
                      </div>
                      <div>
                        <div className="font-medium text-[#1F2937]">{p.firstName} {p.lastName}</div>
                        <div className="text-xs text-slate-500">{p.gender} · {p.dob}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-600">{p.condition}</TableCell>
                  <TableCell>
                    <div className="text-xs text-slate-600">{p.phone}</div>
                    <div className="text-xs text-slate-500">{p.email}</div>
                  </TableCell>
                  <TableCell className="text-slate-600">{p.city}</TableCell>
                  <TableCell className="text-slate-600">{p.lastVisit}</TableCell>
                  <TableCell>
                    <Badge className={p.status === 'active' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-100'}>{p.status}</Badge>
                  </TableCell>
                  <TableCell><Button variant="ghost" size="sm">Open</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New patient</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>First name</Label><Input value={newP.firstName} onChange={(e) => setNewP({ ...newP, firstName: e.target.value })} /></div>
            <div><Label>Last name</Label><Input value={newP.lastName} onChange={(e) => setNewP({ ...newP, lastName: e.target.value })} /></div>
            <div><Label>Phone</Label><Input value={newP.phone} onChange={(e) => setNewP({ ...newP, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input value={newP.email} onChange={(e) => setNewP({ ...newP, email: e.target.value })} /></div>
            <div><Label>City</Label><Input value={newP.city} onChange={(e) => setNewP({ ...newP, city: e.target.value })} /></div>
            <div><Label>Main condition</Label><Input value={newP.condition} onChange={(e) => setNewP({ ...newP, condition: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={addPatient} className="bg-[#2C5F7C]">Create patient</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.firstName} {selected.lastName}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">Main condition</div>
                  <div className="font-medium">{selected.condition}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="text-xs text-slate-500 mb-1">Date of birth</div>
                  <div className="font-medium">{selected.dob}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg"><div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</div><div className="font-medium">{selected.phone}</div></div>
                <div className="p-3 bg-slate-50 rounded-lg"><div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Mail className="w-3 h-3" /> Email</div><div className="font-medium">{selected.email}</div></div>
                <div className="p-3 bg-slate-50 rounded-lg col-span-2"><div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</div><div className="font-medium">{selected.city}</div></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
                <Button className="bg-[#2C5F7C]">Open full profile</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Patients;
