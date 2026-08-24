'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-brand-100 text-brand-700 ring-brand-200',
      success: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
      warning: 'bg-amber-100 text-amber-700 ring-amber-200',
      danger: 'bg-red-100 text-red-700 ring-red-200',
      info: 'bg-sky-100 text-sky-700 ring-sky-200',
      outline: 'bg-transparent text-slate-700 ring-slate-300 border border-slate-300',
    };
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
