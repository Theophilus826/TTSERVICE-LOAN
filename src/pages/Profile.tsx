
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import API from "../services/Api";

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

const formatStatus = (
  status?: string | null,
): string => {
  if (!status) {
    return "None";
  }

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

const formatMoney = (
  amount?: number,
  currency = "NGN",
): string => {
  return `${currency} ${Number(
    amount || 0,
  ).toLocaleString("en-NG")}`;
};

const formatDate = (
  date?: string | null,
): string => {
  if (!date) {
    return "N/A";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "N/A";
  }

  return parsedDate.toLocaleDateString(
    "en-NG",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    },
  );
};

const getStatusClass = (
  status?: string | null,
): string => {
  switch (status) {
    case "accepted":
      return "bg-green-100 text-green-700";

    case "offer_created":
      return "bg-purple-100 text-purple-700";

    case "approved":
      return "bg-green-100 text-green-700";

    case "disbursed":
      return "bg-green-100 text-green-700";

    case "active":
      return "bg-blue-100 text-blue-700";

    case "partially_paid":
      return "bg-blue-100 text-blue-700";

    case "rejected":
      return "bg-red-100 text-red-700";

    case "cancelled":
      return "bg-red-100 text-red-700";

    case "under_review":
    case "credit_check":
      return "bg-blue-100 text-blue-700";

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

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

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

  const [profile, setProfile] =
    useState<User | null>(null);

  const [summary, setSummary] =
    useState<LoanSummary | null>(null);

  const [offers, setOffers] =
    useState<Offer[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [editing, setEditing] =
    useState(false);

  const [name, setName] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  /* =======================================================
     LOAD PROFILE
     ======================================================= */

  const loadProfile = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response =
          await API.get<ProfileResponse>(
            "/users/me/profile",
          );

        if (!response.data?.success) {
          throw new Error(
            response.data?.message ||
              "Failed to load profile",
          );
        }

        const data = response.data.data;

        if (!data?.profile) {
          throw new Error(
            "Profile data was not returned",
          );
        }

        setProfile(data.profile);
        setSummary(data.loanSummary || null);
        setOffers(data.offers || []);
        setName(data.profile.name || "");
      } catch (error: unknown) {
        console.error(
          "Failed to load profile:",
          error,
        );

        const message =
          getErrorMessage(
            error,
            "Failed to load profile",
          );

        setError(message);

        if (showRefresh) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  /* =======================================================
     INITIAL LOAD
     ======================================================= */

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  /* =======================================================
     SAVE PROFILE
     ======================================================= */

  const saveProfile = async () => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Name cannot be empty");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response =
        await API.patch<{
          success?: boolean;
          message?: string;
          data?: User;
        }>("/users/me", {
          name: trimmedName,
        });

      if (!response.data?.success) {
        throw new Error(
          response.data?.message ||
            "Failed to update profile",
        );
      }

      if (response.data.data) {
        setProfile(response.data.data);
        setName(
          response.data.data.name || "",
        );
      }

      setEditing(false);

      toast.success(
        "Profile updated successfully",
      );
    } catch (error: unknown) {
      console.error(
        "Failed to update profile:",
        error,
      );

      const message =
        getErrorMessage(
          error,
          "Failed to update profile",
        );

      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     OPEN OFFER
     ======================================================= */

  const openOffer = (offerId?: string) => {
    if (!offerId) {
      toast.error(
        "Loan offer ID is missing.",
      );
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
            <AlertCircle
              size={21}
              className="mt-0.5 shrink-0"
            />

            <div>
              <p className="font-semibold">
                Unable to load profile
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadProfile(true)
          }
          disabled={refreshing}
          className="mt-4 flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          Try Again
        </button>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const activeApplication =
    summary?.activeApplication || null;

  const currentOffer =
    offers.find(
      (offer) =>
        activeApplication?._id &&
        offer.loanApplication?._id ===
          activeApplication._id,
    ) ||
    offers.find(
      (offer) =>
        offer.status === "pending" ||
        offer.status === "offer_created",
    ) ||
    offers[0] ||
    null;

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* ===================================================
          HEADER
          =================================================== */}

      <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            My Profile
          </h1>

          <p className="mt-1 text-gray-500">
            Manage your account and monitor
            your loan activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadProfile(true)
          }
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            size={17}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </div>

      {/* ===================================================
          ERROR
          =================================================== */}

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-600">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0"
          />

          <p className="text-sm">
            {error}
          </p>
        </div>
      )}

      {/* ===================================================
          PROFILE CARD
          =================================================== */}

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
                {profile.name
                  ?.charAt(0)
                  ?.toUpperCase() || "U"}
              </div>
            )}

            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {profile.name}
              </h2>

              <p className="text-gray-500">
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
                  {formatStatus(
                    profile.accountStatus,
                  )}
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
            onClick={() =>
              setEditing((current) => !current)
            }
            className="rounded-lg border border-gray-300 px-5 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            {editing
              ? "Cancel"
              : "Edit Profile"}
          </button>
        </div>

        {editing && (
          <div className="mt-6 border-t pt-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Full Name
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-black md:max-w-md"
              placeholder="Your name"
            />

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() =>
                  void saveProfile()
                }
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-black px-5 py-3 font-medium text-white disabled:opacity-50"
              >
                {saving && (
                  <RefreshCw
                    size={16}
                    className="animate-spin"
                  />
                )}

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setName(
                    profile.name || "",
                  );
                  setError("");
                }}
                disabled={saving}
                className="rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================
          ACCOUNT INFORMATION
          =================================================== */}

      <div className="mb-6 grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold">
            Account Information
          </h3>

          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">
                Email
              </p>

              <p className="font-medium">
                {profile.email ||
                  "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Phone
              </p>

              <p className="font-medium">
                {profile.phone ||
                  "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                KYC Status
              </p>

              <p className="font-medium">
                {formatStatus(
                  profile.kycStatus,
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Borrower Status
              </p>

              <p className="font-medium">
                {formatStatus(
                  profile.borrowerStatus,
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Member Since
              </p>

              <p className="font-medium">
                {formatDate(
                  profile.createdAt,
                )}
              </p>
            </div>
          </div>
        </div>

        {/* REFERRAL */}

        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-lg font-semibold">
            Referral
          </h3>

          <div className="mb-5 rounded-xl bg-gray-50 p-5">
            <p className="text-sm text-gray-500">
              Referral Code
            </p>

            <p className="mt-1 break-all text-2xl font-bold tracking-wider">
              {profile.referralCode ||
                "N/A"}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Coins
            </p>

            <p className="mt-1 text-2xl font-bold">
              {profile.coins || 0}
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================
          LOAN SUMMARY
          =================================================== */}

      <div className="mb-6">
        <h2 className="mb-4 text-xl font-bold">
          Loan Overview
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Applications
            </p>

            <p className="mt-2 text-3xl font-bold">
              {summary?.totalApplications ||
                0}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Offers
            </p>

            <p className="mt-2 text-3xl font-bold">
              {summary?.totalOffers || 0}
            </p>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">
              Pending Offers
            </p>

            <p className="mt-2 text-3xl font-bold">
              {summary?.pendingOffers ||
                0}
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================
          APPLICATION STATUS
          =================================================== */}

      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">
              Application Status
            </h2>

            {activeApplication && (
              <p className="mt-1 text-sm text-gray-500">
                Application #
                {
                  activeApplication.applicationNumber
                }
              </p>
            )}
          </div>

          {activeApplication && (
            <span
              className={`inline-flex w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                activeApplication.status,
              )}`}
            >
              {formatStatus(
                activeApplication.status,
              )}
            </span>
          )}
        </div>

        {!activeApplication ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <FileText
              size={36}
              className="mx-auto text-gray-400"
            />

            <h3 className="mt-3 text-lg font-semibold text-gray-800">
              No Active Loan
            </h3>

            <p className="mt-2 text-gray-500">
              You currently have no active
              loan application.
            </p>
          </div>
        ) : (
          <>
            {/* STATUS TRACKER */}

            <div className="mb-8">
              {APPLICATION_STATUSES.map(
                (
                  status,
                  index,
                  statuses,
                ) => {
                  const currentStatus =
                    activeApplication.status;

                  const currentIndex =
                    statuses.findIndex(
                      (statusOption) =>
                        statusOption ===
                        currentStatus,
                    );

                  const effectiveCurrentIndex =
                    currentIndex >= 0
                      ? currentIndex
                      : 0;

                  const completed =
                    index <=
                    effectiveCurrentIndex;

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
                          <CheckCircle2
                            size={18}
                          />
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
                        {formatStatus(
                          status,
                        )}
                      </span>
                    </div>
                  );
                },
              )}
            </div>

            {/* APPLICATION DETAILS */}

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">
                  Loan Product
                </p>

                <p className="mt-1 font-semibold">
                  {activeApplication
                    .loanProduct?.name ||
                    "N/A"}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Amount Requested
                </p>

                <p className="mt-1 font-semibold">
                  {formatMoney(
                    activeApplication.amountRequested,
                    activeApplication
                      .loanProduct
                      ?.currency ||
                      "NGN",
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Duration
                </p>

                <p className="mt-1 font-semibold">
                  {activeApplication
                    .durationDays || 0}{" "}
                  days
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">
                  Offer Status
                </p>

                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${getStatusClass(
                    summary?.offerStatus,
                  )}`}
                >
                  {formatStatus(
                    summary?.offerStatus,
                  )}
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===================================================
          LOAN OFFER
          =================================================== */}

      {currentOffer ? (
        <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Loan Offer
              </h2>

              <p className="mt-1 text-gray-500">
                Your loan offer is available
                for review.
              </p>
            </div>

            <span
              className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusClass(
                currentOffer.status,
              )}`}
            >
              {formatStatus(
                currentOffer.status,
              )}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Approved Amount
              </p>

              <p className="mt-1 text-xl font-bold">
                {formatMoney(
                  currentOffer.approvedAmount,
                  currentOffer
                    .loanProduct
                    ?.currency ||
                    "NGN",
                )}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Interest
              </p>

              <p className="mt-1 text-xl font-bold">
                {currentOffer.interestRate ||
                  0}
                %
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Total Repayment
              </p>

              <p className="mt-1 text-xl font-bold">
                {formatMoney(
                  currentOffer.totalRepayment,
                  currentOffer
                    .loanProduct
                    ?.currency ||
                    "NGN",
                )}
              </p>
            </div>

            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-sm text-gray-500">
                Installment
              </p>

              <p className="mt-1 text-xl font-bold">
                {formatMoney(
                  currentOffer.installmentAmount,
                  currentOffer
                    .loanProduct
                    ?.currency ||
                    "NGN",
                )}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {formatStatus(
                  currentOffer.repaymentFrequency,
                )}{" "}
                ×{" "}
                {currentOffer
                  .numberOfInstallments ||
                  0}
              </p>
            </div>
          </div>

          {currentOffer.expiresAt && (
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-yellow-50 p-4">
              <Clock3
                size={19}
                className="mt-0.5 text-yellow-600"
              />

              <div>
                <p className="text-sm text-yellow-700">
                  Offer expires
                </p>

                <p className="mt-1 font-semibold text-yellow-900">
                  {formatDate(
                    currentOffer.expiresAt,
                  )}
                </p>
              </div>
            </div>
          )}

          {/* OFFER ACTION */}

          <div className="mt-6">
            <button
              type="button"
              onClick={() =>
                openOffer(
                  currentOffer._id,
                )
              }
              className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
            >
              View & Accept Offer
            </button>
          </div>

          {/* ACCEPTED */}

          {currentOffer.status ===
            "accepted" && (
            <div className="mt-6 rounded-xl bg-green-50 p-4 text-green-700">
              <p className="font-semibold">
                Loan offer accepted
              </p>

              <p className="mt-1 text-sm">
                Your application has moved to
                the accepted stage.
              </p>
            </div>
          )}

          {/* REJECTED */}

          {currentOffer.status ===
            "rejected" && (
            <div className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">
              <p className="font-semibold">
                Loan offer rejected
              </p>
            </div>
          )}

          {/* EXPIRED */}

          {currentOffer.status ===
            "expired" && (
            <div className="mt-6 rounded-xl bg-gray-50 p-4 text-gray-700">
              <p className="font-semibold">
                Loan offer expired
              </p>

              <p className="mt-1 text-sm">
                This offer is no longer
                available.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Loan Offer
              </h2>

              <p className="mt-1 text-gray-500">
                No loan offer is currently
                available.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/loans")
              }
              className="w-fit rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700"
            >
              Apply for a Loan
            </button>
          </div>
        </div>
      )}

      {/* ===================================================
          APPLICATION / OFFER HISTORY
          =================================================== */}

      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-xl font-bold">
          Application History
        </h2>

        {offers.length === 0 &&
        !activeApplication ? (
          <p className="text-gray-500">
            No loan activity yet.
          </p>
        ) : offers.length === 0 ? (
          <p className="text-gray-500">
            No loan offers yet.
          </p>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <div
                key={offer._id}
                className="flex flex-col gap-3 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-semibold">
                    {offer.loanProduct
                      ?.name ||
                      "Loan Offer"}
                  </p>

                  <p className="text-sm text-gray-500">
                    {formatMoney(
                      offer.approvedAmount,
                      offer.loanProduct
                        ?.currency ||
                        "NGN",
                    )}
                  </p>

                  {offer.loanApplication
                    ?.applicationNumber && (
                    <p className="mt-1 text-xs text-gray-400">
                      Application #
                      {
                        offer
                          .loanApplication
                          .applicationNumber
                      }
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClass(
                      offer.status,
                    )}`}
                  >
                    {formatStatus(
                      offer.status,
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      openOffer(
                        offer._id,
                      )
                    }
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
    </div>
  );
};

export default Profile;

