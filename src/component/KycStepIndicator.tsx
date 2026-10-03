import React from "react";
import { Check } from "lucide-react";

export interface KycStep {
  number: number;
  title: string;
}

export const KYC_STEPS: KycStep[] = [
  { number: 1, title: "Personal" },
  { number: 2, title: "Identity" },
  { number: 3, title: "Bank" },
  { number: 4, title: "BVN" },
  { number: 5, title: "Face" },
];

interface KycStepIndicatorProps {
  currentStep: number;
  steps?: KycStep[];
}

const KycStepIndicator: React.FC<KycStepIndicatorProps> = ({
  currentStep,
  steps = KYC_STEPS,
}) => {
  return (
    <div className="w-full">
      <div className="flex items-start justify-between">
        {steps.map((step, index) => {
          const completed = currentStep > step.number;
          const active = currentStep === step.number;

          return (
            <React.Fragment key={step.number}>
              <div className="flex min-w-0 flex-col items-center">
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    completed
                      ? "border-green-600 bg-green-600 text-white"
                      : active
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-gray-300 bg-white text-gray-500",
                  ].join(" ")}
                >
                  {completed ? <Check size={17} /> : step.number}
                </div>

                <span
                  className={[
                    "mt-2 text-center text-xs font-medium",
                    active
                      ? "text-blue-600"
                      : completed
                        ? "text-green-600"
                        : "text-gray-500",
                  ].join(" ")}
                >
                  {step.title}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={[
                    "mx-2 mt-[18px] h-0.5 flex-1 transition-all",
                    currentStep > step.number
                      ? "bg-green-600"
                      : "bg-gray-200",
                  ].join(" ")}
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