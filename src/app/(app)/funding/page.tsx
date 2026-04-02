'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, ChevronDown, ExternalLink, Landmark, Search, Inbox, FileText } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';

interface FundingScheme {
  id: string;
  schemeId: string;
  name: string;
  implementingAgency: string;
  targetBeneficiary: string;
  supportType: string;
  financialDetails: string;
  sectorsCovered: string;
  eligibilityCriteria: string;
  requiredDocuments: string;
  turnoverBrackets: string;
  applicableStates: string;
  status: string;
  validFrom: string | null;
  validTo: string | null;
  applicationUrl: string | null;
  reportedImpact: string | null;
  source: string;
  sourceUrl: string | null;
}

function parseJsonField(val: string | null): string[] {
  if (!val) return [];
  try { return JSON.parse(val); } catch { return []; }
}

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Proposed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Closed: 'bg-muted text-muted-foreground',
};

export default function FundingDirectoryPage() {
  const [schemes, setSchemes] = useState<FundingScheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/funding')
      .then((r) => r.json())
      .then((data) => setSchemes(data ?? []))
      .catch(() => setSchemes([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = schemes.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.implementingAgency.toLowerCase().includes(q) ||
        s.supportType.toLowerCase().includes(q) ||
        s.targetBeneficiary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Funding Directory</h1>
          <p className="text-sm text-muted-foreground">Loading schemes...</p>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Landmark className="h-6 w-6 text-muted-foreground" />
          Funding Directory
          <InfoTip text="Government schemes and subsidies for MSME energy efficiency and emission reduction projects." />
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Government schemes and subsidies for MSME emission reduction -- {schemes.length} schemes
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search schemes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'Active', 'Proposed', 'Closed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                statusFilter === s
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border text-muted-foreground hover:bg-accent',
              )}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{filtered.length} results</span>
      </div>

      {/* Scheme Cards */}
      <div className="space-y-3">
        {filtered.map((scheme) => {
          const expanded = expandedId === scheme.id;
          const docs = parseJsonField(scheme.requiredDocuments);
          const turnover = parseJsonField(scheme.turnoverBrackets);
          const states = parseJsonField(scheme.applicableStates);

          return (
            <Card key={scheme.id} className="overflow-hidden">
              <button
                onClick={() => setExpandedId(expanded ? null : scheme.id)}
                className="w-full text-left p-5 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold">{scheme.name}</h3>
                      <Badge className={cn('text-[10px]', STATUS_COLORS[scheme.status] ?? 'bg-muted text-muted-foreground')}>
                        {scheme.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{scheme.implementingAgency}</p>
                    <p className="mt-1 text-xs">{scheme.supportType}</p>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-1',
                      expanded && 'rotate-180',
                    )}
                  />
                </div>
              </button>

              {expanded && (
                <CardContent className="border-t border-border space-y-3 pt-4">
                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Financial Details</p>
                    <p className="mt-0.5 text-xs">{scheme.financialDetails}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Target Beneficiary</p>
                    <p className="mt-0.5 text-xs">{scheme.targetBeneficiary}</p>
                  </div>

                  <div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Eligibility</p>
                    <p className="mt-0.5 text-xs">{scheme.eligibilityCriteria}</p>
                  </div>

                  {turnover.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Turnover Brackets</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {turnover.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {states.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Applicable States</p>
                      <p className="mt-0.5 text-xs">{states.join(', ')}</p>
                    </div>
                  )}

                  {docs.length > 0 && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Required Documents
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {docs.map((d, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs">
                            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-muted-foreground/30" />
                            {d}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {scheme.reportedImpact && (
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Reported Impact</p>
                      <p className="mt-0.5 text-xs">{scheme.reportedImpact}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 pt-2 border-t border-border">
                    {scheme.applicationUrl && (
                      <a
                        href={scheme.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Apply Online
                      </a>
                    )}
                    {scheme.sourceUrl && (
                      <a
                        href={scheme.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Source: {scheme.source}
                      </a>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <Inbox className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No schemes match your filters.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
