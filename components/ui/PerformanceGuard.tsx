'use client';

import Script from 'next/script';

export default function PerformanceGuard() {
  // Hostinger-injected perf script reads window.performance.timing navigationStart
  // and crashes with "Cannot read properties of undefined (reading 'startTime')"
  // when timing API unavailable (VM/headless browser). Load guard synchronously.
  return (
    <Script
      src="/perf-guard.js"
      strategy="beforeInteractive"
      onError={(e) => { console.warn('[PerformanceGuard] failed', e); }}
    />
  );
}
