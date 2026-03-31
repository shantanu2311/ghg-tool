'use client';

import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { Breadcrumbs } from './breadcrumbs';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileNav />
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 pt-4 pb-1">
            <Breadcrumbs />
          </div>
          <div className="px-6 py-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
