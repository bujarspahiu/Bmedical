import React from 'react';
import { Star, Quote } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

const people = [
  { n: 'Dr. Elena Moretti', r: 'Owner, MediRehab Milano', img: 'https://i.pravatar.cc/100?img=45' },
  { n: 'Dr. Andrea Conti', r: 'Director, Ospedale Riabilitativo Bologna', img: 'https://i.pravatar.cc/100?img=68' },
  { n: 'Prof. Chiara Marino', r: 'Lead Physiotherapist, San Raffaele Roma', img: 'https://i.pravatar.cc/100?img=47' },
];

const Testimonials: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section id="testimonials" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="text-sm font-semibold text-[#4A90A4] tracking-wider uppercase mb-3">{t.testimonials.eyebrow}</div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937] mb-4">{t.testimonials.title}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {people.map((person, i) => (
            <div key={i} className="bg-white rounded-xl p-7 shadow-sm border border-slate-200">
              <Quote className="w-8 h-8 text-[#4A90A4]/30 mb-4" />
              <div className="flex gap-0.5 mb-4">
                {[...Array(5)].map((_, k) => <Star key={k} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
              </div>
              <p className="text-slate-700 leading-relaxed mb-6">"{t.testimonials.items[i]}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                <img src={person.img} alt={person.n} className="w-11 h-11 rounded-full object-cover" />
                <div>
                  <div className="font-semibold text-sm text-[#1F2937]">{person.n}</div>
                  <div className="text-xs text-slate-500">{person.r}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
