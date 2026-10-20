'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LandingPagesScreen } from '@/modules/landing-pages/LandingPagesScreen';
import { useMode } from '@/lib/mode';

export default function Page() {
  const router = useRouter();
  const { mode, isLoading } = useMode();
  useEffect(() => { if (!isLoading && mode === 'email') router.replace('/'); }, [mode, isLoading, router]);
  if (mode === 'email') return null;
  return <LandingPagesScreen />;
}
