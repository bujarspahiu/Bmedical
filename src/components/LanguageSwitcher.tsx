import React from 'react';
import { Globe } from 'lucide-react';
import { AppLanguage, useLanguage } from '@/contexts/LanguageContext';

const order: AppLanguage[] = ['sq', 'en', 'sr'];

const LanguageSwitcher: React.FC<{ light?: boolean }> = ({ light = false }) => {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className={`inline-flex items-center gap-1 rounded-full border px-1 py-1 ${light ? 'border-white/20 bg-white/10' : 'border-slate-200 bg-white'}`}>
      <Globe className={`w-4 h-4 ml-2 ${light ? 'text-white/70' : 'text-slate-500'}`} />
      {order.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
            language === code
              ? light ? 'bg-white text-slate-900' : 'bg-[#2C5F7C] text-white'
              : light ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-[#2C5F7C]'
          }`}
        >
          {t.languageNames[code]}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
