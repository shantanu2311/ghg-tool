'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  wizard: 'New Inventory',
  recommendations: 'Recommendations',
  funding: 'Funding Directory',
  report: 'Report',
};

// Detect dynamic segments (CUIDs, UUIDs, etc.) — typically 20+ char alphanumeric strings
function isDynamicSegment(seg: string): boolean {
  return /^[a-z0-9]{20,}$/i.test(seg) || /^[0-9a-f]{8}-/.test(seg);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments
    .filter((seg) => !isDynamicSegment(seg)) // Skip raw IDs from breadcrumbs
    .map((seg, i, filteredSegs) => {
      // Reconstruct href using original segments up to this filtered segment's position
      const originalIndex = segments.indexOf(seg);
      const href = '/' + segments.slice(0, originalIndex + 1).join('/');
      const label = ROUTE_LABELS[seg] || seg.charAt(0).toUpperCase() + seg.slice(1);
      const isLast = i === filteredSegs.length - 1;
      return { href, label, isLast };
    });

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/50" />}
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
