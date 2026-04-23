import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import { useLanguage } from '@/contexts/LanguageContext';

const Legal: React.FC = () => {
  const { doc } = useParams();
  const { t } = useLanguage();
  const docs = t.legal.docs as Record<string, { title: string; sections: string[][] }>;
  const content = docs[doc || 'terms'];

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
