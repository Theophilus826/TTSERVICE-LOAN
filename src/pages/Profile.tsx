
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  ShieldCheck,
  X,
  Landmark,
  UserRound,
  Wallet,
} from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import API from "../services/Api";
import bankApi, {
  type Bank,
  type BankAccount,
} from "../services/BankService";

/* =========================================================
   TYPES
   ========================================================= */

type User = {
  _id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avatar?: string | null;
  role?: string;
  isVerified?: boolean;
  accountStatus?: string;
  borrowerStatus?: string;
  kycStatus?: string;
  online?: boolean;
  lastActive?: string | null;
  coins?: number;
  referralCode?: string | null;
  createdAt?: string;
};

type LoanProduct = {
  _id?: string;
  name?: string;
  title?: string;
  code?: string;
  currency?: string;
  minAmount?: number;
  maxAmount?: number;
  interestRate?: number;
  interestType?: string;
  repaymentFrequency?: string;
};

type Application = {
  _id?: string;
  applicationNumber?: string;
  amountRequested?: number;
  durationDays?: number;
  status?: string;
  loanProduct?: LoanProduct;
  createdAt?: string;
};

type Offer = {
  _id: string;
  approvedAmount?: number;
  interestRate?: number;
  interestType?: string;
  processingFee?: number;
  serviceFee?: number;
  totalInterest?: number;
  totalFees?: number;
  totalRepayment?: number;
  durationDays?: number;
  repaymentFrequency?: string;
  installmentAmount?: number;
  numberOfInstallments?: number;
  status?: string;
  expiresAt?: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  loanApplication?: Application;
  loanProduct?: LoanProduct;
};

type LoanSummary = {
  totalApplications: number;
  totalOffers: number;
  pendingOffers: number;
  applicationStatus: string;
  offerStatus: string | null;
  activeApplication: Application | null;
};

type ProfileData = {
  profile: User;
  loanSummary: LoanSummary;
  applications: Application[];
  offers: Offer[];
};

type ProfileResponse = {
  success: boolean;
  message?: string;
  data: ProfileData;
};

type ApiErrorResponse = {
  success?: boolean;
  message?: string;
};

/* =========================================================
   HELPERS
   ========================================================= */

