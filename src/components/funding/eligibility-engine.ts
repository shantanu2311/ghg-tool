/**
 * Eligibility Assessment Engine — Pure Functions
 *
 * Evaluates MSME eligibility for each funding scheme based on
 * questionnaire answers and org context. Routes blocked users
 * to alternatives, credit enhancements, and zero-cost pathways.
 *
 * All client-side, no API calls. Persisted in localStorage.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface OrgContextProp {
  sector: string;
  subSector: string;
  state: string;
  turnoverBracket: string | null;
}

export interface EligibilityAnswers {
  // Section 1: Basic Eligibility (always shown)
  hasUdyam: boolean | null;
  operatingYears: '<1' | '1-3' | '3+' | null;
  isCashProfitable: 'both' | 'one' | 'none' | 'unsure' | null;
  isNpa: 'no' | 'yes' | 'resolved' | 'unsure' | null;
  enterpriseSize: 'micro' | 'small' | 'medium' | null;
  hasCollateral: 'yes' | 'no' | 'prefer_not' | null;

  // Section 2: Financial Profile (shown if loan-based schemes relevant)
  hasGstRegistration: boolean | null;
  itrFiledYears: 0 | 1 | 2 | 3 | null;
  cibilScore: 'above_700' | '650_700' | 'below_650' | 'unknown' | null;
  hasChequeBouncesRecent: boolean | null;

  // Section 3: Situational (shown per tech types)
  hasEnergyAudit: boolean | null;
  hasDPR: boolean | null;
  hasVendorQuotes: boolean | null;
  hasBankRelationship: boolean | null;
  inAdeetieCluster: 'yes' | 'no' | 'unsure' | null;
  hasRoofSpace: 'large' | 'small' | 'no' | null;
  hasPngAccess: 'connected' | 'available' | 'no' | 'unsure' | null;
}

export const EMPTY_ANSWERS: EligibilityAnswers = {
  hasUdyam: null,
  operatingYears: null,
  isCashProfitable: null,
  isNpa: null,
  enterpriseSize: null,
  hasCollateral: null,
  hasGstRegistration: null,
  itrFiledYears: null,
  cibilScore: null,
  hasChequeBouncesRecent: null,
  hasEnergyAudit: null,
  hasDPR: null,
  hasVendorQuotes: null,
  hasBankRelationship: null,
  inAdeetieCluster: null,
  hasRoofSpace: null,
  hasPngAccess: null,
};

export type Verdict = 'eligible' | 'soft_block' | 'hard_block';

export interface BlockReason {
  field: keyof EligibilityAnswers;
  label: string;
  severity: 'soft' | 'hard';
  workaround?: string;
  workaroundUrl?: string;
  workaroundLabel?: string;
}

export type CriterionStatus = 'pass' | 'fail' | 'warning' | 'unknown';

export interface SchemeCriterion {
  label: string;
  status: CriterionStatus;
  severity?: 'soft' | 'hard';
  detail?: string;
  detailUrl?: string;
  detailLabel?: string;
  /** Step group for sequential display (e.g. 'scheme', 'financial') */
  group?: string;
  /** Field key for deduplication across schemes (e.g. 'hasEnergyAudit', 'isNpa') */
  field?: string;
}

export interface SchemeEligibility {
  schemeId: string;
  schemeName: string;
  verdict: Verdict;
  reasons: BlockReason[];
  missingInfo: (keyof EligibilityAnswers)[];
  /** All criteria checked — pass, fail, warning, or unknown */
  criteria: SchemeCriterion[];
}

export interface AlternativeRoute {
  title: string;
  description: string;
  when: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface CreditEnhancement {
  title: string;
  description: string;
  eligible: boolean;
  reason?: string;
}

export interface ZeroCostAction {
  tier: 1 | 2 | 3 | 4;
  tierLabel: string;
  title: string;
  description: string;
  estimatedSaving?: string;
  estimatedCost?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export interface NextAction {
  title: string;
  description: string;
  actionUrl?: string;
  actionLabel?: string;
  urgency: 'start' | 'continue' | 'ready';
}

export interface EligibilityResult {
  schemeResults: SchemeEligibility[];
  alternatives: AlternativeRoute[];
  creditEnhancements: CreditEnhancement[];
  zeroCostPathway: ZeroCostAction[];
  nextAction: NextAction;
  completionPct: number;
  isFullyBlocked: boolean;
  /** True when user needs to build bankability (NPA, no profit, no ITR) even if EESL is available */
  needsBankability: boolean;
}

/* ------------------------------------------------------------------ */
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = 'ghg-funding-eligibility-v2';
const OLD_STORAGE_KEY = 'ghg-funding-readiness';

export function loadEligibility(): EligibilityAnswers {
  if (typeof window === 'undefined') return { ...EMPTY_ANSWERS };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...EMPTY_ANSWERS, ...JSON.parse(stored) };

    // V1 migration
    const old = localStorage.getItem(OLD_STORAGE_KEY);
    if (old) {
      const v1 = JSON.parse(old) as Record<string, boolean>;
      const migrated: EligibilityAnswers = {
        ...EMPTY_ANSWERS,
        hasUdyam: v1.hasUdyam ?? null,
        hasEnergyAudit: v1.hasEnergyAudit ?? null,
        hasDPR: v1.hasDPR ?? null,
        hasVendorQuotes: v1.hasVendorQuotes ?? null,
        hasBankRelationship: v1.hasBankRelationship ?? null,
        hasCollateral: v1.hasCollateral ? 'yes' : v1.hasCollateral === false ? 'no' : null,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      localStorage.removeItem(OLD_STORAGE_KEY);
      return migrated;
    }
  } catch { /* ignore */ }
  return { ...EMPTY_ANSWERS };
}

export function saveEligibility(answers: EligibilityAnswers): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(answers)); } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/*  Completion                                                         */
/* ------------------------------------------------------------------ */

const SECTION1_FIELDS: (keyof EligibilityAnswers)[] = [
  'hasUdyam', 'operatingYears', 'isCashProfitable', 'isNpa', 'enterpriseSize', 'hasCollateral',
];

export function getSection1CompletionPct(answers: EligibilityAnswers): number {
  const answered = SECTION1_FIELDS.filter((k) => answers[k] !== null).length;
  return Math.round((answered / SECTION1_FIELDS.length) * 100);
}

