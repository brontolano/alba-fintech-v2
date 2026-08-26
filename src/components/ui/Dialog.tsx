'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// Dialog Context
interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | undefined>(undefined);

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: React.ReactNode;
}

export interface DialogTriggerProps {
  asChild?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}

// Dialog compound component with context pattern (Radix-style)
export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <DialogContext.Provider value={{ open, onOpenChange }}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
          onClick={() => onOpenChange(false)}
        />
      )}
    </DialogContext.Provider>
  );
};

export const DialogTrigger: React.FC<DialogTriggerProps> = ({
  asChild,
  children,
}) => {
  const ctx = React.useContext(DialogContext);
  const handleClick = () => {
    if (ctx) ctx.onOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement, {
      onClick: (e: React.MouseEvent) => {
        handleClick();
        const existing = (children as any).props.onClick;
        if (existing) existing(e);
      },
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-slate-300 bg-transparent hover:bg-slate-100 hover:text-slate-900 h-10 px-4 py-2"
    >
      {children}
    </button>
  );
};

export interface DialogContentProps {
  className?: string;
  children?: React.ReactNode;
}

export const DialogContent: React.FC<DialogContentProps> = ({
  className,
  children,
}) => {
  const ctx = React.useContext(DialogContext);
  if (!ctx?.open) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 z-[60] mx-auto mb-4 max-w-lg rounded-lg border bg-white p-6 shadow-lg md:top-1/2 md:-translate-y-1/2",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        onClick={() => ctx.onOpenChange(false)}
      >
        ✕
      </button>
      {children}
    </div>
  );
};

export const DialogHeader: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return (
    <div className={cn("mb-4", className)}>
      {children}
    </div>
  );
};

export const DialogTitle: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return (
    <h2 className={cn("text-lg font-semibold", className)}>
      {children}
    </h2>
  );
};

export const DialogDescription: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  return (
    <p className={cn("text-sm text-slate-500", className)}>
      {children}
    </p>
  );
};
