
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import kycApi, {
  type KycData,
  type KycVerificationStatus,
} from "../services/kycApi";

import FaceVerificationStep from "../component/FaceVerificationStep";

const Kyc: React.FC = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState<number>(1);

  const [kyc, setKyc] = useState<KycData | null>(null);

  const [selectedBankAccount, setSelectedBankAccount] =
    useState<any | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // =========================================================
  // DETERMINE CURRENT ONBOARDING STEP
  // =========================================================

  const determineCurrentStep = useCallback(
    (
      kycData: KycData | null,
      bankAccount: any | null,
    ): number => {
      if (!kycData) {
        return 1;
      }

      const bvnVerified =
        kycData.bvnVerificationStatus === "verified";

      const customerVerified =
        kycData.customerVerificationStatus === "verified";

      const faceVerified =
        kycData.faceVerificationStatus === "verified";

      const bankVerified =
        bankAccount?.verificationStatus === "verified" ||
        bankAccount?.status === "verified";

      // -------------------------------------------------------
      // EVERYTHING COMPLETE
      // -------------------------------------------------------

      if (
        bvnVerified &&
        customerVerified &&
        faceVerified
      ) {
        return 6;
      }

      // -------------------------------------------------------
      // BVN + CUSTOMER VERIFIED
      // NEXT = FACE VERIFICATION
      // -------------------------------------------------------

      if (
        bvnVerified &&
        customerVerified
      ) {
        return 5;
      }

      // -------------------------------------------------------
      // BANK VERIFIED
      // NEXT = BVN
      // -------------------------------------------------------

      if (bankVerified) {
        return 4;
      }

      // -------------------------------------------------------
      // KYC SUBMITTED
      // NEXT = BANK
      // -------------------------------------------------------

      if (
        kycData.status === "submitted" ||
        kycData.status === "under_review" ||
        kycData.status === "verified"
      ) {
        return 3;
      }

      // -------------------------------------------------------
      // DEFAULT
      // -------------------------------------------------------

      return 1;
    },
    [],
  );

  // =========================================================
  // LOAD KYC
  // =========================================================

  const loadKyc = useCallback(async (): Promise<KycData | null> => {
    try {
      const response = await kycApi.getMyKyc();

      console.log("=================================");
      console.log("📋 KYC API RESPONSE");
      console.log(response);
      console.log("📋 KYC DATA");
      console.log(response?.data);
      console.log("=================================");

      const kycData = response?.data ?? null;

      setKyc(kycData);

      return kycData;
    } catch (err: any) {
      console.error(
        "❌ FAILED TO LOAD KYC:",
        err?.response?.data || err?.message || err,
      );

      setError(
        err?.response?.data?.message ||
          "Unable to load your verification information.",
      );

      return null;
    }
  }, []);

  // =========================================================
  // LOAD BANK ACCOUNT
  // =========================================================

  const loadSelectedBankAccount =
    useCallback(async (): Promise<any | null> => {
      try {
        /*
         * Keep your existing bank-account loading logic here.
         *
         * This section intentionally does not assume a specific
         * bankApi response structure.
         */

        return selectedBankAccount;
      } catch (err: any) {
        console.error(
          "❌ FAILED TO LOAD BANK ACCOUNT:",
          err?.response?.data || err?.message || err,
        );

        return null;
      }
    }, [selectedBankAccount]);

  // =========================================================
  // INITIAL LOAD
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      setLoading(true);
      setError(null);

      try {
        const [kycData, bankAccount] = await Promise.all([
          loadKyc(),
          loadSelectedBankAccount(),
        ]);

        if (!mounted) {
          return;
        }

        const nextStep = determineCurrentStep(
          kycData,
          bankAccount,
        );

        console.log("=================================");
        console.log("🧭 ONBOARDING STEP");
        console.log("BVN:", kycData?.bvnVerificationStatus);
        console.log(
          "CUSTOMER:",
          kycData?.customerVerificationStatus,
        );
        console.log(
          "FACE:",
          kycData?.faceVerificationStatus,
        );
        console.log("NEXT STEP:", nextStep);
        console.log("=================================");

        // -----------------------------------------------------
        // ALL KYC COMPLETE
        // -----------------------------------------------------

        if (nextStep === 6) {
          navigate("/onboarding/loan", {
            replace: true,
          });

          return;
        }

        setCurrentStep(nextStep);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, [
    determineCurrentStep,
    loadKyc,
    loadSelectedBankAccount,
    navigate,
  ]);

  // =========================================================
  // REFRESH VERIFICATION STATUS
  // =========================================================

  const refreshVerificationStatus =
    useCallback(async (): Promise<KycVerificationStatus | null> => {
      try {
        const response =
          await kycApi.getVerificationStatus();

        console.log("=================================");
        console.log("🔄 VERIFICATION STATUS RESPONSE");
        console.log(response);
        console.log("🔄 VERIFICATION DATA");
        console.log(response?.data);
        console.log("=================================");

        const verification =
          response?.data ?? null;

        if (!verification) {
          return null;
        }

        setKyc((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,

            status:
              verification.kycStatus ??
              previous.status,

            bvnVerificationStatus:
              verification.bvnVerificationStatus ??
              previous.bvnVerificationStatus,

            bvnVerificationReference:
              verification.bvnVerificationReference ??
              previous.bvnVerificationReference,

            bvnVerificationReason:
              verification.bvnVerificationReason ??
              previous.bvnVerificationReason,

            bvnVerifiedAt:
              verification.bvnVerifiedAt ??
              previous.bvnVerifiedAt,

            customerVerificationStatus:
              verification.customerVerificationStatus ??
              previous.customerVerificationStatus,

            customerVerificationReference:
              verification.customerVerificationReference ??
              previous.customerVerificationReference,

            customerVerificationReason:
              verification.customerVerificationReason ??
              previous.customerVerificationReason,

            customerVerifiedAt:
              verification.customerVerifiedAt ??
              previous.customerVerifiedAt,

            verificationProvider:
              verification.verificationProvider ??
              previous.verificationProvider,

            faceVerificationStatus:
              verification.faceVerificationStatus ??
              previous.faceVerificationStatus,

            faceVerificationReference:
              verification.faceVerificationReference ??
              previous.faceVerificationReference,

            faceVerificationReason:
              verification.faceVerificationReason ??
              previous.faceVerificationReason,

            faceVerifiedAt:
              verification.faceVerifiedAt ??
              previous.faceVerifiedAt,

            faceVerificationProvider:
              verification.faceVerificationProvider ??
              previous.faceVerificationProvider,
          };
        });

        return verification;
      } catch (err: any) {
        console.error(
          "❌ FAILED TO REFRESH VERIFICATION STATUS:",
          err?.response?.data ||
            err?.message ||
            err,
        );

        setError(
          err?.response?.data?.message ||
            "Unable to refresh verification status.",
        );

        return null;
      }
    }, []);

  // =========================================================
  // BVN VERIFIED
  // =========================================================

  const handleBvnVerified = async () => {
    setError(null);
    setMessage(null);

    const verification =
      await refreshVerificationStatus();

    if (!verification) {
      return;
    }

    const bvnVerified =
      verification.bvnVerificationStatus ===
      "verified";

    const customerVerified =
      verification.customerVerificationStatus ===
      "verified";

    if (
      bvnVerified &&
      customerVerified
    ) {
      setCurrentStep(5);

      setMessage(
        "BVN verification successful. Please complete face verification.",
      );

      return;
    }

    if (
      verification.bvnVerificationStatus ===
      "pending"
    ) {
      setMessage(
        "Your BVN verification is still being processed. Please refresh again shortly.",
      );

      return;
    }

    if (
      verification.bvnVerificationStatus ===
      "failed"
    ) {
      setError(
        verification.bvnVerificationReason ||
          "BVN verification failed.",
      );

      return;
    }

    setMessage(
      "Your verification status has been updated.",
    );
  };

  // =========================================================
  // FACE VERIFIED
  // =========================================================

  const handleFaceVerified = async () => {
    setError(null);

    /*
     * Update the local state immediately.
     */

    setKyc((previous) => {
      if (!previous) {
        return previous;
      }

      return {
        ...previous,
        faceVerificationStatus: "verified",
        faceVerifiedAt:
          new Date().toISOString(),
      };
    });

    setMessage(
      "Face verification successful. Your onboarding is complete.",
    );

    /*
     * Give React a moment to update the UI, then move
     * directly to the loan onboarding page.
     */

    navigate("/onboarding/loan", {
      replace: true,
    });
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <div className="mb-3">
            Loading your verification status...
          </div>

          <div className="text-sm text-gray-500">
            Please wait.
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error && !kyc) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="font-semibold text-red-700">
            Verification Error
          </h2>

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <div className="mx-auto w-full max-w-3xl p-4 md:p-6">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold">
          Identity Verification
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Complete the steps below to continue your loan
          application.
        </p>
      </div>

      {/* =====================================================
          MESSAGE
      ===================================================== */}

      {message && (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* =====================================================
          STEP INDICATOR
      ===================================================== */}

      <div className="mb-8 flex items-center justify-between">
        {[
          "Personal",
          "Identity",
          "Bank",
          "BVN",
          "Face",
        ].map((label, index) => {
          const stepNumber = index + 1;

          const active =
            currentStep >= stepNumber;

          return (
            <div
              key={label}
              className="flex flex-1 items-center"
            >
              <div
                className={[
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  active
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500",
                ].join(" ")}
              >
                {stepNumber}
              </div>

              <span
                className={[
                  "ml-2 hidden text-xs sm:inline",
                  active
                    ? "text-blue-600"
                    : "text-gray-400",
                ].join(" ")}
              >
                {label}
              </span>

              {index < 4 && (
                <div
                  className={[
                    "mx-2 h-px flex-1",
                    currentStep >
                    stepNumber
                      ? "bg-blue-600"
                      : "bg-gray-200",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* =====================================================
          STEP 5 — FACE VERIFICATION
      ===================================================== */}

      {currentStep === 5 && (
        <FaceVerificationStep
          isVerified={
            kyc?.faceVerificationStatus ===
            "verified"
          }
          onVerified={
            handleFaceVerified
          }
        />
      )}

      {/* =====================================================
          STEP 4 — BVN
      ===================================================== */}

      {currentStep === 4 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            BVN Verification
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Verify your Bank Verification Number to
            continue.
          </p>

          {/* -------------------------------------------------
              IMPORTANT:
              Keep your existing BVN form/component here.
              When verification succeeds, call:
              
              handleBvnVerified()
          ------------------------------------------------- */}

          <button
            type="button"
            onClick={handleBvnVerified}
            className="mt-6 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white"
          >
            Refresh Verification Status
          </button>
        </div>
      )}

      {/* =====================================================
          OTHER STEPS
      ===================================================== */}

      {currentStep < 4 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            Continue Your Application
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Complete the current onboarding step to
            continue.
          </p>
        </div>
      )}

      {/* =====================================================
          COMPLETE
      ===================================================== */}

      {currentStep === 6 && (
        <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
          <h2 className="text-xl font-semibold">
            Verification Complete
          </h2>

          <p className="mt-2 text-sm text-gray-600">
            Redirecting you to loan onboarding...
          </p>
        </div>
      )}
    </div>
  );
};

export default Kyc;