export function isSection1Complete(answers: EligibilityAnswers): boolean {
  return SECTION1_FIELDS.every((k) => answers[k] !== null);
}

export function getCompletionPct(
  answers: EligibilityAnswers,
  techFlags?: { hasEETechs: boolean; hasRETechs: boolean; hasGasTechs: boolean },
): number {
  // Only count fields that are actually shown to the user
  const relevantFields: (keyof EligibilityAnswers)[] = [
    // Section 1 — always shown
    'hasUdyam', 'operatingYears', 'isCashProfitable', 'isNpa', 'enterpriseSize', 'hasCollateral',
    // Section 2 — always shown
    'hasGstRegistration', 'itrFiledYears', 'cibilScore', 'hasChequeBouncesRecent',
    // Section 3 — universal
    'hasEnergyAudit', 'hasDPR', 'hasVendorQuotes', 'hasBankRelationship',
  ];
  // Section 3 — conditional
  if (techFlags?.hasEETechs) relevantFields.push('inAdeetieCluster');
  if (techFlags?.hasRETechs) relevantFields.push('hasRoofSpace');
  if (techFlags?.hasGasTechs) relevantFields.push('hasPngAccess');

  const answered = relevantFields.filter((k) => answers[k] !== null).length;
  return Math.round((answered / relevantFields.length) * 100);
}

/* ------------------------------------------------------------------ */
/*  Step completion — auto from answers + manual user toggles          */
/* ------------------------------------------------------------------ */

const STEP_COMPLETION_KEY = 'ghg-funding-step-completion';

/** Load user-toggled step completions from localStorage */
export function loadStepCompletion(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STEP_COMPLETION_KEY);
    if (stored) return new Set(JSON.parse(stored));
  } catch { /* ignore */ }
  return new Set();
}

/** Save user-toggled step completions to localStorage */
export function saveStepCompletion(steps: Set<string>): void {
  try { localStorage.setItem(STEP_COMPLETION_KEY, JSON.stringify(Array.from(steps))); } catch { /* ignore */ }
}

/** Toggle a step's completion state */
export function toggleStepCompletion(steps: Set<string>, stepKey: string, done: boolean): Set<string> {
  const next = new Set(steps);
  if (done) next.add(stepKey);
  else next.delete(stepKey);
  saveStepCompletion(next);
  return next;
}

/**
 * Get all completed step keys — merges:
 * 1. Auto-completed from eligibility answers (has Udyam → eligibility_check done)
 * 2. User-toggled steps (EOI submitted, bank loan applied, etc.)
 */
export function getCompletedStepKeys(answers: EligibilityAnswers, manualSteps: Set<string>): Set<string> {
  const completed = new Set(manualSteps);
  // Auto-complete from answers
  if (answers.hasUdyam) completed.add('eligibility_check');
  if (answers.hasEnergyAudit) completed.add('energy_audit');
  if (answers.hasDPR) completed.add('dpr');
  // These are NOT auto-completed — user toggles manually:
  // 'eoi', 'bank_loan', 'installation', 'mv'
  return completed;
}

/* ------------------------------------------------------------------ */
/*  BEE-GEF-UNIDO sector list                                         */
/* ------------------------------------------------------------------ */

const BEE_GEF_SECTORS = [
  'iron_steel', 'textiles', 'brick_kilns', 'ceramics', 'dairy',
  'brass', 'chemicals', 'forging', 'foundry',
];

/**
 * ADEETIE cluster states by sector — auto-detect from user's facility state.
 * Source: adeetie.beeindia.gov.in cluster list (April 2026).
 * Not exhaustive at district level, but if state + sector matches, likely in a cluster.
 */
const ADEETIE_CLUSTER_STATES: Record<string, string[]> = {
  iron_steel: ['West Bengal', 'Punjab', 'Rajasthan', 'Gujarat', 'Maharashtra', 'Jharkhand', 'Chhattisgarh', 'Tamil Nadu', 'Karnataka'],
  forging: ['Punjab', 'Rajasthan', 'Tamil Nadu', 'Maharashtra'],
  casting_foundry: ['West Bengal', 'Punjab', 'Rajasthan', 'Gujarat', 'Tamil Nadu', 'Maharashtra', 'Karnataka'],
  textiles: ['Tamil Nadu', 'Gujarat', 'Maharashtra', 'Rajasthan', 'Uttar Pradesh'],
  ceramics: ['Gujarat', 'Rajasthan', 'West Bengal'],
  brick_kilns: ['Uttar Pradesh', 'Bihar', 'West Bengal', 'Punjab', 'Haryana'],
  dairy: ['Gujarat', 'Maharashtra', 'Rajasthan', 'Karnataka'],
  brass: ['Uttar Pradesh', 'Rajasthan'],
  chemicals: ['Gujarat', 'Maharashtra', 'Tamil Nadu'],
};

/** Check if user's state + sector likely maps to an ADEETIE cluster */
function isLikelyInAdeetieCluster(sector: string | undefined, state: string | undefined): boolean | null {
  if (!sector || !state) return null;
  // Map sub-sectors to their ADEETIE parent
  const sectorMap: Record<string, string> = {
    eaf_mini_mill: 'iron_steel', induction_furnace: 'iron_steel',
    re_rolling: 'iron_steel', forging: 'forging', casting_foundry: 'casting_foundry',
  };
  const effectiveSector = sectorMap[sector] ?? sector;
  const states = ADEETIE_CLUSTER_STATES[effectiveSector];
  if (!states) return null;
  return states.includes(state);
}

/** Convert a negative block label into a positive pass label */
function derivePassLabel(field: keyof EligibilityAnswers, blockLabel: string): string {
  const passLabels: Partial<Record<keyof EligibilityAnswers, string>> = {
    hasUdyam: 'Udyam registration',
    operatingYears: 'Operating years requirement',
    isCashProfitable: 'Cash profitability',
    isNpa: 'No active loan default (NPA)',
    enterpriseSize: 'Enterprise size eligible',
    hasCollateral: 'Collateral available',
    hasGstRegistration: 'GST registered',
    itrFiledYears: 'ITR filing history',
    cibilScore: 'CIBIL score acceptable',
    hasChequeBouncesRecent: 'No recent cheque bounces',
    hasEnergyAudit: 'Energy audit completed',
    hasDPR: 'Detailed Project Report ready',
    hasVendorQuotes: 'Vendor quotations available',
    hasBankRelationship: 'Existing bank relationship',
    inAdeetieCluster: 'In eligible cluster',
    hasRoofSpace: 'Roof space available for solar',
    hasPngAccess: 'PNG pipeline access',
  };
  return passLabels[field] ?? blockLabel;
}

