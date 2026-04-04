/**
 * Funding-Aware AI System Prompt Builder
 *
 * When the user is on the funding or recommendations page, this replaces
 * the general system prompt with a funding-specific version that:
 * - Fetches all scheme data from the DB (not hardcoded)
 * - Adds strict anti-hallucination rules
 * - Personalises eligibility based on user context
 * - Provides redirect patterns for "I don't know" answers
 */

import type {
  FundingPromptData,
  FundingUserContext,
  SchemeForPrompt,
  JargonForPrompt,
  ProviderForPrompt,
  ActionStepForPrompt,
} from './fetch-funding-data';
import { RECOMMENDATIONS_KNOWLEDGE } from './system-prompt';

// ---------------------------------------------------------------------------
// Static prompt sections
// ---------------------------------------------------------------------------

const ANTI_HALLUCINATION_RULES = `CRITICAL RULES — follow these above ALL else:

1. ONLY use information from the FUNDING DATABASE, JARGON DICTIONARY, SERVICE PROVIDERS, and ACTION PLANS sections below. Do NOT invent or guess ANY details.
2. NEVER fabricate:
   - Auditor names, firm names, or contact details (phone, email, address)
   - Specific interest rates, subsidy amounts, or percentages beyond what is in the database
   - Application URLs, portal links, or form download links not listed below
   - Application deadlines or approval timelines (say "check the portal for current deadlines")
3. When quoting scheme details, always name the scheme. Example: "Under ADEETIE (BEE), micro and small enterprises get 5% interest subvention."
4. For cost questions, give RANGES from the database (e.g., "₹50,000–₹2,00,000"), not exact numbers. Always mention reimbursement if applicable.
5. If the user asks about something NOT in the data below, say: "I don't have verified details on that. Please check [most relevant official URL from the database] or contact your State Designated Agency."
6. Do NOT mix up details between different schemes. Each scheme has distinct rules, eligibility, and processes.
7. For "find an auditor" questions: NEVER invent auditor names. Direct to the OFFICIAL LISTS with exact URLs from the Service Providers section.
8. For document questions ("I don't have a DPR"): explain what it is (from jargon), who prepares it, cost, reimbursement, and the alternative (e.g., EESL ESCO needs no DPR).`;

const FUNDING_ROLE = `You are a funding and financing assistant for Indian MSMEs (Micro, Small & Medium Enterprises). You help factory owners understand and access government energy efficiency schemes.

TONE AND FORMAT:
- Use simple, jargon-free language. When using a technical term, explain it briefly.
- Keep answers SHORT — 3-5 sentences max. Use bullet points for lists.
- Always recommend the FIRST actionable step (e.g., "Submit EOI to your SDA — it's free and takes 30 minutes") not just the scheme name.
- Mention collateral-free options (CGTMSE) proactively — MSMEs worry about this.
- If the user writes in Hindi, reply in Hindi (Devanagari script). Use English technical terms where necessary.
- Clearly separate facts from general guidance. Quote specific numbers from the database.
- Do not give legal or compliance advice.`;

const REDIRECT_PATTERNS = `REDIRECT PATTERNS — use these when you DON'T have the specific information:

- Specific auditor/firm recommendations → "I can't recommend specific auditors, but here's the official BEE empaneled list: [URL from Service Providers]. You can filter by your state."
- Current interest rates → "Interest rates change frequently. Under ADEETIE, you get interest subvention on top of your bank's rate. Check with your bank for their current base rate."
- Application deadlines → "Check the scheme portal for current application windows: [applicationUrl from database]."
- Scheme not in the database → "I don't have verified information on that scheme. Check with your State Designated Agency or the BEE helpline."
- Questions outside financing → "That's outside my financing expertise. Switch back to the general help assistant for other questions."
- Eligibility edge cases → "Based on what I know, [assessment]. But confirm your eligibility on the scheme portal before applying."`;

/** Date when the seed funding data was last verified against official sources */
const DATA_VERIFIED_DATE = '2026-04-01';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

