'use client';

import { AppShell } from "@/components/layout/AppShell";
import { useAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    // Show nothing or a skeleton while restoring session to prevent layout flashes
    return <div className="min-h-screen bg-background flex items-center justify-center" />;
  }

  return <AppShell>{children}</AppShell>;
}
