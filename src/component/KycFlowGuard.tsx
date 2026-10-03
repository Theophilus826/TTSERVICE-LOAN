import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import kycApi, {
  type KycData,
} from "../services/kycApi";

import API from "../services/Api";

export interface BankAccount {
  _id?: string;
  id?: string;
  isPrimary?: boolean;
  verificationStatus?: string;
  status?: string;
}

export type KycStep = 1 | 2 | 3 | 4 | 5;

export interface KycFlowContext {
  kyc: KycData | null;
  bankAccount: BankAccount | null;
  currentStep: KycStep | "complete";

  loading: boolean;
  error: string | null;

  refreshFlow: () => Promise<void>;
}

const KycFlowStateContext =
  createContext<KycFlowContext | null>(null);

const KycFlowGuard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);

  const [kyc, setKyc] =
    useState<KycData | null>(null);

  const [bankAccount, setBankAccount] =
    useState<BankAccount | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const getCurrentStep = useCallback(
    (
      kycData: KycData | null,
      account: BankAccount | null,
    ): KycStep | "complete" => {
      /*
       * STEP 1 — PERSONAL
       */
      const personalComplete =
        Boolean(kycData?.firstName) &&
        Boolean(kycData?.lastName) &&
        Boolean(kycData?.dateOfBirth) &&
        Boolean(kycData?.gender);

      if (!personalComplete) {
        return 1;
      }

      /*
       * STEP 2 — IDENTITY
       */
      const identityComplete =
        Boolean(kycData?.address) &&
        Boolean(kycData?.city) &&
        Boolean(kycData?.state) &&
        Boolean(kycData?.idType);

      if (!identityComplete) {
        return 2;
      }

      /*
       * STEP 3 — BANK
       */
      const bankComplete =
        account?.verificationStatus === "verified" ||
        account?.status === "verified";

      if (!bankComplete) {
        return 3;
      }

      /*
       * STEP 4 — BVN
       */
      const bvnComplete =
        kycData?.bvnVerificationStatus ===
        "verified";

      if (!bvnComplete) {
        return 4;
      }

      /*
       * STEP 5 — FACE
       */
      const faceComplete =
        kycData?.faceVerificationStatus ===
        "verified";

      if (!faceComplete) {
        return 5;
      }

      return "complete";
    },
    [],
  );

  const loadKyc = useCallback(
    async (): Promise<KycData | null> => {
      const response =
        await kycApi.getMyKyc();

      return response?.data ?? null;
    },
    [],
  );

  const loadBankAccount = useCallback(
    async (): Promise<BankAccount | null> => {
      const response =
        await API.get("/banks");

      const accounts = Array.isArray(
        response?.data?.data,
      )
        ? response.data.data
        : [];

      const primaryAccount =
        accounts.find(
          (item: BankAccount) =>
            item?.isPrimary,
        );

      const verifiedAccount =
        accounts.find(
          (item: BankAccount) =>
            item?.verificationStatus ===
              "verified" ||
            item?.status === "verified",
        );

      return (
        primaryAccount ||
        verifiedAccount ||
        accounts[0] ||
        null
      );
    },
    [],
  );

  /*
   * Load the entire KYC flow.
   */
  const refreshFlow = useCallback(
    async () => {
      try {
        setError(null);

        const [
          kycData,
          account,
        ] = await Promise.all([
          loadKyc(),
          loadBankAccount(),
        ]);

        setKyc(kycData);
        setBankAccount(account);

        const step =
          getCurrentStep(
            kycData,
            account,
          );

        /*
         * Everything is complete.
         */
        if (step === "complete") {
          navigate(
            "/onboarding/loan",
            {
              replace: true,
            },
          );
        }
      } catch (err: any) {
        console.error(
          "KYC FLOW FAILED:",
          err?.response?.data ||
            err?.message ||
            err,
        );

        setError(
          err?.response?.data?.message ||
            "Unable to load your verification status.",
        );
      }
    },
    [
      getCurrentStep,
      loadKyc,
      loadBankAccount,
      navigate,
    ],
  );

  /*
   * Initial load.
   */
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          kycData,
          account,
        ] = await Promise.all([
          loadKyc(),
          loadBankAccount(),
        ]);

        if (!mounted) {
          return;
        }

        setKyc(kycData);
        setBankAccount(account);

        const step =
          getCurrentStep(
            kycData,
            account,
          );

        if (step === "complete") {
          navigate(
            "/onboarding/loan",
            {
              replace: true,
            },
          );
        }
      } catch (err: any) {
        console.error(
          "KYC INITIALIZATION FAILED:",
          err?.response?.data ||
            err?.message ||
            err,
        );

        if (mounted) {
          setError(
            err?.response?.data?.message ||
              "Unable to load your verification status.",
          );
        }
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
    getCurrentStep,
    loadKyc,
    loadBankAccount,
    navigate,
  ]);

  /*
   * Determine current step from the same
   * backend state used by the guard.
   */
  const currentStep =
    getCurrentStep(
      kyc,
      bankAccount,
    );

  const contextValue =
    useMemo<KycFlowContext>(
      () => ({
        kyc,
        bankAccount,
        currentStep,
        loading,
        error,
        refreshFlow,
      }),
      [
        kyc,
        bankAccount,
        currentStep,
        loading,
        error,
        refreshFlow,
      ],
    );

  /*
   * Loading.
   */
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

          <h2 className="text-base font-semibold text-gray-900">
            Loading your verification
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Please wait while we check your progress.
          </p>
        </div>
      </div>
    );
  }

  /*
   * Error.
   */
  if (error) {
    return (
      <div className="mx-auto flex min-h-[400px] w-full max-w-xl items-center px-4">
        <div className="w-full rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-700">
            Verification Error
          </h2>

          <p className="mt-2 text-sm leading-6 text-red-600">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              window.location.reload()
            }
            className="mt-5 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /*
   * If everything is complete.
   */
  if (currentStep === "complete") {
    return (
      <Navigate
        to="/onboarding/loan"
        replace
      />
    );
  }

  /*
   * Only /kyc should render the KYC page.
   */
  if (location.pathname !== "/kyc") {
    return (
      <Navigate
        to="/kyc"
        replace
      />
    );
  }

  return (
    <KycFlowStateContext.Provider value={contextValue}>
      <Outlet context={contextValue} />
    </KycFlowStateContext.Provider>
  );
};

export default KycFlowGuard;

/*
 * Helper hook.
 */
export const useKycFlow =
  (): KycFlowContext => {
    const context =
      useContext(KycFlowStateContext);

    if (!context) {
      throw new Error(
        "useKycFlow must be used within KycFlowGuard",
      );
    }

    return context;
  };