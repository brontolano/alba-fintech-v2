import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type ColorScheme = 'blue' | 'emerald' | 'amber' | 'violet' | 'red' | 'sky';

const COLOR_MAP: Record<ColorScheme, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  red: { bg: 'bg-red-50', text: 'text-red-600' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-600' },
};

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: ColorScheme;
  trend?: { value: string; positive?: boolean };
  className?: string;
}

export function StatCard({ label, value, icon: Icon, color = 'blue', trend, className }: StatCardProps) {
  const colors = COLOR_MAP[color];
  return (
    <div className={cn('bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{value}</p>
          {trend && (
            <p className={cn('text-xs mt-2 font-medium', trend.positive ? 'text-emerald-600' : 'text-red-600')}>
              {trend.value}
            </p>
          )}
        </div>
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center shrink-0', colors.bg)}>
          <Icon size={22} className={colors.text} />
        </div>
      </div>
    </div>
  );
}