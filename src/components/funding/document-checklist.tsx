'use client';

import { useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

interface DocumentChecklistProps {
  documents: string[];
  className?: string;
}

export function DocumentChecklist({ documents, className }: DocumentChecklistProps) {
  const [checked, setChecked] = useState<Set<number>>(new Set());

  function toggle(index: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  const completed = checked.size;
  const total = documents.length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-muted-foreground">Documents needed</p>
        <p className="text-[11px] text-muted-foreground">
          {completed}/{total} ready
        </p>
      </div>
      <div className="space-y-1">
        {documents.map((doc, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className="flex items-start gap-2 w-full text-left py-1 group"
          >
            {checked.has(i) ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <Circle className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground/70 shrink-0 mt-0.5" />
            )}
            <span
              className={`text-xs leading-relaxed ${
                checked.has(i)
                  ? 'text-muted-foreground line-through'
                  : 'text-foreground'
              }`}
            >
              {doc}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
