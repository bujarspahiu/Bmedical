import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Brand from '@/components/Brand';
import LanguageSwitcher from '@/components/LanguageSwitcher';

const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 grid gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="lg:col-span-2">
            <Brand theme="dark" compact showTagline={false} className="mb-4" />
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">{t.footer.description}</p>
          </div>

          <div>
            <div className="mb-4 text-sm font-semibold text-white">{t.footer.product}</div>
            <ul className="space-y-2 text-sm">
              <li><a href="/#features" className="hover:text-white">{t.nav.features}</a></li>
              <li><a href="/#modules" className="hover:text-white">{t.nav.modules}</a></li>
              <li><a href="/#pricing" className="hover:text-white">{t.nav.pricing}</a></li>
              <li><a href="/#testimonials" className="hover:text-white">{t.nav.customers}</a></li>
            </ul>
          </div>

          <div>
            <div className="mb-4 text-sm font-semibold text-white">{t.footer.login}</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/login?type=clinic" className="hover:text-white">{t.nav.clinicLogin}</Link></li>
              <li><Link to="/login?type=hospital" className="hover:text-white">{t.nav.hospitalLogin}</Link></li>
            </ul>
          </div>

          <div>
            <div className="mb-4 text-sm font-semibold text-white">{t.footer.company}</div>
            <ul className="space-y-2 text-sm">
              <li><a href="/#contact" className="hover:text-white">{t.nav.contact}</a></li>
              <li><a href="#" className="hover:text-white">{t.footer.about}</a></li>
              <li><a href="#" className="hover:text-white">{t.footer.careers}</a></li>
              <li><a href="#" className="hover:text-white">{t.footer.partners}</a></li>
            </ul>
          </div>

          <div>
            <div className="mb-4 text-sm font-semibold text-white">{t.footer.legal}</div>
            <ul className="space-y-2 text-sm">
              <li><Link to="/legal/terms" className="hover:text-white">{t.footer.terms}</Link></li>
              <li><Link to="/legal/privacy" className="hover:text-white">{t.footer.privacy}</Link></li>
              <li><Link to="/legal/cookies" className="hover:text-white">{t.footer.cookies}</Link></li>
              <li><a href="#" className="hover:text-white">{t.footer.gdpr}</a></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-8 sm:flex-row">
          <div className="text-xs text-slate-500">© {new Date().getFullYear()} BMedical · {t.footer.rights}</div>
          <LanguageSwitcher light />
          <div className="flex gap-6 text-xs text-slate-500">
            <span>{t.footer.compliance}</span>
            <span>{t.footer.uptime}</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
