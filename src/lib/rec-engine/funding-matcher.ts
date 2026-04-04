// ── Funding Matcher ─────────────────────────────────────────────────────────
// Pure function: matches funding schemes to a technology based on
// user's organisation profile.

import type { FundingData, TechFundingLinkData, FundingMatch } from './types';

interface FundingMatchInput {
  techId: string;
  capexMinLakhs: number | null;
  capexMaxLakhs: number | null;
  organisation: {
    turnoverBracket?: string;
    state: string;
  };
  facilityStates: string[];
  allFunding: FundingData[];
  allLinks: TechFundingLinkData[];
  includeProposed?: boolean;
}

/**
 * Find all funding schemes applicable to a specific technology,
 * filtered by the user's organisation profile.
 */
export function matchFunding(input: FundingMatchInput): FundingMatch[] {
  const {
    techId,
    capexMinLakhs,
    capexMaxLakhs,
    organisation,
    facilityStates,
    allFunding,
    allLinks,
    includeProposed = true,
  } = input;

  // Find all links for this technology
  const relevantLinks = allLinks.filter((l) => l.techId === techId);
  if (relevantLinks.length === 0) return [];

  // Build funding lookup
  const fundingMap = new Map<string, FundingData>();
  for (const f of allFunding) {
    fundingMap.set(f.id, f);
  }

  const matches: FundingMatch[] = [];

  for (const link of relevantLinks) {
    const scheme = fundingMap.get(link.fundingId);
    if (!scheme) continue;

    // Filter: status
    if (scheme.status === 'Concluded' || scheme.status === 'Closed') continue;
    if (scheme.status === 'Proposed' && !includeProposed) continue;
    // S005 PM Surya Ghar: active for residential only, not yet extended to MSMEs
    if (scheme.status.includes('Proposed (MSME)') && !includeProposed) continue;

    // Filter: turnover bracket
    if (
      scheme.turnoverBrackets !== null &&
      scheme.turnoverBrackets.length > 0 &&
      organisation.turnoverBracket
    ) {
      if (!scheme.turnoverBrackets.includes(organisation.turnoverBracket)) continue;
    }

    // Filter: applicable states (null = pan-India)
    if (scheme.applicableStates !== null && scheme.applicableStates.length > 0) {
      const hasMatchingState = facilityStates.some((s) =>
        scheme.applicableStates!.includes(s),
      );
      if (!hasMatchingState) continue;
    }

    // Calculate net capex after subsidy
    let netCapexMinLakhs: number | null = null;
    let netCapexMaxLakhs: number | null = null;
    if (link.subsidyPct !== null && capexMinLakhs !== null && capexMaxLakhs !== null) {
      const factor = 1 - link.subsidyPct / 100;
      netCapexMinLakhs = capexMinLakhs * factor;
      netCapexMaxLakhs = capexMaxLakhs * factor;
      // Cap by max amount if specified
      if (link.maxAmountLakhs !== null) {
        const maxSubsidyMin = capexMinLakhs - link.maxAmountLakhs;
        const maxSubsidyMax = capexMaxLakhs - link.maxAmountLakhs;
        netCapexMinLakhs = Math.max(netCapexMinLakhs, maxSubsidyMin);
        netCapexMaxLakhs = Math.max(netCapexMaxLakhs, maxSubsidyMax);
      }
    }

    matches.push({
      schemeId: scheme.schemeId,
      name: scheme.name,
      implementingAgency: scheme.implementingAgency,
      supportType: scheme.supportType,
      financialDetails: scheme.financialDetails,
      eligibilityCriteria: scheme.eligibilityCriteria,
      requiredDocuments: scheme.requiredDocuments,
      applicationUrl: scheme.applicationUrl,
      subsidyPct: link.subsidyPct,
      maxAmountLakhs: link.maxAmountLakhs,
      notes: link.notes,
      status: scheme.status,
      netCapexMinLakhs,
      netCapexMaxLakhs,
    });
  }

  return matches;
}

/**
 * Find the best (lowest) net capex from a list of funding matches.
 */
export function bestNetCapex(
  fundingMatches: FundingMatch[],
  capexMinLakhs: number | null,
  capexMaxLakhs: number | null,
): { bestMin: number | null; bestMax: number | null } {
  if (capexMinLakhs === null || capexMaxLakhs === null) {
    return { bestMin: null, bestMax: null };
  }

  let bestMin = capexMinLakhs;
  let bestMax = capexMaxLakhs;

  for (const fm of fundingMatches) {
    if (fm.netCapexMinLakhs !== null && fm.netCapexMinLakhs < bestMin) {
      bestMin = fm.netCapexMinLakhs;
    }
    if (fm.netCapexMaxLakhs !== null && fm.netCapexMaxLakhs < bestMax) {
      bestMax = fm.netCapexMaxLakhs;
    }
  }

  return { bestMin, bestMax };
}
