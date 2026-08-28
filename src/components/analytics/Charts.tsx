// components/analytics/Charts.tsx
'use client';

import {
  ResponsiveContainer,
  BarChart as RCBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LineChart as RCLineChart,
  Line,
} from 'recharts';
import { ReactNode } from 'react';

interface BarChartProps {
  data: Array<{ name: string; [key: string]: any }>;
  dataKey: string;
  color?: string;
}

interface LineChartProps {
  data: Array<{ name: string; net: number }>;
}

export function StatusBarChart({ data, dataKey, color = '#3b82f6' }: BarChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-500">Belum ada data.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RCBarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey={dataKey} fill={color} name={dataKey} />
      </RCBarChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data }: LineChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-500">Belum ada data tren.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RCLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
      </RCLineChart>
    </ResponsiveContainer>
  );
}

export function ChartSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
      <div className="h-[300px] w-full bg-slate-200 rounded animate-pulse" />
    </div>
  );
}
