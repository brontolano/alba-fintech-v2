// app/santris/page.tsx
import type { Metadata } from 'next';
import { SantriListClient } from '../../components/santri/SantriListClient';

export const metadata: Metadata = {
  title: 'Data Santri | ALBA Finance',
  description: 'Manajemen data santri di unit KPAK',
};

export default function SantrisPage() {
  return <SantriListClient />;
}
