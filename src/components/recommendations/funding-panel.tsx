'use client';

import type { TechWithFunding } from '@/lib/rec-engine/types';

interface Props {
  tech: TechWithFunding | null;
}

export function FundingPanel({ tech }: Props) {
  if (!tech) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-zinc-900">Funding Opportunities</h3>
        <p className="mt-2 text-xs text-zinc-400">
          Select a technology to see applicable government schemes and subsidies.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-zinc-900">Funding for {tech.name}</h3>
      <p className="text-[11px] text-zinc-500">
        Estimated CAPEX: {tech.capexMinLakhs !== null ? `₹${tech.capexMinLakhs}–${tech.capexMaxLakhs} Lakhs` : 'N/A'}
      </p>

      {tech.fundingMatches.length === 0 ? (
        <p className="mt-4 text-xs text-zinc-400">No specific funding schemes mapped for this technology.</p>
      ) : (
        <div className="mt-3 space-y-3">
          {tech.fundingMatches.map((fm) => (
            <div key={fm.schemeId} className="rounded-lg border border-zinc-100 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900">{fm.name}</h4>
                  <p className="text-[10px] text-zinc-500">{fm.implementingAgency}</p>
                </div>
                <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-medium ${
                  fm.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                  fm.status === 'Proposed' ? 'bg-amber-100 text-amber-700' :
                  'bg-zinc-100 text-zinc-500'
                }`}>
                  {fm.status}
                </span>
              </div>

              <p className="mt-1.5 text-[11px] text-zinc-600">{fm.supportType}</p>
              <p className="mt-1 text-[10px] text-zinc-500">{fm.financialDetails}</p>

              {fm.subsidyPct !== null && (
                <p className="mt-1 text-[11px] font-medium text-teal-600">
                  Subsidy: {fm.subsidyPct}%
                  {fm.netCapexMinLakhs !== null && (
                    <> · Net cost: ₹{fm.netCapexMinLakhs.toFixed(1)}–{fm.netCapexMaxLakhs?.toFixed(1)} Lakhs</>
                  )}
                </p>
              )}

              {fm.notes && (
                <p className="mt-1 text-[10px] text-zinc-400 italic">{fm.notes}</p>
              )}

              {fm.requiredDocuments && fm.requiredDocuments.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-medium text-zinc-500">Required documents:</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {fm.requiredDocuments.map((doc, i) => (
                      <li key={i} className="flex items-start gap-1 text-[10px] text-zinc-500">
                        <span className="mt-0.5 h-1 w-1 flex-shrink-0 rounded-full bg-zinc-300" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {fm.applicationUrl && (
                <a
                  href={fm.applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-teal-600 hover:text-teal-700"
                >
                  Apply →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {tech.bestNetCapexMinLakhs !== null && tech.bestNetCapexMaxLakhs !== null && (
        <div className="mt-3 rounded-lg bg-teal-50 p-3">
          <p className="text-[11px] font-medium text-teal-800">
            Best net cost after subsidy: ₹{tech.bestNetCapexMinLakhs.toFixed(1)}–{tech.bestNetCapexMaxLakhs.toFixed(1)} Lakhs
          </p>
        </div>
      )}
    </div>
  );
}
