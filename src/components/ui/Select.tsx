import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children?: React.ReactNode;
  className?: string;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onValueChange,
  children,
  className,
}: SelectProps) => {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={cn(
        'flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none',
        className
      )}
    >
      {children}
    </select>
  );
};

export const SelectTrigger: React.FC<{ children?: React.ReactNode; className?: string }> = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) => {
  return <div className={cn('relative', className)}>{children}</div>;
};

export const SelectValue: React.FC<{ placeholder?: string }> = ({
  placeholder,
}: {
  placeholder?: string;
}) => {
  return <span className="text-slate-400">{placeholder}</span>;
};

export const SelectContent: React.FC<{ children?: React.ReactNode }> = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  return <>{children}</>;
};

export const SelectItem: React.FC<{ 
  value: string; 
  children?: React.ReactNode 
}> = ({
  value,
  children,
}: {
  value: string;
  children?: React.ReactNode;
}) => {
  return <option value={value}>{children}</option>;
};
