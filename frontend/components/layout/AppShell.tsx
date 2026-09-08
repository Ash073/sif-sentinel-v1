'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground flex flex-col relative">
      {/* Background ambient light (optional) */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none"></div>
      
      {/* Floating Header */}
      <div className="fixed top-0 left-0 right-0 z-50 pt-4 px-4 lg:px-6">
        <Header />
      </div>
      
      <div className="flex-1 flex pt-[88px] h-screen overflow-hidden">
        {/* Floating Sidebar (Left Rail) */}
        <aside className="hidden lg:flex flex-col w-[80px] shrink-0 ml-4 lg:ml-6 mb-6 border border-border bg-card/60 backdrop-blur-xl shadow-lg rounded-3xl z-40 overflow-hidden">
          <Sidebar />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-6 lg:pl-8">
          <div className="max-w-[1400px] mx-auto w-full pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
