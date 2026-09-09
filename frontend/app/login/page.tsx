'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, EyeOff, ArrowLeft, ShieldAlert, Key } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { AxiosError } from 'axios';
import { authService } from '@/services/auth.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

type LoginData = z.infer<typeof loginSchema>;

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState<string | null>(null);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoggingIn },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const onLogin = async (data: LoginData) => {
    try {
      const response = await authService.login(data.email, data.password);
      login(response.access_token);
      toast.add({
        title: "Authentication Confirmed",
        description: "Welcome back to the secure network.",
        type: "success",
      });
      router.push('/dashboard');
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ error?: { message: string }, detail?: string }>;
      const errorMessage = axiosError.response?.data?.error?.message || axiosError.response?.data?.detail || "An error occurred during login.";
      toast.add({
        title: "Access Denied",
        description: errorMessage,
        type: "error",
      });
    }
  };

  const handleDemoLogin = async (role: string, email: string) => {
    setIsDemoLoading(role);
    try {
      const response = await authService.login(email, 'admin123'); // Assuming 'admin123' or known seed password
      login(response.access_token);
      toast.add({
        title: "Demo Mode Authenticated",
        description: `Logged in as ${role}`,
        type: "success",
      });
      router.push('/dashboard');
    } catch (error: unknown) {
      toast.add({
        title: "Demo Login Failed",
        description: "Seed credentials might be incorrect or database not seeded.",
        type: "error",
      });
    } finally {
      setIsDemoLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans text-slate-50 overflow-hidden relative selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Left Side: Abstract Visualization */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center border-r border-white/5">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.15),transparent_60%)]"></div>
          <div className="absolute top-1/3 -left-1/4 w-[600px] h-[600px] bg-emerald-500/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
          <div className="absolute bottom-1/4 -right-1/4 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none"></div>
        </div>

        <div className="relative z-10 p-12 max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)] mb-8">
            <ShieldAlert className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-bold mb-4">SIF SENTINEL</h1>
          <p className="text-slate-400 text-lg leading-relaxed font-light">
            Enterprise-grade safety intelligence. Access deterministic risk precursors and predict serious injuries before they occur.
          </p>
        </div>
      </div>

      {/* Right Side: Glassmorphic Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 md:p-12 relative z-10">
        <Link href="/" className="absolute top-8 left-8 lg:left-12 flex items-center gap-2 text-slate-400 hover:text-emerald-400 transition-colors group z-50">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span className="font-semibold tracking-widest text-[11px] uppercase">Back</span>
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[440px] glass-card p-10 backdrop-blur-2xl bg-slate-900/60"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-semibold mb-2">Secure Gateway</h2>
            <p className="text-slate-400 text-sm font-light">Enter your credentials to access the intelligence dashboard.</p>
          </div>

          <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-5">
            <div className="space-y-1 relative">
              <Input
                type="email"
                placeholder="Official Email"
                {...registerLogin('email')}
                disabled={isLoggingIn}
                className={`bg-slate-950/50 border ${loginErrors.email ? 'border-red-500/50' : 'border-white/10'} rounded-lg h-12 px-4 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-all`}
              />
              <AnimatePresence>
                {loginErrors.email && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px] text-red-400 absolute -bottom-5 left-1">
                    {loginErrors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-1 relative">
              <div className="relative">
                <Input
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="Password"
                  {...registerLogin('password')}
                  disabled={isLoggingIn}
                  className={`bg-slate-950/50 border ${loginErrors.password ? 'border-red-500/50' : 'border-white/10'} rounded-lg h-12 px-4 pr-12 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-all`}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <AnimatePresence>
                {loginErrors.password && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px] text-red-400 absolute -bottom-5 left-1">
                    {loginErrors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Authenticate'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <span className="text-slate-500 text-xs">Unregistered? </span>
            <Link href="/register" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors">
              Request Access
            </Link>
          </div>
          
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-2 text-slate-500 uppercase tracking-widest">SIH Demo Access</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline"
              size="sm"
              className="bg-slate-950/50 border-white/10 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 transition-all text-xs h-10 flex items-center justify-start gap-2 px-3"
              onClick={() => handleDemoLogin('ADMIN', 'admin@example.com')}
              disabled={!!isDemoLoading}
            >
              {isDemoLoading === 'ADMIN' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3 text-emerald-500" />}
              <span className="truncate">Admin</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="bg-slate-950/50 border-white/10 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-400 transition-all text-xs h-10 flex items-center justify-start gap-2 px-3"
              onClick={() => handleDemoLogin('HSE MANAGER', 'manager@example.com')}
              disabled={!!isDemoLoading}
            >
              {isDemoLoading === 'HSE MANAGER' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3 text-amber-500" />}
              <span className="truncate">HSE Manager</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="bg-slate-950/50 border-white/10 hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-400 transition-all text-xs h-10 flex items-center justify-start gap-2 px-3"
              onClick={() => handleDemoLogin('REVIEWER', 'reviewer@example.com')}
              disabled={!!isDemoLoading}
            >
              {isDemoLoading === 'REVIEWER' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3 text-blue-500" />}
              <span className="truncate">Reviewer</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="bg-slate-950/50 border-white/10 hover:bg-slate-500/20 hover:border-slate-500/40 hover:text-slate-300 transition-all text-xs h-10 flex items-center justify-start gap-2 px-3"
              onClick={() => handleDemoLogin('VIEWER', 'viewer@example.com')}
              disabled={!!isDemoLoading}
            >
              {isDemoLoading === 'VIEWER' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Key className="w-3 h-3 text-slate-400" />}
              <span className="truncate">Viewer</span>
            </Button>
          </div>

        </motion.div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500 h-8 w-8" />
      </div>
    }>
      <AuthContent />
    </React.Suspense>
  );
}
