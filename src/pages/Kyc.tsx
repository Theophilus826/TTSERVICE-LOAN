import React, {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useKycFlow,
} from "../component/KycFlowGuard";
import kycApi from "../services/kycApi";

import KycStepIndicator from "../component/KycStepIndicator";

import PersonalStep, {
  type PersonalFormData,
} from "../component/PersonalStep";
import BankAccountStep from "../component/BankAccountStep";
import BvnStep from "../component/BvnStep";
import FaceVerificationStep from "../component/FaceVerificationStep";

/*
 * Replace this import with your actual
 * identity/customer verification component.
 */
import IdentityStep from "../component/IdentityStep";
import type { IdentityFormData } from "../component/IdentityStep";

const Kyc: React.FC = () => {
  const navigate = useNavigate();

  const {
    kyc,
    bankAccount,
    currentStep,
    refreshFlow,
  } = useKycFlow();

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const [personalForm, setPersonalForm] =
    useState<PersonalFormData>(() => ({
      firstName: kyc?.firstName ?? "",
      lastName: kyc?.lastName ?? "",
      dateOfBirth: kyc?.dateOfBirth?.slice(0, 10) ?? "",
      gender: kyc?.gender ?? "",
    }));

  const [identityForm, setIdentityForm] =
    useState<IdentityFormData>(() => ({
      address: kyc?.address ?? "",
      city: kyc?.city ?? "",
      state: kyc?.state ?? "",
      country: kyc?.country ?? "Nigeria",
      idType: kyc?.idType ?? "",
      idNumber: kyc?.idNumber ?? "",
    }));

  const indicatorStep =
    currentStep === "complete"
      ? 5
      : currentStep;

  /*
   * Called after PersonalStep successfully
   * saves the personal information.
   */
  const handlePersonalComplete =
    async (form: PersonalFormData) => {
      const gender = form.gender;
      if (!gender) {
        setError("Please select your gender.");
        return;
      }

      setSaving(true);
      setError(null);
      setMessage(null);

      try {
        await kycApi.savePersonalInfo({
          ...form,
          gender,
        });
        setMessage("Personal information saved.");
        await refreshFlow();
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to save personal information.",
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * Called after Identity verification
   * has completed.
   */
  const handleIdentityComplete =
    async (form: IdentityFormData) => {
      const gender = personalForm.gender;
      const idType = form.idType;
      if (!gender || !idType) {
        setError("Complete all required personal and identity fields.");
        return;
      }

      setSaving(true);
      setError(null);
      setMessage(null);

      try {
        await kycApi.submitKyc({
          ...personalForm,
          ...form,
          gender,
          idType,
        });
        setMessage("Identity information saved.");
        await refreshFlow();
      } catch (err: any) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to save identity information.",
        );
      } finally {
        setSaving(false);
      }
    };

  /*
   * Called after bank verification.
   */
  const handleBankComplete =
    async () => {
      setError(null);
      setMessage(null);

      await refreshFlow();
    };

  /*
   * Called after BVN verification.
   */
  const handleBvnComplete =
    async () => {
      setError(null);
      setMessage(null);

      await refreshFlow();
    };

  /*
   * Called after face verification.
   */
  const handleFaceComplete =
    async () => {
      setError(null);
      setMessage(null);

      await refreshFlow();
    };

  /*
   * Header information.
   */
  const getTitle = () => {
    switch (currentStep) {
      case 1:
        return "Personal Information";

      case 2:
        return "Identity Verification";

      case 3:
        return "Bank Account";

      case 4:
        return "BVN Verification";

      case 5:
        return "Face Verification";

      default:
        return "Verification";
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-6 md:py-8">

      {/* ================================================
          STEP INDICATOR
          ================================================ */}

      <div className="mb-8">
        <KycStepIndicator
          currentStep={indicatorStep}
        />
      </div>

      {/* ================================================
          HEADER
          ================================================ */}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {getTitle()}
        </h1>

        <p className="mt-1 text-sm leading-6 text-gray-500">
          Complete each step to continue
          your loan application.
        </p>
      </div>

      {/* ================================================
          MESSAGE
          ================================================ */}

      {message && (
        <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ================================================
          STEP CONTENT
          ================================================ */}

      <div className="rounded-xl border bg-white p-6 shadow-sm md:p-8">

        {/* STEP 1 */}

        {currentStep === 1 && (
          <PersonalStep
            form={personalForm}
            onChange={(field, value) => {
              setPersonalForm((previous) => ({
                ...previous,
                [field]: value,
              }));
            }}
            onComplete={
              handlePersonalComplete
            }
            saving={saving}
          />
        )}

        {/* STEP 2 */}

        {currentStep === 2 && (
          <IdentityStep
            form={identityForm}
            onChange={(field, value) => {
              setIdentityForm((previous) => ({
                ...previous,
                [field]: value,
              }));
            }}
            onComplete={handleIdentityComplete}
            saving={saving}
          />
        )}

        {/* STEP 3 */}

        {currentStep === 3 && (
          <BankAccountStep
            selectedBankAccountId={
              bankAccount?._id ?? null
            }
            onSelect={async (
              accountId,
            ) => {
              if (accountId) {
                await refreshFlow();
              }
            }}
          />
        )}

        {/* STEP 4 */}

        {currentStep === 4 && (
          <BvnStep
            bankAccountId={
              bankAccount?._id ?? null
            }
            bvnLast4={kyc?.bvnLast4 ?? null}
            bvnVerificationStatus={
              kyc?.bvnVerificationStatus ??
              "not_started"
            }
            customerVerificationStatus={
              kyc?.customerVerificationStatus ??
              "not_started"
            }
            onVerified={
              handleBvnComplete
            }
          />
        )}

        {/* STEP 5 */}

        {currentStep === 5 && (
          <FaceVerificationStep
            isVerified={
              kyc?.faceVerificationStatus ===
              "verified"
            }
            onVerified={
              handleFaceComplete
            }
          />
        )}
      </div>
    </div>
  );
};

export default Kyc;