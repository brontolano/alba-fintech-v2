'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, id, leftIcon, rightIcon, ...props }, ref) => {
    const inputId = React.useId();

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
         </label>
        )}
        <div className={cn(leftIcon || rightIcon ? 'relative' : undefined)}>
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
              {leftIcon}
           </div>
          )}
          <input
            type={type}
            id={id ?? inputId}
            className={cn(
              'flex h-10 w-full rounded-md border border-slate-300 bg-white py-2 text-sm',
              leftIcon ? 'pl-10' : 'pl-3',
              rightIcon ? 'pr-10' : 'pr-3',
              'placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
              error && 'border-red-500 focus:ring-red-500',
              className
            )}
            ref={ref}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 flex items-center">
              {rightIcon}
           </div>
          )}
       </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
            {error}
         </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-slate-500">
            {hint}
         </p>
        )}
     </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };