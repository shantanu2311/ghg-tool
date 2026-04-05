'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EligibilityAnswers, OrgContextProp } from './eligibility-engine';

/* ------------------------------------------------------------------ */
/*  Option button                                                      */
/* ------------------------------------------------------------------ */

function OptionBtn({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Question row                                                       */
/* ------------------------------------------------------------------ */

function Question({
  label,
  detail,
  children,
}: {
  label: string;
  detail?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 py-3 border-b border-border last:border-0">
      <div>
        <p className="text-xs font-medium text-foreground">{label}</p>
        {detail && <p className="text-[11px] text-muted-foreground">{detail}</p>}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collapsible section                                                */
/* ------------------------------------------------------------------ */

function Section({
  title,
  description,
  defaultOpen,
  children,
}: {
  title: string;
  description: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{description}</p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && <div className="px-4 pb-3">{children}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

interface Props {
  answers: EligibilityAnswers;
  onChange: (answers: EligibilityAnswers) => void;
  orgContext: OrgContextProp | null;
  hasEETechs: boolean;
  hasRETechs: boolean;
  hasBioTechs: boolean;
  hasGasTechs: boolean;
  completionPct: number;
}

export function EligibilityQuestionnaire({
  answers,
  onChange,
  hasEETechs,
  hasRETechs,
  hasBioTechs,
  hasGasTechs,
  completionPct,
}: Props) {
  function set<K extends keyof EligibilityAnswers>(field: K, value: EligibilityAnswers[K]) {
    onChange({ ...answers, [field]: value });
  }

  // Show financial section if any loan-based scheme could be relevant
  const showFinancial = hasEETechs || hasRETechs || hasBioTechs;

  // Show situational section if we have specific tech types
  const showSituational = true; // always show — audit/DPR/quotes are universal

  // Count answered
  const s1Count = [answers.hasUdyam, answers.operatingYears, answers.isCashProfitable, answers.isNpa, answers.enterpriseSize, answers.hasCollateral].filter(v => v !== null).length;
  const s2Count = [answers.hasGstRegistration, answers.itrFiledYears, answers.cibilScore, answers.hasChequeBouncesRecent].filter(v => v !== null).length;
  const s3Keys: (keyof EligibilityAnswers)[] = ['hasEnergyAudit', 'hasDPR', 'hasVendorQuotes', 'hasBankRelationship'];
  if (hasEETechs) s3Keys.push('inAdeetieCluster');
  if (hasRETechs) s3Keys.push('hasRoofSpace');
  if (hasGasTechs) s3Keys.push('hasPngAccess');
  const s3Count = s3Keys.filter(k => answers[k] !== null).length;

  return (
    <div className="space-y-3">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Eligibility assessment — {completionPct}% complete
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${completionPct}%` }}
        />
      </div>

      {/* Section 1: Basic Eligibility */}
      <Section
        title={`Basic Eligibility (${s1Count}/6)`}
        description="Required for all government schemes"
        defaultOpen={s1Count < 6}
      >
        <Question label="Do you have Udyam registration?" detail="Required for all government MSME schemes">
          <OptionBtn label="Yes" selected={answers.hasUdyam === true} onClick={() => set('hasUdyam', true)} />
          <OptionBtn label="No" selected={answers.hasUdyam === false} onClick={() => set('hasUdyam', false)} />
        </Question>

        <Question label="How long has your unit been operating?">
          <OptionBtn label="< 1 year" selected={answers.operatingYears === '<1'} onClick={() => set('operatingYears', '<1')} />
          <OptionBtn label="1-3 years" selected={answers.operatingYears === '1-3'} onClick={() => set('operatingYears', '1-3')} />
          <OptionBtn label="3+ years" selected={answers.operatingYears === '3+'} onClick={() => set('operatingYears', '3+')} />
        </Question>

        <Question label="Cash profitable in last 2 financial years?" detail="Banks check this for loan eligibility">
          <OptionBtn label="Both years" selected={answers.isCashProfitable === 'both'} onClick={() => set('isCashProfitable', 'both')} />
          <OptionBtn label="One year" selected={answers.isCashProfitable === 'one'} onClick={() => set('isCashProfitable', 'one')} />
          <OptionBtn label="Neither" selected={answers.isCashProfitable === 'none'} onClick={() => set('isCashProfitable', 'none')} />
          <OptionBtn label="Not sure" selected={answers.isCashProfitable === 'unsure'} onClick={() => set('isCashProfitable', 'unsure')} />
        </Question>

        <Question label="Any existing loan in default (NPA)?" detail="Active NPA blocks all bank-based schemes">
          <OptionBtn label="No" selected={answers.isNpa === 'no'} onClick={() => set('isNpa', 'no')} />
          <OptionBtn label="Yes" selected={answers.isNpa === 'yes'} onClick={() => set('isNpa', 'yes')} />
          <OptionBtn label="Resolved (OTS)" selected={answers.isNpa === 'resolved'} onClick={() => set('isNpa', 'resolved')} />
          <OptionBtn label="Not sure" selected={answers.isNpa === 'unsure'} onClick={() => set('isNpa', 'unsure')} />
        </Question>

        <Question label="Enterprise size (from Udyam certificate)">
          <OptionBtn label="Micro" selected={answers.enterpriseSize === 'micro'} onClick={() => set('enterpriseSize', 'micro')} />
          <OptionBtn label="Small" selected={answers.enterpriseSize === 'small'} onClick={() => set('enterpriseSize', 'small')} />
          <OptionBtn label="Medium" selected={answers.enterpriseSize === 'medium'} onClick={() => set('enterpriseSize', 'medium')} />
        </Question>

        <Question label="Do you have collateral (property/equipment) to pledge?" detail="Some schemes need it, others don't">
          <OptionBtn label="Yes" selected={answers.hasCollateral === 'yes'} onClick={() => set('hasCollateral', 'yes')} />
          <OptionBtn label="No" selected={answers.hasCollateral === 'no'} onClick={() => set('hasCollateral', 'no')} />
          <OptionBtn label="Prefer not to" selected={answers.hasCollateral === 'prefer_not'} onClick={() => set('hasCollateral', 'prefer_not')} />
        </Question>
      </Section>

      {/* Section 2: Financial Profile */}
      {showFinancial && (
        <Section
          title={`Financial Profile (${s2Count}/4)`}
          description="Needed for loan-based funding schemes"
          defaultOpen={s1Count >= 6 && s2Count < 4}
        >
          <Question label="Do you have GST registration?" detail="Required for most bank loans">
            <OptionBtn label="Yes" selected={answers.hasGstRegistration === true} onClick={() => set('hasGstRegistration', true)} />
            <OptionBtn label="No" selected={answers.hasGstRegistration === false} onClick={() => set('hasGstRegistration', false)} />
          </Question>

          <Question label="How many years of ITR filed?" detail="Banks check 2-3 years of returns">
            <OptionBtn label="0" selected={answers.itrFiledYears === 0} onClick={() => set('itrFiledYears', 0)} />
            <OptionBtn label="1 year" selected={answers.itrFiledYears === 1} onClick={() => set('itrFiledYears', 1)} />
            <OptionBtn label="2 years" selected={answers.itrFiledYears === 2} onClick={() => set('itrFiledYears', 2)} />
            <OptionBtn label="3+ years" selected={answers.itrFiledYears === 3} onClick={() => set('itrFiledYears', 3)} />
          </Question>

          <Question label="CIBIL score range" detail="Check at cibil.com — free once a year">
            <OptionBtn label="Above 700" selected={answers.cibilScore === 'above_700'} onClick={() => set('cibilScore', 'above_700')} />
            <OptionBtn label="650-700" selected={answers.cibilScore === '650_700'} onClick={() => set('cibilScore', '650_700')} />
            <OptionBtn label="Below 650" selected={answers.cibilScore === 'below_650'} onClick={() => set('cibilScore', 'below_650')} />
            <OptionBtn label="Don't know" selected={answers.cibilScore === 'unknown'} onClick={() => set('cibilScore', 'unknown')} />
          </Question>

          <Question label="Any cheque bounces in last 6 months?" detail="Banks flag this during credit check">
            <OptionBtn label="No" selected={answers.hasChequeBouncesRecent === false} onClick={() => set('hasChequeBouncesRecent', false)} />
            <OptionBtn label="Yes" selected={answers.hasChequeBouncesRecent === true} onClick={() => set('hasChequeBouncesRecent', true)} />
          </Question>
        </Section>
      )}

      {/* Section 3: Situational */}
      {showSituational && (
        <Section
          title={`Your Situation (${s3Count}/${s3Keys.length})`}
          description="Helps us check which steps you've already completed"
          defaultOpen={s1Count >= 6 && s2Count >= 4 && s3Count < s3Keys.length}
        >
          <Question label="Have you completed an energy audit?" detail="IGEA or DEA report">
            <OptionBtn label="Yes" selected={answers.hasEnergyAudit === true} onClick={() => set('hasEnergyAudit', true)} />
            <OptionBtn label="No" selected={answers.hasEnergyAudit === false} onClick={() => set('hasEnergyAudit', false)} />
          </Question>

          <Question label="Do you have a Detailed Project Report (DPR)?" detail="With technology specs and cost estimates">
            <OptionBtn label="Yes" selected={answers.hasDPR === true} onClick={() => set('hasDPR', true)} />
            <OptionBtn label="No" selected={answers.hasDPR === false} onClick={() => set('hasDPR', false)} />
          </Question>

          <Question label="Do you have 3+ vendor quotations?">
            <OptionBtn label="Yes" selected={answers.hasVendorQuotes === true} onClick={() => set('hasVendorQuotes', true)} />
            <OptionBtn label="No" selected={answers.hasVendorQuotes === false} onClick={() => set('hasVendorQuotes', false)} />
          </Question>

          <Question label="Do you have an existing bank relationship?" detail="Faster loan processing with your current bank">
            <OptionBtn label="Yes" selected={answers.hasBankRelationship === true} onClick={() => set('hasBankRelationship', true)} />
            <OptionBtn label="No" selected={answers.hasBankRelationship === false} onClick={() => set('hasBankRelationship', false)} />
          </Question>

          {hasEETechs && (
            <Question label="Is your unit in an ADEETIE-eligible cluster?" detail="60 clusters across 14 sectors">
              <OptionBtn label="Yes" selected={answers.inAdeetieCluster === 'yes'} onClick={() => set('inAdeetieCluster', 'yes')} />
              <OptionBtn label="No" selected={answers.inAdeetieCluster === 'no'} onClick={() => set('inAdeetieCluster', 'no')} />
              <OptionBtn label="Not sure" selected={answers.inAdeetieCluster === 'unsure'} onClick={() => set('inAdeetieCluster', 'unsure')} />
            </Question>
          )}

          {hasRETechs && (
            <Question label="Do you have roof space for solar panels?">
              <OptionBtn label="Large (500+ sqft)" selected={answers.hasRoofSpace === 'large'} onClick={() => set('hasRoofSpace', 'large')} />
              <OptionBtn label="Small (< 500 sqft)" selected={answers.hasRoofSpace === 'small'} onClick={() => set('hasRoofSpace', 'small')} />
              <OptionBtn label="No" selected={answers.hasRoofSpace === 'no'} onClick={() => set('hasRoofSpace', 'no')} />
            </Question>
          )}

          {hasGasTechs && (
            <Question label="Do you have PNG pipeline access?">
              <OptionBtn label="Connected" selected={answers.hasPngAccess === 'connected'} onClick={() => set('hasPngAccess', 'connected')} />
              <OptionBtn label="Available nearby" selected={answers.hasPngAccess === 'available'} onClick={() => set('hasPngAccess', 'available')} />
              <OptionBtn label="No" selected={answers.hasPngAccess === 'no'} onClick={() => set('hasPngAccess', 'no')} />
              <OptionBtn label="Not sure" selected={answers.hasPngAccess === 'unsure'} onClick={() => set('hasPngAccess', 'unsure')} />
            </Question>
          )}
        </Section>
      )}
    </div>
  );
}