function checkSchemeEligibility(
  scheme: SchemeForPrompt,
  ctx: FundingUserContext
): EligibilityResult {
  if (!ctx.sector && !ctx.state && !ctx.turnoverBracket) {
    return { eligible: true }; // No context to check against
  }

  // Sector check
  if (scheme.sectorsCovered && scheme.sectorsCovered.length > 0 && ctx.sector) {
    if (!scheme.sectorsCovered.includes(ctx.sector)) {
      return { eligible: false, reason: `sector ${ctx.sector} not covered` };
    }
  }

  // Turnover bracket check
  if (scheme.turnoverBrackets && scheme.turnoverBrackets.length > 0 && ctx.turnoverBracket) {
    if (!scheme.turnoverBrackets.includes(ctx.turnoverBracket)) {
      return { eligible: false, reason: `turnover bracket ${ctx.turnoverBracket} not eligible` };
    }
  }

  // State check (only for state-specific schemes)
  if (scheme.applicableStates && scheme.applicableStates.length > 0 && ctx.state) {
    if (!scheme.applicableStates.includes(ctx.state)) {
      return { eligible: false, reason: `state ${ctx.state} not covered` };
    }
  }

  return { eligible: true };
}

function formatSchemeBlock(scheme: SchemeForPrompt, ctx: FundingUserContext): string {
  const lines: string[] = [];
  const elig = checkSchemeEligibility(scheme, ctx);

  let header = `SCHEME: ${scheme.name} (${scheme.schemeId})`;
  if (ctx.sector || ctx.state) {
    header += elig.eligible ? ' [ELIGIBLE FOR YOU]' : ` [MAY NOT APPLY — ${elig.reason}]`;
  }
  lines.push(header);

  lines.push(`- Implementing agency: ${scheme.implementingAgency}`);
  lines.push(`- Target: ${scheme.targetBeneficiary}`);
  lines.push(`- Support type: ${scheme.supportType}`);
  lines.push(`- Financial details: ${scheme.financialDetails}`);
  lines.push(`- Eligibility: ${scheme.eligibilityCriteria}`);
  if (scheme.requiredDocuments) {
    lines.push(`- Required documents: ${scheme.requiredDocuments.join(', ')}`);
  }
  if (scheme.minEnergySaving) {
    lines.push(`- Minimum energy saving required: ${scheme.minEnergySaving}%`);
  }
  if (scheme.applicationUrl) {
    lines.push(`- Portal: ${scheme.applicationUrl}`);
  }
  if (scheme.sourceUrl) {
    lines.push(`- Official source: ${scheme.sourceUrl}`);
  }
  if (scheme.techLinks.length > 0) {
    const techStr = scheme.techLinks
      .map((tl) => {
        let s = tl.techName;
        if (tl.subsidyPct) s += ` (${tl.subsidyPct}% subsidy)`;
        if (tl.notes) s += ` — ${tl.notes}`;
        return s;
      })
      .join('; ');
    lines.push(`- Linked technologies: ${techStr}`);
  }

  return lines.join('\n');
}

function formatJargonBlock(entry: JargonForPrompt): string {
  const parts: string[] = [`${entry.term} = ${entry.fullForm}: ${entry.explanation}`];
  if (entry.whoDoesIt) parts.push(`  Who does it: ${entry.whoDoesIt}`);
  if (entry.typicalCostInr) parts.push(`  Cost: ${entry.typicalCostInr}`);
  if (entry.isReimbursed) parts.push(`  Reimbursement: ${entry.isReimbursed}`);
  return parts.join('\n');
}

function formatProviderBlock(provider: ProviderForPrompt, userState?: string): string {
  const parts: string[] = [];
  let label = `- ${provider.name}`;
  if (provider.accreditation) label += ` (${provider.accreditation})`;
  if (userState && provider.states?.includes(userState)) label += ' [YOUR STATE]';
  parts.push(label);
  if (provider.services) parts.push(`  Services: ${provider.services.join(', ')}`);
  if (provider.states) parts.push(`  States: ${provider.states.join(', ')}`);
  if (provider.website) parts.push(`  Website: ${provider.website}`);
  return parts.join('\n');
}

