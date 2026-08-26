'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const isDisabled = loading || disabled;
    const baseStyles =
      'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

    const variants = {
      default: 'bg-brand-600 text-white hover:bg-brand-700',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
      outline:
        'border border-slate-300 bg-transparent hover:bg-slate-100 hover:text-slate-900',
      secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
      ghost: 'hover:bg-slate-100 hover:text-slate-900',
      link: 'text-brand-600 underline-offset-4 hover:underline',
    };

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10',
    };

    const classes = cn(baseStyles, variants[variant], sizes[size], className);

  if (asChild) {
    return (
      <button
        className={classes}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {loading ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : children}
      </button>
    );
  }

  return (
    <button
      className={classes}
      ref={ref}
      disabled={isDisabled}
      {...props}
    >
      {loading ? <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> : children}
    </button>
  );
}
);

Button.displayName = 'Button';

export { Button };

// buttonVariants helper for compatibility
export function buttonVariants({
  variant = 'default',
  size = 'default',
  className,
}: {
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
}) {
  const variants = {
    default: 'bg-brand-600 text-white hover:bg-brand-700',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    outline:
      'border border-slate-300 bg-transparent hover:bg-slate-100 hover:text-slate-900',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    ghost: 'hover:bg-slate-100 hover:text-slate-900',
    link: 'text-brand-600 underline-offset-4 hover:underline',
  };

  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  };

  const baseStyles =
    'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';

  return cn(baseStyles, variants[variant], sizes[size], className);
}
