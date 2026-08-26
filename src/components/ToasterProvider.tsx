'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function ToasterProvider() {
  return <SonnerToaster position="top-right" closeButton rich-colors duration={4000} />;
}
