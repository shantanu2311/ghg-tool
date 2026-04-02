'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type DataQuality = 'PRIMARY' | 'SECONDARY' | 'ESTIMATED';

const OPTIONS: { value: DataQuality; label: string; activeClass: string }[] = [
  { value: 'PRIMARY', label: 'Primary', activeClass: 'text-emerald-600 border-emerald-200 bg-emerald-50 hover:bg-emerald-50' },
  { value: 'SECONDARY', label: 'Secondary', activeClass: 'text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-50' },
  { value: 'ESTIMATED', label: 'Estimated', activeClass: 'text-red-600 border-red-200 bg-red-50 hover:bg-red-50' },
];

interface DataQualityToggleProps {
  value: DataQuality;
  onChange: (value: DataQuality) => void;
}

export function DataQualityToggle({ value, onChange }: DataQualityToggleProps) {
  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 text-[10px] font-medium h-auto py-1.5 px-2',
            value === o.value
              ? o.activeClass
              : 'border-border text-muted-foreground hover:bg-accent',
          )}
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}
