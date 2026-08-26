'use client';

import { Badge } from './Badge';

export function TransactionStatusBadge({ status }: { status: string }) {
  const variant = (status === 'PENDING' ? 'warning' : status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : 'outline') as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

  return <Badge variant={variant}>{status}</Badge>;
}

export function TransactionTypeBadge({ type }: { type: string }) {
  const variant = type === 'INCOME' ? 'success' : 'danger';
  return <Badge variant={variant}>{type}</Badge>;
}
