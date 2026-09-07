'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FilePlus, History, CheckSquare, Activity,
  Shield, ShieldCheck, LogOut, User, ClipboardList, AlertTriangle, Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/AuthProvider';

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'] },
  { name: 'Reports', href: '/reports', icon: History, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'] },
  { name: 'Submit Report', href: '/reports/new', icon: FilePlus, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER'] },
  { name: 'Review Queue', href: '/reviews', icon: CheckSquare, roles: ['ADMIN', 'HSE_MANAGER', 'REVIEWER'] },
  { name: 'Corrective Actions', href: '/corrective-actions', icon: ClipboardList, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'] },
  { name: 'Precursors', href: '/precursors', icon: Activity, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'] },
  { name: 'Risk Intelligence', href: '/risk', icon: Shield, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'] },
  { name: 'Interventions', href: '/interventions', icon: ShieldCheck, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'] },
  { name: 'LSR Analytics', href: '/rules', icon: AlertTriangle, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST', 'REVIEWER', 'VIEWER'] },
  { name: 'ML Models', href: '/models', icon: Cpu, roles: ['ADMIN', 'HSE_MANAGER', 'HSE_ANALYST'] },
];

interface SidebarProps {
  isCollapsed: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isCollapsed, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isRouteActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const visibleItems = NAVIGATION_ITEMS.filter(
    (item) => !user?.role || item.roles.includes(user.role)
  );

  return (
    <div className="flex h-full flex-col gap-1 py-4">
      {/* Logo */}
      <div className="px-4 flex items-center h-10 mb-2">
        <div className={cn('flex items-center gap-2', isCollapsed && 'justify-center w-full')}>
          <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 shadow-[0_0_10px_rgba(226,92,34,0.15)] flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          {!isCollapsed && (
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">SIF Sentinel</span>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Safety Intelligence</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-3 flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-0.5">
          {visibleItems.map((item) => {
            const isActive = isRouteActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onCloseMobile}
                className={cn(
                  'w-full inline-flex items-center gap-3 h-9 rounded-lg text-sm font-medium transition-all border',
                  isCollapsed ? 'px-0 justify-center' : 'px-3',
                  isActive
                    ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
                )}
                title={isCollapsed ? item.name : undefined}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.name}</span>}
                {!isCollapsed && isActive && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Footer */}
      <div className={cn('px-3 pt-3 border-t border-border/50', isCollapsed && 'flex justify-center')}>
        {!isCollapsed && user && (
          <div className="mb-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <User className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.full_name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.role}</p>
              </div>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            'w-full gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors h-9',
            isCollapsed ? 'px-0 justify-center' : 'px-3 justify-start'
          )}
          title={isCollapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span className="text-sm">Sign Out</span>}
        </Button>
      </div>
    </div>
  );
}
