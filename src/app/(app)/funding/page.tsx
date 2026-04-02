'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ExternalLink, Landmark, Search, Inbox, FileText, X, Eye, EyeOff } from 'lucide-react';
import { InfoTip } from '@/components/ui/info-tip';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TechLink {
  subsidyPct: number | null;
  maxAmountLakhs: number | null;
  notes: string | null;
  relevant: boolean | null; // null = no org context available
  technology: {
    techId: string;
    name: string;
    category: string;
  };
}

interface FundingScheme {
  id: string;
  schemeId: string;
  name: string;
  implementingAgency: string;
  targetBeneficiary: string;
  supportType: string;
  financialDetails: string;
  sectorsCovered: string[] | null;
  eligibilityCriteria: string;
  requiredDocuments: string[] | null;
  turnoverBrackets: string[] | null;
  applicableStates: string[] | null;
  status: string;
  validFrom: string | null;
  validTo: string | null;
  applicationUrl: string | null;
  reportedImpact: string | null;
  source: string;
  sourceUrl: string | null;
  eligible: boolean | null; // null = no org context available
  techLinks: TechLink[];
}

interface OrgContext {
  sector: string;
  subSector: string;
  relevantTechIds: string[];
}

interface TechInfo {
  techId: string;
  name: string;
  category: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Proposed: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Closed: 'bg-muted text-muted-foreground',
};

type Highlight = 'selected' | 'connected' | 'faded' | 'none';

const HIGHLIGHT_CLASSES: Record<Highlight, string> = {
  selected: 'ring-2 ring-primary bg-primary/5 dark:bg-primary/10',
  connected: 'ring-1 ring-primary/50 bg-primary/5 dark:bg-primary/10',
  faded: 'opacity-30',
  none: '',
};