/* ------------------------------------------------------------------ */
/*  Per-scheme eligibility rules                                       */
/* ------------------------------------------------------------------ */

const SCHEME_NAMES: Record<string, string> = {
  S001: 'ADEETIE Scheme',
  S002: 'BEE-GEF-UNIDO Programme',
  S003: 'SIDBI PRSF',
  S004: 'SIDBI 4E / Green Finance',
  S006: 'CLCS-TUS (EET Component)',
  S007: 'ZED Certification',
  S008: 'SATAT / Bioenergy',
  S009: 'State SDA Subsidies',
  S010: 'EESL ESCO Model',
  S011: 'MSE-GIFT',
  S012: 'IREDA RE Financing',
};

export function evaluateScheme(
  schemeId: string,
  answers: EligibilityAnswers,
  orgContext: OrgContextProp | null,
): SchemeEligibility {
  const reasons: BlockReason[] = [];
  const missingInfo: (keyof EligibilityAnswers)[] = [];
  const criteria: SchemeCriterion[] = [];

  // Field → group mapping: scheme-specific vs financial
  const FINANCIAL_FIELDS: Set<keyof EligibilityAnswers> = new Set([
    'isNpa', 'cibilScore', 'isCashProfitable', 'hasGstRegistration',
    'hasChequeBouncesRecent', 'hasBankRelationship', 'hasCollateral', 'itrFiledYears',
  ]);

  function groupFor(field: keyof EligibilityAnswers): 'scheme' | 'financial' {
    return FINANCIAL_FIELDS.has(field) ? 'financial' : 'scheme';
  }

  // Helper: add a reason or track missing info, AND track the criterion
  function check(
    field: keyof EligibilityAnswers,
    severity: 'soft' | 'hard',
    label: string,
    condition: () => boolean, // returns true if BLOCKED
    workaround?: string,
    workaroundUrl?: string,
    workaroundLabel?: string,
  ) {
    // Derive a positive label for passing criteria
    const passLabel = derivePassLabel(field, label);
    const group = groupFor(field);

    if (answers[field] === null) {
      missingInfo.push(field);
      criteria.push({ label: passLabel, status: 'unknown', group, field });
      return;
    }
    if (condition()) {
      reasons.push({ field, label, severity, workaround, workaroundUrl, workaroundLabel });
      criteria.push({
        label,
        status: severity === 'hard' ? 'fail' : 'warning',
        severity,
        detail: workaround,
        detailUrl: workaroundUrl,
        detailLabel: workaroundLabel,
        group,
        field,
      });
    } else {
      criteria.push({ label: passLabel, status: 'pass', group, field });
    }
  }

  // ── Universal checks ──
  const checkUdyam = (sev: 'soft' | 'hard' = 'hard') => {
    check('hasUdyam', sev, 'No Udyam registration',
      () => !answers.hasUdyam,
      'Register free at udyamregistration.gov.in — takes 15 minutes with Aadhaar + PAN',
      'https://udyamregistration.gov.in',
      'Register Now (Free)',
    );
  };

  const checkNpa = () => {
    check('isNpa', 'hard', 'Existing loan in default (NPA)',
      () => answers.isNpa === 'yes',
      'Resolve NPA through One Time Settlement (OTS) with your existing bank, then reapply',
    );
    if (answers.isNpa === 'resolved') {
      const resolvedWorkaround = 'After OTS settlement, the NPA shows as "Settled" (not "Closed") on your CIBIL for 7 years. Banks typically want 12-24 months of clean history post-OTS before approving new loans. Focus on: (1) building 12+ months clean bank statements, (2) improving CIBIL above 650, (3) filing ITR regularly. In the meantime, EESL ESCO (20% co-payment, no credit check) is available in 12 clusters.';
      reasons.push({
        field: 'isNpa',
        label: 'NPA resolved — banks may need 12-24 months cooling period',
        severity: 'soft',
        workaround: resolvedWorkaround,
      });
      criteria.push({
        label: 'NPA resolved — banks may need 12-24 months cooling period',
        status: 'warning',
        severity: 'soft',
        detail: resolvedWorkaround,
        group: 'financial',
        field: 'isNpa',
      });
    }
    if (answers.isNpa === 'unsure') {
      const unsureWorkaround = 'Check with your existing bank whether any loan is classified as NPA (overdue 90+ days). If yes, resolve via OTS before applying for new loans.';
      reasons.push({
        field: 'isNpa',
        label: 'NPA status unknown — verify before applying',
        severity: 'soft',
        workaround: unsureWorkaround,
      });
      criteria.push({
        label: 'NPA status unknown — verify before applying',
        status: 'warning',
        severity: 'soft',
        detail: unsureWorkaround,
        group: 'financial',
        field: 'isNpa',
      });
    }
  };

  // ── Scheme-specific rules ──
  switch (schemeId) {
    case 'S001': // ADEETIE
      // ── Scheme eligibility ──
      checkUdyam();
      check('operatingYears', 'soft', 'Less than 3 years in operation',
        () => answers.operatingYears === '<1' || answers.operatingYears === '1-3',
        'Some banks are flexible with CGTMSE cover. Also consider MSE-GIFT (no age restriction, 75% guarantee, 2% subvention) — may be a better fit for newer units.',
      );
      // Cluster — auto-detect from state if possible
      {
        const autoCluster = isLikelyInAdeetieCluster(orgContext?.subSector ?? orgContext?.sector, orgContext?.state);
        if (autoCluster === true) {
          criteria.push({ label: `In ADEETIE cluster (${orgContext?.state} — auto-detected from your facility)`, status: 'pass', group: 'scheme', field: 'inAdeetieCluster' });
        } else if (autoCluster === false) {
          criteria.push({
            label: `Your state (${orgContext?.state}) does not have ADEETIE clusters for your sector`,
            status: 'fail', severity: 'hard',
            detail: 'ADEETIE only operates in designated clusters. Use MSE-GIFT (pan-India, 2% subvention + 75% guarantee) or SIDBI 4E instead.',
            group: 'scheme',
            field: 'inAdeetieCluster',
          });
          reasons.push({ field: 'inAdeetieCluster', label: `No ADEETIE cluster in ${orgContext?.state} for your sector`, severity: 'hard', workaround: 'Use MSE-GIFT (pan-India) or SIDBI 4E instead.' });
        } else {
          check('inAdeetieCluster', 'soft', answers.inAdeetieCluster === 'unsure' ? 'ADEETIE cluster status unknown — verify before applying' : 'Not in an ADEETIE-eligible cluster',
            () => answers.inAdeetieCluster !== 'yes',
            answers.inAdeetieCluster === 'unsure'
              ? 'Check if your district is in one of 60 ADEETIE clusters at adeetie.beeindia.gov.in. If not, use MSE-GIFT (pan-India) or SIDBI 4E instead.'
              : 'ADEETIE covers 60 clusters across 14 sectors. If you\'re not in one, use MSE-GIFT (pan-India) or SIDBI 4E instead.',
            'https://adeetie.beeindia.gov.in',
            'Check Cluster List',
          );
        }
      }
      check('hasEnergyAudit', 'soft', 'No energy audit done yet',
        () => answers.hasEnergyAudit === false,
        'Get an IGEA through an ADEETIE empaneled auditor. Cost (₹50K–₹2L) is reimbursed after M&V.',
        'https://adeetie.beeindia.gov.in/accredited-energy-audit-agencies',
        'Find Empaneled Auditors',
      );

      // ── Financial profile ──
      checkNpa();
      check('hasGstRegistration', 'soft', 'No GST registration',
        () => answers.hasGstRegistration === false,
        'Banks require GST registration for loan processing. Register at gst.gov.in (free, takes 7-10 days).',
      );
      check('cibilScore', 'soft', answers.cibilScore === 'unknown' ? 'CIBIL score unknown — check before applying' : 'CIBIL score below 650',
        () => answers.cibilScore === 'below_650' || answers.cibilScore === 'unknown',
        answers.cibilScore === 'unknown'
          ? 'Check your CIBIL score free at cibil.com (once a year). Above 700 is ideal; below 650 may need CGTMSE cover.'
          : 'Apply through an ADEETIE-registered PSB (SBI, BOB, PNB) with CGTMSE cover — PSBs are more flexible on CIBIL than private banks.',
      );
      check('isCashProfitable', 'soft', 'No cash profit in last 2 years',
        () => answers.isCashProfitable === 'none',
        'If your cash flow is positive (despite accounting losses), explain to the lender. Energy savings from the project itself improve your cash flow.',
      );
      if (answers.isCashProfitable === 'unsure') {
        const profitWorkaround = 'Check your last 2 years\' Profit & Loss statements. Banks need cash profit in at least 1 of last 2 years.';
        reasons.push({ field: 'isCashProfitable', label: 'Profit status uncertain — check your P&L before applying', severity: 'soft', workaround: profitWorkaround });
        criteria.push({ label: 'Profit status uncertain — check your P&L before applying', status: 'warning', severity: 'soft', detail: profitWorkaround, group: 'financial', field: 'isCashProfitable' });
      }
      check('hasChequeBouncesRecent', 'soft', 'Recent cheque bounces on record',
        () => answers.hasChequeBouncesRecent === true,
        'Maintain 6 months of clean bank statements before applying. Apply through a PSB — more lenient with CGTMSE cover.',
      );
      break;

    case 'S002': // BEE-GEF-UNIDO
      // Step 1: Sector check (auto from org)
      if (orgContext?.sector && !BEE_GEF_SECTORS.includes(orgContext.sector)) {
        reasons.push({ field: 'hasUdyam', label: 'Your sector is not covered by BEE-GEF-UNIDO', severity: 'hard', workaround: 'This programme covers 9 sectors (iron & steel, textiles, foundry, etc.). Your sector is not included.' });
        criteria.push({ label: 'Your sector is not covered by BEE-GEF-UNIDO', status: 'fail', severity: 'hard', detail: 'This programme covers 9 sectors (iron & steel, textiles, foundry, etc.). Your sector is not included.', group: 'scheme', field: 'sector' });
      } else if (orgContext?.sector) {
        criteria.push({ label: 'Sector covered by programme', status: 'pass', group: 'scheme', field: 'sector' });
      }
      // ── Scheme eligibility ──
      checkUdyam('soft');
      // Cluster — auto-detect (always prefer over stored answers)
      {
        const autoCluster = isLikelyInAdeetieCluster(orgContext?.subSector ?? orgContext?.sector, orgContext?.state);
        if (autoCluster === true) {
          criteria.push({ label: `In programme cluster (${orgContext?.state} — auto-detected)`, status: 'pass', group: 'scheme', field: 'inAdeetieCluster' });
        } else if (autoCluster === false) {
          criteria.push({ label: `Your state does not have programme clusters for your sector`, status: 'fail', severity: 'hard', detail: 'This programme only operates in designated clusters.', group: 'scheme', field: 'inAdeetieCluster' });
          reasons.push({ field: 'inAdeetieCluster', label: 'Not in a programme cluster', severity: 'hard', workaround: 'This programme only operates in designated clusters.' });
        } else {
          check('inAdeetieCluster', 'soft', answers.inAdeetieCluster === 'unsure' ? 'Programme cluster status unknown' : 'May not be in a programme cluster',
            () => answers.inAdeetieCluster !== 'yes',
            'Check if your district is in one of 26 programme clusters at sidhiee.beeindia.gov.in.',
            'https://sidhiee.beeindia.gov.in', 'Check Cluster List',
          );
        }
      }
      // ── Financial profile ──
      checkNpa();
      break;

    case 'S003': // SIDBI PRSF
      // ── Scheme eligibility ──
      check('enterpriseSize', 'hard', 'Medium enterprises not eligible (Micro/Small only)',
        () => answers.enterpriseSize === 'medium',
        'SIDBI PRSF is for Micro and Small only. Use ADEETIE or SIDBI 4E instead — both cover Medium enterprises.',
      );
      check('operatingYears', 'soft', 'Less than 2 years in operation',
        () => answers.operatingYears === '<1',
        'SIDBI PRSF typically needs some operating history. Consider MSE-GIFT or EESL ESCO instead.',
      );
      // ── Financial profile ──
      checkNpa();
      check('cibilScore', 'soft', 'CIBIL score below 650',
        () => answers.cibilScore === 'below_650',
        'SIDBI has its own credit assessment. Apply with a strong DPR showing clear energy savings.',
      );
      break;

    case 'S004': // SIDBI 4E
      // ── Scheme eligibility ──
      check('operatingYears', 'hard', 'Less than 3 years in operation',
        () => answers.operatingYears === '<1' || answers.operatingYears === '1-3',
        'SIDBI 4E needs 3+ years. Use MSE-GIFT (no age restriction) or EESL ESCO instead.',
      );
      check('hasEnergyAudit', 'soft', 'No energy audit done yet',
        () => answers.hasEnergyAudit === false,
        'SIDBI arranges audits through ISTSL at subsidised rates (₹30K–₹45K). Or get a free audit via BEE-GEF-UNIDO.',
      );
      // ── Financial profile ──
      checkNpa();
      check('isCashProfitable', 'hard', 'No cash profit in last 2 years',
        () => answers.isCashProfitable === 'none',
        'SIDBI 4E requires cash profit. Consider EESL ESCO (no profit history needed) or cash-flow based lending.',
      );
      break;

    case 'S006': // CLCS-TUS
      // ── Scheme eligibility ──
      checkUdyam();
      check('hasEnergyAudit', 'soft', 'Need energy audit to prove 15% saving threshold',
        () => answers.hasEnergyAudit === false,
        'CLCS-TUS requires 15% minimum energy saving. Get an audit first to confirm your saving potential. If savings are 10–15%, use ADEETIE instead (only needs 10%).',
      );
      // ── Financial profile ──
      checkNpa();
      break;

    case 'S007': // ZED
      // ── Scheme eligibility ──
      checkUdyam('soft');
      break;

    case 'S008': // SATAT/Bioenergy
      // ── Scheme eligibility ──
      check('hasPngAccess', 'soft', answers.hasPngAccess === 'available' ? 'PNG available but not connected — connection needed first' : 'No PNG pipeline in your area',
        () => answers.hasPngAccess === 'no' || answers.hasPngAccess === 'available',
        answers.hasPngAccess === 'available'
          ? 'Contact your local CGD (city gas distributor) to apply for an industrial PNG connection. Costs ₹1-5L, takes 2-6 months. You can process the ADEETIE/SATAT application in parallel.'
          : 'For CBG: check SATAT portal for plants near you (108 operational). For biomass briquettes: contact local manufacturers — available in most agricultural states.',
        answers.hasPngAccess === 'available' ? undefined : 'https://satat.co.in',
        answers.hasPngAccess === 'available' ? undefined : 'Check SATAT Portal',
      );
      break;

    case 'S010': // EESL ESCO — universal fallback, almost no barriers
      // No hard blocks. EESL only needs energy bills and factory access.
      break;

    case 'S011': // MSE-GIFT
      // ── Scheme eligibility ──
      checkUdyam();
      check('enterpriseSize', 'hard', 'Medium enterprises not eligible (Micro/Small only)',
        () => answers.enterpriseSize === 'medium',
        'MSE-GIFT is for Micro and Small only. Use ADEETIE (3% subvention for Medium enterprises) instead.',
      );
      // ── Financial profile ──
      checkNpa();
      check('cibilScore', 'soft', 'CIBIL score below 650',
        () => answers.cibilScore === 'below_650',
        'MSE-GIFT uses SIDBI credit assessment which is more flexible than bank CIBIL checks. Apply with a strong DPR.',
      );
      break;

    case 'S012': // IREDA
      // ── Scheme eligibility ──
      check('operatingYears', 'soft', 'Less than 3 years in operation',
        () => answers.operatingYears === '<1' || answers.operatingYears === '1-3',
        'IREDA prefers established units. Consider RESCO model (zero CAPEX, no loan needed) or state SDA subsidies.',
      );
      // ── Financial profile ──
      checkNpa();
      check('cibilScore', 'soft', 'CIBIL score below 650',
        () => answers.cibilScore === 'below_650',
        'IREDA has its own project viability assessment. A strong DPR with clear RE generation potential can compensate.',
      );
      break;

    default:
      // S005 (not for MSMEs), S009 (state-specific) — basic checks
      checkUdyam('soft');
      break;
  }

  // Determine verdict
  const hasHard = reasons.some((r) => r.severity === 'hard');
  const hasSoft = reasons.some((r) => r.severity === 'soft');
  const verdict: Verdict = hasHard ? 'hard_block' : hasSoft ? 'soft_block'
    : missingInfo.length > 0 ? 'soft_block' : 'eligible';

  return {
    schemeId,
    schemeName: SCHEME_NAMES[schemeId] ?? schemeId,
    verdict,
    reasons,
    missingInfo,
    criteria,
  };
}

/* ------------------------------------------------------------------ */
/*  Evaluate all schemes                                               */
/* ------------------------------------------------------------------ */

export function evaluateAllSchemes(
  answers: EligibilityAnswers,
  orgContext: OrgContextProp | null,
  relevantSchemeIds: string[],
  hasEETechs: boolean,
  hasRETechs: boolean,
): EligibilityResult {
  const schemeResults = relevantSchemeIds.map((sid) => evaluateScheme(sid, answers, orgContext));

  const allReasons = schemeResults.flatMap((r) => r.reasons);
  const hardBlockedIds = new Set(schemeResults.filter((r) => r.verdict === 'hard_block').map((r) => r.schemeId));
  const isFullyBlocked = schemeResults.length > 0 && schemeResults.every((r) => r.verdict === 'hard_block');
  const needsBankability = answers.isNpa === 'yes' || answers.isNpa === 'resolved' || answers.isCashProfitable === 'none' || answers.itrFiledYears === 0;

  return {
    schemeResults,
    alternatives: getAlternativeRoutes(answers, orgContext, allReasons, hardBlockedIds),
    creditEnhancements: getCreditEnhancements(answers, hasEETechs, hasRETechs),
    zeroCostPathway: getZeroCostPathway(answers, orgContext),
    nextAction: getNextAction(answers, orgContext),
    completionPct: getCompletionPct(answers),
    isFullyBlocked,
    needsBankability,
  };
}

