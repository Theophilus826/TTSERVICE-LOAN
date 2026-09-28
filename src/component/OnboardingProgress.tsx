interface Props {
  currentStep: number;
}

const steps = [
  "KYC",
  "Bank",
  "Loan",
  "Review",
];

export default function OnboardingProgress({
  currentStep,
}: Props) {
  return (
    <div className="mb-8 w-full">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const completed =
            stepNumber <= currentStep;

          return (
            <div
              key={step}
              className="flex flex-1 items-center"
            >
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                    completed
                      ? "bg-slate-950 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {stepNumber}
                </div>

                <span
                  className={`mt-2 text-xs font-medium ${
                    completed
                      ? "text-slate-950"
                      : "text-slate-400"
                  }`}
                >
                  {step}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`mx-2 mb-5 h-0.5 flex-1 ${
                    stepNumber < currentStep
                      ? "bg-slate-950"
                      : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}