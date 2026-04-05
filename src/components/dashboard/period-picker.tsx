'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from 'lucide-react';

interface PeriodOption {
  id: string;
  orgId: string;
  startDate: string;
  endDate: string;
  status: string;
  organisation: { name: string };
}

interface PeriodPickerProps {
  selectedId: string | null;
  onSelect: (periodId: string) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

function formatLabel(p: PeriodOption, showOrg: boolean) {
  const dateRange = `${formatDate(p.startDate)} – ${formatDate(p.endDate)}`;
  return showOrg ? `${p.organisation.name} · ${dateRange}` : dateRange;
}

export default function PeriodPicker({ selectedId, onSelect }: PeriodPickerProps) {
  const [periods, setPeriods] = useState<PeriodOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/periods')
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const calculated = (data ?? []).filter(
          (p: PeriodOption) => p.status === 'calculated'
        );
        setPeriods(calculated);
      })
      .catch(() => {
        if (!cancelled) setPeriods([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Group periods by organisation
  const { groups, multiOrg } = useMemo(() => {
    const orgMap = new Map<string, { name: string; periods: PeriodOption[] }>();
    for (const p of periods) {
      const existing = orgMap.get(p.orgId);
      if (existing) {
        existing.periods.push(p);
      } else {
        orgMap.set(p.orgId, { name: p.organisation.name, periods: [p] });
      }
    }
    return {
      groups: Array.from(orgMap.values()),
      multiOrg: orgMap.size > 1,
    };
  }, [periods]);

  if (loading) {
    return <Skeleton className="h-8 w-56" />;
  }

  if (periods.length <= 1) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <Select value={selectedId ?? undefined} onValueChange={(val) => { if (val) onSelect(val); }}>
        <SelectTrigger className="w-auto min-w-52">
          <SelectValue placeholder="Select analysis" />
        </SelectTrigger>
        <SelectContent>
          {multiOrg ? (
            // Multiple orgs: group with labels
            groups.map((group, gi) => (
              <SelectGroup key={group.name}>
                {gi > 0 && <SelectSeparator />}
                <SelectLabel>{group.name}</SelectLabel>
                {group.periods.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {formatDate(p.startDate)} – {formatDate(p.endDate)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))
          ) : (
            // Single org: just list periods
            periods.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {formatLabel(p, false)}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
