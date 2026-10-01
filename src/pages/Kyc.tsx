
import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

import kycApi from "../services/kycApi";
import bankApi from "../services/BankService";

import KycStepIndicator from "../component/KycStepIndicator";
import PersonalStep, {
  PersonalFormData,
} from "../component/PersonalStep";
import IdentityStep, {
  IdentityFormData,
} from "../component/IdentityStep";
import BankAccountStep from "../component/BankAccountStep";
import BvnStep from "../component/BvnStep";
import FaceVerificationStep from "../component/FaceVerificationStep";

interface KycData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "";

  address: string;
  city: string;
  state: string;
  country: string;

  idType:
    | "nin"
    | "passport"
    | "drivers_license"
    | "voters_card"
    | "";
  idNumber: string;

  status?: string;

  bvnLast4?: string | null;

  bvnVerificationStatus?:
    | "not_started"
    | "pending"
    | "verified"
    | "failed";

  customerVerificationStatus?:
    | "not_started"
    | "pending"
    | "verified"
    | "failed";

  faceVerificationStatus?:
    | "not_started"
    | "pending"
    | "verified"
    | "failed";
}

interface BankAccount {
  _id: string;
  bankName: string;
  bankCode: string;
  accountName?: string;
  accountNumberLast4: string;
  accountType?: "savings" | "current";
  currency?: string;
  isPrimary: boolean;
  verificationStatus: "pending" | "verified" | "failed";
}

const initialPersonal: PersonalFormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
};

const initialIdentity: IdentityFormData = {
  address: "",
  city: "",
  state: "",
  country: "Nigeria",
  idType: "",
  idNumber: "",
};

