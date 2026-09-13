'use client';

import { useEffect } from 'react';

export default function PerformanceGuard() {
  // Hostinger-injected perf script reads window.performance.timing navigationStart
  // and crashes with "Cannot read properties of undefined (reading 'startTime')"
  // when timing API unavailable (VM/headless browser). Guard it.
  useEffect(() => {
    try {
      if (typeof window === 'undefined') return;
      if (!window.performance) {
        window.performance = {
          now: () => Date.now(),
          mark: () => {},
          measure: () => {},
          clearMarks: () => {},
          clearMeasures: () => {},
          getEntries: () => [],
          getEntriesByName: () => [],
          getEntriesByType: () => [],
          clearResourceTimings: () => {},
          setResourceTimingBufferSize: () => {},
        } as any;
      }
    } catch {}
  }, []);

  return null;
}