const formatStatus = (status?: string | null): string => {
  if (!status) return "None";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatMoney = (
  amount?: number,
  currency = "NGN",
): string => {
  return `${currency} ${Number(amount || 0).toLocaleString("en-NG")}`;
};

const formatDate = (date?: string | null): string => {
  if (!date) return "N/A";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "N/A";

  return parsedDate.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getStatusClass = (status?: string | null): string => {
  switch (status) {
    case "accepted":
    case "approved":
    case "disbursed":
      return "bg-green-100 text-green-700";

    case "offer_created":
      return "bg-purple-100 text-purple-700";

    case "active":
    case "partially_paid":
    case "under_review":
    case "credit_check":
      return "bg-blue-100 text-blue-700";

    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-700";

    case "submitted":
    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "expired":
      return "bg-gray-100 text-gray-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return (
      error.response?.data?.message ||
      error.message ||
      fallback
    );
  }

  if (error instanceof Error) return error.message;

  return fallback;
};

const getBankName = (account: BankAccount): string =>
  account.bankName || "Bank account";

/* =========================================================
   APPLICATION STATUS
   ========================================================= */

const APPLICATION_STATUSES = [
  "submitted",
  "under_review",
  "credit_check",
  "approved",
  "offer_created",
  "accepted",
] as const;

/* =========================================================
   COMPONENT
   ========================================================= */

const Profile = () => {
  const navigate = useNavigate();

  /* Profile state */
  const [profile, setProfile] = useState<User | null>(null);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  /* Edit profile drawer */
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  /* Bank account state */
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState("");
  const [newAccountNumber, setNewAccountNumber] = useState("");

  /* =======================================================
     LOAD PROFILE
     ======================================================= */

  const loadProfile = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await API.get<ProfileResponse>(
        "/users/me/profile",
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to load profile",
        );
      }

      const data = response.data.data;

      if (!data?.profile) {
        throw new Error("Profile data was not returned");
      }

      setProfile(data.profile);
      setSummary(data.loanSummary || null);
      setOffers(data.offers || []);
      setName(data.profile.name || "");
    } catch (loadError: unknown) {
      console.error("Failed to load profile:", loadError);

      const message = getErrorMessage(
        loadError,
        "Failed to load profile",
      );

      setError(message);

      if (showRefresh) toast.error(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /* =======================================================
     LOAD BANKS AND BANK ACCOUNTS
     ======================================================= */

  const loadBankAccounts = useCallback(async () => {
    setBankLoading(true);

    try {
      const [banksResponse, accountsResponse] = await Promise.all([
        bankApi.getBanks(),
        bankApi.getMyBankAccounts(),
      ]);

      if (banksResponse.success === false) {
        throw new Error(
          banksResponse.message || "Unable to load available banks",
        );
      }

      if (accountsResponse.success === false) {
        throw new Error(
          accountsResponse.message || "Unable to load bank accounts",
        );
      }

      setBanks(
        Array.isArray(banksResponse.data) ? banksResponse.data : [],
      );

      setBankAccounts(
        Array.isArray(accountsResponse.data)
          ? accountsResponse.data
          : [],
      );
    } catch (bankError: unknown) {
      console.error("Failed to load bank data:", bankError);

      toast.error(
        getErrorMessage(
          bankError,
          "Unable to load bank accounts",
        ),
      );
    } finally {
      setBankLoading(false);
    }
  }, []);

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    void loadProfile();
    void loadBankAccounts();
  }, [loadProfile, loadBankAccounts]);

  /* =======================================================
     CLOSE EDIT DRAWER
     ======================================================= */

  const closeEditor = () => {
    if (saving || bankSaving) return;

    setEditing(false);
    setName(profile?.name || "");
    setError("");
    setShowAddBank(false);
    setSelectedBankCode("");
    setNewAccountNumber("");
  };

  /* =======================================================
     SAVE PROFILE
     ======================================================= */

  const saveProfile = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await API.patch<{
        success?: boolean;
        message?: string;
        data?: User;
      }>("/users/me", {
        name: trimmedName,
      });

      if (response.data?.success === false) {
        throw new Error(
          response.data?.message || "Failed to update profile",
        );
      }

      const updatedProfile = response.data?.data;

      setProfile((current) =>
        current
          ? {
              ...current,
              ...(updatedProfile || {}),
              name: updatedProfile?.name || trimmedName,
            }
          : current,
      );

      setName(updatedProfile?.name || trimmedName);

      toast.success(
        response.data?.message || "Profile updated successfully",
      );
    } catch (saveError: unknown) {
      console.error("Failed to update profile:", saveError);

      const message = getErrorMessage(
        saveError,
        "Failed to update profile",
      );

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     ADD BANK ACCOUNT
     ======================================================= */

  const addBankAccount = async () => {
    const accountNumber = newAccountNumber.trim();

    if (!selectedBankCode) {
      toast.error("Please select a bank");
      return;
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      toast.error("Enter a valid 10-digit account number");
      return;
    }

    const selectedBank = banks.find(
      (bank) => bank.code === selectedBankCode,
    );

    if (!selectedBank) {
      toast.error("The selected bank could not be found");
      return;
    }

    if (!selectedBank.name.trim() || !selectedBank.code.trim()) {
      toast.error("The selected bank is missing its name or bank code");
      return;
    }

    try {
      setBankSaving(true);

      const response = await bankApi.addBankAccount({
        bankName: selectedBank.name,
        bankCode: selectedBank.code,
        accountNumber,
        accountType: "savings",
        currency: "NGN",
      });

      if (!response.success) {
        throw new Error(
          response.message || "Could not add bank account",
        );
      }

      toast.success(
        response.message || "Bank account added successfully",
      );

      setNewAccountNumber("");
      setSelectedBankCode("");
      setShowAddBank(false);

      await loadBankAccounts();
    } catch (bankError: unknown) {
      console.error("Failed to add bank account:", bankError);

      toast.error(
        getErrorMessage(
          bankError,
          "Could not add bank account",
        ),
      );
    } finally {
      setBankSaving(false);
    }
  };

  /* =======================================================
     VERIFY BANK ACCOUNT
     ======================================================= */

  const verifyBankAccount = async (accountId: string) => {
    try {
      setBankSaving(true);

      const response = await bankApi.verifyBankAccount(accountId);

      if (!response.success) {
        throw new Error(
          response.message || "Bank verification failed",
        );
      }

      toast.success(
        response.message || "Verification request completed",
      );

      await loadBankAccounts();
    } catch (bankError: unknown) {
      console.error("Bank verification failed:", bankError);

      toast.error(
        getErrorMessage(
          bankError,
          "Bank verification failed",
        ),
      );
    } finally {
      setBankSaving(false);
    }
  };

  /* =======================================================
     SET PRIMARY BANK ACCOUNT
     ======================================================= */

  const setPrimaryBankAccount = async (accountId: string) => {
    try {
      setBankSaving(true);

      const response =
        await bankApi.setPrimaryBankAccount(accountId);

      if (!response.success) {
        throw new Error(
          response.message || "Could not change primary bank account",
        );
      }

      toast.success(
        response.message || "Primary bank account updated",
      );

      await loadBankAccounts();
    } catch (bankError: unknown) {
      console.error("Failed to set primary bank:", bankError);

      toast.error(
        getErrorMessage(
          bankError,
          "Could not change primary bank account",
        ),
      );
    } finally {
      setBankSaving(false);
    }
  };

  /* =======================================================
     OPEN OFFER
     ======================================================= */

  const openOffer = (offerId?: string) => {
    if (!offerId) {
      toast.error("Loan offer ID is missing");
      return;
    }

    navigate(`/loan-offers/${offerId}`);
  };

  /* =======================================================
     LOADING
     ======================================================= */

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <RefreshCw
            size={30}
            className="mx-auto animate-spin text-gray-500"
          />
          <p className="mt-3 text-sm text-gray-500">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR WITHOUT PROFILE
     ======================================================= */

  if (error && !profile) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <div className="rounded-xl bg-red-50 p-5 text-red-600">
          <div className="flex items-start gap-3">
            <AlertCircle size={21} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Unable to load profile</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadProfile(true)}
          disabled={refreshing}
          className="mt-4 flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Try Again
        </button>
      </div>
    );
  }

  if (!profile) return null;

  const activeApplication = summary?.activeApplication || null;

  const currentOffer =
    offers.find(
      (offer) =>
        activeApplication?._id &&
        offer.loanApplication?._id === activeApplication._id,
    ) ||
    offers.find(
      (offer) =>
        offer.status === "pending" ||
        offer.status === "offer_created",
    ) ||
    offers[0] ||
    null;

  const primaryAccount = bankAccounts.find(
    (account) => account.isPrimary,
  );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      {/* PAGE HEADER */}

      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            My Profile
          </h1>
          <p className="mt-1 text-gray-500">
            Manage your account and monitor your loan activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void loadProfile(true);
            void loadBankAccounts();
          }}
          disabled={refreshing || bankLoading}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              refreshing || bankLoading ? "animate-spin" : ""
            }
          />
          Refresh
        </button>
      </div>

      {/* PAGE ERROR */}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-600">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* PROFILE CARD */}

      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            {profile.avatar ? (
              <img
                src={profile.avatar}
                alt={profile.name}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-900 text-2xl font-bold text-white">
                {profile.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}

            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {profile.name}
              </h2>

              <p className="break-all text-gray-500">
                {profile.email ||
                  profile.phone ||
                  "No contact information"}
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                    profile.accountStatus,
                  )}`}
                >
                  {formatStatus(profile.accountStatus)}
                </span>

                {profile.isVerified && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                    <ShieldCheck size={13} />
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setName(profile.name || "");
              setError("");
              setEditing(true);
            }}
            className="flex items-center justify-center gap-2 rounded-lg bg-black px-5 py-3 font-medium text-white transition hover:bg-gray-800"
          >
            <UserRound size={17} />
            Edit Profile
          </button>
        </div>
      </div>

      {/* ACCOUNT INFORMATION AND REFERRAL */}

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold">
            Account Information
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="break-all font-medium">
                {profile.email || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">
                {profile.phone || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Primary Bank Account
              </p>

              {primaryAccount ? (
                <div className="mt-1">
                  <p className="font-medium">
                    {getBankName(primaryAccount)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Account ending in{" "}
                    {primaryAccount.accountNumberLast4 || "••••"}

                    {primaryAccount.verificationStatus === "verified" && (
                      <span className="ml-2 inline-flex items-center gap-1 text-green-700">
                        <CheckCircle2 size={14} />
                        Verified
                      </span>
                    )}
                  </p>
                </div>
              ) : (
                <p className="font-medium">
                  {bankLoading
                    ? "Loading bank account..."
                    : "No primary bank account"}
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setName(profile.name || "");
                  setError("");
                  setEditing(true);
                }}
                className="mt-2 text-sm font-medium text-blue-700 hover:underline"
              >
                Manage bank accounts
              </button>
            </div>

            <div>
              <p className="text-sm text-gray-500">KYC Status</p>
              <p className="font-medium">
                {formatStatus(profile.kycStatus)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Borrower Status</p>
              <p className="font-medium">
                {formatStatus(profile.borrowerStatus)}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">Member Since</p>
              <p className="font-medium">
                {formatDate(profile.createdAt)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold">Referral</h3>

          <div className="mb-5 rounded-xl bg-gray-50 p-5">
            <p className="text-sm text-gray-500">Referral Code</p>
            <p className="mt-1 break-all text-2xl font-bold tracking-wider">
              {profile.referralCode || "N/A"}
            </p>
          </div>

          <p className="text-sm text-gray-500">Coins</p>
          <p className="mt-1 text-2xl font-bold">
            {profile.coins || 0}
          </p>
        </div>
      </div>

      {/* LOAN SUMMARY */}

      <div className="mb-6">
        <h2 className="mb-4 text-xl font-bold">Loan Overview</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Applications</p>
            <p className="mt-2 text-3xl font-bold">
              {summary?.totalApplications || 0}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Offers</p>
            <p className="mt-2 text-3xl font-bold">
              {summary?.totalOffers || 0}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending Offers</p>
            <p className="mt-2 text-3xl font-bold">
              {summary?.pendingOffers || 0}
            </p>
          </div>
        </div>
      </div>

      {/* APPLICATION STATUS */}

      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Application Status</h2>

            {activeApplication && (
              <p className="mt-1 text-sm text-gray-500">
                Application #{activeApplication.applicationNumber}
              </p>
            )}
          </div>

          {activeApplication && (
            <span
              className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                activeApplication.status,
              )}`}
            >
              {formatStatus(activeApplication.status)}
            </span>
          )}
        </div>

        {!activeApplication ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <FileText size={36} className="mx-auto text-gray-400" />

            <h3 className="mt-3 text-lg font-semibold text-gray-800">
              No Active Loan
            </h3>

            <p className="mt-2 text-gray-500">
              You currently have no active loan application.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              {APPLICATION_STATUSES.map((status, index, statuses) => {
                const currentIndex = statuses.findIndex(
                  (statusOption) =>
                    statusOption === activeApplication.status,
                );

                const effectiveIndex =
                  currentIndex >= 0 ? currentIndex : 0;

                const completed = index <= effectiveIndex;

                return (
                  <div
                    key={status}
                    className="mb-4 flex items-center gap-3"
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                        completed
                          ? "bg-green-600 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {completed ? (
                        <CheckCircle2 size={18} />
                      ) : (
                        index + 1
                      )}
                    </div>

                    <span
                      className={
                        completed
                          ? "font-semibold text-gray-900"
                          : "text-gray-400"
                      }
                    >
                      {formatStatus(status)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">Loan Product</p>
                <p className="mt-1 font-semibold">
                  {activeApplication.loanProduct?.name || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Amount Requested
                </p>
                <p className="mt-1 font-semibold">
                  {formatMoney(
                    activeApplication.amountRequested,
                    activeApplication.loanProduct?.currency || "NGN",
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="mt-1 font-semibold">
                  {activeApplication.durationDays || 0} days
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Offer Status</p>
                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${getStatusClass(
                    summary?.offerStatus,
                  )}`}
                >
                  {formatStatus(summary?.offerStatus)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* LOAN OFFER */}

      {currentOffer ? (
        <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">Loan Offer</h2>
              <p className="mt-1 text-gray-500">
                Your loan offer is available for review.
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                currentOffer.status,
              )}`}
            >
              {formatStatus(currentOffer.status)}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Approved Amount</p>
              <p className="mt-1 text-xl font-bold">
                {formatMoney(
                  currentOffer.approvedAmount,
                  currentOffer.loanProduct?.currency || "NGN",
                )}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Interest</p>
              <p className="mt-1 text-xl font-bold">
                {currentOffer.interestRate || 0}%
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Total Repayment</p>
              <p className="mt-1 text-xl font-bold">
                {formatMoney(
                  currentOffer.totalRepayment,
                  currentOffer.loanProduct?.currency || "NGN",
                )}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Installment</p>
              <p className="mt-1 text-xl font-bold">
                {formatMoney(
                  currentOffer.installmentAmount,
                  currentOffer.loanProduct?.currency || "NGN",
                )}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {formatStatus(currentOffer.repaymentFrequency)} ×{" "}
                {currentOffer.numberOfInstallments || 0}
              </p>
            </div>
          </div>

          {currentOffer.expiresAt && (
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-yellow-50 p-4">
              <Clock3 size={19} className="mt-0.5 text-yellow-600" />
              <div>
                <p className="text-sm text-yellow-700">Offer expires</p>
                <p className="mt-1 font-semibold text-yellow-900">
                  {formatDate(currentOffer.expiresAt)}
                </p>
              </div>
            </div>
          )}

          <div className="mt-6">
            <button
              type="button"
              onClick={() => openOffer(currentOffer._id)}
              className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
            >
              View & Accept Offer
            </button>
          </div>

          {currentOffer.status === "accepted" && (
            <div className="mt-6 rounded-xl bg-green-50 p-4 text-green-700">
              <p className="font-semibold">Loan offer accepted</p>
              <p className="mt-1 text-sm">
                Your application has moved to the accepted stage.
              </p>
            </div>
          )}

          {currentOffer.status === "rejected" && (
            <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
              <p className="font-semibold">Loan offer rejected</p>
            </div>
          )}

          {currentOffer.status === "expired" && (
            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-gray-700">
              <p className="font-semibold">Loan offer expired</p>
              <p className="mt-1 text-sm">
                This offer is no longer available.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">Loan Offer</h2>
              <p className="mt-1 text-gray-500">
                No loan offer is currently available.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/loans")}
              className="w-fit rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
            >
              Apply for a Loan
            </button>
          </div>
        </div>
      )}

      {/* APPLICATION / OFFER HISTORY */}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-bold">
          Application History
        </h2>

        {offers.length === 0 && !activeApplication ? (
          <p className="text-gray-500">No loan activity yet.</p>
        ) : offers.length === 0 ? (
          <p className="text-gray-500">No loan offers yet.</p>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <div
                key={offer._id}
                className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {offer.loanProduct?.name || "Loan Offer"}
                  </p>

                  <p className="text-sm text-gray-500">
                    {formatMoney(
                      offer.approvedAmount,
                      offer.loanProduct?.currency || "NGN",
                    )}
                  </p>

                  {offer.loanApplication?.applicationNumber && (
                    <p className="mt-1 text-xs text-gray-400">
                      Application #
                      {offer.loanApplication.applicationNumber}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                      offer.status,
                    )}`}
                  >
                    {formatStatus(offer.status)}
                  </span>

                  <button
                    type="button"
                    onClick={() => openOffer(offer._id)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    View Offer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* =====================================================
          EDIT PROFILE SIDE DRAWER
          ===================================================== */}

      {editing && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}

          <button
            type="button"
            aria-label="Close edit profile"
            onClick={closeEditor}
            disabled={saving || bankSaving}
            className="absolute inset-0 bg-black/40 transition-opacity disabled:cursor-not-allowed"
          />

          {/* Drawer */}

          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="relative z-10 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
          >
            {/* Drawer header */}

            <div className="flex items-center justify-between border-b px-5 py-5 sm:px-6">
              <div>
                <h2
                  id="edit-profile-title"
                  className="text-xl font-bold text-gray-900"
                >
                  Edit Profile
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your personal details and payout accounts.
                </p>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                disabled={saving || bankSaving}
                aria-label="Close drawer"
                className="rounded-lg border p-2 text-gray-500 transition hover:bg-gray-50 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable drawer content */}

            <div className="flex-1 space-y-8 overflow-y-auto p-5 sm:p-6">
              {/* Profile form */}

              <section>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                    <UserRound size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Personal Information
                    </h3>
                    <p className="text-sm text-gray-500">
                      Update your profile name.
                    </p>
                  </div>
                </div>

                <label
                  htmlFor="profile-name"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Full Name
                </label>

                <input
                  id="profile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={saving}
                  autoComplete="name"
                  placeholder="Enter your full name"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-black disabled:bg-gray-100"
                />

                {error && (
                  <p className="mt-2 flex items-start gap-2 text-sm text-red-600">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    {error}
                  </p>
                )}

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="mt-1 break-all text-sm font-medium text-gray-900">
                      {profile.email || "Not provided"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {profile.phone || "Not provided"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void saveProfile()}
                  disabled={saving || !name.trim()}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-5 py-3 font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <RefreshCw size={16} className="animate-spin" />
                  )}
                  {saving ? "Saving..." : "Save Profile"}
                </button>
              </section>

              <div className="border-t" />

              {/* Bank account management */}

              <section>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Wallet size={20} />
                    </div>

                    <div>
                      <h3 className="font-semibold text-gray-900">
                        Bank Accounts
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Manage your loan payout accounts.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadBankAccounts()}
                    disabled={bankLoading || bankSaving}
                    title="Refresh bank accounts"
                    aria-label="Refresh bank accounts"
                    className="rounded-lg border p-2 text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={17}
                      className={bankLoading ? "animate-spin" : ""}
                    />
                  </button>
                </div>

                {/* Add account button */}

                <button
                  type="button"
                  onClick={() => setShowAddBank((current) => !current)}
                  disabled={bankSaving}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
                >
                  <Landmark size={17} />
                  {showAddBank ? "Cancel" : "Add Bank Account"}
                </button>

                {/* Add account form */}

                {showAddBank && (
                  <div className="mt-4 space-y-4 rounded-xl border bg-gray-50 p-4">
                    <div>
                      <label
                        htmlFor="bank-select"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Select Bank
                      </label>

                      <select
                        id="bank-select"
                        value={selectedBankCode}
                        onChange={(event) =>
                          setSelectedBankCode(event.target.value)
                        }
                        disabled={bankLoading || bankSaving}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-black disabled:opacity-50"
                      >
                        <option value="">Select your bank</option>

                        {banks.map((bank) => (
                          <option
                            key={bank.code}
                            value={bank.code}
                          >
                            {bank.name}
                          </option>
                        ))}
                      </select>

                      {!bankLoading && banks.length === 0 && (
                        <p className="mt-2 text-sm text-amber-700">
                          No banks are available. Try refreshing the list.
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="account-number"
                        className="mb-2 block text-sm font-medium text-gray-700"
                      >
                        Account Number
                      </label>

                      <input
                        id="account-number"
                        type="text"
                        value={newAccountNumber}
                        onChange={(event) =>
                          setNewAccountNumber(
                            event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10),
                          )
                        }
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={10}
                        placeholder="Enter 10-digit account number"
                        disabled={bankSaving}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-3 outline-none focus:border-black disabled:opacity-50"
                      />

                      <p className="mt-2 text-xs text-gray-500">
                        Your full account number will not be displayed
                        in the account list.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void addBankAccount()}
                      disabled={
                        bankSaving ||
                        bankLoading ||
                        !selectedBankCode ||
                        !/^\d{10}$/.test(newAccountNumber)
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {bankSaving && (
                        <RefreshCw
                          size={16}
                          className="animate-spin"
                        />
                      )}
                      {bankSaving ? "Please wait..." : "Add Account"}
                    </button>
                  </div>
                )}

                {/* Bank account list */}

                <div className="mt-5 space-y-3">
                  {bankLoading && bankAccounts.length === 0 ? (
                    <div className="rounded-xl border p-8 text-center">
                      <RefreshCw
                        size={24}
                        className="mx-auto animate-spin text-gray-400"
                      />
                      <p className="mt-3 text-sm text-gray-500">
                        Loading bank accounts...
                      </p>
                    </div>
                  ) : bankAccounts.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-8 text-center">
                      <Landmark
                        size={30}
                        className="mx-auto text-gray-400"
                      />
                      <p className="mt-3 font-medium text-gray-800">
                        No bank accounts added
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        Add a bank account to get started.
                      </p>
                    </div>
                  ) : (
                    bankAccounts.map((account) => {
                      const id = account._id;
                      const bankLabel = getBankName(account);
                      const status = account.verificationStatus;

                      return (
                        <div
                          key={id}
                          className="rounded-xl border p-4 transition hover:border-gray-300"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                              <Landmark size={19} />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-gray-900">
                                  {bankLabel}
                                </p>

                                {account.isPrimary && (
                                  <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                                    Primary
                                  </span>
                                )}
                              </div>

                              <p className="mt-1 text-sm text-gray-500">
                                Account ending in{" "}
                                {account.accountNumberLast4 || "••••"}
                              </p>

                              <p
                                className={`mt-2 flex items-center gap-1 text-xs font-medium ${
                                  status === "verified"
                                    ? "text-green-700"
                                    : status === "failed"
                                      ? "text-red-700"
                                      : "text-amber-700"
                                }`}
                              >
                                {status === "verified" ? (
                                  <CheckCircle2 size={14} />
                                ) : (
                                  <Clock3 size={14} />
                                )}

                                {status === "verified"
                                  ? "Verified"
                                  : status === "failed"
                                    ? "Verification failed"
                                    : "Verification pending"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            {status !== "verified" && id && (
                              <button
                                type="button"
                                onClick={() =>
                                  void verifyBankAccount(id)
                                }
                                disabled={bankSaving}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                              >
                                {status === "failed"
                                  ? "Retry Verification"
                                  : "Verify Account"}
                              </button>
                            )}

                            {!account.isPrimary &&
                              status === "verified" &&
                              id && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void setPrimaryBankAccount(id)
                                  }
                                  disabled={bankSaving}
                                  className="rounded-lg bg-black px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800 disabled:opacity-50"
                                >
                                  Make Primary
                                </button>
                              )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <p className="mt-4 text-xs leading-5 text-gray-500">
                  Only verified bank accounts can be selected as your
                  primary payout account.
                </p>
              </section>
            </div>

            {/* Drawer footer */}

            <div className="border-t bg-white p-4 sm:px-6">
              <button
                type="button"
                onClick={closeEditor}
                disabled={saving || bankSaving}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Done
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Profile;