/* ------------------------------------------------------------------ */
/*  Alternative lending waterfall                                      */
/* ------------------------------------------------------------------ */

function getAlternativeRoutes(
  answers: EligibilityAnswers,
  orgContext: OrgContextProp | null,
  reasons: BlockReason[],
  hardBlockedIds: Set<string>,
): AlternativeRoute[] {
  const alts: AlternativeRoute[] = [];
  // No collateral
  if (answers.hasCollateral === 'no' || answers.hasCollateral === 'prefer_not') {
    alts.push({
      title: 'CGTMSE — Collateral-Free Loan Guarantee',
      description: 'Your bank applies on your behalf. Covers loans up to ₹5 Cr without pledging property. For loans up to ₹20L, RBI mandates banks cannot ask for collateral from MSEs.',
      when: 'Best when you have a viable project but no property to pledge',
    });
  }

  // Low CIBIL (only if no NPA — with NPA, no bank will lend regardless)
  if (answers.cibilScore === 'below_650' && answers.isNpa !== 'yes') {
    alts.push({
      title: 'ADEETIE Registered Bank + CGTMSE',
      description: '21 banks are registered on the ADEETIE portal — PSBs like SBI, BOB, PNB are more flexible on CIBIL than private banks. Apply with CGTMSE guarantee cover and a strong DPR showing clear energy savings.',
      when: 'Best when private banks reject due to CIBIL but your business is fundamentally sound',
      actionUrl: 'https://adeetie.beeindia.gov.in/registered-fis',
      actionLabel: 'ADEETIE Registered Banks',
    });
  }

  // Too new
  if (answers.operatingYears === '<1' || answers.operatingYears === '1-3') {
    if (!hardBlockedIds.has('S011')) {
      alts.push({
        title: 'MSE-GIFT — No Minimum Operating Period',
        description: 'Unlike SIDBI 4E (needs 3+ years), MSE-GIFT has no explicit operating period requirement. Available for Micro and Small enterprises.',
        when: 'Best for newer units that can\'t access SIDBI 4E',
        actionUrl: 'https://green.msme.gov.in',
        actionLabel: 'MSE-GIFT Portal',
      });
    }
  }

  // No profit
  if (answers.isCashProfitable === 'none') {
    alts.push({
      title: 'EESL ESCO — No Profit History Needed',
      description: 'EESL assesses energy saving potential, not your profit history. 20% co-payment required (negotiate to pay from first quarter savings). EESL covers 80% and you repay from actual savings over 3 years. Available in 12 MSME clusters — check EESL portal.',
      when: 'Best when banks reject due to losses but you have significant energy waste',
      actionUrl: 'https://msme.eeslindia.org',
      actionLabel: 'Contact EESL',
    });
  }

  // NPA — EESL is the only option
  if (answers.isNpa === 'yes') {
    if (!alts.some((a) => a.title.includes('EESL'))) {
      alts.push({
        title: 'EESL ESCO — Only Option with Active NPA',
        description: 'With an active NPA, no bank will approve a new loan. EESL ESCO is your best path — no bank loan needed, no CIBIL check. Requires 20% co-payment (negotiate deferred payment from savings). Available in 12 MSME clusters. In parallel, resolve NPA via OTS to unlock bank-based schemes (takes 3-12 months).',
        when: 'The only financing path available when you have an existing default',
        actionUrl: 'https://msme.eeslindia.org',
        actionLabel: 'Contact EESL',
      });
    }
  }

  // No energy audit — suggest free options
  if (answers.hasEnergyAudit === false) {
    const inBeeGefSector = orgContext?.sector ? BEE_GEF_SECTORS.includes(orgContext.sector) : false;
    if (inBeeGefSector) {
      alts.push({
        title: 'Free Energy Audit via BEE-GEF-UNIDO',
        description: 'Your sector is covered. If your unit is in one of 26 programme clusters, the audit and DPR are completely free (GEF-funded). This saves ₹50K–₹2.75L.',
        when: 'Check if your district is in a programme cluster',
        actionUrl: 'https://sidhiee.beeindia.gov.in',
        actionLabel: 'Check Cluster Eligibility',
      });
    }
  }

  // Small roof — suggest RESCO / open access
  if (answers.hasRoofSpace === 'small') {
    alts.push({
      title: 'RESCO / PPA — Solar Without Large Roof',
      description: 'If your roof space is limited for CAPEX solar, use a RESCO model instead. A solar developer installs panels at their cost, you buy the electricity at ₹3-4/kWh (30-50% cheaper than grid). For larger needs, consider green open access.',
      when: 'Best when roof space is under 3,000 sqft but you still want solar savings',
    });
  }

  // No Udyam — always suggest
  if (answers.hasUdyam === false) {
    alts.push({
      title: 'Register on Udyam Portal — Unlocks Everything',
      description: 'Free, takes 15 minutes with Aadhaar + PAN. Instant digital certificate. Required for ALL government MSME schemes. This is your #1 priority.',
      when: 'Must-do first step before any scheme application',
      actionUrl: 'https://udyamregistration.gov.in',
      actionLabel: 'Register Now (Free)',
    });
  }

  return alts;
}

