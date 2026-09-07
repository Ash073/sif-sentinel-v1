'use client';

import React, { useState } from 'react';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { AxiosError } from 'axios';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    try {
      const response = await authService.login(email, password);
      await login(response.access_token);
      toast.add({
        title: "Authentication successful",
        description: "Welcome back to SIF Sentinel.",
        type: "success",
      });
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ detail: string }>;
      toast.add({
        title: "Authentication failed",
        description: axiosError.response?.data?.detail || "Invalid credentials or network error.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="glass-panel p-8 space-y-8">
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-2 border border-primary/20 shadow-[0_0_15px_rgba(202,60,0,0.1)]">
              <ShieldAlert className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              SIF Sentinel
            </h1>
            <p className="text-sm text-muted-foreground">
              Premium Industrial Safety Intelligence
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@sif.demo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-background/50 border-border/50 focus-visible:ring-primary/50 h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-background/50 border-border/50 focus-visible:ring-primary/50 h-11"
              />
            </div>
            
            <Button
              type="submit"
              disabled={isSubmitting || !email || !password}
              className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
          
          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border/40">
            Secure access restricted to authorized personnel only.
          </div>
        </div>
      </div>
    </div>
  );
}
