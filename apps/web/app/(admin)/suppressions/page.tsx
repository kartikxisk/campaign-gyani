'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SuppressionsScreen } from '@/modules/suppressions/SuppressionsScreen';
import { useMode } from '@/lib/mode';

export default function Page() {
  const router = useRouter();
  const { mode, isLoading } = useMode();
  useEffect(() => { if (!isLoading && mode !== 'email') router.replace('/'); }, [mode, isLoading, router]);
  if (mode !== 'email') return null;
  return <SuppressionsScreen />;
}