/* ------------------------------------------------------------------ */
/*  Credit enhancements                                                */
/* ------------------------------------------------------------------ */

function getCreditEnhancements(
  answers: EligibilityAnswers,
  hasEETechs: boolean,
  hasRETechs: boolean,
): CreditEnhancement[] {
  const enhancements: CreditEnhancement[] = [];
  const isMicroSmall = answers.enterpriseSize === 'micro' || answers.enterpriseSize === 'small';
  const isMedium = answers.enterpriseSize === 'medium';

  // CGTMSE
  enhancements.push({
    title: 'CGTMSE — Collateral-Free Guarantee (up to ₹5 Cr)',
    description: 'Your bank applies on your behalf. No property pledge needed. For MSE loans up to ₹20L, RBI mandates banks cannot ask for collateral.',
    eligible: !isMedium && answers.isNpa !== 'yes',
    reason: isMedium
      ? 'Primarily for Micro/Small enterprises. Medium enterprises may need standard collateral.'
      : answers.isNpa === 'yes' ? 'Not available with active NPA.' : undefined,
  });

  // MSE-GIFT guarantee
  if (hasEETechs || hasRETechs) {
    enhancements.push({
      title: 'MSE-GIFT — 75% Credit Guarantee + 2% Interest Subvention',
      description: 'SIDBI provides 75% guarantee through partnered banks/NBFCs. Plus 2% annual interest subvention for up to 5 years. Loan limit ₹2 Cr.',
      eligible: isMicroSmall && answers.isNpa !== 'yes',
      reason: isMedium
        ? 'Only for Micro and Small enterprises (not Medium).'
        : answers.isNpa === 'yes' ? 'Not available with active NPA.' : undefined,
    });
  }

  // CLCS-TUS capital subsidy
  if (hasEETechs) {
    enhancements.push({
      title: 'CLCS-TUS — 25% Capital Subsidy (max ₹10L)',
      description: 'One-time 25% subsidy on equipment cost. Applied through nodal banks (SBI, BOB, Canara). Reduces your loan amount before interest subvention kicks in.',
      eligible: answers.hasUdyam !== false && answers.isNpa !== 'yes',
      reason: answers.hasUdyam === false
        ? 'Requires Udyam registration.'
        : answers.isNpa === 'yes' ? 'Not available with active NPA.' : undefined,
    });
  }

  // RBI ₹20L mandate
  if (isMicroSmall && (answers.hasCollateral === 'no' || answers.hasCollateral === 'prefer_not')) {
    enhancements.push({
      title: 'RBI Mandate — No Collateral for MSE Loans up to ₹20L',
      description: 'RBI mandates that banks cannot ask for collateral for MSE loans up to ₹20 lakh. If your bank asks, cite the RBI Master Direction on MSME Lending (Feb 2026).',
      eligible: true,
    });
  }

  return enhancements;
}

