'use client';

import { Badge } from '@/components/ui/badge';
import { ExternalLink, MapPin, Mail } from 'lucide-react';

export interface ServiceProviderData {
  id: string;
  name: string;
  type: string;
  services: string[] | null;
  states: string[] | null;
  sectors: string[] | null;
  accreditation: string | null;
  contactEmail: string | null;
  website: string | null;
  address: string | null;
}

const TYPE_LABELS: Record<string, string> = {
  energy_auditor: 'Energy Auditor',
  esco: 'ESCO',
  bank: 'Bank / DFI',
  sda: 'State Agency',
  consultant: 'Portal / Consultant',
};

const TYPE_COLORS: Record<string, string> = {
  energy_auditor: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400',
  esco: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  bank: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-400',
  sda: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  consultant: 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-400',
};

export function ServiceProviderCard({ provider }: { provider: ServiceProviderData }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-card-foreground leading-snug">
          {provider.name}
        </h3>
        <Badge
          variant="outline"
          className={`shrink-0 text-[10px] ${TYPE_COLORS[provider.type] ?? ''}`}
        >
          {TYPE_LABELS[provider.type] ?? provider.type}
        </Badge>
      </div>

      {provider.accreditation && (
        <p className="text-[11px] text-muted-foreground">{provider.accreditation}</p>
      )}

      {provider.services && provider.services.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {provider.services.map((s) => (
            <span
              key={s}
              className="inline-block rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {provider.states && provider.states.length > 0 && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="h-3 w-3 shrink-0" />
          {provider.states.join(', ')}
        </p>
      )}

      <div className="flex items-center gap-3 pt-1">
        {provider.website && (
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            <ExternalLink className="h-3 w-3" />
            Website
          </a>
        )}
        {provider.contactEmail && (
          <a
            href={`mailto:${provider.contactEmail}`}
            className="text-[11px] text-primary hover:underline flex items-center gap-1"
          >
            <Mail className="h-3 w-3" />
            Email
          </a>
        )}
      </div>
    </div>
  );
}
