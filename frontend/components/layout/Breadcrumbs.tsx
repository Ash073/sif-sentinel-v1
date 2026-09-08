'use client';

import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { NAVIGATION_ITEMS } from './Sidebar';
import React from 'react';

export function Breadcrumbs() {
  const pathname = usePathname();

  // Simple breadcrumb generation logic
  const paths = pathname.split('/').filter(Boolean);
  
  // Find matching navigation item for the root if possible
  const rootItem = NAVIGATION_ITEMS.find(item => 
    item.href && (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)))
  );

  return (
    <div className="flex items-center text-sm text-muted-foreground">
      {pathname === '/' ? (
        <span className="font-medium text-foreground">Dashboard</span>
      ) : (
        <div className="flex items-center gap-1.5 capitalize">
          {rootItem && rootItem.href && (
            <>
              <Link href={rootItem.href} className="hover:text-foreground transition-colors">
                {rootItem.name}
              </Link>
            </>
          )}
          
          {paths.length > (rootItem?.href?.split('/').length || 1) && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-foreground truncate max-w-[200px]">
                {paths[paths.length - 1].replace(/-/g, ' ')}
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