/* ------------------------------------------------------------------ */
/*  Zero-cost pathway                                                  */
/* ------------------------------------------------------------------ */

function getZeroCostPathway(
  answers: EligibilityAnswers,
  orgContext: OrgContextProp | null,
): ZeroCostAction[] {
  const actions: ZeroCostAction[] = [];

  // Tier 1: Zero-cost actions
  if (!answers.hasUdyam) {
    actions.push({
      tier: 1, tierLabel: 'Zero Cost',
      title: 'Register on Udyam Portal',
      description: 'Free, 15 minutes with Aadhaar + PAN. Unlocks ALL government schemes.',
      estimatedCost: 'Free',
      actionUrl: 'https://udyamregistration.gov.in',
      actionLabel: 'Register Now',
    });
  }

  actions.push(
    {
      tier: 1, tierLabel: 'Zero Cost',
      title: 'Fix Compressed Air Leaks',
      description: 'Ask maintenance team to check joints, hoses, and valves. Leaks waste 5–15% of compressor electricity.',
      estimatedSaving: '5–15% compressor electricity',
      estimatedCost: 'Free',
    },
    {
      tier: 1, tierLabel: 'Zero Cost',
      title: 'Switch Off Idle Equipment',
      description: 'Turn off motors, compressors, and furnaces during breaks and non-production hours.',
      estimatedSaving: '3–8% electricity',
      estimatedCost: 'Free',
    },
    {
      tier: 1, tierLabel: 'Zero Cost',
      title: 'Start Monthly Energy Records',
      description: 'Track electricity and fuel consumption monthly. This data is needed for future audits and DPRs.',
      estimatedCost: 'Free',
    },
  );

  // Tier 2: Free external support
  const inBeeGefSector = orgContext?.sector ? BEE_GEF_SECTORS.includes(orgContext.sector) : false;
  if (inBeeGefSector) {
    actions.push({
      tier: 2, tierLabel: 'Free Support',
      title: 'Free Energy Audit (BEE-GEF-UNIDO)',
      description: 'If your unit is in one of 26 programme clusters, audit + DPR are completely free.',
      estimatedCost: 'Free',
      actionUrl: 'https://sidhiee.beeindia.gov.in',
      actionLabel: 'Check Eligibility',
    });
  }

  actions.push(
    {
      tier: 2, tierLabel: 'Free Support',
      title: 'ZED Bronze Self-Assessment',
      description: 'Free self-assessment on the ZED portal. Builds credibility for future loan applications.',
      estimatedCost: 'Free',
      actionUrl: 'https://zed.msme.gov.in',
      actionLabel: 'Start Assessment',
    },
  );

  // Tier 3: Micro-investment
  actions.push(
    {
      tier: 3, tierLabel: 'Micro-Investment',
      title: 'EESL ESCO — Low Upfront Cost',
      description: 'EESL installs LEDs, motors, VFDs. You pay 20% co-payment upfront (negotiate deferred payment from savings), EESL covers 80%. Repay from actual savings over 3 years. No bank loan, audit, or DPR needed. Available in 12 MSME clusters.',
      estimatedCost: '20% co-payment',
      actionUrl: 'https://msme.eeslindia.org',
      actionLabel: 'Contact EESL',
    },
    {
      tier: 3, tierLabel: 'Micro-Investment',
      title: 'Self-Fund LED Lighting',
      description: 'Replace old bulbs with LED. ₹500–₹5,000 total. Pays back in 2–3 months from electricity savings.',
      estimatedSaving: '50–70% lighting electricity',
      estimatedCost: '₹500–₹5,000',
    },
  );

  // Tier 4: Build bankability
  if (answers.isNpa === 'yes' || answers.isNpa === 'resolved' || answers.isCashProfitable === 'none' || answers.itrFiledYears === 0) {
    actions.push(
      {
        tier: 4, tierLabel: 'Build Bankability',
        title: 'Build 12 Months of Clean Bank Statements',
        description: 'Regular deposits, no bounced cheques. This is the #1 thing banks check after CIBIL.',
        estimatedCost: 'Free',
      },
      {
        tier: 4, tierLabel: 'Build Bankability',
        title: 'File GST Returns for 4 Quarters',
        description: 'Regular GST filing shows business consistency to lenders. Fill gaps before applying.',
        estimatedCost: 'Free (or ₹2K–₹5K via CA)',
      },
    );
    if (answers.isNpa === 'yes') {
      actions.push({
        tier: 4, tierLabel: 'Build Bankability',
        title: 'Resolve NPA via One Time Settlement',
        description: 'Contact your existing bank about OTS. Even partial settlement clears the NPA flag and reopens all lending options.',
        estimatedCost: 'Varies',
      });
    }
    if (answers.itrFiledYears === 0) {
      actions.push({
        tier: 4, tierLabel: 'Build Bankability',
        title: 'File Last 2 Years ITR',
        description: 'Consult a CA to file retrospectively. Banks need 2+ years of ITR for most loan schemes.',
        estimatedCost: '₹2,000–₹5,000 per year',
      });
    }
  }

  return actions;
}

