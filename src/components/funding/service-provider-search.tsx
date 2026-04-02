'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox } from 'lucide-react';
import { ServiceProviderCard, type ServiceProviderData } from './service-provider-card';

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'energy_auditor', label: 'Energy Auditors' },
  { value: 'esco', label: 'ESCOs' },
  { value: 'bank', label: 'Banks & DFIs' },
  { value: 'sda', label: 'State Agencies (SDAs)' },
  { value: 'consultant', label: 'Portals & Consultants' },
];

interface ServiceProviderSearchProps {
  defaultState?: string;
  className?: string;
}

export function ServiceProviderSearch({ defaultState, className }: ServiceProviderSearchProps) {
  const [providers, setProviders] = useState<ServiceProviderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (defaultState) params.set('state', defaultState);

    fetch(`/api/service-providers?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setProviders(Array.isArray(data) ? data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [defaultState]);

  const filtered = typeFilter === 'all'
    ? providers
    : providers.filter((p) => p.type === typeFilter);

  return (
    <div className={className}>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={typeFilter} onValueChange={(val) => val && setTypeFilter(val)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue>
              {() => TYPE_OPTIONS.find((o) => o.value === typeFilter)?.label ?? 'All Types'}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? 'provider' : 'providers'}
          {defaultState && ` for ${defaultState}`}
        </p>
      </div>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((p) => (
            <ServiceProviderCard key={p.id} provider={p} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
          <Inbox className="h-8 w-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No providers found</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Try changing the filter or check back later.
          </p>
        </div>
      )}
    </div>
  );
}
