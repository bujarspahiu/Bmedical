import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import Brand from '@/components/Brand';

const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          <Link to="/" className="shrink-0">
            <Brand compact />
          </Link>

          <div className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-700 hover:text-[#2C5F7C]">{t.nav.features}</a>
            <a href="#modules" className="text-sm font-medium text-slate-700 hover:text-[#2C5F7C]">{t.nav.modules}</a>
            <a href="#pricing" className="text-sm font-medium text-slate-700 hover:text-[#2C5F7C]">{t.nav.pricing}</a>
            <a href="#testimonials" className="text-sm font-medium text-slate-700 hover:text-[#2C5F7C]">{t.nav.customers}</a>
            <a href="#contact" className="text-sm font-medium text-slate-700 hover:text-[#2C5F7C]">{t.nav.contact}</a>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <LanguageSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-[#2C5F7C]">
                  {t.nav.login} <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => navigate('/login?type=clinic')}>{t.nav.clinicLogin}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/login?type=ordinance')}>{t.nav.ordinanceLogin}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/login?type=hospital')}>{t.nav.hospitalLogin}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={() => navigate('/register')} className="bg-[#2C5F7C] hover:bg-[#234e66] text-white">
              {t.nav.startTrial}
            </Button>
          </div>

          <button className="lg:hidden p-2 shrink-0" onClick={() => setOpen(!open)}>
            {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {open && (
          <div className="lg:hidden pb-4 space-y-2 border-t border-slate-100 pt-3">
            <div className="px-2 pb-2">
              <LanguageSwitcher />
            </div>
            <a href="#features" onClick={() => setOpen(false)} className="block px-2 py-2 text-sm font-medium">{t.nav.features}</a>
            <a href="#modules" onClick={() => setOpen(false)} className="block px-2 py-2 text-sm font-medium">{t.nav.modules}</a>
            <a href="#pricing" onClick={() => setOpen(false)} className="block px-2 py-2 text-sm font-medium">{t.nav.pricing}</a>
            <a href="#contact" onClick={() => setOpen(false)} className="block px-2 py-2 text-sm font-medium">{t.nav.contact}</a>
            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/login')}>{t.nav.login}</Button>
              <Button size="sm" onClick={() => navigate('/register')} className="bg-[#2C5F7C] text-white">{t.nav.signUp}</Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
