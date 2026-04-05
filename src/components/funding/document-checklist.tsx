'use client';

import { useCallback, useState } from 'react';
import { CheckCircle2, Circle } from 'lucide-react';

const STORAGE_KEY = 'funding-doc-checklist';

function loadChecked(): Record<string, number[]> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveChecked(data: Record<string, number[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

interface DocumentChecklistProps {
  documents: string[];
  /** Stable key to persist checkbox state (e.g. schemeId + stepNumber) */
  stepKey?: string;
  className?: string;
}

export function DocumentChecklist({ documents, stepKey, className }: DocumentChecklistProps) {
  const [checked, setChecked] = useState<Set<number>>(() => {
    if (!stepKey) return new Set();
    const stored = loadChecked();
    const indices = stored[stepKey];
    return indices?.length ? new Set(indices) : new Set();
  });

  const toggle = useCallback((index: number) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      // Persist
      if (stepKey) {
        const stored = loadChecked();
        stored[stepKey] = Array.from(next);
        saveChecked(stored);
      }
      return next;
    });
  }, [stepKey]);

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
