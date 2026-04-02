'use client';

import { useState, useRef, useEffect } from 'react';
import { useJargon } from './jargon-provider';

interface JargonTermProps {
  term: string;
  children?: React.ReactNode;
}

export function JargonTerm({ term, children }: JargonTermProps) {
  const { jargonMap } = useJargon();
  const entry = jargonMap.get(term);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!entry) {
    return <span>{children ?? term}</span>;
  }

  return (
    <span className="relative inline-block">
      <span
        ref={ref}
        onClick={() => setOpen(!open)}
        className="border-b border-dotted border-primary/50 cursor-help text-foreground hover:text-primary hover:border-primary transition-colors"
      >
        {children ?? term}
      </span>

      {open && (
        <div
          ref={popoverRef}
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 rounded-lg border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95 duration-150"
        >
          {/* Arrow */}
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-b border-r border-border bg-card" />

          <div className="relative p-3 space-y-2">
            {/* Header */}
            <div className="flex items-baseline gap-1.5">
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
              <div className="grid gap-1.5 pt-1 border-t border-border">
                {entry.whoDoesIt && (
                  <div className="flex gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground shrink-0 w-16">Who:</span>
                    <span className="text-[11px] text-foreground">{entry.whoDoesIt}</span>
                  </div>
                )}
                {entry.typicalCostInr && (
                  <div className="flex gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground shrink-0 w-16">Cost:</span>
                    <span className="text-[11px] text-foreground">{entry.typicalCostInr}</span>
                  </div>
                )}
                {entry.isReimbursed && (
                  <div className="flex gap-2">
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0 w-16">Reimb:</span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{entry.isReimbursed}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </span>
  );
}
