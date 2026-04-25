import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

const Legal: React.FC = () => {
  const { doc } = useParams();
  const { t } = useLanguage();
  const docs = t.legal.docs as Record<string, { title: string; sections: string[][] }>;
  const fallbackDoc = doc || 'terms';
  const content = fallbackDoc === 'terms'
    ? {
        title: 'Kushtet e Sherbimit',
        sections: [
          ['1. Pranimi i kushteve', 'Duke perdorur platformen, pajtoheni me keto Kushte te Sherbimit. Sherbimi operohet nga BMedical.'],
          ['2. Abonimi dhe faturimi', 'Sherbimi ofrohet me abonim. Plani Professional faturohet 20 EUR ne muaj ose 200 EUR ne vit. Plani Enterprise faturohet 50 EUR ne muaj ose 500 EUR ne vit. Cdo plan perfshin 1 user dhe user-et shtese tarifohen sipas planit aktiv.'],
          ['3. Demo dhe vendimi i blerjes', 'Klienti ka mundesi te shohe live demo para blerjes. Duke vazhduar me regjistrimin dhe pagesen, klienti pranon se e ka vleresuar sherbimin ne masen e nevojshme per vendimin e abonimit.'],
          ['4. Rimbursimet', 'Pas aktivizimit te llogarise, abonimet konsiderohen pergjithesisht pa rimbursim, pervec rasteve kur ligji ne fuqi kerkon ndryshe. Pagesat me bank transfer nuk konsiderohen aktivizim derisa te verifikohen nga administratori i platformes.'],
          ['5. Te dhenat e tenant-it', 'Te dhenat qe ngarkoni mbeten prona juaj. Platforma vepron si perpunues i te dhenave sipas GDPR.'],
          ['6. Perdorimi i lejueshem', 'Nuk lejohet keqperdorimi i sherbimit, shkelja e sigurise, mashtrimi, pagesa e rreme ose ruajtja e permbajtjes se paligjshme.'],
          ['7. Kufizimi i pergjegjesise', 'BMedical nuk mban pergjegjesi per deme indirekte apo pasoja nga perdorimi i sherbimit ne masen e lejuar nga ligji.'],
          ['8. Nderprerja dhe pezullimi', 'Platforma mund te pezulloje ose kufizoje llogari ne rast mospagese, mashtrimi, abuzimi ose shkeljeje te ketyre kushteve.'],
        ],
      }
    : docs[fallbackDoc];

  if (!content) return <div>{t.legal.notFound}</div>;

  return (
    <div>
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold text-[#1F2937] mb-3">{content.title}</h1>
        <p className="text-slate-500 mb-10">{t.legal.updated}: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <div className="space-y-8">
          {content.sections.map(([heading, paragraph], i) => (
            <div key={i}>
              <h2 className="text-xl font-semibold text-[#1F2937] mb-2">{heading}</h2>
              <p className="text-slate-600 leading-relaxed">{paragraph}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 pt-8 border-t border-slate-100 flex gap-4 text-sm">
          <Link to="/legal/terms" className="text-[#2C5F7C]">{t.legal.terms}</Link>
          <Link to="/legal/privacy" className="text-[#2C5F7C]">{t.legal.privacy}</Link>
          <Link to="/legal/cookies" className="text-[#2C5F7C]">{t.legal.cookies}</Link>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Legal;