const SECTOR_LABELS: Record<string, string> = {
  iron_steel: 'Iron & Steel',
  textiles: 'Textiles',
  brick_kilns: 'Brick Kilns',
  ceramics: 'Ceramics',
  dairy: 'Dairy',
  foundry: 'Foundry',
  brass: 'Brass',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function asArray(val: string[] | null | undefined): string[] {
  return Array.isArray(val) ? val : [];
}

function formatSubSector(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function FundingDirectoryPage() {
  const [schemes, setSchemes] = useState<FundingScheme[]>([]);
  const [orgContext, setOrgContext] = useState<OrgContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedSchemeId, setExpandedSchemeId] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [showAllTechs, setShowAllTechs] = useState(false);

  useEffect(() => {
    fetch('/api/funding')
      .then((r) => r.json())
      .then((data) => {
        // API returns { schemes: [...], context: {...} } or legacy array
        const schemeList = Array.isArray(data) ? data : Array.isArray(data?.schemes) ? data.schemes : [];
        setSchemes(schemeList);
        setOrgContext(data?.context ?? null);
      })
      .catch(() => setSchemes([]))
      .finally(() => setLoading(false));
  }, []);

  const hasContext = orgContext !== null;
  const relevantTechSet = useMemo(
    () => new Set(orgContext?.relevantTechIds ?? []),
    [orgContext],
  );

  // Derive tech list + bidirectional lookup maps from scheme data
  const { techsByCategory, techToSchemes, schemeToTechs, allTechs, relevantTechs, totalLinks } = useMemo(() => {
    const techMap = new Map<string, TechInfo>();
    const t2s = new Map<string, Set<string>>();
    const s2t = new Map<string, Set<string>>();
    let links = 0;

    for (const s of schemes) {
      for (const tl of s.techLinks) {
        const tid = tl.technology.techId;
        const sid = s.schemeId;
        techMap.set(tid, tl.technology);
        if (!t2s.has(tid)) t2s.set(tid, new Set());
        t2s.get(tid)!.add(sid);
        if (!s2t.has(sid)) s2t.set(sid, new Set());
        s2t.get(sid)!.add(tid);
        links++;
      }
    }

    const allTechsList = Array.from(techMap.values()).sort((a, b) => a.techId.localeCompare(b.techId));
    const relevantList = hasContext ? allTechsList.filter((t) => relevantTechSet.has(t.techId)) : allTechsList;

    // Group the techs to display (relevant only, or all if toggled / no context)
    const displayTechs = showAllTechs || !hasContext ? allTechsList : relevantList;
    const grouped = new Map<string, TechInfo[]>();
    for (const t of displayTechs) {
      if (!grouped.has(t.category)) grouped.set(t.category, []);
      grouped.get(t.category)!.push(t);
    }

    return {
      techsByCategory: grouped,
      techToSchemes: t2s,
      schemeToTechs: s2t,
      allTechs: allTechsList,
      relevantTechs: relevantList,
      totalLinks: links,
    };
  }, [schemes, hasContext, relevantTechSet, showAllTechs]);

  // Filtered schemes (search + status)
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

  // Highlight logic
  const hasSelection = selectedTechId !== null || selectedSchemeId !== null;

  function getTechHighlight(techId: string): Highlight {
    if (!hasSelection) return 'none';
    if (selectedTechId === techId) return 'selected';
    if (selectedSchemeId) {
      return schemeToTechs.get(selectedSchemeId)?.has(techId) ? 'connected' : 'faded';
    }
    return 'faded';
  }

  function getSchemeHighlight(schemeId: string): Highlight {
    if (!hasSelection) return 'none';
    if (selectedSchemeId === schemeId) return 'selected';
    if (selectedTechId) {
      return techToSchemes.get(selectedTechId)?.has(schemeId) ? 'connected' : 'faded';
    }
    return 'faded';
  }

  // Handlers
  function handleTechClick(techId: string) {
    setSelectedSchemeId(null);
    setSelectedTechId((prev) => (prev === techId ? null : techId));
  }

  function handleSchemeSelect(schemeId: string) {
    setSelectedTechId(null);
    setSelectedSchemeId((prev) => (prev === schemeId ? null : schemeId));
  }

  function clearSelection() {
    setSelectedTechId(null);
    setSelectedSchemeId(null);
  }

  // Selection summary info
  const selectionLabel = selectedTechId
    ? allTechs.find((t) => t.techId === selectedTechId)?.name
    : selectedSchemeId
      ? schemes.find((s) => s.schemeId === selectedSchemeId)?.name
      : null;

  const selectionCount = selectedTechId
    ? techToSchemes.get(selectedTechId)?.size ?? 0
    : selectedSchemeId
      ? schemeToTechs.get(selectedSchemeId)?.size ?? 0
      : 0;

  // Count eligible schemes
  const eligibleCount = hasContext ? schemes.filter((s) => s.eligible).length : null;

  /* ---------------------------------------------------------------- */
  /*  Loading skeleton                                                 */
  /* ---------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Funding Directory</h1>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
        <div className="flex gap-6">
          <div className="w-[340px] shrink-0 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-6 w-40 mt-4" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="flex-1 space-y-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const displayTechCount = hasContext && !showAllTechs ? relevantTechs.length : allTechs.length;
  const otherTechCount = allTechs.length - relevantTechs.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Landmark className="h-6 w-6 text-muted-foreground" />
          Funding Directory
          <InfoTip text="Government schemes and subsidies for MSME energy efficiency and emission reduction projects. Click a technology or scheme to see connections." />
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {hasContext ? (
            <>
              Showing for <span className="font-medium text-foreground">{SECTOR_LABELS[orgContext.sector] ?? orgContext.sector}</span>
              {' '}&middot; {formatSubSector(orgContext.subSector)}
              {' '}&mdash; {relevantTechs.length} matching technologies &middot; {eligibleCount} eligible schemes
            </>
          ) : (
            <>
              {allTechs.length} technologies &middot; {schemes.length} schemes &middot; {totalLinks} links
            </>
          )}
        </p>
      </div>

      {/* Selection summary bar */}
      {hasSelection && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 dark:bg-primary/10 px-4 py-2">
          <span className="text-xs font-medium">
            {selectedTechId ? 'Technology' : 'Scheme'}:
          </span>
          <span className="text-xs font-semibold">{selectionLabel}</span>
          <span className="text-xs text-muted-foreground">
            &mdash; {selectionCount} {selectedTechId ? 'funding scheme' : 'technolog'}{selectedTechId ? (selectionCount === 1 ? '' : 's') : (selectionCount === 1 ? 'y' : 'ies')} connected
          </span>
          <button
            onClick={clearSelection}
            className="ml-auto rounded-full p-0.5 hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Two-panel layout */}
      <div className="flex gap-6">
        {/* LEFT PANEL — Technologies */}
        <div className="w-[340px] shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Technologies ({displayTechCount})
            </p>
            {hasContext && otherTechCount > 0 && (
              <button
                onClick={() => setShowAllTechs((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {showAllTechs ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {showAllTechs ? 'Show relevant only' : `+${otherTechCount} other`}
              </button>
            )}
          </div>
          <ScrollArea className="h-[calc(100vh-220px)] rounded-lg border border-border">
            <div className="p-2 space-y-3">
              {Array.from(techsByCategory.entries()).map(([category, techs]) => (
                <div key={category}>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    {category}
                  </p>
                  <div className="space-y-0.5">
                    {techs.map((tech) => {
                      const hl = getTechHighlight(tech.techId);
                      const linkCount = techToSchemes.get(tech.techId)?.size ?? 0;
                      const isRelevant = !hasContext || relevantTechSet.has(tech.techId);
                      return (
                        <button
                          key={tech.techId}
                          onClick={() => handleTechClick(tech.techId)}
                          className={cn(
                            'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left transition-all duration-200 hover:bg-accent/50',
                            HIGHLIGHT_CLASSES[hl],
                            hasContext && !isRelevant && hl === 'none' && 'opacity-40',
                          )}
                        >
                          <span className="text-[10px] font-mono text-muted-foreground w-8 shrink-0">{tech.techId}</span>
                          <span className="text-xs truncate flex-1">{tech.name}</span>
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
                            {linkCount}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* RIGHT PANEL — Funding Schemes */}
        <div className="flex-1 min-w-0">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="relative w-56">
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

          {/* Scheme cards */}
          <ScrollArea className="h-[calc(100vh-220px)]">
            <div className="space-y-3 pr-2">
              {filtered.map((scheme) => {
                const expanded = expandedSchemeId === scheme.id;
                const hl = getSchemeHighlight(scheme.schemeId);
                const docs = asArray(scheme.requiredDocuments);
                const turnover = asArray(scheme.turnoverBrackets);
                const states = asArray(scheme.applicableStates);
                const techCount = schemeToTechs.get(scheme.schemeId)?.size ?? 0;
                const isEligible = scheme.eligible;

                return (
                  <Card
                    key={scheme.id}
                    className={cn(
                      'overflow-hidden transition-all duration-200',
                      HIGHLIGHT_CLASSES[hl],
                      hasContext && isEligible === false && hl === 'none' && 'opacity-50',
                    )}
                  >
                    <div className="flex items-start">
                      {/* Clickable card body for selection */}
                      <button
                        onClick={() => handleSchemeSelect(scheme.schemeId)}
                        className="flex-1 text-left p-5 hover:bg-accent/30 transition-colors min-w-0"
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold">{scheme.name}</h3>
                          <Badge className={cn('text-[10px]', STATUS_COLORS[scheme.status] ?? 'bg-muted text-muted-foreground')}>
                            {scheme.status}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {techCount} tech{techCount !== 1 ? 's' : ''}
                          </Badge>
                          {hasContext && isEligible === true && (
                            <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Eligible
                            </Badge>
                          )}
                          {hasContext && isEligible === false && (
                            <Badge className="text-[10px] bg-muted text-muted-foreground">
                              Not eligible
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{scheme.implementingAgency}</p>
                        <p className="mt-1 text-xs">{scheme.supportType}</p>
                      </button>
                      {/* Expand chevron */}
                      <button
                        onClick={() => setExpandedSchemeId(expanded ? null : scheme.id)}
                        className="p-5 hover:bg-accent/30 transition-colors shrink-0"
                      >
                        <ChevronDown
                          className={cn(
                            'h-4 w-4 text-muted-foreground transition-transform',
                            expanded && 'rotate-180',
                          )}
                        />
                      </button>
                    </div>

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

                        {scheme.techLinks?.length > 0 && (
                          <div>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                              Applicable Technologies
                            </p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {scheme.techLinks.map((tl) => {
                                const isRelevantTech = !hasContext || tl.relevant === true;
                                return (
                                  <button
                                    key={tl.technology.techId}
                                    onClick={() => handleTechClick(tl.technology.techId)}
                                    className={cn(
                                      'inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] transition-all duration-200 hover:bg-accent',
                                      selectedTechId === tl.technology.techId
                                        ? 'bg-primary/10 border-primary/50 ring-1 ring-primary/30'
                                        : isRelevantTech
                                          ? 'bg-muted/50'
                                          : 'bg-muted/30 opacity-50',
                                    )}
                                    title={tl.notes || undefined}
                                  >
                                    <span className="font-mono font-medium text-muted-foreground">{tl.technology.techId}</span>
                                    <span>{tl.technology.name}</span>
                                    {tl.subsidyPct != null && (
                                      <Badge variant="secondary" className="text-[9px] ml-0.5 px-1 py-0">{tl.subsidyPct}%</Badge>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

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
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
