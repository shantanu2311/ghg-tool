'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useWhatIfStore } from '@/lib/what-if-store';
import type { TechWithFunding, FundingMatch } from '@/lib/rec-engine/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileText,
  Clock,
  IndianRupee,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Layers,
  CircleDot,
  Shield,
  Lightbulb,
  Check,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Zap,
  Target,
} from 'lucide-react';
import {
  type EligibilityAnswers,
  EMPTY_ANSWERS,
  type OrgContextProp,
  type EligibilityResult,
  type SchemeEligibility,
  type Verdict,
  loadEligibility,
  saveEligibility,
  evaluateAllSchemes,
  getCompletedStepKeys,
  getCompletionPct,
  loadStepCompletion,
  toggleStepCompletion,
} from './eligibility-engine';
import { EligibilityQuestionnaire } from './eligibility-questionnaire';

/* ------------------------------------------------------------------ */
/*  Stacking tips — contextual per step type                           */
/* ------------------------------------------------------------------ */

interface StackingContext {
  hasEETechs: boolean;
  hasRETechs: boolean;
  hasBioTechs: boolean;
  hasLowCostEE: boolean;
  schemeId: string;
  /** User's enterprise size: 'micro' | 'small' | 'medium' | null */
  enterpriseSize: string | null;
  /** User's sector (e.g. 'iron_steel') */
  userSector: string | null;
  /** User's state (decrypted) */
  userState: string | null;
}

/** BEE-GEF-UNIDO programme covers these sectors */
const BEE_GEF_SECTORS = ['iron_steel', 'textiles', 'brick_kilns', 'ceramics', 'dairy', 'brass', 'chemicals', 'forging', 'foundry'];

/** Known State Designated Agencies */
const STATE_SDA_MAP: Record<string, string> = {
  Maharashtra: 'MEDA', Gujarat: 'GEDA', Karnataka: 'KREDL', Rajasthan: 'RRECL',
  'Tamil Nadu': 'TEDA', 'Uttar Pradesh': 'UPNEDA', Haryana: 'HAREDA',
  'Madhya Pradesh': 'MPNRED', Punjab: 'PEDA', Telangana: 'TSREDCO',
  'Andhra Pradesh': 'NREDCAP', Kerala: 'ANERT', Bihar: 'BREDA',
  Odisha: 'OREDA', 'West Bengal': 'WBREDA', Jharkhand: 'JREDA',
  Chhattisgarh: 'CREDA', Assam: 'AEDA',
};