function formatActionPlanBlock(
  schemeName: string,
  steps: ActionStepForPrompt[]
): string {
  const lines: string[] = [`ACTION PLAN: ${schemeName}`];
  for (const step of steps) {
    lines.push(`\nStep ${step.stepNumber}: ${step.title}`);
    lines.push(step.description);
    if (step.estimatedTime) lines.push(`Time: ${step.estimatedTime}`);
    if (step.estimatedCost) lines.push(`Cost: ${step.estimatedCost}`);
    if (step.documentsNeeded) lines.push(`Documents: ${step.documentsNeeded.join(', ')}`);
    if (step.actionUrl) lines.push(`Link: ${step.actionUrl}${step.actionLabel ? ` (${step.actionLabel})` : ''}`);
    if (step.tips) lines.push(`Tip: ${step.tips}`);
  }
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main prompt builder
// ---------------------------------------------------------------------------

export interface FundingPromptContext extends FundingUserContext {
  currentStep: string;
  language?: 'en' | 'hi';
  analysisSummary?: string;
}

export function buildFundingSystemPrompt(
  data: FundingPromptData,
  context: FundingPromptContext
): string {
  const sections: string[] = [];

  // 1. Anti-hallucination rules (FIRST for max attention weight)
  sections.push(ANTI_HALLUCINATION_RULES);

  // 2. Role and tone
  sections.push(FUNDING_ROLE);

  // Language instruction
  if (context.language === 'hi') {
    sections.push(
      'The user prefers Hindi. Reply in Hindi (Devanagari script). Use English technical terms where necessary (e.g. "emission factor", "tCO2e") but explain them in Hindi.'
    );
  }

  // 3. Staleness check
  const verifiedDate = new Date(DATA_VERIFIED_DATE);
  const now = new Date();
  const daysSinceVerified = Math.floor(
    (now.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (daysSinceVerified > 90) {
    sections.push(
      `NOTE: This funding data was last verified on ${DATA_VERIFIED_DATE}. Scheme details may have changed since then. Recommend the user verify current status at the official URLs provided below.`
    );
  }

  // 4. Scheme database
  if (data.schemes.length > 0) {
    const schemeBlocks = data.schemes.map((s) => formatSchemeBlock(s, context));
    sections.push(
      `FUNDING SCHEMES DATABASE (${data.schemes.length} active schemes, verified ${DATA_VERIFIED_DATE}):\n\n${schemeBlocks.join('\n\n')}`
    );
  }

  // 5. Jargon dictionary
  if (data.jargon.length > 0) {
    const jargonBlocks = data.jargon.map(formatJargonBlock);
    sections.push(
      `TECHNICAL JARGON DICTIONARY (${data.jargon.length} terms):\n\n${jargonBlocks.join('\n\n')}`
    );
  }

  // 6. Service providers (grouped by type)
  if (data.serviceProviders.length > 0) {
    const byType = new Map<string, ProviderForPrompt[]>();
    for (const p of data.serviceProviders) {
      const list = byType.get(p.type) ?? [];
      list.push(p);
      byType.set(p.type, list);
    }

    const typeLabels: Record<string, string> = {
      sda: 'State Designated Agencies (SDAs)',
      energy_auditor: 'Energy Auditor Bodies',
      esco: 'ESCOs (Energy Service Companies)',
      bank: 'Financing Institutions',
      consultant: 'Consultants',
      portal: 'Official Portals',
    };

    const providerLines: string[] = ['SERVICE PROVIDERS & AUDITOR DIRECTORY:'];
    providerLines.push(
      '\nIMPORTANT: I cannot recommend specific auditor names or firms. I can only direct you to official databases listed below.'
    );

    for (const [type, providers] of byType) {
      providerLines.push(`\n${typeLabels[type] || type}:`);
      for (const p of providers) {
        providerLines.push(formatProviderBlock(p, context.state));
      }
    }

    sections.push(providerLines.join('\n'));
  }

  // 7. Action plans
  if (data.actionPlans.size > 0) {
    const planLines: string[] = ['STEP-BY-STEP ACTION PLANS:'];
    for (const [schemeId, steps] of data.actionPlans) {
      const scheme = data.schemes.find((s) => s.schemeId === schemeId);
      if (!scheme) continue;
      planLines.push('');
      planLines.push(formatActionPlanBlock(scheme.name, steps));
    }
    sections.push(planLines.join('\n'));
  }

  // 8. Funding stacking knowledge
  sections.push(`FUNDING STACKING — What MSMEs can and CANNOT combine:

CONFIRMED STACKABLE:
- CGTMSE (collateral-free guarantee) + ANY loan scheme. CGTMSE is a credit guarantee, not a subsidy. MSE-GIFT guidelines explicitly mention alignment with CGTMSE.
- CLCS-TUS capital subsidy (25% one-time) + interest subvention (ADEETIE or MSE-GIFT). These are different instruments: capital subsidy (reduces equipment cost) vs interest subvention (reduces loan interest). Different ministries, different mechanisms.
- MSE-GIFT interest subvention (2%) + MSE-GIFT risk sharing (75% guarantee). SIDBI FAQ confirms: "Eligible MSEs can avail either I or II or both."
- BEE-GEF-UNIDO free audit + ADEETIE interest subvention. Sequential: free audit gives you the DPR → use DPR to apply for ADEETIE loan.
- State SDA subsidy + central IREDA/SIDBI loan. Most states allow this (e.g., MEDA 25% solar subsidy + IREDA solar loan).

UNCERTAIN — DO NOT claim without verification:
- ADEETIE (5%) + MSE-GIFT (2%) on the SAME loan. Both are interest subvention from different ministries. No official document confirms dual subvention on one loan. SAFE GUIDANCE: pick the higher one. For EE projects: use ADEETIE (5%). For RE/green projects not covered by ADEETIE: use MSE-GIFT (2%).
- Multiple state subsidies on same equipment. Varies by state policy. Check with your SDA.

PRACTICAL BEST COMBINATIONS:
- EE tech (VFDs, motors, boilers, WHRS): ADEETIE 5% subvention + CLCS-TUS 25% capital subsidy + CGTMSE = best stack
- Solar CAPEX: MSE-GIFT 2% subvention + State SDA subsidy (MEDA 25% etc.) + IREDA/SIDBI loan
- Low-cost EE (LEDs, compressed air): EESL ESCO (20% co-payment, rest from savings — no separate bank loan needed, available in 12 MSME clusters)
- Biomass/CBG: MSE-GIFT 2% + SATAT offtake guarantee + IREDA loan`);

  // 9. Redirect patterns
  sections.push(REDIRECT_PATTERNS);

  // 9. Recommendations knowledge (when on recommendations page)
  if (context.currentStep === 'recommendations') {
    sections.push(RECOMMENDATIONS_KNOWLEDGE);
  }

  // 10. User context
  const contextLines: string[] = ['\nCURRENT CONTEXT:'];
  contextLines.push(`- The user is on: ${context.currentStep} page`);
  if (context.state) contextLines.push(`- User's state: ${context.state}`);
  if (context.sector) contextLines.push(`- Sector: ${context.sector}`);
  if (context.subSector) contextLines.push(`- Sub-sector: ${context.subSector}`);
  if (context.turnoverBracket) contextLines.push(`- Turnover bracket: ${context.turnoverBracket}`);
  contextLines.push(
    '\nPersonalise your answers to this user\'s profile. If they are eligible for a scheme, say so explicitly. If not, explain why and suggest alternatives.'
  );
  sections.push(contextLines.join('\n'));

  // Include analysis data if available
  if (context.analysisSummary) {
    sections.push(
      `USER'S ANALYSIS DATA (from their current session):\n${context.analysisSummary}\n\nUse this data to answer questions about their specific emissions, technologies, and funding eligibility. Quote their actual numbers. Do NOT suggest their data is incomplete or wrong.\n\nIf the data includes a "Recommendation Simulator State" section, use it to answer about selected technologies, implementation status, CAPEX, savings, and which funding schemes apply to which technologies.`
    );
  }

  return sections.join('\n\n');
}
