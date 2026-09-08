'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, Search, ShieldAlert, HelpCircle, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRef } from 'react';

export function Header() {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    if (newIsDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="h-[64px] flex items-center justify-between px-6 bg-card/60 backdrop-blur-2xl border border-border shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-full w-full">
      
      {/* Left: Logo */}
      <div className="flex items-center w-[200px]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-[16px] tracking-tight text-foreground hidden sm:inline-block">FinexySentinel</span>
        </Link>
      </div>

      {/* Middle: Empty space, because nav is in sidebar */}
      <div className="flex-1 hidden lg:flex"></div>

      {/* Right: Search, Notifications, Profile */}
      <div className="flex items-center gap-4">
        
        {/* Search, Bell, Help Pill */}
        <div className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-full h-[40px] px-1 gap-1">
          <div className="relative group">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-hover:text-slate-600 transition-colors" />
            <input 
              type="text" 
              placeholder="Search" 
              className="h-[38px] w-32 pl-9 pr-2 rounded-full bg-transparent border-transparent focus:w-48 text-[13px] text-slate-900 placeholder:text-slate-400 transition-all outline-none"
            />
          </div>
          
          <div className="h-4 w-px bg-slate-200 mx-1"></div>
          
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 rounded-full text-slate-500 hover:bg-white hover:shadow-sm transition-all">
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-white hover:shadow-sm transition-all">
            <Bell className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-500 hover:bg-white hover:shadow-sm transition-all">
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>

        {/* Profile Pill */}
        {user && (
          <div className="relative" ref={profileRef}>
            <button 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 h-[40px] pl-1.5 pr-4 rounded-full border border-border bg-card hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                {user.full_name?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:flex flex-col items-start text-left">
                 <span className="text-[12px] font-semibold leading-none text-foreground">{user.full_name}</span>
                 <span className="text-[10px] text-muted-foreground leading-none mt-1 truncate max-w-[100px]">{user.email}</span>
              </div>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border shadow-lg rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                <div className="p-3">
                  <p className="text-[13px] font-medium leading-none text-foreground">{user.full_name}</p>
                  <p className="text-[11px] leading-none text-muted-foreground mt-1.5">{user.role.replace('_', ' ')}</p>
                </div>
                <div className="h-px bg-border w-full"></div>
                <div className="p-1">
                  <button 
                    onClick={() => { setProfileOpen(false); logout(); }} 
                    className="w-full text-left px-2 py-2 text-[13px] text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
