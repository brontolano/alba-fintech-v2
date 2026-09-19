'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import SplashScreen from '@/components/auth/SplashScreen';
import Onboarding from '@/components/auth/Onboarding';

interface HomeClientProps {
  hasSession: boolean;
}

export default function HomeClient({ hasSession }: HomeClientProps) {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if onboarding has been seen
    const onboardingSeen = localStorage.getItem('alba-onboarding-seen') === 'true';
    setShowOnboarding(!onboardingSeen);
  }, []);

  useEffect(() => {
    if (!showSplash && !showOnboarding) {
      router.replace(hasSession ? '/dashboard' : '/login');
    }
  }, [hasSession, router, showOnboarding, showSplash]);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return null;
}
