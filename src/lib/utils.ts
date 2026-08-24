import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(typeof amount === 'number' ? amount : Number(amount));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('id-ID', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getStatusVariant(
  status: string
): 'default' | 'success' | 'warning' | 'danger' | 'outline' {
  switch (status.toLowerCase()) {
    case 'pending':
      return 'warning';
    case 'approved':
    case 'paid':
      return 'success';
    case 'rejected':
    case 'failed':
      return 'danger';
    default:
      return 'outline';
  }
}