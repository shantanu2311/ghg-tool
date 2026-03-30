'use client';

import { useWizardStore } from '@/lib/store';
import { cn } from '@/lib/utils';
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

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 transition-colors',
        step.number <= currentStep
          ? 'cursor-pointer'
          : 'cursor-default opacity-40',
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors',
          isActive && 'bg-teal-600 text-white',
          isCompleted && 'bg-teal-100 text-teal-700',
          !isActive && !isCompleted && 'bg-gray-100 text-gray-400',
        )}
      >
        {isCompleted ? (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          step.number
        )}
      </span>
      <span
        className={cn(
          'hidden text-sm font-medium sm:inline',
          isActive && 'text-gray-900',
          isCompleted && 'text-teal-700',
          !isActive && !isCompleted && 'text-gray-400',
        )}
      >
        {step.label}
      </span>
    </button>
  );
}

export default function WizardPage() {
  const currentStep = useWizardStore((s) => s.currentStep);
  const setStep = useWizardStore((s) => s.setStep);
  const nextStep = useWizardStore((s) => s.nextStep);
  const prevStep = useWizardStore((s) => s.prevStep);

  function renderStep() {
    switch (currentStep) {
      case 1:
        return <StepOrganisation />;
      case 2:
        return <StepFacilities />;
      case 3:
        return <StepPeriod />;
      case 4:
        return <StepScope1 />;
      case 5:
        return <StepScope2 />;
      case 6:
        return <StepScope3 />;
      case 7:
        return <StepReview />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <h1 className="text-lg font-semibold text-gray-900">GHG Inventory Wizard</h1>
          <p className="text-sm text-gray-500">Step {currentStep} of {STEPS.length}</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-4xl overflow-x-auto px-4 py-3">
          <div className="flex items-center gap-1 sm:gap-3">
            {STEPS.map((step, i) => (
              <div key={step.number} className="flex items-center gap-1 sm:gap-3">
                <StepIndicator
                  step={step}
                  currentStep={currentStep}
                  onClick={() => {
                    if (step.number <= currentStep) setStep(step.number);
                  }}
                />
                {i < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'h-px w-4 sm:w-8',
                      step.number < currentStep ? 'bg-teal-300' : 'bg-gray-200',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="border-t bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className={cn(
              'rounded-lg border px-5 py-2.5 text-sm font-medium transition-colors',
              currentStep === 1
                ? 'cursor-not-allowed border-gray-200 text-gray-300'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50',
            )}
          >
            Previous
          </button>
          <button
            type="button"
            onClick={nextStep}
            disabled={currentStep === STEPS.length}
            className={cn(
              'rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-colors',
              currentStep === STEPS.length
                ? 'cursor-not-allowed bg-teal-300'
                : 'bg-teal-600 hover:bg-teal-700',
            )}
          >
            {currentStep === STEPS.length ? 'Submit' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
