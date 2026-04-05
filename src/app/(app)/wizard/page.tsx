'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, RotateCcw, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import StepOrganisation from '@/components/wizard/step-organisation';
import StepFacilities from '@/components/wizard/step-facilities';
import StepPeriod from '@/components/wizard/step-period';
import StepScope1 from '@/components/wizard/step-scope1';
import StepScope2 from '@/components/wizard/step-scope2';
import StepScope3 from '@/components/wizard/step-scope3';
import StepReview from '@/components/wizard/step-review';

const STEPS = [
  { number: 1, label: 'Organisation' },
  { number: 2, label: 'Facilities' },
  { number: 3, label: 'Period' },
  { number: 4, label: 'Scope 1' },
  { number: 5, label: 'Scope 2' },
  { number: 6, label: 'Scope 3' },
  { number: 7, label: 'Review' },
];

function StepIndicator({
  step,
  currentStep,
  onClick,
}: {
  step: (typeof STEPS)[number];
  currentStep: number;
  onClick: () => void;
}) {
  const isActive = step.number === currentStep;
  const isCompleted = step.number < currentStep;
  const isClickable = step.number <= currentStep;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!isClickable}
      className={cn(
        'flex items-center gap-2 transition-colors duration-200',
        isClickable ? 'cursor-pointer' : 'cursor-default opacity-40',
      )}
    >
      <span className="relative">
        <span
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-200',
            isActive && 'bg-primary text-primary-foreground shadow-sm',
            isCompleted && 'bg-primary/15 text-primary',
            !isActive && !isCompleted && 'bg-muted text-muted-foreground',
          )}
        >
          {isCompleted ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : step.number}
        </span>
        {isActive && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-primary"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </span>
      <span
        className={cn(
          'hidden text-xs font-medium sm:inline transition-colors',
          isActive && 'text-foreground',
          isCompleted && 'text-primary',
          !isActive && !isCompleted && 'text-muted-foreground',
        )}
      >
        {step.label}
      </span>
    </button>
  );
}

const STEP_COMPONENTS = [
  StepOrganisation,
  StepFacilities,
  StepPeriod,
  StepScope1,
  StepScope2,
  StepScope3,
  StepReview,
];

export default function WizardPage() {
  const currentStep = useWizardStore((s) => s.currentStep);
  const setStep = useWizardStore((s) => s.setStep);
  const nextStep = useWizardStore((s) => s.nextStep);
  const prevStep = useWizardStore((s) => s.prevStep);
  const calculationResult = useWizardStore((s) => s.calculationResult);
  const reset = useWizardStore((s) => s.reset);
  const router = useRouter();
  const [direction, setDirection] = useState(0);
  const [showNewAnalysisPrompt, setShowNewAnalysisPrompt] = useState(
    () => calculationResult !== null
  );

  const handleNewAnalysis = useCallback((keepOrg: boolean) => {
    reset(keepOrg);
    setShowNewAnalysisPrompt(false);
  }, [reset]);

  const handleContinueEditing = useCallback(() => {
    setShowNewAnalysisPrompt(false);
  }, []);

  const handleViewDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  const StepComponent = STEP_COMPONENTS[currentStep - 1];

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  };

  if (showNewAnalysisPrompt) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Card className="max-w-lg w-full">
          <CardContent className="py-8 space-y-5">
            <div className="text-center">
              <h2 className="text-lg font-semibold">You have an existing analysis</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Would you like to start a new analysis or continue editing the current one?
              </p>
            </div>
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={() => handleNewAnalysis(true)}
                className="gap-2 w-full"
              >
                <RotateCcw className="h-4 w-4" />
                New Analysis (keep organisation &amp; facilities)
              </Button>
              <Button
                variant="outline"
                onClick={() => handleNewAnalysis(false)}
                className="gap-2 w-full"
              >
                <RotateCcw className="h-4 w-4" />
                New Analysis (start fresh)
              </Button>
              <Button
                variant="outline"
                onClick={handleContinueEditing}
                className="gap-2 w-full"
              >
                <PenLine className="h-4 w-4" />
                Continue Editing Current
              </Button>
              <Button
                variant="ghost"
                onClick={handleViewDashboard}
                className="w-full text-muted-foreground"
              >
                View Dashboard Instead
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">GHG Inventory Wizard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Step {currentStep} of {STEPS.length}</p>
      </div>

      {/* Step indicator */}
      <div className="rounded-xl border border-border bg-card p-4 mb-6">
        <div className="overflow-x-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex items-center gap-1 sm:gap-2">
                <StepIndicator
                  step={step}
                  currentStep={currentStep}
                  onClick={() => {
                    if (step.number <= currentStep) {
                      setDirection(step.number > currentStep ? 1 : -1);
                      setStep(step.number);
                    }
                  }}
                />
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-px w-4 sm:w-6 transition-colors',
                      step.number < currentStep ? 'bg-primary/40' : 'bg-border',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content with transitions */}
      <div className="min-h-[500px]">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={currentStep}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <StepComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 mt-6 border-t border-border">
        <Button
          variant="outline"
          onClick={() => { setDirection(-1); prevStep(); }}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <Button
          onClick={() => { setDirection(1); nextStep(); }}
          disabled={currentStep === STEPS.length}
          className="gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
