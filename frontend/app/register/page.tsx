'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { AxiosError } from 'axios';
import Link from 'next/link';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.add({
        title: "Passwords do not match",
        description: "Please ensure your passwords match.",
        type: "error",
      });
      return;
    }

    if (password.length < 12) {
      toast.add({
        title: "Password too short",
        description: "Your password must be at least 12 characters long to meet security requirements.",
        type: "warning",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await authService.register(fullName, email, password);
      toast.add({
        title: "Registration successful",
        description: "Your account has been created. Please log in.",
        type: "success",
      });
      router.push('/login');
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ detail: string }>;
      toast.add({
        title: "Registration failed",
        description: axiosError.response?.data?.detail || "An error occurred during registration.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background aesthetic */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      
      <div className="relative z-10 w-full max-w-md">
        
        {/* Branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20 backdrop-blur-md mb-4 shadow-[0_0_15px_rgba(202,60,0,0.1)]">
            <ShieldAlert className="size-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">SIF Sentinel</h1>
          <p className="text-muted-foreground mt-2">Create a new account</p>
        </div>

        {/* Form Card */}
        <div className="glass-panel p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Full Name</label>
                <Input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 h-11 focus-visible:ring-primary/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Email Address</label>
                <Input
                  type="email"
                  placeholder="name@example.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting}
                  className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 h-11 focus-visible:ring-primary/50"
                />
              </div>
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-slate-300">Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 12 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 h-11 pr-10 focus-visible:ring-primary/50"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2 relative">
                <label className="text-sm font-medium text-slate-300">Confirm Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                    className="bg-black/20 border-white/10 text-white placeholder:text-slate-500 h-11 pr-10 focus-visible:ring-primary/50"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
              disabled={isSubmitting || !email || !password || !fullName || !confirmPassword}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm text-muted-foreground pt-4 border-t border-border/40">
            Already have an account? <Link href="/login" className="text-primary font-medium hover:underline">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
