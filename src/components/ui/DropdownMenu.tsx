'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
      'disabled:pointer-events-none disabled:opacity-50',
      className
    )}
    {...props}
  />
));

DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export const DropdownMenuContent = ({ 
  children, 
  align = 'end',
  className 
}: { 
  children: React.ReactNode; 
  align?: 'start' | 'center' | 'end';
  className?: string;
}) => {
  const alignmentClasses = {
    start: 'origin-top-left',
    center: 'origin-top',
    end: 'origin-top-right',
  };

  return (
    <div 
      className={cn(
        'z-50 min-w-32 bg-white rounded-md shadow-lg border border-slate-200 py-1',
        alignmentClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
};

export const DropdownMenuItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'px-3 py-2 cursor-pointer hover:bg-slate-100 flex items-center text-sm',
      destructive && 'text-red-600 hover:bg-red-50',
      className
    )}
    {...props}
  />
));

DropdownMenuItem.displayName = 'DropdownMenuItem';
