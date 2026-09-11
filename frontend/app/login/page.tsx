'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();
  
  useEffect(() => {
    // FREEZE THIS PAGE: Instantly bounce any visitor back to the landing page
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-emerald-500 h-8 w-8" />
    </div>
  );
}
