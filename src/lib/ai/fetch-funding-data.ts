/**
 * Server-side data fetcher for the funding-aware AI assistant.
 *
 * Queries Prisma directly (not via HTTP) to provide the funding system prompt
 * with all scheme data, jargon, service providers, and action plan steps.
 */

import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SchemeForPrompt {
  schemeId: string;
  name: string;
  implementingAgency: string;
  targetBeneficiary: string;
  supportType: string;
  financialDetails: string;
  sectorsCovered: string[] | null;
  eligibilityCriteria: string;
  requiredDocuments: string[] | null;
  minEnergySaving: number | null;
  turnoverBrackets: string[] | null;
  applicableStates: string[] | null;
  status: string;
  applicationUrl: string | null;
  sourceUrl: string | null;
  techLinks: Array<{
    techId: string;
    techName: string;
    subsidyPct: number | null;
    notes: string | null;
  }>;
}

export interface JargonForPrompt {
  term: string;
  fullForm: string;
  explanation: string;
  whoDoesIt: string | null;
  typicalCostInr: string | null;
  isReimbursed: string | null;
  relatedTerms: string[] | null;
}

export interface ProviderForPrompt {
  name: string;
  type: string;
  services: string[] | null;
  states: string[] | null;
  accreditation: string | null;
  website: string | null;
}

export interface ActionStepForPrompt {
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime: string | null;
  estimatedCost: string | null;
  documentsNeeded: string[] | null;
  actionUrl: string | null;
  actionLabel: string | null;
  tips: string | null;
}

export interface FundingPromptData {
  schemes: SchemeForPrompt[];
  jargon: JargonForPrompt[];
  serviceProviders: ProviderForPrompt[];
  /** Keyed by FundingScheme.schemeId (e.g. "S001") */
  actionPlans: Map<string, ActionStepForPrompt[]>;
}

export interface FundingUserContext {
  state?: string;
  sector?: string;
  subSector?: string;
  turnoverBracket?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJson(val: string | null): string[] | null {
  if (!val) return null;
  try { return JSON.parse(val); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Main fetch function
// ---------------------------------------------------------------------------

export async function fetchFundingDataForPrompt(userId: string): Promise<{
  data: FundingPromptData;
  userContext: FundingUserContext;
}> {
  // Run all queries in parallel
  const [schemesRaw, jargonRaw, providersRaw, stepsRaw, org] = await Promise.all([
    prisma.fundingScheme.findMany({
      where: { status: 'Active' },
      include: {
        techLinks: {
          include: { technology: { select: { techId: true, name: true } } },
        },
      },
    }),
    prisma.jargonEntry.findMany(),
    prisma.serviceProvider.findMany({ where: { active: true } }),
    prisma.actionPlanStep.findMany({ orderBy: { stepNumber: 'asc' } }),
    prisma.organisation.findFirst({
      where: { userId },
      select: { sector: true, subSector: true, state: true, turnoverBracket: true },
    }),
  ]);

  // Parse schemes
  const schemes: SchemeForPrompt[] = schemesRaw.map((s) => ({
    schemeId: s.schemeId,
    name: s.name,
    implementingAgency: s.implementingAgency,
    targetBeneficiary: s.targetBeneficiary,
    supportType: s.supportType,
    financialDetails: s.financialDetails,
    sectorsCovered: parseJson(s.sectorsCovered),
    eligibilityCriteria: s.eligibilityCriteria,
    requiredDocuments: parseJson(s.requiredDocuments),
    minEnergySaving: s.minEnergySaving,
    turnoverBrackets: parseJson(s.turnoverBrackets),
    applicableStates: parseJson(s.applicableStates),
    status: s.status,
    applicationUrl: s.applicationUrl,
    sourceUrl: s.sourceUrl,
    techLinks: s.techLinks.map((tl) => ({
      techId: tl.technology.techId,
      techName: tl.technology.name,
      subsidyPct: tl.subsidyPct,
      notes: tl.notes,
    })),
  }));

  // Parse jargon
  const jargon: JargonForPrompt[] = jargonRaw.map((j) => ({
    term: j.term,
    fullForm: j.fullForm,
    explanation: j.explanation,
    whoDoesIt: j.whoDoesIt,
    typicalCostInr: j.typicalCostInr,
    isReimbursed: j.isReimbursed,
    relatedTerms: parseJson(j.relatedTerms),
  }));

  // Parse service providers
  const serviceProviders: ProviderForPrompt[] = providersRaw.map((p) => ({
    name: p.name,
    type: p.type,
    services: parseJson(p.services),
    states: parseJson(p.states),
    accreditation: p.accreditation,
    website: p.website,
  }));

  // Group action plan steps by scheme's schemeId
  // Steps have schemeId as FK to FundingScheme.id (internal ID), need to map to schemeId code
  const schemeIdMap = new Map(schemesRaw.map((s) => [s.id, s.schemeId]));
  const actionPlans = new Map<string, ActionStepForPrompt[]>();
  for (const step of stepsRaw) {
    const code = schemeIdMap.get(step.schemeId);
    if (!code) continue;
    const list = actionPlans.get(code) ?? [];
    list.push({
      stepNumber: step.stepNumber,
      title: step.title,
      description: step.description,
      estimatedTime: step.estimatedTime,
      estimatedCost: step.estimatedCost,
      documentsNeeded: parseJson(step.documentsNeeded),
      actionUrl: step.actionUrl,
      actionLabel: step.actionLabel,
      tips: step.tips,
    });
    actionPlans.set(code, list);
  }

  // Build user context from org data
  const userContext: FundingUserContext = {};
  if (org) {
    userContext.sector = org.sector;
    userContext.subSector = org.subSector;
    userContext.state = decrypt(org.state) ?? undefined;
    userContext.turnoverBracket = org.turnoverBracket ?? undefined;
  }

  return {
    data: { schemes, jargon, serviceProviders, actionPlans },
    userContext,
  };
}
