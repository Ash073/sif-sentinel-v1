'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { AxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
  name: z.string().min(1, 'Designation is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(12, 'Password must be at least 12 characters for compliance'),
});

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [isSignUp, setIsSignUp] = useState(searchParams?.get('mode') === 'signup');
  
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors, isSubmitting: isLoggingIn },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  const {
    register: registerSignUp,
    handleSubmit: handleRegisterSubmit,
    reset: resetRegister,
    formState: { errors: registerErrors, isSubmitting: isRegistering },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
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

  const onRegister = async (data: RegisterData) => {
    try {
      await authService.register(data.name, data.email, data.password);
      toast.add({
        title: "Clearance Granted",
        description: "Identity verified. Please sign in to initialize session.",
        type: "success",
      });
      resetRegister();
      setIsSignUp(false);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ error?: { message: string }, detail?: string }>;
      const errorMessage = axiosError.response?.data?.error?.message || axiosError.response?.data?.detail || "An error occurred during registration.";
      toast.add({
        title: "Registration Failed",
        description: errorMessage,
        type: "error",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-900 overflow-hidden relative">
      
      {/* Back Button */}
      <Link href="/" className="absolute top-8 left-8 z-[200] flex items-center gap-2 text-slate-500 hover:text-blue-900 transition-colors group">
        <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
        <span className="font-bold tracking-widest text-[11px] uppercase">Back to SIF SENTINEL</span>
      </Link>

      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-50">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] opacity-50"></div>
      </div>

      <div className="relative w-full max-w-[1000px] min-h-[650px] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-10 flex">
        
        {/* SIGN UP FORM (Left Side) */}
        <div 
          className={cn(
            "absolute top-0 left-0 h-full w-1/2 p-12 transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col justify-center",
            isSignUp ? "translate-x-full opacity-100 z-50 pointer-events-auto" : "translate-x-[90%] opacity-0 z-10 pointer-events-none scale-95"
          )}
        >
          <form onSubmit={handleRegisterSubmit(onRegister)} className="flex flex-col items-center w-full h-full justify-center">
            <h1 className="text-3xl font-display font-medium mb-2 tracking-tight text-slate-900">Initialize Identity</h1>
            <p className="text-slate-500 mb-8 font-light text-center">Secure clearance for SIF Sentinel.</p>
            
            <div className="flex flex-col gap-5 w-full max-w-[320px]">
              <div className="relative group">
                <Input
                  type="text"
                  placeholder="Designation (Username)"
                  {...registerSignUp('name')}
                  disabled={isRegistering}
                  className={`bg-slate-50 border ${registerErrors.name ? 'border-red-500' : 'border-slate-200'} rounded-lg h-12 px-4 text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-900 focus-visible:border-blue-900 transition-all group-hover:border-slate-300 shadow-sm`}
                />
                {registerErrors.name && <p className="text-[11px] text-red-500 mt-1 absolute -bottom-4 left-0">{registerErrors.name.message}</p>}
              </div>
              <div className="relative group">
                <Input
                  type="email"
                  placeholder="Official Email"
                  {...registerSignUp('email')}
                  disabled={isRegistering}
                  className={`bg-slate-50 border ${registerErrors.email ? 'border-red-500' : 'border-slate-200'} rounded-lg h-12 px-4 text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-900 focus-visible:border-blue-900 transition-all group-hover:border-slate-300 shadow-sm`}
                />
                {registerErrors.email && <p className="text-[11px] text-red-500 mt-1 absolute -bottom-4 left-0">{registerErrors.email.message}</p>}
              </div>
              <div className="relative group w-full">
                <Input
                  type={showRegisterPassword ? "text" : "password"}
                  placeholder="Encryption Key (Password)"
                  {...registerSignUp('password')}
                  disabled={isRegistering}
                  className={`bg-slate-50 border ${registerErrors.password ? 'border-red-500' : 'border-slate-200'} rounded-lg h-12 px-4 pr-12 text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-900 focus-visible:border-blue-900 transition-all group-hover:border-slate-300 shadow-sm`}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-900 transition-colors"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                >
                  {showRegisterPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
                {registerErrors.password && <p className="text-[11px] text-red-500 mt-1 absolute -bottom-4 left-0">{registerErrors.password.message}</p>}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-lg bg-blue-900 text-white hover:bg-blue-800 font-medium mt-4 shadow-md transition-all uppercase tracking-widest text-[13px]"
                disabled={isRegistering}
              >
                {isRegistering ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Request Access'}
              </Button>
            </div>
          </form>
        </div>

        {/* SIGN IN FORM (Right Side) */}
        <div 
          className={cn(
            "absolute top-0 left-0 h-full w-1/2 p-12 transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col justify-center",
            isSignUp ? "-translate-x-[10%] opacity-0 z-10 pointer-events-none scale-95" : "translate-x-0 opacity-100 z-50 pointer-events-auto"
          )}
        >
          <form onSubmit={handleLoginSubmit(onLogin)} className="flex flex-col items-center w-full h-full justify-center">
            <h1 className="text-3xl font-display font-medium mb-2 tracking-tight text-slate-900">Secure Gateway</h1>
            <p className="text-slate-500 mb-8 font-light text-center">Enter credentials to authenticate session.</p>
            
            <div className="flex flex-col gap-5 w-full max-w-[320px]">
              <div className="relative group">
                <Input
                  type="email"
                  placeholder="Official Email"
                  {...registerLogin('email')}
                  disabled={isLoggingIn}
                  className={`bg-slate-50 border ${loginErrors.email ? 'border-red-500' : 'border-slate-200'} rounded-lg h-12 px-4 text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-900 focus-visible:border-blue-900 transition-all group-hover:border-slate-300 shadow-sm`}
                />
                {loginErrors.email && <p className="text-[11px] text-red-500 mt-1 absolute -bottom-4 left-0">{loginErrors.email.message}</p>}
              </div>
              <div className="relative group w-full">
                <Input
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="Encryption Key (Password)"
                  {...registerLogin('password')}
                  disabled={isLoggingIn}
                  className={`bg-slate-50 border ${loginErrors.password ? 'border-red-500' : 'border-slate-200'} rounded-lg h-12 px-4 pr-12 text-slate-900 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-blue-900 focus-visible:border-blue-900 transition-all group-hover:border-slate-300 shadow-sm`}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-900 transition-colors"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                >
                  {showLoginPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
                {loginErrors.password && <p className="text-[11px] text-red-500 mt-1 absolute -bottom-4 left-0">{loginErrors.password.message}</p>}
              </div>

              <div className="flex justify-end w-full">
                <button type="button" className="text-xs text-slate-500 hover:text-blue-900 transition-colors mt-2">Emergency Reset?</button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-medium shadow-md transition-all uppercase tracking-widest text-[13px]"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Authenticate'}
              </Button>
            </div>
          </form>
        </div>

        {/* OVERLAY CONTAINER (The Sliding Door) */}
        <div 
          className={cn(
            "absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-all duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] z-[100] shadow-2xl",
            isSignUp ? "-translate-x-full" : "translate-x-0"
          )}
        >
          <div 
            className={cn(
              "bg-blue-900 relative h-full w-[200%] -left-full transition-transform duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] text-white",
              isSignUp ? "translate-x-1/2" : "translate-x-0"
            )}
          >
            {/* Dynamic Sliding Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent z-0"></div>
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-400/20 rounded-full blur-[100px] mix-blend-screen opacity-50 z-0"></div>
            
            {/* OVERLAY LEFT (Shown when Sign Up is active) */}
            <div 
              className={cn(
                "absolute w-1/2 h-full flex flex-col items-center justify-center text-center px-16 transition-transform duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] z-10",
                isSignUp ? "translate-x-0" : "-translate-x-[30%]"
              )}
            >
              <ShieldCheck className="w-16 h-16 text-blue-200 mb-6 opacity-90" />
              <h2 className="text-3xl font-medium mb-4 font-display">System Authorized?</h2>
              <p className="text-blue-100/80 mb-10 font-light leading-relaxed">
                If you already possess clearance, proceed to the secure gateway to resume operations.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setIsSignUp(false)}
                className="rounded-lg px-8 py-6 border border-white/20 text-white hover:bg-white/10 hover:border-white/40 font-medium bg-transparent backdrop-blur-sm uppercase tracking-widest text-[12px] transition-all"
              >
                Sign In Phase
              </Button>
            </div>

            {/* OVERLAY RIGHT (Shown when Sign In is active) */}
            <div 
              className={cn(
                "absolute right-0 w-1/2 h-full flex flex-col items-center justify-center text-center px-16 transition-transform duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] z-10",
                isSignUp ? "translate-x-[30%]" : "translate-x-0"
              )}
            >
              <ShieldCheck className="w-16 h-16 text-blue-200 mb-6 opacity-90" />
              <h2 className="text-3xl font-medium mb-4 font-display">Unregistered Status?</h2>
              <p className="text-blue-100/80 mb-10 font-light leading-relaxed">
                New analysts must establish their identity profile before accessing predictive insights.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setIsSignUp(true)}
                className="rounded-lg px-8 py-6 border border-white/20 text-white hover:bg-white/10 hover:border-white/40 font-medium bg-transparent backdrop-blur-sm uppercase tracking-widest text-[12px] transition-all"
              >
                Initialize Profile
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="relative">
            <div className="absolute inset-0 bg-blue-900/10 blur-xl rounded-full"></div>
            <Loader2 className="animate-spin text-blue-900 h-10 w-10 relative z-10" />
        </div>
      </div>
    }>
      <AuthContent />
    </React.Suspense>
  );
}
