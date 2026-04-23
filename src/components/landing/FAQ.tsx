import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/contexts/LanguageContext';

const FAQ: React.FC = () => {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="text-sm font-semibold text-[#4A90A4] tracking-wider uppercase mb-3">{t.faq.eyebrow}</div>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1F2937]">{t.faq.title}</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {t.faq.items.map(([question, answer], i) => (
            <AccordionItem key={i} value={`i${i}`} className="bg-slate-50 border border-slate-200 rounded-lg px-5">
              <AccordionTrigger className="text-left font-semibold text-[#1F2937] hover:no-underline">{question}</AccordionTrigger>
              <AccordionContent className="text-slate-600 leading-relaxed">{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
