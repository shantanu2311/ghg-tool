'use client';

import { useEffect, useState } from 'react';

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
  Active: 'bg-emerald-100 text-emerald-700',
  Proposed: 'bg-amber-100 text-amber-700',
  Closed: 'bg-zinc-100 text-zinc-500',
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <h1 className="text-lg font-bold text-zinc-900">Funding Directory</h1>
          <p className="text-xs text-zinc-500">
            Government schemes and subsidies for MSME emission reduction · {schemes.length} schemes
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search schemes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 w-64"
          />
          <div className="flex gap-1">
            {['all', 'Active', 'Proposed', 'Closed'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-zinc-200 text-zinc-500 hover:bg-zinc-50'
                }`}
              >
                {s === 'all' ? 'All' : s}
              </button>
            ))}
          </div>
          <span className="text-xs text-zinc-400 ml-auto">{filtered.length} results</span>
        </div>

        {/* Scheme Cards */}
        <div className="mt-4 space-y-3">
          {filtered.map((scheme) => {
            const expanded = expandedId === scheme.id;
            const docs = parseJsonField(scheme.requiredDocuments);
            const turnover = parseJsonField(scheme.turnoverBrackets);
            const states = parseJsonField(scheme.applicableStates);

            return (
              <div
                key={scheme.id}
                className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => setExpandedId(expanded ? null : scheme.id)}
                  className="w-full text-left p-5 hover:bg-zinc-50/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-zinc-900">{scheme.name}</h3>
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[scheme.status] ?? 'bg-zinc-100 text-zinc-500'}`}>
                          {scheme.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-zinc-500">{scheme.implementingAgency}</p>
                      <p className="mt-1 text-xs text-zinc-600">{scheme.supportType}</p>
                    </div>
                    <svg
                      className={`w-4 h-4 text-zinc-400 transition-transform flex-shrink-0 mt-1 ${expanded ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-zinc-100 px-5 pb-5 pt-4 space-y-3">
                    <div>
                      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Financial Details</p>
                      <p className="mt-0.5 text-xs text-zinc-700">{scheme.financialDetails}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Target Beneficiary</p>
                      <p className="mt-0.5 text-xs text-zinc-700">{scheme.targetBeneficiary}</p>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Eligibility</p>
                      <p className="mt-0.5 text-xs text-zinc-700">{scheme.eligibilityCriteria}</p>
                    </div>

                    {turnover.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Turnover Brackets</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {turnover.map((t) => (
                            <span key={t} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] text-zinc-600">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {states.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Applicable States</p>
                        <p className="mt-0.5 text-xs text-zinc-700">{states.join(', ')}</p>
                      </div>
                    )}

                    {docs.length > 0 && (
                      <div>
                        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Required Documents</p>
                        <ul className="mt-1 space-y-0.5">
                          {docs.map((d, i) => (
                            <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-300" />
                              {d}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {scheme.reportedImpact && (
                      <div>
                        <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wide">Reported Impact</p>
                        <p className="mt-0.5 text-xs text-zinc-700">{scheme.reportedImpact}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-2 border-t border-zinc-100">
                      {scheme.applicationUrl && (
                        <a
                          href={scheme.applicationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
                        >
                          Apply Online →
                        </a>
                      )}
                      {scheme.sourceUrl && (
                        <a
                          href={scheme.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-zinc-400 hover:text-zinc-600"
                        >
                          Source: {scheme.source}
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm text-zinc-400">No schemes match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
