'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Activity, ShieldCheck, 
  LogOut, FileText, CheckSquare, ChevronRight,
  Brain, Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/AuthProvider';
import { useState, useRef, useEffect } from 'react';

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'] },
  { name: 'Reports', href: '/reports', icon: FileText, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'] },
  { name: 'Human Reviews', href: '/reviews', icon: CheckSquare, roles: ['ADMIN', 'REVIEWER'] },
  { name: 'AI Copilot', href: '/copilot', icon: Brain, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'] },
  { 
    name: 'Intelligence', 
    icon: Activity, 
    roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'],
    children: [
      { name: 'Risk Intelligence', href: '/risk' },
      { name: 'Precursors', href: '/precursors' },
      { name: 'ML Models', href: '/models' }
    ]
  },
  { 
    name: 'Operations', 
    icon: ShieldCheck, 
    roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'],
    children: [
      { name: 'Interventions', href: '/interventions' },
      { name: 'Corrective Actions', href: '/corrective-actions' },
      { name: 'Life-Saving Rules', href: '/rules' }
    ]
  },
  { name: 'Admin', href: '/admin', icon: Settings, roles: ['ADMIN'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isRouteActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isParentActive = (item: any) => {
    if (item.href && isRouteActive(item.href)) return true;
    if (item.children) {
      return item.children.some((child: any) => isRouteActive(child.href));
    }
    return false;
  };

  const visibleItems = NAVIGATION_ITEMS.filter(
    (item) => !user?.role || item.roles.includes(user.role)
  );

  return (
    <div className="flex h-full flex-col bg-transparent items-center py-6">


      {/* Navigation Rail */}
      <div className="flex-1 overflow-y-auto w-full flex flex-col items-center gap-3 mt-4" ref={menuRef}>
        {visibleItems.map((item) => {
          const isActive = isParentActive(item);
          
          if (item.children) {
            const isOpen = openMenu === item.name;
            return (
              <div key={item.name} className="relative">
                <button
                  title={item.name}
                  onClick={() => setOpenMenu(isOpen ? null : item.name)}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center transition-all group focus:outline-none',
                    isActive || isOpen
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" strokeWidth={isActive ? 2.5 : 2} />
                </button>

                {isOpen && (
                  <div className="absolute left-full top-0 ml-4 w-48 bg-card border border-border shadow-xl rounded-xl z-50 overflow-hidden animate-in slide-in-from-left-2 duration-100">
                    <div className="px-3 py-2 border-b border-border">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{item.name}</span>
                    </div>
                    <div className="p-1">
                      {item.children.map((child) => {
                        const isChildActive = isRouteActive(child.href);
                        return (
                          <Link 
                            key={child.name} 
                            href={child.href} 
                            onClick={() => setOpenMenu(null)}
                            className={cn(
                              "w-full flex items-center gap-2 px-3 py-2 rounded-md text-[13px] transition-colors", 
                              isChildActive ? "text-primary font-medium bg-primary/10" : "text-foreground hover:bg-muted/50"
                            )}
                          >
                            {child.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href!}
              title={item.name}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all group relative',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" strokeWidth={isActive ? 2.5 : 2} />
            </Link>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="pt-6 flex flex-col items-center gap-3 w-full">
        <button
          onClick={logout}
          title="Sign Out"
          className="w-10 h-10 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all group"
        >
          <LogOut className="w-5 h-5 transition-transform group-hover:scale-110" />
        </button>
      </div>
    </div>
  );
}
