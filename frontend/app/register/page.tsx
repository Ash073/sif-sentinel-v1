'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { AxiosError } from 'axios';
import { authService } from '@/services/auth.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';

const registerSchema = z.object({
  name: z.string().min(1, 'Name/Designation is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(12, 'Password must be at least 12 characters for compliance'),
});

type RegisterData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  
  const [showPassword, setShowPassword] = useState(false);

  const {
    register: registerSignUp,
    handleSubmit: handleRegisterSubmit,
    formState: { errors: registerErrors, isSubmitting: isRegistering },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  const onRegister = async (data: RegisterData) => {
    try {
      await authService.register(data.name, data.email, data.password);
      toast.add({
        title: "Clearance Granted",
        description: "Identity verified. Please sign in to initialize session.",
        type: "success",
      });
      router.push('/login');
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
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Initialize Clearance</h1>
          <p className="text-slate-400 text-lg leading-relaxed font-light">
            Join the SIF Sentinel network. Register your credentials to access deterministic safety intelligence and prevent critical incidents.
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
            <h2 className="text-2xl font-semibold mb-2">Request Access</h2>
            <p className="text-slate-400 text-sm font-light">Establish your identity profile to begin.</p>
          </div>

          <form onSubmit={handleRegisterSubmit(onRegister)} className="space-y-5">
            <div className="space-y-1 relative">
              <Input
                type="text"
                placeholder="Designation (Username)"
                {...registerSignUp('name')}
                disabled={isRegistering}
                className={`bg-slate-950/50 border ${registerErrors.name ? 'border-red-500/50' : 'border-white/10'} rounded-lg h-12 px-4 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-all`}
              />
              <AnimatePresence>
                {registerErrors.name && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px] text-red-400 absolute -bottom-5 left-1">
                    {registerErrors.name.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-1 relative">
              <Input
                type="email"
                placeholder="Official Email"
                {...registerSignUp('email')}
                disabled={isRegistering}
                className={`bg-slate-950/50 border ${registerErrors.email ? 'border-red-500/50' : 'border-white/10'} rounded-lg h-12 px-4 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-all`}
              />
              <AnimatePresence>
                {registerErrors.email && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px] text-red-400 absolute -bottom-5 left-1">
                    {registerErrors.email.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-1 relative">
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Encryption Key (Password)"
                  {...registerSignUp('password')}
                  disabled={isRegistering}
                  className={`bg-slate-950/50 border ${registerErrors.password ? 'border-red-500/50' : 'border-white/10'} rounded-lg h-12 px-4 pr-12 text-white placeholder:text-slate-500 focus-visible:ring-1 focus-visible:ring-emerald-500/50 focus-visible:border-emerald-500/50 transition-all`}
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-emerald-400 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <AnimatePresence>
                {registerErrors.password && (
                  <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[11px] text-red-400 absolute -bottom-5 left-1">
                    {registerErrors.password.message}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]"
                disabled={isRegistering}
              >
                {isRegistering ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Initialize Identity'}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <span className="text-slate-500 text-xs">Already possess clearance? </span>
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 text-xs font-medium transition-colors">
              Secure Gateway
            </Link>
          </div>
          
        </motion.div>
      </div>
    </div>
  );
}