/* ------------------------------------------------------------------ */
/*  Next action                                                        */
/* ------------------------------------------------------------------ */

function getNextAction(
  answers: EligibilityAnswers,
  orgContext: OrgContextProp | null,
): NextAction {
  const inBeeGefSector = orgContext?.sector ? BEE_GEF_SECTORS.includes(orgContext.sector) : false;
  const isMicroSmall = answers.enterpriseSize === 'micro' || answers.enterpriseSize === 'small';

  if (answers.hasUdyam === null) {
    return {
      title: 'Answer the Eligibility Questions',
      description: 'Complete the eligibility check above to get personalised guidance on which schemes you qualify for and what to do next.',
      urgency: 'start',
    };
  }
  if (answers.hasUdyam === false) {
    return {
      title: 'Get Udyam Registration',
      description: 'Free, 15 minutes with Aadhaar + PAN. Required for all government EE/RE schemes.',
      actionUrl: 'https://udyamregistration.gov.in',
      actionLabel: 'Register Now (Free)',
      urgency: 'start',
    };
  }
  if (answers.isNpa === 'yes') {
    return {
      title: 'Resolve Your NPA First',
      description: 'With an active NPA, only EESL ESCO is available (20% co-payment, no credit check — in 12 clusters). To unlock bank-based schemes, settle the default via OTS (One Time Settlement) with your existing bank. OTS takes 3-12 months to reflect in your CIBIL.',
      actionUrl: 'https://msme.eeslindia.org',
      actionLabel: 'Try EESL ESCO Instead',
      urgency: 'start',
    };
  }
  if (answers.isNpa === 'resolved') {
    return {
      title: 'Build Clean Credit History Post-OTS',
      description: 'Your NPA is resolved but banks need 12-24 months of clean history. Focus on: clean bank statements (no bounced cheques), regular GST + ITR filing, and improving CIBIL above 650. Meanwhile, use EESL ESCO (no credit check) for immediate energy savings.',
      actionUrl: 'https://www.cibil.com/freecibilscore',
      actionLabel: 'Check CIBIL Progress',
      urgency: 'start',
    };
  }
  if (answers.hasEnergyAudit === false || answers.hasEnergyAudit === null) {
    const desc = inBeeGefSector
      ? 'Your sector qualifies for a FREE audit under BEE-GEF-UNIDO (26 clusters). Check eligibility. Otherwise, hire a BEE-empaneled auditor (₹50K–₹2L, reimbursable).'
      : isMicroSmall
      ? 'Hire a BEE-empaneled auditor (₹50K–₹2L). As a Micro/Small enterprise, apply for MSE-GIFT voucher support first to reduce audit cost.'
      : 'Hire a BEE-empaneled auditor (₹50K–₹2L). Cost is reimbursable after M&V under ADEETIE.';
    return {
      title: 'Get an Energy Audit',
      description: desc,
      actionUrl: inBeeGefSector ? 'https://sidhiee.beeindia.gov.in' : 'https://adeetie.beeindia.gov.in/accredited-energy-audit-agencies',
      actionLabel: inBeeGefSector ? 'Check Free Audit Eligibility' : 'Find Empaneled Auditors',
      urgency: 'start',
    };
  }
  if (answers.hasDPR === false || answers.hasDPR === null) {
    return {
      title: 'Prepare Your DPR',
      description: 'Ask your auditor to prepare the DPR alongside the audit (saves time). Get 3+ vendor quotes. The same DPR works for ADEETIE, CLCS-TUS, SIDBI 4E, and MSE-GIFT.',
      urgency: 'continue',
    };
  }
  if (answers.hasVendorQuotes === false || answers.hasVendorQuotes === null) {
    return {
      title: 'Get 3+ Vendor Quotations',
      description: 'Banks require minimum 3 vendor quotes as part of loan application. Contact equipment suppliers for your selected technologies.',
      urgency: 'continue',
    };
  }
  // If not in ADEETIE cluster, point to MSE-GIFT or SIDBI 4E instead
  if (answers.inAdeetieCluster === 'no') {
    return {
      title: 'Apply for Your Loan',
      description: isMicroSmall
        ? 'You\'re ready! Since you\'re not in an ADEETIE cluster, apply through MSE-GIFT (2% interest subvention, 75% credit guarantee) via any SIDBI-empaneled bank.'
        : 'You\'re ready! Since you\'re not in an ADEETIE cluster, apply through SIDBI 4E (concessional rates for EE projects) or directly to any scheduled commercial bank.',
      actionUrl: isMicroSmall ? 'https://green.msme.gov.in' : 'https://www.sidbi.in/en/pages/incentive-schemes-for-green-loans',
      actionLabel: isMicroSmall ? 'Apply via MSE-GIFT' : 'Apply via SIDBI 4E',
      urgency: 'ready',
    };
  }
  return {
    title: 'Apply for Your Loan',
    description: answers.hasBankRelationship
      ? 'You\'re ready! Approach your existing bank with the DPR. Ask them to process ADEETIE interest subvention and apply for CGTMSE cover on your behalf. Check if your bank is ADEETIE-registered at the portal.'
      : `You're ready! Choose from 21 ADEETIE-registered banks with pre-approved ${isMicroSmall ? '5%' : '3%'} interest subvention — no need to explain the scheme to them. Start with SBI or PNB — they have branches in every district.`,
    actionUrl: 'https://adeetie.beeindia.gov.in/registered-fis',
    actionLabel: 'View ADEETIE Registered Banks',
    urgency: 'ready',
  };
}
