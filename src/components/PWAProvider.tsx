'use client';

interface PWAProviderProps {
  children?: React.ReactNode;
}

// PWAProvider is a void component - it registers SW and doesn't render children
// children prop is accepted but not used (for type compatibility)
export function PWAProvider({}: PWAProviderProps) {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    });
  }

  return null;
}
