'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, FilePlus, History, CheckSquare, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export const NAVIGATION_ITEMS = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'New Report', href: '/reports/new', icon: FilePlus },
  { name: 'Reports History', href: '/reports', icon: History, exact: true },
  { name: 'Review Queue', href: '/reviews', icon: CheckSquare },
  { name: 'Precursors', href: '/precursors', icon: Activity },
];

interface SidebarProps {
  isCollapsed: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isCollapsed, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();

  const isRouteActive = (href: string, exact?: boolean) => {
    if (href === '/') return pathname === '/';
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col gap-4 py-4">
      <div className="px-4 flex items-center h-10">
        <div className={cn("flex items-center gap-2", isCollapsed && "justify-center w-full")}>
          <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 shadow-[0_0_10px_rgba(202,60,0,0.1)] flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          {!isCollapsed && (
            <span className="font-semibold text-lg tracking-tight truncate">SIF Sentinel</span>
          )}
        </div>
      </div>
      
      <div className="px-3 flex-1 overflow-y-auto">
        <nav className="flex flex-col gap-1">
          {NAVIGATION_ITEMS.map((item) => {
            const isActive = isRouteActive(item.href, item.exact);
            return (
              <Link key={item.name} href={item.href} onClick={onCloseMobile}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 transition-colors",
                    isCollapsed ? "px-0 justify-center" : "px-3",
                    isActive ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-accent border border-transparent"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