const Kyc: React.FC = () => {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);

  const [personal, setPersonal] =
    useState<PersonalFormData>(initialPersonal);

  const [identity, setIdentity] =
    useState<IdentityFormData>(initialIdentity);

  const [kyc, setKyc] = useState<KycData | null>(null);

  const [selectedBankAccountId, setSelectedBankAccountId] =
    useState<string | null>(null);

  const [selectedBankAccount, setSelectedBankAccount] =
    useState<BankAccount | null>(null);

  const [loading, setLoading] = useState(true);
  const [savingKyc, setSavingKyc] = useState(false);

  const [errors, setErrors] =
    useState<Record<string, string>>({});

  const loadKyc = async () => {
    try {
      setLoading(true);

      const response = await kycApi.getMyKyc();
      const data = response?.data;

      if (!data) {
        return;
      }

      const kycData: KycData = {
        firstName: data.firstName || "",
        lastName: data.lastName || "",

        dateOfBirth: data.dateOfBirth
          ? String(data.dateOfBirth).slice(0, 10)
          : "",

        gender: data.gender || "",

        address: data.address || "",
        city: data.city || "",
        state: data.state || "",
        country: data.country || "Nigeria",

        idType: data.idType || "",
        idNumber: data.idNumber || "",

        status: data.status,

        bvnLast4: data.bvnLast4 || null,

        bvnVerificationStatus:
          data.bvnVerificationStatus || "not_started",

        customerVerificationStatus:
          data.customerVerificationStatus || "not_started",

        faceVerificationStatus:
          data.faceVerificationStatus || "not_started",
      };

      setKyc(kycData);

      setPersonal({
        firstName: kycData.firstName,
        lastName: kycData.lastName,
        dateOfBirth: kycData.dateOfBirth,
        gender: kycData.gender,
      });

      setIdentity({
        address: kycData.address,
        city: kycData.city,
        state: kycData.state,
        country: kycData.country,
        idType: kycData.idType,
        idNumber: kycData.idNumber,
      });
    } catch (error: any) {
      if (error?.response?.status !== 404) {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Unable to load KYC information",
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSelectedBankAccount = async () => {
    try {
      const response = await bankApi.getMyBankAccounts();

      const accounts = (response?.data ??
        response ??
        []) as BankAccount[];

      if (!Array.isArray(accounts)) {
        return;
      }

      const verifiedPrimary = accounts.find(
        (account) =>
          account.verificationStatus === "verified" &&
          account.isPrimary === true,
      );

      if (verifiedPrimary) {
        setSelectedBankAccountId(verifiedPrimary._id);
        setSelectedBankAccount(verifiedPrimary);
        return;
      }

      const verified = accounts.find(
        (account) =>
          account.verificationStatus === "verified",
      );

      if (verified) {
        setSelectedBankAccountId(verified._id);
        setSelectedBankAccount(verified);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load bank account",
      );
    }
  };

  useEffect(() => {
    const initialize = async () => {
      await loadKyc();
      await loadSelectedBankAccount();
    };

    initialize();
  }, []);

  const handlePersonalChange = (
    field: keyof PersonalFormData,
    value: string,
  ) => {
    setPersonal((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  };

  const handleIdentityChange = (
    field: keyof IdentityFormData,
    value: string,
  ) => {
    setIdentity((previous) => ({
      ...previous,
      [field]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  };

  const handleBankSelect = async (accountId: string) => {
    setSelectedBankAccountId(accountId);

    try {
      const response = await bankApi.getMyBankAccounts();

      const accounts = (response?.data ??
        response ??
        []) as BankAccount[];

      const account = Array.isArray(accounts)
        ? accounts.find((item) => item._id === accountId)
        : null;

      if (account) {
        setSelectedBankAccount(account);
      }
    } catch {
      // BankAccountStep handles its own errors.
    }
  };

  const validatePersonal = () => {
    const nextErrors: Record<string, string> = {};

    if (!personal.firstName.trim()) {
      nextErrors.firstName = "First name is required";
    }

    if (!personal.lastName.trim()) {
      nextErrors.lastName = "Last name is required";
    }

    if (!personal.dateOfBirth) {
      nextErrors.dateOfBirth =
        "Date of birth is required";
    }

    if (!personal.gender) {
      nextErrors.gender = "Gender is required";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const validateIdentity = () => {
    const nextErrors: Record<string, string> = {};

    if (!identity.address.trim()) {
      nextErrors.address = "Address is required";
    }

    if (!identity.city.trim()) {
      nextErrors.city = "City is required";
    }

    if (!identity.state.trim()) {
      nextErrors.state = "State is required";
    }

    if (!identity.country.trim()) {
      nextErrors.country = "Country is required";
    }

    if (!identity.idType) {
      nextErrors.idType = "ID type is required";
    }

    if (!identity.idNumber.trim()) {
      nextErrors.idNumber = "ID number is required";
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  };

  const saveKyc = async () => {
    try {
      setSavingKyc(true);

      const response = await kycApi.submitKyc({
        firstName: personal.firstName.trim(),
        lastName: personal.lastName.trim(),
        dateOfBirth: personal.dateOfBirth,
        gender: personal.gender,

        address: identity.address.trim(),
        city: identity.city.trim(),
        state: identity.state.trim(),
        country: identity.country.trim(),

        idType: identity.idType,
        idNumber: identity.idNumber.trim(),
      });

      const responseData = response?.data;

      setKyc((previous) => ({
        ...(previous || {}),

        firstName: personal.firstName.trim(),
        lastName: personal.lastName.trim(),
        dateOfBirth: personal.dateOfBirth,
        gender: personal.gender,

        address: identity.address.trim(),
        city: identity.city.trim(),
        state: identity.state.trim(),
        country: identity.country.trim(),

        idType: identity.idType,
        idNumber: identity.idNumber.trim(),

        status:
          responseData?.status ||
          previous?.status ||
          "submitted",

        bvnLast4:
          responseData?.bvnLast4 ||
          previous?.bvnLast4 ||
          null,

        bvnVerificationStatus:
          responseData?.bvnVerificationStatus ||
          previous?.bvnVerificationStatus ||
          "not_started",

        customerVerificationStatus:
          responseData?.customerVerificationStatus ||
          previous?.customerVerificationStatus ||
          "not_started",

        faceVerificationStatus:
          responseData?.faceVerificationStatus ||
          previous?.faceVerificationStatus ||
          "not_started",
      }));

      toast.success(
        "KYC information saved successfully",
      );

      return true;
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to save KYC information",
      );

      return false;
    } finally {
      setSavingKyc(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === 1) {
      if (!validatePersonal()) {
        return;
      }

      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      if (!validateIdentity()) {
        return;
      }

      const saved = await saveKyc();

      if (!saved) {
        return;
      }

      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      if (!selectedBankAccountId || !selectedBankAccount) {
        toast.error("Please select a bank account.");
        return;
      }

      if (
        selectedBankAccount.verificationStatus !==
        "verified"
      ) {
        toast.error(
          "Your bank account must be verified first.",
        );
        return;
      }

      if (!selectedBankAccount.isPrimary) {
        toast.error("Your bank account must be primary.");
        return;
      }

      setCurrentStep(4);
      return;
    }

    if (currentStep === 4) {
      const bvnVerified =
        kyc?.bvnVerificationStatus === "verified";

      const customerVerified =
        kyc?.customerVerificationStatus === "verified";

      if (!bvnVerified || !customerVerified) {
        toast.error(
          "Please complete BVN verification before continuing.",
        );
        return;
      }

      setCurrentStep(5);
    }
  };

  const previousStep = () => {
    if (currentStep > 1 && currentStep < 5) {
      setCurrentStep((step) => step - 1);
    }
  };

  const refreshAfterBvn = async () => {
    try {
      const response =
        await kycApi.getVerificationStatus();

      const data = response?.data;

      setKyc((previous) => ({
        ...(previous || {}),

        firstName:
          previous?.firstName || personal.firstName,

        lastName:
          previous?.lastName || personal.lastName,

        dateOfBirth:
          previous?.dateOfBirth || personal.dateOfBirth,

        gender:
          previous?.gender || personal.gender,

        address:
          previous?.address || identity.address,

        city:
          previous?.city || identity.city,

        state:
          previous?.state || identity.state,

        country:
          previous?.country || identity.country,

        idType:
          previous?.idType || identity.idType,

        idNumber:
          previous?.idNumber || identity.idNumber,

        status:
          data?.kycStatus ||
          data?.status ||
          previous?.status,

        bvnLast4:
          data?.bvnLast4 ||
          previous?.bvnLast4 ||
          null,

        bvnVerificationStatus:
          data?.bvnVerificationStatus ||
          previous?.bvnVerificationStatus ||
          "not_started",

        customerVerificationStatus:
          data?.customerVerificationStatus ||
          previous?.customerVerificationStatus ||
          "not_started",

        faceVerificationStatus:
          data?.faceVerificationStatus ||
          previous?.faceVerificationStatus ||
          "not_started",
      }));
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to refresh verification status",
      );
    }
  };

  const handleBvnVerified = async () => {
    await refreshAfterBvn();

    try {
      const response =
        await kycApi.getVerificationStatus();

      const data = response?.data;

      if (
        data?.bvnVerificationStatus === "verified" &&
        data?.customerVerificationStatus === "verified"
      ) {
        setKyc((previous) => ({
          ...(previous || {}),

          bvnVerificationStatus: "verified",
          customerVerificationStatus: "verified",

          bvnLast4:
            data?.bvnLast4 ||
            previous?.bvnLast4 ||
            null,

          status:
            data?.kycStatus ||
            data?.status ||
            previous?.status,

          faceVerificationStatus:
            data?.faceVerificationStatus ||
            previous?.faceVerificationStatus ||
            "not_started",
        }));

        setCurrentStep(5);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to confirm verification status",
      );
    }
  };

  const handleFaceVerified = () => {
    setKyc((previous) => ({
      ...(previous || {}),
      faceVerificationStatus: "verified",
    }));

    toast.success("Face verification completed.");

    navigate("/onboarding/loan");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2
          className="animate-spin text-blue-600"
          size={30}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50 px-3 py-4 sm:px-4 sm:py-6 lg:py-8">
      <div className="mx-auto w-full max-w-4xl min-w-0">
        <div className="mb-5 sm:mb-8">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            Complete Your Verification
          </h1>

          <p className="mt-2 max-w-2xl text-xs leading-5 text-gray-500 sm:text-sm">
            Complete your identity, bank, BVN, and face
            verification before applying for a loan.
          </p>
        </div>

        <div className="w-full min-w-0 rounded-2xl bg-white p-4 shadow-sm sm:p-5 md:p-8">
          <div className="w-full min-w-0 overflow-x-auto pb-1">
            <div className="min-w-max sm:min-w-0">
              <KycStepIndicator currentStep={currentStep} />
            </div>
          </div>

          <div className="my-5 border-t border-gray-100 sm:my-8" />

          {currentStep === 1 && (
            <PersonalStep
              form={personal}
              onChange={handlePersonalChange}
              errors={errors}
            />
          )}

          {currentStep === 2 && (
            <IdentityStep
              form={identity}
              onChange={handleIdentityChange}
              errors={errors}
            />
          )}

          {currentStep === 3 && (
            <BankAccountStep
              selectedBankAccountId={selectedBankAccountId}
              onSelect={handleBankSelect}
            />
          )}

          {currentStep === 4 && (
            <BvnStep
              bankAccountId={selectedBankAccountId}
              bvnLast4={kyc?.bvnLast4}
              bvnVerificationStatus={
                kyc?.bvnVerificationStatus
              }
              customerVerificationStatus={
                kyc?.customerVerificationStatus
              }
              onVerified={handleBvnVerified}
            />
          )}

          {currentStep === 5 && (
            <FaceVerificationStep
              isVerified={
                kyc?.faceVerificationStatus === "verified"
              }
              onVerified={handleFaceVerified}
            />
          )}

          {currentStep < 5 && (
            <div className="mt-7 flex flex-col-reverse gap-3 border-t border-gray-100 pt-5 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:pt-6">
              <button
                type="button"
                onClick={previousStep}
                disabled={
                  currentStep === 1 || savingKyc
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
              >
                <ChevronLeft size={17} />
                Back
              </button>

              <button
                type="button"
                onClick={nextStep}
                disabled={savingKyc}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 sm:w-auto"
              >
                {savingKyc && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                Continue

                {!savingKyc && (
                  <ChevronRight size={17} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Kyc;

