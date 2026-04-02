'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useJargon } from './jargon-provider';

interface JargonTermProps {
  term: string;
  children?: React.ReactNode;
}

export function JargonTerm({ term, children }: JargonTermProps) {
  const { jargonMap } = useJargon();
  const entry = jargonMap.get(term);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; showBelow: boolean } | null>(null);

  // Position the popover relative to the trigger (fixed positioning = viewport coords)
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 288; // w-72 = 18rem = 288px
    const popoverHeight = 200; // approximate max height
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    // Clamp to viewport
    left = Math.max(8, Math.min(left, window.innerWidth - popoverWidth - 8));
    // Show above trigger; flip below if not enough space above
    const showBelow = rect.top < popoverHeight + 8;
    const top = showBelow ? rect.bottom + 8 : rect.top - 8;
    setPos({ top, left, showBelow });
  }, []);

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return;
    updatePosition();
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleScroll() { setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, updatePosition]);

  if (!entry) {
    return <span>{children ?? term}</span>;
  }

  return (
    <>
      <span
        ref={triggerRef}
        onClick={() => setOpen(!open)}
        className="border-b border-dotted border-primary/50 cursor-help text-foreground hover:text-primary hover:border-primary transition-colors"
      >
        {children ?? term}
      </span>

      {open && pos && createPortal(
        <div
          ref={popoverRef}
          style={{ top: pos.top, left: pos.left }}
          className={cn(
            'fixed z-[100] w-72 rounded-lg border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95 duration-150',
            pos.showBelow ? '' : '-translate-y-full',
          )}
        >
          <div className="relative p-3 space-y-2">
            {/* Header */}
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-primary">{entry.term}</span>
              <span className="text-xs text-muted-foreground">—</span>
              <span className="text-xs font-semibold text-foreground">{entry.fullForm}</span>
            </div>

            {/* Explanation */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              {entry.explanation}
            </p>

            {/* Details grid */}
            {(entry.whoDoesIt || entry.typicalCostInr || entry.isReimbursed) && (
              <div className="grid gap-1.5 pt-1.5 border-t border-border">
                {entry.whoDoesIt && (
                  <div className="flex gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground shrink-0 w-14">Who:</span>
                    <span className="text-[11px] text-foreground">{entry.whoDoesIt}</span>
                  </div>
                )}
                {entry.typicalCostInr && (
                  <div className="flex gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground shrink-0 w-14">Cost:</span>
                    <span className="text-[11px] text-foreground">{entry.typicalCostInr}</span>
                  </div>
                )}
                {entry.isReimbursed && (
                  <div className="flex gap-2">
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0 w-14">Reimb:</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{entry.isReimbursed}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
