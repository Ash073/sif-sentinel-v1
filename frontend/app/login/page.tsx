'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { AxiosError } from 'axios';
import { cn } from '@/lib/utils';
import { authService } from '@/services/auth.service';

function AuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [isSignUp, setIsSignUp] = useState(searchParams?.get('mode') === 'signup');
  
  // Sign In State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sign Up State
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  // The mode is already evaluated in the initial state of isSignUp

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const response = await authService.login(loginEmail, loginPassword);
      login(response.access_token);
      toast.add({
        title: "Login successful",
        description: "Welcome back to SIF Sentinel.",
        type: "success",
      });
      router.push('/');
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ error?: { message: string }, detail?: string }>;
      const errorMessage = axiosError.response?.data?.error?.message || axiosError.response?.data?.detail || "An error occurred during login.";
      toast.add({
        title: "Login failed",
        description: errorMessage,
        type: "error",
      });
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registerPassword.length < 12) {
      toast.add({
        title: "Password too short",
        description: "Your password must be at least 12 characters long.",
        type: "warning",
      });
      return;
    }

    setIsRegistering(true);
    try {
      await authService.register(registerName, registerEmail, registerPassword);
      toast.add({
        title: "Registration successful",
        description: "Your account has been created. Please log in.",
        type: "success",
      });
      // Clear register form and slide to login
      setRegisterPassword('');
      setIsSignUp(false);
    } catch (error: unknown) {
      const axiosError = error as AxiosError<{ error?: { message: string }, detail?: string }>;
      const errorMessage = axiosError.response?.data?.error?.message || axiosError.response?.data?.detail || "An error occurred during registration.";
      toast.add({
        title: "Registration failed",
        description: errorMessage,
        type: "error",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4 font-sans text-slate-800">
      <div className="relative w-full max-w-[900px] min-h-[600px] bg-white rounded-[30px] shadow-2xl overflow-hidden">
        
        {/* SIGN UP FORM (Left Side) */}
        <div 
          className={cn(
            "absolute top-0 left-0 h-full w-1/2 p-12 transition-all duration-700 ease-in-out flex flex-col justify-center",
            isSignUp ? "translate-x-full opacity-100 z-50" : "opacity-0 z-10"
          )}
        >
          <form onSubmit={handleRegister} className="flex flex-col items-center w-full h-full justify-center">
            <h1 className="text-4xl font-bold mb-6 text-slate-800">Sign up</h1>
            
            <div className="flex flex-col gap-4 w-full max-w-[300px]">
              <Input
                type="text"
                placeholder="Username"
                value={registerName}
                onChange={(e) => setRegisterName(e.target.value)}
                required
                disabled={isRegistering}
                className="bg-slate-100 border-none rounded-xl h-12 px-4 focus-visible:ring-indigo-500"
              />
              <Input
                type="email"
                placeholder="Email"
                value={registerEmail}
                onChange={(e) => setRegisterEmail(e.target.value)}
                required
                disabled={isRegistering}
                className="bg-slate-100 border-none rounded-xl h-12 px-4 focus-visible:ring-indigo-500"
              />
              <div className="relative w-full">
                <Input
                  type={showRegisterPassword ? "text" : "password"}
                  placeholder="Password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                  disabled={isRegistering}
                  className="bg-slate-100 border-none rounded-xl h-12 px-4 pr-10 focus-visible:ring-indigo-500"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                >
                  {showRegisterPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold mt-2 shadow-[0_4px_14px_0_rgba(99,102,241,0.39)]"
                disabled={isRegistering || !registerName || !registerEmail || !registerPassword}
              >
                {isRegistering ? <Loader2 className="h-5 w-5 animate-spin" /> : 'SIGN UP'}
              </Button>
            </div>

            <div className="mt-8 text-center text-sm text-slate-500">
              <p className="mb-4">Or sign up with social platforms</p>
              <div className="flex gap-4 justify-center">
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-indigo-500 font-bold">G</div>
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-indigo-500 font-bold">F</div>
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-indigo-500 font-bold">in</div>
              </div>
            </div>
          </form>
        </div>

        {/* SIGN IN FORM (Right Side) */}
        <div 
          className={cn(
            "absolute top-0 left-0 h-full w-1/2 p-12 transition-all duration-700 ease-in-out flex flex-col justify-center",
            isSignUp ? "translate-x-full opacity-0 z-10" : "opacity-100 z-50"
          )}
        >
          <form onSubmit={handleLogin} className="flex flex-col items-center w-full h-full justify-center">
            <h1 className="text-4xl font-bold mb-6 text-slate-800">Sign in</h1>
            
            <div className="flex flex-col gap-4 w-full max-w-[300px]">
              <Input
                type="email"
                placeholder="Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                disabled={isLoggingIn}
                className="bg-slate-100 border-none rounded-xl h-12 px-4 focus-visible:ring-indigo-500"
              />
              <div className="relative w-full">
                <Input
                  type={showLoginPassword ? "text" : "password"}
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  disabled={isLoggingIn}
                  className="bg-slate-100 border-none rounded-xl h-12 px-4 pr-10 focus-visible:ring-indigo-500"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                >
                  {showLoginPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 rounded-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold mt-2 shadow-[0_4px_14px_0_rgba(99,102,241,0.39)]"
                disabled={isLoggingIn || !loginEmail || !loginPassword}
              >
                {isLoggingIn ? <Loader2 className="h-5 w-5 animate-spin" /> : 'LOGIN'}
              </Button>
            </div>

            <div className="mt-8 text-center text-sm text-slate-500">
              <p className="mb-4">Or sign in with social platforms</p>
              <div className="flex gap-4 justify-center">
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-indigo-500 font-bold">G</div>
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-indigo-500 font-bold">F</div>
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors text-indigo-500 font-bold">in</div>
              </div>
            </div>
          </form>
        </div>

        {/* OVERLAY CONTAINER */}
        <div 
          className={cn(
            "absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-[100]",
            isSignUp ? "-translate-x-full" : "translate-x-0"
          )}
          style={{
            borderRadius: isSignUp ? '0 100px 100px 0' : '100px 0 0 100px'
          }}
        >
          <div 
            className={cn(
              "bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 relative h-full w-[200%] -left-full transition-transform duration-700 ease-in-out text-white",
              isSignUp ? "translate-x-1/2" : "translate-x-0"
            )}
          >
            {/* OVERLAY LEFT (Shown when Sign Up is active) */}
            <div 
              className={cn(
                "absolute w-1/2 h-full flex flex-col items-center justify-center text-center px-12 transition-transform duration-700 ease-in-out",
                isSignUp ? "translate-x-0" : "-translate-x-[20%]"
              )}
            >
              <h2 className="text-4xl font-bold mb-4">One of us?</h2>
              <p className="text-lg mb-8 font-light max-w-[250px]">
                Welcome back! Sign in to continue your journey with us.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setIsSignUp(false)}
                className="rounded-full px-12 py-6 border-2 border-white text-white hover:bg-white hover:text-indigo-600 font-bold bg-transparent tracking-widest uppercase"
              >
                Sign In
              </Button>
            </div>

            {/* OVERLAY RIGHT (Shown when Sign In is active) */}
            <div 
              className={cn(
                "absolute right-0 w-1/2 h-full flex flex-col items-center justify-center text-center px-12 transition-transform duration-700 ease-in-out",
                isSignUp ? "translate-x-[20%]" : "translate-x-0"
              )}
            >
              <h2 className="text-4xl font-bold mb-4">New here?</h2>
              <p className="text-lg mb-8 font-light max-w-[250px]">
                Join us today and discover a world of possibilities. Create your account in seconds!
              </p>
              <Button 
                variant="outline" 
                onClick={() => setIsSignUp(true)}
                className="rounded-full px-12 py-6 border-2 border-white text-white hover:bg-white hover:text-indigo-600 font-bold bg-transparent tracking-widest uppercase"
              >
                Sign Up
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
    <React.Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center"><Loader2 className="animate-spin text-white h-8 w-8" /></div>}>
      <AuthContent />
    </React.Suspense>
  );
}
