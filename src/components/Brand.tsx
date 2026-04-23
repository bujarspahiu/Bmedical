import React from 'react';
import clsx from 'clsx';

type BrandProps = {
  theme?: 'light' | 'dark';
  compact?: boolean;
  showTagline?: boolean;
  className?: string;
};

const Brand: React.FC<BrandProps> = ({ theme = 'light', compact = false, showTagline = true, className }) => {
  const dark = theme === 'dark';

  return (
    <div className={clsx('flex items-center gap-3', className)}>
      <img src="/bmedical.png" alt="Bmedical" className={clsx(compact ? 'h-9' : 'h-10', 'w-auto object-contain')} />
      <div className="min-w-0">
        <div className={clsx('font-bold leading-none', compact ? 'text-base' : 'text-lg', dark ? 'text-white' : 'text-[#1F2937]')}>Bmedical</div>
        {showTagline && (
          <div className={clsx('text-[10px] tracking-wide', dark ? 'text-slate-400' : 'text-slate-500')}>
            DIGITAL HEALTH PLATFORM
          </div>
        )}
      </div>
    </div>
  );
};

export default Brand;
