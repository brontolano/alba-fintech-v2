'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface DropdownMenuContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextType>({
  open: false,
  setOpen: () => {},
});

export function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { setOpen } = React.useContext(DropdownMenuContext);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(true);
    if (onClick) onClick(e);
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      onClick={handleClick}
      {...props}
    />
  );
});

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
  const { open, setOpen } = React.useContext(DropdownMenuContext);

  const alignmentClasses = {
    start: 'origin-top-left left-0',
    center: 'origin-top left-1/2 -translate-x-1/2',
    end: 'origin-top-right right-0',
  };

  // Close when clicking outside - only when open
  React.useEffect(() => {
    if (!open) return;

    const handleClickOutside = () => {
      setOpen(false);
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [open, setOpen]);

  if (!open) return null;

  return (
    <div
      className={cn(
        'absolute z-50 min-w-32 bg-white rounded-md shadow-lg border border-slate-200 py-1',
        'mt-1',
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
>(({ className, destructive, onClick, ...props }, ref) => {
  const { setOpen } = React.useContext(DropdownMenuContext);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) onClick(e);
    setOpen(false);
  };

  return (
    <div
      ref={ref}
      className={cn(
        'px-3 py-2 cursor-pointer hover:bg-slate-100 flex items-center text-sm',
        destructive && 'text-red-600 hover:bg-red-50',
        className
      )}
      onClick={handleClick}
      {...props}
    />
  );
});

DropdownMenuItem.displayName = 'DropdownMenuItem';

export const DropdownMenuLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-3 py-2 text-sm font-semibold text-slate-600', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export const DropdownMenuSeparator = ({ className }: { className?: string }) => (
  <div className={cn('h-px bg-slate-200 mx-3 my-1', className)} />
);
