'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '@/lib/utils';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col border-r border-border/40 bg-card/30 backdrop-blur-md transition-all duration-300 ease-in-out relative z-40",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}
      >
        <Sidebar isCollapsed={isSidebarCollapsed} />
        
        {/* Collapse Toggle */}
        <div className="absolute -right-3 top-6">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full border-border/50 bg-background text-muted-foreground hover:text-foreground shadow-sm z-50"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-3.5 w-3.5" />
            ) : (
              <PanelLeftClose className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileOpen(false)}
          />
          <div className="relative flex w-full max-w-xs flex-1 flex-col bg-card shadow-2xl border-r border-border/50 z-50">
            <Sidebar isCollapsed={false} onCloseMobile={() => setIsMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setIsMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
