// components/santri/Badge.tsx
import React from 'react';

export interface BadgeProps {
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'DELETED' | 'UNKNOWN' | 'PAID' | 'UNPAID' | 'PARTIAL' | 'CANCELLED';
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
  children?: React.ReactNode;
  className?: string;
}

export function Badge({ status, variant, children, className = '' }: BadgeProps) {
  // If variant is provided, use it (new API)
  if (variant) {
    const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';
    const styles = {
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800',
      default: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`${base} ${styles[variant]} ${className}`} aria-label={`Status: ${children || variant}`}>
        {children}
      </span>
    );
  }

  // Fallback to status-based API (old API)
  const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold';
  const styles = {
    ACTIVE: 'bg-green-100 text-green-800',
    INACTIVE: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    DELETED: 'bg-gray-100 text-gray-600',
    UNKNOWN: 'bg-gray-100 text-gray-600',
    PAID: 'bg-green-100 text-green-800',
    UNPAID: 'bg-red-100 text-red-800',
    PARTIAL: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-gray-100 text-gray-600',
  };
  const labels = {
    ACTIVE: 'Aktif',
    INACTIVE: 'Tidak Aktif',
    PENDING: 'Pending',
    DELETED: 'Dihapus',
    UNKNOWN: 'Tidak Diketahui',
    PAID: 'Lunas',
    UNPAID: 'Belum Bayar',
    PARTIAL: 'Cicilan',
    CANCELLED: 'Dibatalkan',
  };
  const s = status || 'UNKNOWN';
  return (
    <span
      className={`${base} ${styles[s]} ${className}`}
      aria-label={`Status: ${labels[s]}`}
    >
      {labels[s]}
    </span>
  );
}
