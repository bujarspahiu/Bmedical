import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const ContactForm: React.FC = () => {
  const { t } = useLanguage();
  const [form, setForm] = useState({ name: '', email: '', clinic: '', phone: '', message: '', captcha: '' });
  const [submitted, setSubmitted] = useState(false);
  const captchaQuestion = '7 + 3 = ?';
  const captchaAnswer = '10';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast({ title: t.contact.missingTitle, description: t.contact.missingBody });
      return;
    }
    if (form.captcha.trim() !== captchaAnswer) {
      toast({ title: 'Captcha failed', description: 'Please solve the simple anti-spam question before sending your request.' });
      return;
    }
    setSubmitted(true);
    toast({ title: t.contact.requestTitle, description: t.contact.requestBody });
  };

  return (
    <section id="contact" className="py-24 bg-gradient-to-br from-[#2C5F7C] to-[#4A90A4]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <div className="text-white">
            <div className="text-sm font-semibold text-white/80 tracking-wider uppercase mb-3">{t.contact.eyebrow}</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-5">{t.contact.title}</h2>
            <p className="text-white/85 text-lg leading-relaxed mb-8">{t.contact.description}</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3"><Mail className="w-5 h-5" /><span>info@bmedical.health</span></div>
              <div className="flex items-center gap-3"><Phone className="w-5 h-5" /><span>+39 02 1234 5678</span></div>
              <div className="flex items-center gap-3"><MapPin className="w-5 h-5" /><span>Via Dante 12, 20121 Milano, Italy</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-[#1F2937] mb-2">{t.contact.successTitle}</div>
                <p className="text-slate-600">{t.contact.successBody}</p>
                <Button onClick={() => { setSubmitted(false); setForm({ name: '', email: '', clinic: '', phone: '', message: '', captcha: '' }); }} variant="outline" className="mt-6">{t.contact.sendAnother}</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="n">{t.contact.fullName}</Label>
                    <Input id="n" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="e">{t.contact.email}</Label>
                    <Input id="e" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="c">{t.contact.clinic}</Label>
                    <Input id="c" value={form.clinic} onChange={(e) => setForm({ ...form, clinic: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="p">{t.contact.phone}</Label>
                    <Input id="p" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="m">{t.contact.help}</Label>
                  <Textarea id="m" rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="captcha">Anti-spam check: {captchaQuestion}</Label>
                  <Input
                    id="captcha"
                    inputMode="numeric"
                    value={form.captcha}
                    onChange={(e) => setForm({ ...form, captcha: e.target.value.replace(/[^0-9]/g, '') })}
                    placeholder="Type the answer"
                  />
                </div>
                <Button type="submit" className="w-full h-11 bg-[#2C5F7C] hover:bg-[#234e66] text-white">{t.contact.request}</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
