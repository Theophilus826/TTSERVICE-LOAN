
import React from "react";
import { useNavigate } from "react-router-dom";

import FaceVerificationStep from "../component/FaceVerificationStep";
import KycStepIndicator from "../component/KycStepIndicator";

const FaceVerificationPage: React.FC = () => {
  const navigate = useNavigate();

  const handleFaceVerified = () => {
    navigate("/onboarding/loan", {
      replace: true,
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
      <div className="mb-8">
        <KycStepIndicator currentStep={5} />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Face Verification
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Complete the final verification step to
          continue your loan application.
        </p>
      </div>

      <FaceVerificationStep
        isVerified={false}
        onVerified={handleFaceVerified}
      />
    </div>
  );
};

export default FaceVerificationPage;

