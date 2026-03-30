'use client';

import type { TechWithFunding } from '@/lib/rec-engine/types';

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  'Energy Efficiency - Cross Sector': { bg: 'bg-teal-50', text: 'text-teal-700' },
  'Sector Specific - Iron & Steel': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'Sector Specific - Brick Kilns': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'Sector Specific - Textiles': { bg: 'bg-blue-50', text: 'text-blue-700' },
  'Green Electricity': { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  'Alternative Fuels': { bg: 'bg-amber-50', text: 'text-amber-700' },
};

const READINESS_BADGE: Record<string, string> = {
  'Commercially mature': 'bg-emerald-100 text-emerald-700',
  'Early commercial': 'bg-amber-100 text-amber-700',
  'Emerging': 'bg-zinc-100 text-zinc-600',
};

interface Props {
  tech: TechWithFunding;
  enabled: boolean;
  selected: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

export function TechCard({ tech, enabled, selected, onToggle, onSelect }: Props) {
  const catColor = CATEGORY_COLORS[tech.category] ?? { bg: 'bg-zinc-50', text: 'text-zinc-600' };
  const readinessClass = READINESS_BADGE[tech.technologyReadiness] ?? 'bg-zinc-100 text-zinc-600';

  return (
    <div
      className={`rounded-xl border p-4 transition-all cursor-pointer ${
        selected
          ? 'border-teal-500 bg-teal-50/30 shadow-md'
          : enabled
          ? 'border-teal-200 bg-white shadow-sm'
          : 'border-zinc-200 bg-white shadow-sm hover:border-zinc-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${catColor.bg} ${catColor.text}`}>
              {tech.category.replace(' - Cross Sector', '').replace('Sector Specific - ', '')}
            </span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${readinessClass}`}>
              {tech.technologyReadiness}
            </span>
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-zinc-900 leading-tight">{tech.name}</h3>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`relative mt-1 inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            enabled ? 'bg-teal-600' : 'bg-zinc-200'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-600">
        <div>
          <span className="text-zinc-400">CO2 reduction</span>
          <p className="font-medium text-zinc-800">
            {tech.reductionMinTonnes.toFixed(0)}–{tech.reductionMaxTonnes.toFixed(0)} t
          </p>
        </div>
        <div>
          <span className="text-zinc-400">Payback</span>
          <p className="font-medium text-zinc-800">
            {tech.paybackMinYears === 0 && tech.paybackMaxYears === 0
              ? 'Zero upfront'
              : `${tech.paybackMinYears}–${tech.paybackMaxYears} yrs`}
          </p>
        </div>
        <div>
          <span className="text-zinc-400">CAPEX</span>
          <p className="font-medium text-zinc-800">
            {tech.capexMinLakhs === null || tech.capexMinLakhs === 0
              ? 'N/A'
              : `₹${tech.capexMinLakhs}–${tech.capexMaxLakhs}L`}
          </p>
        </div>
        <div>
          <span className="text-zinc-400">Impact on total</span>
          <p className="font-medium text-zinc-800">{tech.pctOfTotal.toFixed(1)}%</p>
        </div>
      </div>

      {tech.warnings.length > 0 && (
        <div className="mt-2 rounded-md bg-amber-50 px-2 py-1">
          {tech.warnings.map((w, i) => (
            <p key={i} className="text-[10px] text-amber-700">{w}</p>
          ))}
        </div>
      )}

      {tech.fundingMatches.length > 0 && (
        <div className="mt-2 text-[10px] text-teal-600">
          {tech.fundingMatches.length} funding scheme{tech.fundingMatches.length > 1 ? 's' : ''} available
        </div>
      )}
    </div>
  );
}
