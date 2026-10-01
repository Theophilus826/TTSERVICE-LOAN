
import React from "react";

type Step = {
  number: number;
  title: string;
};

type KycStepIndicatorProps = {
  currentStep: number;
  steps?: Step[];
};

const defaultSteps: Step[] = [
  { number: 1, title: "Personal" },
  { number: 2, title: "Identity" },
  { number: 3, title: "Bank Account" },
  { number: 4, title: "BVN" },
  { number: 5, title: "Face Verification" },
];

const KycStepIndicator: React.FC<KycStepIndicatorProps> = ({
  currentStep,
  steps = defaultSteps,
}) => {
  // Keep the step within the valid KYC range.
  const safeCurrentStep = Math.min(
    Math.max(currentStep, 1),
    steps.length,
  );

  return (
    <div className="w-full">
      <div className="flex w-full items-start">
        {steps.map((step, index) => {
          const isCompleted =
            safeCurrentStep > step.number;

          const isCurrent =
            safeCurrentStep === step.number;

          const isLast =
            index === steps.length - 1;

          return (
            <React.Fragment key={step.number}>
              {/* Step */}
              <div className="flex min-w-0 flex-shrink-0 flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition sm:h-10 sm:w-10 sm:text-sm ${
                    isCompleted || isCurrent
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-gray-300 bg-white text-gray-500"
                  }`}
                >
                  {isCompleted ? "✓" : step.number}
                </div>

                <span
                  className={`mt-2 max-w-[70px] text-center text-[10px] font-medium leading-tight sm:max-w-[110px] sm:text-xs ${
                    isCurrent || isCompleted
                      ? "text-blue-600"
                      : "text-gray-500"
                  }`}
                >
                  {step.title}
                </span>
              </div>

              {/* Connector */}
              {!isLast && (
                <div
                  className={`mx-1 mt-4 h-0.5 min-w-0 flex-1 sm:mx-2 sm:mt-5 ${
                    safeCurrentStep > step.number
                      ? "bg-blue-600"
                      : "bg-gray-300"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default KycStepIndicator;