function getStackingTips(dedupKey: string | null, title: string, ctx: StackingContext): string[] {
  const tips: string[] = [];
  const text = (dedupKey ?? '') + ' ' + title.toLowerCase();
  const isMicroSmall = ctx.enterpriseSize === 'micro' || ctx.enterpriseSize === 'small';
  const isMedium = ctx.enterpriseSize === 'medium';
  const inBeeGefSector = ctx.userSector ? BEE_GEF_SECTORS.includes(ctx.userSector) : false;
  const stateSda = ctx.userState ? STATE_SDA_MAP[ctx.userState] : null;

  // Audit step
  if (text.includes('energy_audit') || /energy audit|igea/i.test(title)) {
    if (inBeeGefSector) {
      tips.push('Your sector is covered by BEE-GEF-UNIDO — this audit can be completely FREE if your unit is in one of the 26 programme clusters. Check sidhiee.beeindia.gov.in');
    } else if (ctx.userSector) {
      tips.push('BEE-GEF-UNIDO offers free audits in 26 programme clusters, but your sector is not currently covered. You\'ll need to commission a BEE-empaneled auditor independently');
    }
    if (ctx.schemeId !== 'S011' && isMicroSmall) {
      tips.push('You\'re eligible for MSE-GIFT voucher-based support for energy audits — apply before commissioning an auditor to reduce audit costs');
    } else if (ctx.schemeId !== 'S011' && isMedium) {
      tips.push('MSE-GIFT audit support is only for Micro/Small enterprises. As a Medium enterprise, you\'ll need to fund the audit independently (cost reimbursed up to ₹1L under ADEETIE after M&V)');
    }
  }

  // DPR step
  if (text.includes('dpr') || /detailed project report|dpr/i.test(title)) {
    tips.push('The same DPR works for ADEETIE, CLCS-TUS, SIDBI 4E, and MSE-GIFT applications — prepare once, apply to multiple schemes. Important: if you want CLCS-TUS stacking, aim for 15%+ overall energy saving in the DPR (ADEETIE only needs 10%)');
    if (inBeeGefSector) {
      tips.push('Your sector qualifies for BEE-GEF-UNIDO — DPR preparation is also free in programme clusters. This saves ₹30,000–₹75,000');
    }
  }

  // Bank loan step
  if (text.includes('bank_loan') || /bank loan|loan.*sanction|loan.*appli/i.test(title)) {
    if (ctx.hasEETechs && ctx.schemeId === 'S001') {
      tips.push('Stack with CLCS-TUS EET: Apply through a CLCS-TUS nodal bank (SBI, BOB, Canara, PNB, BOI) for 25% capital subsidy (max ₹10L) on the SAME EE project — requires 15%+ overall energy saving (verified by audit). CLCS-TUS reduces your principal, ADEETIE reduces your interest rate — both apply to the same loan if your bank is a nodal bank');
    }
    if (isMicroSmall) {
      tips.push('Ask your bank to apply for CGTMSE cover — collateral-free guarantee up to ₹5 Cr. You don\'t apply directly; the bank does it for you');
    } else if (isMedium) {
      tips.push('CGTMSE collateral-free guarantee is mainly for Micro/Small. As a Medium enterprise, your bank may require standard collateral');
    } else {
      tips.push('Ask your bank to apply for CGTMSE cover — collateral-free guarantee up to ₹5 Cr. You don\'t apply directly; the bank does it');
    }
    if (ctx.schemeId !== 'S011' && isMicroSmall && (ctx.hasEETechs || ctx.hasRETechs)) {
      tips.push('You\'re eligible for MSE-GIFT: 75% credit guarantee + 2% interest subvention through SIDBI-empaneled banks. Note: MSE-GIFT subvention is a separate scheme from ADEETIE — check if your bank is empaneled for both, otherwise you may need separate loan applications');
    } else if (ctx.schemeId !== 'S011' && isMedium) {
      tips.push('MSE-GIFT (75% guarantee + 2% interest subvention) is not available for Medium enterprises — ADEETIE 3% subvention (for Medium) is your best option for EE projects');
    }
    if (ctx.schemeId === 'S001') {
      tips.push(`21 banks are already registered on the ADEETIE portal with pre-approved ${isMedium ? '3%' : '5%'} interest subvention${isMedium ? ' (for Medium enterprises)' : ''} — check adeetie.beeindia.gov.in/registered-fis. Use your existing bank if it's on the list for fastest processing`);
    }
  }

  // Installation step
  if (/install|implementation|equipment/i.test(title) && !/audit|assessment/i.test(title)) {
    if (ctx.hasLowCostEE) {
      tips.push('For LEDs, motors, and compressed air: Consider EESL ESCO as an alternative — 20% co-payment upfront, they install and you pay the rest from savings over 3 years (available in 12 MSME clusters)');
    }
    if (ctx.hasRETechs && stateSda) {
      tips.push(`Check ${stateSda} (${ctx.userState} SDA) for additional state-level solar/RE subsidy that stacks with your central scheme loan. Also consider IREDA for dedicated RE project financing and MSE-GIFT for 2% interest subvention on the RE portion`);
    } else if (ctx.hasRETechs) {
      tips.push('Check your State Designated Agency (SDA) for additional state-level subsidy. Also consider IREDA for dedicated RE project financing and MSE-GIFT for 2% interest subvention');
    }
    if (ctx.hasEETechs && ctx.hasRETechs) {
      tips.push('Tip: EE equipment (VFDs, motors, LEDs) and RE equipment (solar) typically need separate financing streams — ADEETIE covers EE technologies, while solar goes through SDA/IREDA/SIDBI. You may need two loan applications');
    }
  }

  // M&V / savings step
  if (/m&v|monitoring|verification|savings|repayment/i.test(title)) {
    tips.push('Track your energy savings data — use it for ZED certification (improves access to future subsidies) and BRSR Principle 6 disclosure');
  }

  return tips;
}
import { cn } from '@/lib/utils';
import { DocumentChecklist } from './document-checklist';
import { JargonTerm } from './jargon-term';
import { PlanCostSummary } from './plan-cost-summary';
import Link from 'next/link';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActionStepData {
  id: string;
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

interface SchemeSteps {
  scheme: {
    schemeId: string;
    name: string;
    implementingAgency: string;
    supportType: string;
    status: string;
    applicationUrl: string | null;
  };
  steps: ActionStepData[];
}

/** A scheme section in the curated plan */
interface SchemeSection {
  schemeId: string;
  schemeName: string;
  schemeAgency: string;
  supportType: string;
  status: string;
  applicationUrl: string | null;
  techNames: string[];        // Technologies funded by this scheme
  steps: StepItem[];           // Steps in order, with dedup applied
}

interface StepItem {
  stepNumber: number;
  title: string;
  description: string;
  estimatedTime: string | null;
  estimatedCost: string | null;
  documentsNeeded: string[];
  actionUrl: string | null;
  actionLabel: string | null;
  tips: string | null;
  dedupKey: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const JARGON_TERMS = ['DEA', 'IGEA', 'DPR', 'ESCO', 'M&V', 'CGTMSE', 'PRSF', 'EOI', 'PPA', 'RESCO', 'CEA', 'AEA', 'NCV', 'SDA', 'EPC', 'OTS', 'DISCOM', 'NBFC', 'CBG', 'FI', 'EMI', 'CIBIL', 'NPA', 'ITR', 'EBLR', 'PSB', 'BRSR', 'ZED', 'UDYAM', 'MLI', 'PFI', 'RAMP'];

function renderWithJargon(text: string) {
  const regex = new RegExp(`\\b(${JARGON_TERMS.join('|')})\\b`, 'g');
  const parts = text.split(regex);
  return parts.map((part, i) =>
    JARGON_TERMS.includes(part) ? <JargonTerm key={i} term={part} /> : <span key={i}>{part}</span>,
  );
}

function fmtLakhs(v: number | null | undefined): string {
  if (v == null || v === 0) return '₹0';
  if (v >= 100) return `₹${(v / 100).toFixed(1)} Cr`;
  return `₹${v.toFixed(1)}L`;
}

function fmtInr(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toFixed(0)}`;
}

/** Pick the best funding scheme for a technology */
function pickBestScheme(tech: TechWithFunding): FundingMatch | null {
  const active = tech.fundingMatches.filter((m) => m.status === 'Active');
  if (active.length === 0) return tech.fundingMatches[0] ?? null;

  return active.reduce((best, m) => {
    if (m.netCapexMinLakhs != null && (best.netCapexMinLakhs == null || m.netCapexMinLakhs < best.netCapexMinLakhs)) {
      return m;
    }
    if (m.netCapexMinLakhs === best.netCapexMinLakhs && (m.subsidyPct ?? 0) > (best.subsidyPct ?? 0)) {
      return m;
    }
    return best;
  });
}

/* ------------------------------------------------------------------ */
/*  Deduplication                                                      */
/* ------------------------------------------------------------------ */

/** Patterns that identify equivalent steps across schemes */
const DEDUP_PATTERNS: { key: string; patterns: RegExp[] }[] = [
  { key: 'eligibility_check', patterns: [/check.*eligib/i, /verify.*udyam/i, /eligib.*check/i] },
  { key: 'energy_audit', patterns: [/energy audit/i, /\bDEA\b/, /\bIGEA\b/] },
  { key: 'dpr', patterns: [/\bDPR\b/, /detailed project report/i] },
  { key: 'bank_loan', patterns: [/bank loan/i, /loan.*sanction/i, /loan.*appli/i] },
  { key: 'eoi', patterns: [/submit.*eoi/i, /expression of interest/i] },
];

function getDedupKey(step: ActionStepData): string | null {
  const text = step.title + ' ' + step.description;
  for (const { key, patterns } of DEDUP_PATTERNS) {
    if (patterns.some((p) => p.test(text))) return key;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Build curated plan — scheme-grouped, step-ordered, deduplicated    */
/* ------------------------------------------------------------------ */

function buildCuratedPlan(
  enabledTechs: TechWithFunding[],
  schemeStepsMap: Map<string, SchemeSteps>,
): SchemeSection[] {
  // 1. Group techs by best scheme
  const techsByScheme = new Map<string, { techs: TechWithFunding[]; scheme: FundingMatch }>();

  for (const tech of enabledTechs) {
    const bestScheme = pickBestScheme(tech);
    if (!bestScheme) continue;

    const existing = techsByScheme.get(bestScheme.schemeId);
    if (existing) {
      existing.techs.push(tech);
    } else {
      techsByScheme.set(bestScheme.schemeId, { techs: [tech], scheme: bestScheme });
    }
  }

  // 2. Process schemes in priority order (most comprehensive first)
  const schemeOrder = ['S001', 'S011', 'S006', 'S004', 'S003', 'S002', 'S010', 'S008', 'S012', 'S009', 'S007'];
  const sortedSchemeIds = Array.from(techsByScheme.keys()).sort((a, b) => {
    const ia = schemeOrder.indexOf(a);
    const ib = schemeOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  // 3. Build sections, keeping scheme step order, deduplicating across schemes
  const coveredDedupKeys = new Set<string>();
  const sections: SchemeSection[] = [];

  for (const sid of sortedSchemeIds) {
    const group = techsByScheme.get(sid)!;
    const stepsData = schemeStepsMap.get(sid);
    if (!stepsData) continue;

    const steps: StepItem[] = [];
    let stepCounter = 1;

    for (const step of stepsData.steps) {
      const dedupKey = getDedupKey(step);

      // Skip if this step type was already covered by an earlier scheme
      if (dedupKey && coveredDedupKeys.has(dedupKey)) continue;

      // Mark as covered for subsequent schemes
      if (dedupKey) coveredDedupKeys.add(dedupKey);

      steps.push({
        stepNumber: stepCounter++,
        title: step.title,
        description: step.description,
        estimatedTime: step.estimatedTime,
        estimatedCost: step.estimatedCost,
        documentsNeeded: step.documentsNeeded ?? [],
        actionUrl: step.actionUrl,
        actionLabel: step.actionLabel,
        tips: step.tips,
        dedupKey,
      });
    }

    if (steps.length === 0) continue;

    sections.push({
      schemeId: sid,
      schemeName: stepsData.scheme.name,
      schemeAgency: stepsData.scheme.implementingAgency,
      supportType: stepsData.scheme.supportType,
      status: stepsData.scheme.status,
      applicationUrl: stepsData.scheme.applicationUrl,
      techNames: group.techs.map((t) => t.name),
      steps,
    });
  }

  return sections;
}

/* ------------------------------------------------------------------ */
/*  Step status — actionable sub-tasks + user completion toggle        */
/* ------------------------------------------------------------------ */

interface SubStep {
  done: boolean;
  label: string;
  actionUrl?: string;
  actionLabel?: string;
}

interface StepStatus {
  /** Checklist items: what the user needs to do / has done */
  items: SubStep[];
  /** Recommended path heading (e.g. "Free audit via BEE-GEF-UNIDO") */
  recommendedPath?: string;
  /** Detailed how-to sub-steps for the recommended path */
  howTo?: SubStep[];
  /** Field in EligibilityAnswers or step dedup key the user can toggle to mark done */
  markDoneField?: string;
  /** Label for the mark-done toggle */
  markDoneLabel?: string;
  /** Note shown when step is already completed */
  completedNote?: string;
}

function getStepStatus(dedupKey: string | null, answers: EligibilityAnswers, orgContext: OrgContextProp | null, relevantSchemeIds?: Set<string>): StepStatus | null {
  if (!dedupKey) return null;

  switch (dedupKey) {
    case 'eligibility_check': {
      const items: SubStep[] = [];
      if (answers.hasUdyam !== null)
        items.push(answers.hasUdyam
          ? { done: true, label: 'Udyam registration: Done' }
          : { done: false, label: 'Get Udyam registration (free, 15 min)', actionUrl: 'https://udyamregistration.gov.in', actionLabel: 'Register Now' },
        );
      if (answers.enterpriseSize !== null)
        items.push({ done: true, label: `Enterprise size: ${answers.enterpriseSize.charAt(0).toUpperCase() + answers.enterpriseSize.slice(1)}` });
      if (answers.inAdeetieCluster !== null)
        items.push(
          answers.inAdeetieCluster === 'yes' ? { done: true, label: 'ADEETIE cluster: Confirmed' }
          : answers.inAdeetieCluster === 'no' ? { done: false, label: 'Not in an ADEETIE cluster — consider MSE-GIFT or SIDBI 4E instead' }
          : { done: false, label: 'ADEETIE cluster: Unsure — check your district', actionUrl: 'https://adeetie.beeindia.gov.in', actionLabel: 'Check Cluster List' },
        );
      if (answers.isNpa !== null && answers.isNpa !== 'no')
        items.push({
          done: false,
          label: answers.isNpa === 'yes' ? 'Active NPA: Blocks all bank-based schemes — resolve via OTS first'
            : answers.isNpa === 'resolved' ? 'NPA resolved (OTS) — banks typically need 12-24 months clean history post-settlement before approving new loans'
            : 'NPA status: Unsure — check with your bank before applying',
        });
      return items.length > 0 ? { items, markDoneField: 'hasUdyam', markDoneLabel: 'I have verified my eligibility', completedNote: 'Eligibility verified — you meet all basic criteria for this scheme.' } : null;
    }

    case 'energy_audit': {
      const items: SubStep[] = [];
      const inBeeGef = orgContext?.sector ? BEE_GEF_SECTORS.includes(orgContext.sector) : false;
      const isMicroSmall = answers.enterpriseSize === 'micro' || answers.enterpriseSize === 'small';

      if (answers.hasEnergyAudit === true) {
        items.push({ done: true, label: 'Energy audit: Completed' });
        return { items, markDoneField: 'hasEnergyAudit', markDoneLabel: 'Energy audit is done', completedNote: 'Audit report ready. Use it for your DPR and scheme applications.' };
      }

      // Not done — show how to get it done
      items.push({ done: false, label: 'Energy audit: Not done yet' });

      // Recommended path based on user's profile
      let recommendedPath: string | undefined;
      let howTo: SubStep[] | undefined;

      if (inBeeGef) {
        recommendedPath = 'Recommended: Free audit via BEE-GEF-UNIDO';
        howTo = [
          { done: answers.inAdeetieCluster === 'yes', label: 'Check if your unit is in one of 26 BEE-GEF-UNIDO programme clusters', actionUrl: 'https://sidhiee.beeindia.gov.in', actionLabel: 'Check Cluster List' },
          { done: false, label: 'If yes: Contact the BEE facilitation centre for your cluster — they assign a free auditor' },
          { done: false, label: 'If no: Hire a BEE-empaneled auditor independently (₹50K–₹2L)' },
          { done: false, label: 'Auditor visits your factory for 2-3 days, measures every machine, furnace, motor' },
          { done: false, label: 'Auditor delivers IGEA report with savings estimates — keep this safe, needed for DPR' },
        ];
        if (isMicroSmall) {
          howTo.push({ done: false, label: 'If paying for audit: Apply for MSE-GIFT voucher first to reduce cost', actionUrl: 'https://green.msme.gov.in', actionLabel: 'MSE-GIFT Portal' });
        }
      } else {
        recommendedPath = 'How to get your energy audit done';
        howTo = [
          { done: false, label: 'Find a BEE-empaneled energy auditor', actionUrl: 'https://adeetie.beeindia.gov.in/accredited-energy-audit-agencies', actionLabel: 'Find Auditors' },
          ...(isMicroSmall ? [{ done: false, label: 'Apply for MSE-GIFT voucher support first to reduce audit cost (₹50K–₹2L)', actionUrl: 'https://green.msme.gov.in', actionLabel: 'MSE-GIFT Portal' }] : []),
          { done: false, label: 'Auditor visits your factory for 2-3 days, measures equipment and energy flows' },
          { done: false, label: 'Receive IGEA report with technology recommendations and savings estimates' },
          { done: false, label: 'Audit cost is reimbursable after M&V approval under ADEETIE' },
        ];
      }

      return { items, recommendedPath, howTo, markDoneField: 'hasEnergyAudit', markDoneLabel: 'I have completed my energy audit' };
    }

    case 'dpr': {
      const items: SubStep[] = [];
      const inBeeGef = orgContext?.sector ? BEE_GEF_SECTORS.includes(orgContext.sector) : false;

      if (answers.hasDPR === true && answers.hasVendorQuotes === true) {
        items.push({ done: true, label: 'DPR: Prepared' });
        items.push({ done: true, label: 'Vendor quotes: 3+ collected' });
        return { items, markDoneField: 'hasDPR', markDoneLabel: 'DPR is ready', completedNote: 'DPR and vendor quotations ready. Same DPR works for ADEETIE, CLCS-TUS, SIDBI 4E, and MSE-GIFT.' };
      }

      // Show actionable sub-steps
      const howTo: SubStep[] = [];
      if (answers.hasDPR !== true) {
        items.push({ done: false, label: 'DPR: Not prepared yet' });
        if (inBeeGef && answers.inAdeetieCluster !== 'no') {
          howTo.push({ done: false, label: 'If in BEE-GEF-UNIDO cluster: DPR preparation is also FREE — bundled with audit' });
        }
        howTo.push({ done: false, label: 'Ask your energy auditor to prepare the DPR alongside the audit (saves time and cost)' });
        howTo.push({ done: false, label: 'DPR should include: current energy consumption, proposed technology, expected savings, project cost, payback period' });
        howTo.push({ done: false, label: 'Same DPR works for ADEETIE, CLCS-TUS, SIDBI 4E, and MSE-GIFT — prepare once, apply to multiple' });
      } else {
        items.push({ done: true, label: 'DPR: Prepared' });
      }

      if (answers.hasVendorQuotes !== true) {
        items.push({ done: false, label: 'Vendor quotes: Need 3+ quotations' });
        howTo.push({ done: false, label: 'Contact 3+ equipment suppliers for your selected technologies' });
        howTo.push({ done: false, label: 'Get written quotations with equipment specs, delivery time, warranty, and installation cost' });
        howTo.push({ done: false, label: 'Banks require minimum 3 quotes as part of loan application' });
      } else {
        items.push({ done: true, label: 'Vendor quotes: 3+ collected' });
      }

      return { items, howTo: howTo.length > 0 ? howTo : undefined, recommendedPath: howTo.length > 0 ? 'How to prepare your DPR' : undefined, markDoneField: 'hasDPR', markDoneLabel: 'I have my DPR ready' };
    }

    case 'bank_loan': {
      const items: SubStep[] = [];
      const isMicroSmall = answers.enterpriseSize === 'micro' || answers.enterpriseSize === 'small';
      const isMedium = answers.enterpriseSize === 'medium';

      // Profile items
      if (answers.hasBankRelationship !== null)
        items.push(answers.hasBankRelationship
          ? { done: true, label: 'Existing bank relationship — approach your current bank for faster processing' }
          : { done: true, label: 'No existing bank — start with SBI or PNB (branches in every district). Open a current account first (needs PAN + Aadhaar + address proof + 2 photos, takes 1-2 weeks). Then ask the MSME lending officer about ADEETIE energy efficiency loans. Having 3-6 months of transactions in the account before applying improves approval chances', actionUrl: 'https://adeetie.beeindia.gov.in/registered-fis', actionLabel: 'All 21 ADEETIE Banks' },
        );
      if (answers.cibilScore !== null)
        items.push(
          answers.cibilScore === 'above_700' ? { done: true, label: 'CIBIL score: Above 700 — strong position' }
          : answers.cibilScore === '650_700' ? { done: true, label: 'CIBIL score: 650-700 — acceptable, add CGTMSE for extra cover' }
          : answers.cibilScore === 'below_650' ? { done: false, label: 'CIBIL score: Below 650 — apply through a PSB with CGTMSE cover, or use EESL ESCO (no credit check)' }
          : { done: false, label: 'CIBIL score: Unknown — check free at cibil.com/freecibilscore (needs PAN + Aadhaar OTP, 10-15 min). Banks check your PERSONAL score, not the company\'s. Do this before applying for any loan', actionUrl: 'https://www.cibil.com/freecibilscore', actionLabel: 'Check CIBIL Free' },
        );
      if (answers.hasCollateral !== null && answers.hasCollateral !== 'yes') {
        const isMedium = answers.enterpriseSize === 'medium';
        if (isMedium) {
          items.push({ done: false, label: 'No collateral: CGTMSE is primarily for Micro/Small. As a Medium enterprise, your bank may require standard collateral or consider project-based lending' });
        } else {
          items.push(
            answers.hasCollateral === 'no'
              ? { done: true, label: 'No collateral: RBI mandates no collateral for MSE loans up to ₹20L. For larger amounts, ask bank to apply CGTMSE (up to ₹5 Cr)' }
              : { done: true, label: 'Prefer not to pledge: Ask bank to apply CGTMSE — collateral-free guarantee up to ₹5 Cr' },
          );
        }
      }
      if (answers.itrFiledYears !== null && (answers.itrFiledYears ?? 0) < 2)
        items.push(
          answers.itrFiledYears === 0
            ? { done: false, label: 'ITR: Not filed — banks need 2+ years. Consult a CA to file retrospectively (₹2K–₹5K/year)' }
            : { done: false, label: 'ITR: 1 year filed — most banks prefer 2+. File the missing year before applying' },
        );

      // How-to for the loan process — scheme-aware
      const hasAdeetie = relevantSchemeIds?.has('S001');
      const hasMseGift = relevantSchemeIds?.has('S011');
      const hasSidbi4e = relevantSchemeIds?.has('S004');
      const hasClcsTus = relevantSchemeIds?.has('S006');

      const subventionParts: string[] = [];
      if (hasAdeetie) subventionParts.push(`ADEETIE ${isMedium ? '3%' : '5%'} interest subvention (up to 5 years)`);
      if (hasMseGift && isMicroSmall) subventionParts.push('MSE-GIFT 2% interest subvention (5 years) + 75% guarantee');
      if (hasClcsTus) subventionParts.push('CLCS-TUS 25% capital subsidy (max ₹10L)');
      const subventionLabel = subventionParts.length > 0
        ? `Ask the bank to apply for: ${subventionParts.join('; ')}`
        : 'Ask the bank about available interest subvention and capital subsidy schemes';

      const howTo: SubStep[] = [
        { done: answers.hasDPR === true, label: 'Gather: DPR + 3 vendor quotes + Udyam certificate + 2 years ITR + 6 months bank statements' },
        { done: false, label: answers.hasBankRelationship ? 'Visit your bank branch and ask to speak with the MSME lending officer — check if they\'re ADEETIE-registered at adeetie.beeindia.gov.in/registered-fis' : hasAdeetie ? `Choose from 21 ADEETIE-registered banks at adeetie.beeindia.gov.in/registered-fis — all pre-approved for ${isMedium ? '3%' : '5%'} interest subvention` : hasSidbi4e ? 'Apply to SIDBI directly (dedicated EE lending cell) or any scheduled commercial bank' : 'Visit any scheduled commercial bank or apply to SIDBI directly' },
        { done: false, label: subventionLabel },
        { done: false, label: isMicroSmall ? 'Ask the bank to apply for CGTMSE cover — they do it, not you' : 'Discuss collateral requirements with the bank' },
        { done: false, label: 'Bank sanctions loan → you receive disbursement → proceed with equipment purchase' },
      ];

      return { items, howTo, recommendedPath: 'Loan application process', markDoneField: 'hasBankRelationship', markDoneLabel: 'I have applied for / secured my loan' };
    }

    case 'eoi': {
      // EOI only requires Udyam — energy audit comes AFTER EOI acceptance
      const items: SubStep[] = [];
      if (answers.hasUdyam !== null)
        items.push(answers.hasUdyam
          ? { done: true, label: 'Udyam registration: Done — you can submit the EOI' }
          : { done: false, label: 'Get Udyam registration first (free, 15 min)', actionUrl: 'https://udyamregistration.gov.in', actionLabel: 'Register' },
        );

      return {
        items,
        howTo: [
          { done: false, label: 'Download the EOI format from the ADEETIE portal', actionUrl: 'https://adeetie.beeindia.gov.in', actionLabel: 'ADEETIE Portal' },
          { done: false, label: 'Fill in: company name, Udyam number, sector, annual energy consumption, contact details' },
          { done: false, label: 'Keep your last 12 months DISCOM bills ready — you\'ll need total kWh and bill amounts' },
          { done: false, label: 'Email the completed EOI to the BEE facilitation centre for your cluster' },
          { done: false, label: 'After acceptance: BEE assigns an empaneled auditor for your energy audit' },
        ],
        recommendedPath: 'How to submit your EOI',
        markDoneField: 'eoi', // tracked via manual step completion
        markDoneLabel: 'I have submitted my EOI',
        completedNote: 'EOI submitted. Next: BEE assigns an auditor for your energy audit.',
      };
    }

    default: {
      // Handle installation and M&V steps by title pattern matching
      return null;
    }
  }
}

/** Additional step status for non-deduped steps (installation, M&V) based on title */
function getStepStatusByTitle(title: string, answers: EligibilityAnswers): StepStatus | null {
  const t = title.toLowerCase();

  // Installation / implementation step
  if (/install|implementation|equipment.*purchas/i.test(t) && !/audit|assessment/i.test(t)) {
    return {
      items: [],
      howTo: [
        { done: false, label: 'Issue purchase order to selected vendor (use the vendor quote from your DPR)' },
        { done: false, label: 'Ensure vendor provides: installation, commissioning, warranty certificate, and training' },
        { done: false, label: 'Keep all invoices, delivery challans, and installation photos — needed for M&V' },
        { done: false, label: 'Inform your bank/scheme officer once installation is complete' },
      ],
      recommendedPath: 'Installation process',
      markDoneField: 'installation',
      markDoneLabel: 'Equipment is installed and commissioned',
      completedNote: 'Equipment installed. Next: Schedule M&V verification with the scheme officer to confirm energy savings.',
    };
  }

  // M&V / monitoring / verification / savings step
  if (/m&v|monitoring.*verif|verification|savings.*verif/i.test(t)) {
    return {
      items: [],
      howTo: [
        { done: false, label: 'Scheme officer / empaneled agency visits to verify installation matches DPR' },
        { done: false, label: 'They measure actual energy savings over 3-6 months (baseline vs post-installation)' },
        { done: false, label: 'Keep monthly energy bills and production logs ready for comparison' },
        { done: false, label: 'After successful M&V: subsidy/subvention is formally confirmed' },
      ],
      recommendedPath: 'M&V process',
      markDoneField: 'mv',
      markDoneLabel: 'M&V is complete',
      completedNote: 'M&V verified. Your energy savings are confirmed and subsidy/subvention is active. Track savings for ZED certification and BRSR disclosure.',
    };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Step card component                                                */
/* ------------------------------------------------------------------ */

function StepCard({ step, stepIndex, totalSteps, stackingTips, completed = false, isNextAction = false, stepStatus, onToggleDone, schemeId }: { step: StepItem; stepIndex: number; totalSteps: number; stackingTips: string[]; completed?: boolean; isNextAction?: boolean; stepStatus?: StepStatus | null; onToggleDone?: (field: string, value: boolean) => void; schemeId?: string }) {
  const [expanded, setExpanded] = useState(isNextAction && !completed);
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div className={cn('relative flex gap-3', !isLast && 'pb-4')}>
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        {completed ? (
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-3.5 w-3.5" />
          </div>
        ) : (
          <div className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-bold',
            isNextAction
              ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30 ring-offset-1 animate-pulse'
              : 'border-primary bg-primary/10 text-primary',
          )}>
            {step.stepNumber}
          </div>
        )}
        {!isLast && <div className="w-px flex-1 bg-border" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-start justify-between text-left group"
        >
          <div className="space-y-0.5 min-w-0">
            <h4 className={cn(
              'text-sm font-semibold transition-colors',
              completed ? 'text-muted-foreground line-through' : 'text-foreground group-hover:text-primary',
            )}>
              {step.title}
            </h4>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {step.estimatedTime && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {step.estimatedTime}
                </span>
              )}
              {step.estimatedCost && (
                <span className="flex items-center gap-1">
                  <IndianRupee className="h-3 w-3" />
                  {step.estimatedCost}
                </span>
              )}
            </div>
          </div>
          <ChevronRight
            className={cn('h-4 w-4 text-muted-foreground transition-transform mt-0.5 shrink-0', expanded && 'rotate-90')}
          />
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
            {/* Status + actionable sub-steps from eligibility answers */}
            {stepStatus && (stepStatus.items.length > 0 || stepStatus.howTo || stepStatus.completedNote) && (
              <div className="rounded-md border border-border bg-background px-3 py-2.5 space-y-2">
                {/* Completion summary or checklist */}
                {completed && stepStatus.completedNote ? (
                  <>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                      <span>{stepStatus.completedNote}</span>
                    </p>
                    {/* Toggle to undo */}
                    {stepStatus.markDoneField && onToggleDone && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggleDone(stepStatus.markDoneField!, false); }}
                        className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-red-500 transition-colors"
                      >
                        <XCircle className="h-3 w-3" />
                        Mark as not done
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-semibold text-muted-foreground">Your status:</p>
                    {stepStatus.items.map((item, i) => (
                      <div key={i} className={cn('text-[11px] flex items-start gap-1.5', item.done ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                        {item.done ? <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" /> : <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />}
                        <span>{item.label}</span>
                        {item.actionUrl && (
                          <a href={item.actionUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline ml-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {item.actionLabel ?? 'Open'}
                          </a>
                        )}
                      </div>
                    ))}

                    {/* How-to sub-steps */}
                    {stepStatus.howTo && stepStatus.howTo.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                        <p className="text-[11px] font-semibold text-foreground">{stepStatus.recommendedPath ?? 'How to complete this step:'}</p>
                        {stepStatus.howTo.map((sub, i) => (
                          <div key={i} className="text-[11px] text-muted-foreground flex items-start gap-1.5">
                            <span className="text-muted-foreground/50 shrink-0 mt-0.5 font-mono text-[10px]">{i + 1}.</span>
                            <span>{sub.label}</span>
                            {sub.actionUrl && (
                              <a href={sub.actionUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline ml-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                {sub.actionLabel ?? 'Open'}
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mark as done toggle */}
                    {stepStatus.markDoneField && onToggleDone && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onToggleDone(stepStatus.markDoneField!, true); }}
                          className="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {stepStatus.markDoneLabel ?? 'Mark as done'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <p className="text-xs text-foreground leading-relaxed">
              {renderWithJargon(step.description)}
            </p>

            {!completed && step.tips && (
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                <p className="text-[11px] text-amber-800 dark:text-amber-200">
                  <span className="font-semibold">Tip:</span> {step.tips}
                </p>
              </div>
            )}

            {!completed && stackingTips.length > 0 && (
              <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 space-y-1.5">
                <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                  <Layers className="h-3 w-3" />
                  Stack with other schemes
                </p>
                {stackingTips.map((tip, i) => (
                  <p key={i} className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-start gap-1.5">
                    <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </p>
                ))}
              </div>
            )}

            {step.documentsNeeded.length > 0 && (
              <DocumentChecklist documents={step.documentsNeeded} stepKey={schemeId ? `${schemeId}-${step.stepNumber}` : undefined} />
            )}

            {step.actionUrl && (
              <a href={step.actionUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <ExternalLink className="h-3 w-3" />
                  {step.actionLabel ?? 'Open Link'}
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Verdict badge                                                      */
/* ------------------------------------------------------------------ */

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  switch (verdict) {
    case 'eligible':
      return (
        <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 dark:text-emerald-400 gap-1">
          <Check className="h-3 w-3" /> Eligible
        </Badge>
      );
    case 'soft_block':
      return (
        <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-600 dark:text-amber-400 gap-1">
          <AlertTriangle className="h-3 w-3" /> Fix Required
        </Badge>
      );
    case 'hard_block':
      return (
        <Badge variant="outline" className="text-[10px] border-red-500 text-red-600 dark:text-red-400 gap-1">
          <XCircle className="h-3 w-3" /> Not Eligible
        </Badge>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function CuratedPlan({ className, orgContext }: { className?: string; orgContext?: OrgContextProp | null }) {
  const recommendations = useWhatIfStore((s) => s.recommendations);
  const enabledTechIds = useWhatIfStore((s) => s.enabledTechIds);
  const combinedImpact = useWhatIfStore((s) => s.combinedImpact);
  const periodId = useWhatIfStore((s) => s.periodId);

  const [schemeStepsMap, setSchemeStepsMap] = useState<Map<string, SchemeSteps>>(new Map());
  const [loading, setLoading] = useState(false);

  const enabledTechs = useMemo(
    () => recommendations.filter((r) => enabledTechIds.has(r.techId)),
    [recommendations, enabledTechIds],
  );

  const neededSchemeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const tech of enabledTechs) {
      const best = pickBestScheme(tech);
      if (best) ids.add(best.schemeId);
    }
    return ids;
  }, [enabledTechs]);

  // Fetch action plan steps for all needed schemes
  useEffect(() => {
    if (neededSchemeIds.size === 0) return;
    const toFetch = Array.from(neededSchemeIds).filter((id) => !schemeStepsMap.has(id));
    if (toFetch.length === 0) return;

    setLoading(true);
    Promise.all(
      toFetch.map((sid) =>
        fetch(`/api/action-plans/${sid}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => (data ? [sid, data as SchemeSteps] as const : null)),
      ),
    )
      .then((results) => {
        setSchemeStepsMap((prev) => {
          const next = new Map(prev);
          for (const r of results) {
            if (r) next.set(r[0], r[1]);
          }
          return next;
        });
      })
      .finally(() => setLoading(false));
  }, [neededSchemeIds, schemeStepsMap]);

  // Build the curated plan — scheme-grouped sections
  const sections = useMemo(
    () => buildCuratedPlan(enabledTechs, schemeStepsMap),
    [enabledTechs, schemeStepsMap],
  );

  // Consolidated document list across all sections
  const allDocuments = useMemo(() => {
    const docs = new Set<string>();
    for (const section of sections) {
      for (const step of section.steps) {
        for (const doc of step.documentsNeeded) docs.add(doc);
      }
    }
    return Array.from(docs);
  }, [sections]);

  // Group techs by scheme for summary display
  const schemeGroups = useMemo(() => {
    const groups = new Map<string, { scheme: FundingMatch; techs: TechWithFunding[] }>();
    for (const tech of enabledTechs) {
      const scheme = pickBestScheme(tech);
      if (!scheme) continue;
      const existing = groups.get(scheme.schemeId);
      if (existing) {
        existing.techs.push(tech);
      } else {
        groups.set(scheme.schemeId, { scheme, techs: [tech] });
      }
    }
    return Array.from(groups.values());
  }, [enabledTechs]);

  const uniqueSchemeCount = schemeGroups.length;

  // ── Eligibility state ──
  const [eligAnswers, setEligAnswers] = useState<EligibilityAnswers>(() => loadEligibility());
  const [showQuestionnaire, setShowQuestionnaire] = useState(() => loadEligibility().hasUdyam === null);

  const updateAnswers = useCallback((newAnswers: EligibilityAnswers) => {
    setEligAnswers((prev) => {
      // Clear manual step completion when a related answer changes to false/null
      const fieldToStep: Record<string, string> = {
        hasUdyam: 'eligibility_check',
        hasEnergyAudit: 'energy_audit',
        hasDPR: 'dpr',
        hasVendorQuotes: 'dpr', // vendor quotes are part of DPR step
      };
      for (const [field, stepKey] of Object.entries(fieldToStep)) {
        const k = field as keyof EligibilityAnswers;
        if (prev[k] === true && newAnswers[k] === false) {
          setManualSteps((ms) => toggleStepCompletion(ms, stepKey, false));
        }
      }
      return newAnswers;
    });
    saveEligibility(newAnswers);
  }, []);

  // Tech type flags
  const hasEETechs = enabledTechs.some((t) =>
    ['T001','T002','T003','T004','T005','T006','T007','T008','T009','T012','T014'].includes(t.techId),
  );
  const hasRETechs = enabledTechs.some((t) =>
    ['T015','T016','T017','T018'].includes(t.techId),
  );
  const hasBioTechs = enabledTechs.some((t) =>
    ['T020','T021'].includes(t.techId),
  );
  const hasGasTechs = enabledTechs.some((t) =>
    ['T019'].includes(t.techId),
  );

  // Compute eligibility
  const eligResult: EligibilityResult = useMemo(
    () => evaluateAllSchemes(eligAnswers, orgContext ?? null, Array.from(neededSchemeIds), hasEETechs, hasRETechs),
    [eligAnswers, orgContext, neededSchemeIds, hasEETechs, hasRETechs],
  );

  const [manualSteps, setManualSteps] = useState<Set<string>>(() => loadStepCompletion());
  const completedStepKeys = useMemo(() => getCompletedStepKeys(eligAnswers, manualSteps), [eligAnswers, manualSteps]);
  const completionPct = useMemo(() => getCompletionPct(eligAnswers), [eligAnswers]);

  // Toggle a step as done/not done from within the StepCard
  const handleToggleDone = useCallback((field: keyof EligibilityAnswers | string, value: boolean) => {
    // Check if it's an eligibility answer field (boolean fields)
    if (field in EMPTY_ANSWERS) {
      updateAnswers({ ...eligAnswers, [field]: value });
    }
    // Also toggle the step key in manual completion (for steps like EOI, bank_loan)
    // Map field → step dedup key
    const fieldToStep: Record<string, string> = {
      hasUdyam: 'eligibility_check',
      hasEnergyAudit: 'energy_audit',
      hasDPR: 'dpr',
      hasBankRelationship: 'bank_loan',
    };
    const stepKey = fieldToStep[field] ?? field;
    setManualSteps((prev) => toggleStepCompletion(prev, stepKey, value));
  }, [eligAnswers, updateAnswers]);

  // Find scheme eligibility by ID
  const schemeEligMap = useMemo(() => {
    const map = new Map<string, SchemeEligibility>();
    for (const r of eligResult.schemeResults) map.set(r.schemeId, r);
    return map;
  }, [eligResult]);

  /* ---------------------------------------------------------------- */
  /*  No recommendations data — CTA                                    */
  /* ---------------------------------------------------------------- */

  if (recommendations.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <Sparkles className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <h3 className="text-base font-semibold mb-1">Your Curated Action Plan</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Complete your GHG inventory and select technologies in the Recommendations page.
            We&apos;ll build a personalised action plan matching your selected technologies with
            the best funding schemes.
          </p>
          <Link href="/recommendations">
            <Button variant="default" size="sm" className="gap-1.5">
              <ArrowRight className="h-3.5 w-3.5" />
              Go to Recommendations
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  No enabled techs                                                 */
  /* ---------------------------------------------------------------- */

  if (enabledTechs.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
          <h3 className="text-base font-semibold mb-1">No Technologies Selected</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Enable technologies in the Recommendations simulator, then come back to see your
            curated action plan with matched funding schemes.
          </p>
          {periodId && (
            <Link href={`/recommendations/${periodId}`}>
              <Button variant="default" size="sm" className="gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                Go to Simulator
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Loading                                                          */
  /* ---------------------------------------------------------------- */

  if (loading && sections.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="space-y-4 py-8">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <div className="space-y-3 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Separate scheme sections by eligibility
  const eligibleSections = sections.filter((s) => {
    const e = schemeEligMap.get(s.schemeId);
    return !e || e.verdict === 'eligible';
  });
  const softBlockedSections = sections.filter((s) => {
    const e = schemeEligMap.get(s.schemeId);
    return e?.verdict === 'soft_block';
  });
  const hardBlockedSections = sections.filter((s) => {
    const e = schemeEligMap.get(s.schemeId);
    return e?.verdict === 'hard_block';
  });

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className={cn('space-y-4', className)}>

      {/* ── 1. Eligibility Questionnaire ── */}
      <Card>
        <CardHeader className="pb-2">
          <button
            type="button"
            onClick={() => setShowQuestionnaire(!showQuestionnaire)}
            className="flex w-full items-center justify-between text-left"
          >
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-semibold">Eligibility Check</CardTitle>
              {completionPct === 100 && (
                <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-600 dark:text-emerald-400">Complete</Badge>
              )}
            </div>
            {showQuestionnaire ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <CardDescription className="text-[11px]">
            Answer a few questions to check which schemes you qualify for
          </CardDescription>
        </CardHeader>
        {showQuestionnaire && (
          <CardContent>
            <EligibilityQuestionnaire
              answers={eligAnswers}
              onChange={updateAnswers}
              orgContext={orgContext ?? null}
              hasEETechs={hasEETechs}
              hasRETechs={hasRETechs}
              hasBioTechs={hasBioTechs}
              hasGasTechs={hasGasTechs}
              completionPct={completionPct}
            />
          </CardContent>
        )}
      </Card>

      {/* ── 2. Next Action CTA ── */}
      {eligResult.nextAction && (
        <Card className={cn(
          'border-2',
          eligResult.nextAction.urgency === 'start' ? 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20' :
          eligResult.nextAction.urgency === 'continue' ? 'border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20' :
          'border-emerald-500/50 bg-emerald-50/50 dark:bg-emerald-950/20',
        )}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                eligResult.nextAction.urgency === 'start' ? 'bg-blue-100 dark:bg-blue-900' :
                eligResult.nextAction.urgency === 'continue' ? 'bg-amber-100 dark:bg-amber-900' :
                'bg-emerald-100 dark:bg-emerald-900',
              )}>
                <Zap className={cn(
                  'h-4 w-4',
                  eligResult.nextAction.urgency === 'start' ? 'text-blue-600 dark:text-blue-400' :
                  eligResult.nextAction.urgency === 'continue' ? 'text-amber-600 dark:text-amber-400' :
                  'text-emerald-600 dark:text-emerald-400',
                )} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{eligResult.nextAction.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{eligResult.nextAction.description}</p>
                {eligResult.nextAction.actionUrl && (
                  <a href={eligResult.nextAction.actionUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <ExternalLink className="h-3 w-3" />
                      {eligResult.nextAction.actionLabel ?? 'Open'}
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 3. Eligibility Summary Bar ── */}
      {eligResult.schemeResults.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {eligResult.schemeResults.map((sr) => (
            <VerdictBadge key={sr.schemeId} verdict={sr.verdict} />
          ))}
          <span className="text-[11px] text-muted-foreground self-center ml-1">
            {eligResult.schemeResults.filter((r) => r.verdict === 'eligible').length} of {eligResult.schemeResults.length} schemes eligible
          </span>
        </div>
      )}

      {/* ── 4. Summary header (scheme groups + KPIs) ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold">
              Your Curated Action Plan
            </CardTitle>
          </div>
          <CardDescription className="text-[11px]">
            {enabledTechs.length} {enabledTechs.length === 1 ? 'technology' : 'technologies'} matched
            with {uniqueSchemeCount} funding {uniqueSchemeCount === 1 ? 'scheme' : 'schemes'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {schemeGroups.map(({ scheme, techs }) => {
              const se = schemeEligMap.get(scheme.schemeId);
              return (
                <div key={scheme.schemeId} className="rounded-lg border border-border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">{scheme.name}</h4>
                      <p className="text-[11px] text-muted-foreground">{scheme.supportType}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {se && <VerdictBadge verdict={se.verdict} />}
                      <Badge
                        variant="outline"
                        className={cn(
                          'shrink-0 text-[10px]',
                          scheme.status === 'Active'
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                            : 'border-amber-500 text-amber-600 dark:text-amber-400',
                        )}
                      >
                        {scheme.status}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {techs.map((tech) => (
                      <Badge key={tech.techId} variant="outline" className="text-[10px] py-0.5 px-2 font-normal">
                        {tech.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {combinedImpact && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
              <div>
                <p className="text-[11px] text-muted-foreground">CO₂ Reduction</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {combinedImpact.totalReductionTonnes.toFixed(1)} tCO₂e
                  <span className="text-xs font-normal ml-1">({combinedImpact.totalReductionPct.toFixed(0)}%)</span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Total CAPEX</p>
                <p className="text-sm font-bold">
                  {fmtLakhs(combinedImpact.totalCapexMinLakhs)}–{fmtLakhs(combinedImpact.totalCapexMaxLakhs)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Annual Savings</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {fmtInr(combinedImpact.totalAnnualSavingMinInr)}–{fmtInr(combinedImpact.totalAnnualSavingMaxInr)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">Blended Payback</p>
                <p className="text-sm font-bold">
                  {combinedImpact.blendedPaybackYears != null
                    ? `${combinedImpact.blendedPaybackYears.toFixed(1)} years`
                    : '—'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── 5. Eligible scheme sections ── */}
      {eligibleSections.map((section, sectionIndex) => {
        const sectionCtx: StackingContext = {
          hasEETechs,
          hasRETechs,
          hasBioTechs,
          hasLowCostEE: enabledTechs.some((t) => ['T006','T005'].includes(t.techId)),
          schemeId: section.schemeId,
          enterpriseSize: eligAnswers.enterpriseSize ?? null,
          userSector: orgContext?.sector ?? null,
          userState: orgContext?.state ?? null,
        };

        return (
        <Card key={section.schemeId}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {sectionIndex + 1}
                  </span>
                  {section.schemeName}
                </CardTitle>
                <CardDescription className="text-[11px] mt-1">
                  {section.supportType} — {section.schemeAgency}
                </CardDescription>
              </div>
              <VerdictBadge verdict="eligible" />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[11px] text-muted-foreground mr-1">Covers:</span>
              {section.techNames.map((name) => (
                <Badge key={name} variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                  {name}
                </Badge>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {section.steps.map((step, i) => {
                const isCompleted = step.dedupKey ? completedStepKeys.has(step.dedupKey) : false;
                const firstUncompleted = section.steps.findIndex((s) => !s.dedupKey || !completedStepKeys.has(s.dedupKey));
                const isNextStep = i === firstUncompleted;

                return (
                  <StepCard
                    key={`${section.schemeId}-${step.stepNumber}`}
                    step={step}
                    stepIndex={i}
                    totalSteps={section.steps.length}
                    stackingTips={getStackingTips(step.dedupKey, step.title, sectionCtx)}
                    completed={isCompleted}
                    isNextAction={isNextStep}
                    stepStatus={getStepStatus(step.dedupKey, eligAnswers, orgContext ?? null, neededSchemeIds) ?? getStepStatusByTitle(step.title, eligAnswers)}
                    onToggleDone={handleToggleDone}
                    schemeId={section.schemeId}
                  />
                );
              })}
            </div>
            {section.applicationUrl && (
              <div className="mt-4 pt-3 border-t border-border">
                <a href={section.applicationUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <ExternalLink className="h-3 w-3" />
                    Go to {section.schemeName} Portal
                  </Button>
                </a>
              </div>
            )}
          </CardContent>
        </Card>
        );
      })}

      {/* ── 6. Soft-blocked scheme sections ── */}
      {softBlockedSections.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">Schemes requiring action</p>
          </div>
          {softBlockedSections.map((section, sectionIndex) => {
            const se = schemeEligMap.get(section.schemeId);
            const sectionCtx: StackingContext = {
              hasEETechs,
              hasRETechs,
              hasBioTechs,
              hasLowCostEE: enabledTechs.some((t) => ['T006','T005'].includes(t.techId)),
              schemeId: section.schemeId,
              enterpriseSize: eligAnswers.enterpriseSize ?? null,
              userSector: orgContext?.sector ?? null,
              userState: orgContext?.state ?? null,
            };

            return (
            <Card key={section.schemeId} className="border-amber-200 dark:border-amber-800">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                        {eligibleSections.length + sectionIndex + 1}
                      </span>
                      {section.schemeName}
                    </CardTitle>
                    <CardDescription className="text-[11px] mt-1">
                      {section.supportType} — {section.schemeAgency}
                    </CardDescription>
                  </div>
                  <VerdictBadge verdict="soft_block" />
                </div>

                {/* Workaround callout */}
                {se && se.reasons.length > 0 && (
                  <div className="mt-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 space-y-1.5">
                    <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200">Issues to resolve:</p>
                    {se.reasons.map((r, i) => (
                      <div key={i} className="text-[11px] text-amber-700 dark:text-amber-300">
                        <p className="font-medium">{r.label}</p>
                        {r.workaround && <p className="text-amber-600 dark:text-amber-400 mt-0.5">{r.workaround}</p>}
                        {r.workaroundUrl && (
                          <a href={r.workaroundUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline text-[10px]">
                            {r.workaroundLabel ?? 'Learn more'}
                          </a>
                        )}
                      </div>
                    ))}
                    {se.missingInfo.length > 0 && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                        Answer more questions above to confirm full eligibility
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[11px] text-muted-foreground mr-1">Covers:</span>
                  {section.techNames.map((name) => (
                    <Badge key={name} variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                      {name}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="opacity-75">
                <div className="space-y-0">
                  {section.steps.map((step, i) => {
                    const isCompleted = step.dedupKey ? completedStepKeys.has(step.dedupKey) : false;
                    const firstUncompleted = section.steps.findIndex((s) => !s.dedupKey || !completedStepKeys.has(s.dedupKey));
                    const isNextStep = i === firstUncompleted;

                    return (
                      <StepCard
                        key={`${section.schemeId}-${step.stepNumber}`}
                        step={step}
                        stepIndex={i}
                        totalSteps={section.steps.length}
                        stackingTips={getStackingTips(step.dedupKey, step.title, sectionCtx)}
                        completed={isCompleted}
                        isNextAction={isNextStep}
                        stepStatus={getStepStatus(step.dedupKey, eligAnswers, orgContext ?? null, neededSchemeIds) ?? getStepStatusByTitle(step.title, eligAnswers)}
                        onToggleDone={handleToggleDone}
                        schemeId={section.schemeId}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </>
      )}

      {/* ── 7. Credit Enhancements ── */}
      {eligResult.creditEnhancements.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Credit Enhancements</CardTitle>
            </div>
            <CardDescription className="text-[11px]">
              Government guarantees and subsidies that reduce your financing cost
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {eligResult.creditEnhancements.map((ce, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">{ce.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{ce.description}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-[10px]',
                      ce.eligible
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-red-500 text-red-600 dark:text-red-400',
                    )}
                  >
                    {ce.eligible ? 'Eligible' : 'Not eligible'}
                  </Badge>
                </div>
                {ce.reason && (
                  <p className="text-[10px] text-muted-foreground mt-1 italic">{ce.reason}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── 8. Alternatives (if any blocks exist) ── */}
      {eligResult.alternatives.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">Alternative Routes</CardTitle>
            </div>
            <CardDescription className="text-[11px]">
              Options available based on your current situation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {eligResult.alternatives.map((alt, i) => (
              <div key={i} className="rounded-lg border border-border p-3">
                <h4 className="text-xs font-semibold text-foreground">{alt.title}</h4>
                <p className="text-[11px] text-muted-foreground mt-0.5">{alt.description}</p>
                <p className="text-[10px] text-primary mt-1">{alt.when}</p>
                {alt.actionUrl && (
                  <a href={alt.actionUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                      <ExternalLink className="h-3 w-3" />
                      {alt.actionLabel ?? 'Open'}
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── 9. Zero-Cost Pathway (if fully blocked or needs bankability) ── */}
      {(eligResult.isFullyBlocked || eligResult.needsBankability) && eligResult.zeroCostPathway.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm font-semibold">Start Here — Zero-Cost Actions</CardTitle>
            </div>
            <CardDescription className="text-[11px]">
              Even without loan access, these steps save energy and build your eligibility over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {[1, 2, 3, 4].map((tier) => {
              const tierActions = eligResult.zeroCostPathway.filter((a) => a.tier === tier);
              if (tierActions.length === 0) return null;
              return (
                <div key={tier} className="mb-4 last:mb-0">
                  <p className="text-[11px] font-semibold text-muted-foreground mb-2">
                    Tier {tier}: {tierActions[0].tierLabel}
                  </p>
                  <div className="space-y-2">
                    {tierActions.map((action, i) => (
                      <div key={i} className="rounded-lg border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-semibold text-foreground">{action.title}</h4>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{action.description}</p>
                          </div>
                          <div className="text-right shrink-0">
                            {action.estimatedCost && (
                              <Badge variant="outline" className="text-[10px]">{action.estimatedCost}</Badge>
                            )}
                          </div>
                        </div>
                        {action.estimatedSaving && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">
                            Potential saving: {action.estimatedSaving}
                          </p>
                        )}
                        {action.actionUrl && (
                          <a href={action.actionUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                              <ExternalLink className="h-3 w-3" />
                              {action.actionLabel ?? 'Open'}
                            </Button>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ── 10. Cost breakdown ── */}
      <PlanCostSummary
        techs={enabledTechs}
        pickBestScheme={pickBestScheme}
      />

      {/* ── 11. Document checklist ── */}
      {allDocuments.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-semibold">
                All Documents Needed
              </CardTitle>
              <CardDescription className="text-[11px] ml-auto">
                Consolidated across all schemes
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <DocumentChecklist documents={allDocuments} stepKey="consolidated" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
