import { useEffect, useMemo, useState } from "react";
import {
  Eye,
  RefreshCw,
  X,
  Loader2,
  AlertCircle,
  Plus,
  Calculator,
} from "lucide-react";
import { toast } from "react-toastify";

import API from "../services/Api";

/* =========================================================
   TYPES
========================================================= */

interface LoanOfferUser {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

interface LoanProduct {
  _id: string;
  name?: string;
  title?: string;
  code?: string;
  currency?: string;

  interestRate?: number;
  interestType?: string;

  processingFee?: number;
  processingFeeType?: string;

  serviceFee?: number;

  repaymentFrequency?: string;

  minAmount?: number;
  maxAmount?: number;

  minDurationDays?: number;
  maxDurationDays?: number;
}

interface LoanApplication {
  _id: string;

  applicationNumber?: string;
  status?: string;

  amountRequested?: number;
  amount?: number;

  durationDays?: number;

  purpose?: string;

  createdAt?: string;

  user?: LoanOfferUser | null;

  loanProduct?: LoanProduct | null;

  creditAssessment?: {
    _id: string;
    [key: string]: any;
  } | null;
}

type LoanOfferStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

interface LoanOffer {
  _id: string;

  user?: LoanOfferUser | null;

  loanApplication?: LoanApplication | null;

  loanProduct?: LoanProduct | null;

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

  status: LoanOfferStatus;

  expiresAt?: string;

  acceptedAt?: string | null;
  rejectedAt?: string | null;

  createdAt?: string;
}

interface OffersResponse {
  success: boolean;
  count?: number;
  data?: LoanOffer[];
  message?: string;
}

interface ApplicationsResponse {
  success: boolean;
  count?: number;
  data?: LoanApplication[];
  message?: string;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function AdminOffers() {
  /* =======================================================
     OFFERS STATE
  ======================================================= */

  const [offers, setOffers] = useState<LoanOffer[]>([]);

  const [loading, setLoading] = useState(true);

  const [selectedOffer, setSelectedOffer] = useState<LoanOffer | null>(null);

  /* =======================================================
     CREATE OFFER STATE
  ======================================================= */

  const [showCreateModal, setShowCreateModal] = useState(false);

  const [applications, setApplications] = useState<LoanApplication[]>([]);

  const [loadingApplications, setLoadingApplications] = useState(false);

  const [creatingOffer, setCreatingOffer] = useState(false);

  const [selectedApplicationId, setSelectedApplicationId] = useState("");

  const [approvedAmount, setApprovedAmount] = useState("");

  /* =========================================================
     LOAD OFFERS
  ========================================================= */

  const loadOffers = async () => {
    try {
      setLoading(true);

      console.log("ADMIN OFFERS: Loading /loan-offers/admin...");

      const response = await API.get<OffersResponse>("/loan-offers/admin");

      console.log("ADMIN OFFERS: API response:", response.data);

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Failed to load loan offers");
      }

      const data = Array.isArray(response.data.data) ? response.data.data : [];

      console.log(`ADMIN OFFERS: Received ${data.length} offers`);

      setOffers(data);
    } catch (error: any) {
      console.error("ADMIN OFFERS: Failed to load:", error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load loan offers";

      toast.error(message);

      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     LOAD APPROVED APPLICATIONS
  ========================================================= */

  const loadApprovedApplications = async () => {
    try {
      setLoadingApplications(true);

      console.log("ADMIN OFFERS: Loading approved applications...");

      const response = await API.get<ApplicationsResponse>(
        "/loan-offers/admin/approved-applications",
      );

      console.log("ADMIN OFFERS: Approved applications:", response.data);

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Failed to load approved applications",
        );
      }

      const data = Array.isArray(response.data.data) ? response.data.data : [];

      setApplications(data);
    } catch (error: any) {
      console.error("ADMIN OFFERS: Failed to load applications:", error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load approved applications";

      toast.error(message);

      setApplications([]);
    } finally {
      setLoadingApplications(false);
    }
  };

  /* =========================================================
     INITIAL LOAD
  ========================================================= */

  useEffect(() => {
    loadOffers();
  }, []);

  /* =========================================================
     FORMAT MONEY
  ========================================================= */

  const formatMoney = (amount?: number, currency = "NGN") => {
    const safeAmount =
      typeof amount === "number" && Number.isFinite(amount) ? amount : 0;

    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(safeAmount);
    } catch {
      return `₦${safeAmount.toLocaleString()}`;
    }
  };

  /* =========================================================
     FORMAT DATE
  ========================================================= */

  const formatDate = (date?: string) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleDateString("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  /* =========================================================
     FORMAT DATE TIME
  ========================================================= */

  const formatDateTime = (date?: string) => {
    if (!date) return "-";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "-";
    }

    return parsedDate.toLocaleString("en-NG");
  };

  /* =========================================================
     FORMAT STATUS
  ========================================================= */

  const formatStatus = (status?: string) => {
    if (!status) return "-";

    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  /* =========================================================
     STATUS CLASS
  ========================================================= */

  const getStatusClass = (status?: LoanOfferStatus) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-700";

      case "rejected":
        return "bg-red-100 text-red-700";

      case "expired":
      case "cancelled":
        return "bg-gray-100 text-gray-700";

      case "pending":
      default:
        return "bg-yellow-100 text-yellow-700";
    }
  };

  /* =========================================================
     SELECTED APPLICATION
  ========================================================= */

  const selectedApplication = useMemo(() => {
    if (!selectedApplicationId) {
      return null;
    }

    return (
      applications.find(
        (application) => application._id === selectedApplicationId,
      ) || null
    );
  }, [applications, selectedApplicationId]);

  /* =========================================================
     REQUESTED AMOUNT
  ========================================================= */

  const requestedAmount =
    Number(
      selectedApplication?.amountRequested ?? selectedApplication?.amount ?? 0,
    ) || 0;

  /* =========================================================
     APPROVED AMOUNT NUMBER
  ========================================================= */

  const approvedAmountNumber = Number(approvedAmount) || 0;

  /* =========================================================
     CREATE OFFER PREVIEW
     
     IMPORTANT:
     This is ONLY a frontend preview.
     The backend remains the source of truth.
  ========================================================= */

  const offerPreview = useMemo(() => {
    if (!selectedApplication) {
      return null;
    }

    const product = selectedApplication.loanProduct;

    if (!product) {
      return null;
    }

    const amount = approvedAmountNumber;

    const durationDays = Number(selectedApplication.durationDays) || 0;

    const interestRate = Number(product.interestRate) || 0;

    if (amount <= 0 || durationDays <= 0) {
      return null;
    }

    /* -----------------------------------------------
       INTEREST
    ------------------------------------------------ */

    const totalInterest = amount * (interestRate / 100) * (durationDays / 30);

    /* -----------------------------------------------
       PROCESSING FEE
    ------------------------------------------------ */

    const processingFee =
      product.processingFeeType === "percentage"
        ? amount * ((Number(product.processingFee) || 0) / 100)
        : Number(product.processingFee) || 0;

    /* -----------------------------------------------
       SERVICE FEE
    ------------------------------------------------ */

    const serviceFee = Number(product.serviceFee) || 0;

    /* -----------------------------------------------
       TOTAL FEES
    ------------------------------------------------ */

    const totalFees = processingFee + serviceFee;

    /* -----------------------------------------------
       TOTAL REPAYMENT
    ------------------------------------------------ */

    const totalRepayment = amount + totalInterest + totalFees;

    /* -----------------------------------------------
       INSTALLMENTS
    ------------------------------------------------ */

    let numberOfInstallments = 1;

    switch (product.repaymentFrequency) {
      case "daily":
        numberOfInstallments = durationDays;
        break;

      case "weekly":
        numberOfInstallments = Math.ceil(durationDays / 7);
        break;

      case "biweekly":
        numberOfInstallments = Math.ceil(durationDays / 14);
        break;

      case "monthly":
      default:
        numberOfInstallments = Math.ceil(durationDays / 30);
        break;
    }

    numberOfInstallments = Math.max(numberOfInstallments, 1);

    /* -----------------------------------------------
       INSTALLMENT AMOUNT
    ------------------------------------------------ */

    const installmentAmount = totalRepayment / numberOfInstallments;

    return {
      approvedAmount: amount,
      interestRate,
      totalInterest,
      processingFee,
      serviceFee,
      totalFees,
      totalRepayment,
      numberOfInstallments,
      installmentAmount,
      durationDays,
      repaymentFrequency: product.repaymentFrequency || "monthly",
      currency: product.currency || "NGN",
    };
  }, [selectedApplication, approvedAmountNumber]);

  /* =========================================================
     OPEN CREATE MODAL
  ========================================================= */

  const openCreateModal = async () => {
    setShowCreateModal(true);

    setSelectedApplicationId("");

    setApprovedAmount("");

    await loadApprovedApplications();
  };

  /* =========================================================
     CLOSE CREATE MODAL
  ========================================================= */

  const closeCreateModal = () => {
    if (creatingOffer) {
      return;
    }

    setShowCreateModal(false);

    setSelectedApplicationId("");

    setApprovedAmount("");
  };

  /* =========================================================
     APPLICATION SELECTED
  ========================================================= */

  const handleApplicationChange = (applicationId: string) => {
    setSelectedApplicationId(applicationId);

    const application = applications.find((item) => item._id === applicationId);

    if (!application) {
      setApprovedAmount("");
      return;
    }

    const requested = application.amountRequested ?? application.amount ?? "";

    /*
      Automatically populate the requested amount.

      Admin can reduce it before creating
      the offer.
    */

    setApprovedAmount(requested ? String(requested) : "");
  };

  /* =========================================================
     CREATE OFFER
  ========================================================= */

  const createOffer = async () => {
    if (!selectedApplication) {
      toast.error("Please select an application.");
      return;
    }

    if (!offerPreview) {
      toast.error("Unable to calculate the loan offer.");
      return;
    }

    if (approvedAmountNumber <= 0 || approvedAmountNumber > requestedAmount) {
      toast.error("Invalid approved amount.");
      return;
    }

    try {
      setCreatingOffer(true);

      let application = selectedApplication;

      /* =====================================================
       STEP 1: RUN CREDIT ASSESSMENT IF NEEDED
    ===================================================== */

      let creditAssessmentId = application.creditAssessment?._id || null;

      if (!creditAssessmentId) {
        console.log(
          "ADMIN OFFERS: Credit assessment missing. Running assessment...",
        );

        const assessmentResponse = await API.post(
          `/credit/assess/${application._id}`,
        );

        console.log(
          "ADMIN OFFERS: Assessment response:",
          assessmentResponse.data,
        );

        if (!assessmentResponse.data?.success) {
          throw new Error(
            assessmentResponse.data?.message || "Credit assessment failed",
          );
        }

        const assessmentData = assessmentResponse.data?.data || {};

        /* -----------------------------------------------
         Get assessment ID
      ------------------------------------------------ */

        const assessment =
          assessmentData.assessment || assessmentData.creditAssessment || null;

        creditAssessmentId =
          assessment?._id || assessmentData.assessmentId || null;

        if (!creditAssessmentId) {
          throw new Error(
            "Credit assessment completed but no assessment ID was returned.",
          );
        }

        console.log("ADMIN OFFERS: Credit assessment ID:", creditAssessmentId);

        /* -----------------------------------------------
         Update local application
      ------------------------------------------------ */

        application = {
          ...application,
          creditAssessment: {
            _id: creditAssessmentId,
          },
        };
      }

      /* =====================================================
       STEP 2: CREATE OFFER
    ===================================================== */

      console.log("ADMIN OFFERS: Creating offer...", {
        applicationId: application._id,
        creditAssessmentId,
      });

      const offerData = {
        approvedAmount: offerPreview.approvedAmount,
      };

      const offerResponse = await API.post(
        `/loan-offers/admin/applications/${application._id}`,
        offerData,
      );

      console.log("ADMIN OFFERS: Offer response:", offerResponse.data);

      if (!offerResponse.data?.success) {
        throw new Error(
          offerResponse.data?.message || "Failed to create loan offer",
        );
      }

      /* =====================================================
       STEP 3: SUCCESS
    ===================================================== */

      toast.success("Loan offer created successfully.");

      setShowCreateModal(false);

      setSelectedApplicationId("");

      setApprovedAmount("");

      await loadOffers();
    } catch (error: any) {
      console.error("ADMIN OFFERS: Create offer failed:", error);

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create loan offer";

      toast.error(message);
    } finally {
      setCreatingOffer(false);
    }
  };

  /* =========================================================
     COUNTS
  ========================================================= */

  const totalOffers = offers.length;

  const pendingOffers = offers.filter(
    (offer) => offer.status === "pending",
  ).length;

  const acceptedOffers = offers.filter(
    (offer) => offer.status === "accepted",
  ).length;

  const rejectedOffers = offers.filter(
    (offer) => offer.status === "rejected",
  ).length;

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="space-y-6">
      {/* =====================================================
          HEADER
      ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Offers</h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage loan offers issued to customers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* CREATE OFFER */}

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            <Plus size={17} />
            Create Offer
          </button>

          {/* REFRESH */}

          <button
            type="button"
            onClick={loadOffers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total Offers</p>

          <p className="mt-2 text-2xl font-bold text-gray-900">{totalOffers}</p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Pending</p>

          <p className="mt-2 text-2xl font-bold text-yellow-600">
            {pendingOffers}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Accepted</p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {acceptedOffers}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Rejected</p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {rejectedOffers}
          </p>
        </div>
      </div>

      {/* =====================================================
          TABLE
      ===================================================== */}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Customer
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Product
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Approved Amount
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Interest
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Repayment
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Duration
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Status
                </th>

                <th className="px-5 py-4 text-left font-semibold text-gray-600">
                  Expires
                </th>

                <th className="px-5 py-4 text-right font-semibold text-gray-600">
                  Action
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {/* LOADING */}

              {loading && (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2
                        size={30}
                        className="mb-3 animate-spin text-orange-500"
                      />

                      <p className="text-sm text-gray-500">
                        Loading loan offers...
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* EMPTY */}

              {!loading && offers.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-14 text-center">
                    <AlertCircle
                      size={40}
                      className="mx-auto mb-3 text-gray-300"
                    />

                    <p className="font-semibold text-gray-700">
                      No loan offers found
                    </p>

                    <p className="mt-1 text-sm text-gray-400">
                      No offers have been created yet.
                    </p>

                    <button
                      type="button"
                      onClick={openCreateModal}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                    >
                      <Plus size={16} />
                      Create Offer
                    </button>
                  </td>
                </tr>
              )}

              {/* OFFERS */}

              {!loading &&
                offers.length > 0 &&
                offers.map((offer) => {
                  const currency = offer.loanProduct?.currency || "NGN";

                  return (
                    <tr key={offer._id} className="transition hover:bg-gray-50">
                      {/* CUSTOMER */}

                      <td className="px-5 py-4">
                        <p className="font-semibold text-gray-900">
                          {offer.user?.name || "Unknown User"}
                        </p>

                        <p className="text-xs text-gray-500">
                          {offer.user?.email || offer.user?.phone || "-"}
                        </p>
                      </td>

                      {/* PRODUCT */}

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {offer.loanProduct?.name ||
                            offer.loanProduct?.title ||
                            "Loan"}
                        </p>

                        {offer.loanProduct?.code && (
                          <p className="text-xs text-gray-400">
                            {offer.loanProduct.code}
                          </p>
                        )}
                      </td>

                      {/* AMOUNT */}

                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {formatMoney(offer.approvedAmount, currency)}
                      </td>

                      {/* INTEREST */}

                      <td className="px-5 py-4">
                        <p className="font-medium">
                          {offer.interestRate ?? 0}%
                        </p>

                        <p className="text-xs capitalize text-gray-400">
                          {formatStatus(offer.interestType)}
                        </p>
                      </td>

                      {/* REPAYMENT */}

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {formatMoney(offer.totalRepayment, currency)}
                        </p>

                        <p className="text-xs text-gray-400">
                          {offer.numberOfInstallments ?? 0} installments
                        </p>
                      </td>

                      {/* DURATION */}

                      <td className="px-5 py-4">
                        {offer.durationDays ?? 0} days
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass(
                            offer.status,
                          )}`}
                        >
                          {formatStatus(offer.status)}
                        </span>
                      </td>

                      {/* EXPIRES */}

                      <td className="px-5 py-4 text-gray-600">
                        {formatDate(offer.expiresAt)}
                      </td>

                      {/* ACTION */}

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOffer(offer)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          CREATE OFFER MODAL
      ===================================================== */}

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeCreateModal}
        >
          <div
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white p-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Create Loan Offer
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select an approved application and set the approved amount.
                </p>
              </div>

              <button
                type="button"
                disabled={creatingOffer}
                onClick={closeCreateModal}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* BODY */}

            <div className="space-y-6 p-6">
              {/* APPLICATION */}

              <section>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Approved Application
                </label>

                {loadingApplications ? (
                  <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    <Loader2
                      size={18}
                      className="animate-spin text-orange-500"
                    />
                    Loading approved applications...
                  </div>
                ) : applications.length === 0 ? (
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle
                        size={20}
                        className="mt-0.5 shrink-0 text-yellow-600"
                      />

                      <div>
                        <p className="text-sm font-semibold text-yellow-800">
                          No approved applications
                        </p>

                        <p className="mt-1 text-xs text-yellow-700">
                          There are currently no approved applications available
                          for creating an offer.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <select
                    value={selectedApplicationId}
                    onChange={(event) =>
                      handleApplicationChange(event.target.value)
                    }
                    disabled={creatingOffer}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
                  >
                    <option value="">Select an approved application</option>

                    {applications.map((application) => {
                      const requested =
                        application.amountRequested ?? application.amount ?? 0;

                      const customerName =
                        application.user?.name || "Unknown Customer";

                      const applicationNumber =
                        application.applicationNumber || application._id;

                      const currency =
                        application.loanProduct?.currency || "NGN";

                      return (
                        <option key={application._id} value={application._id}>
                          {customerName} — {applicationNumber} —{" "}
                          {formatMoney(requested, currency)}
                        </option>
                      );
                    })}
                  </select>
                )}
              </section>

              {/* APPLICATION DETAILS */}

              {selectedApplication && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Application Details
                  </h3>

                  <div className="mt-3 rounded-2xl bg-gray-50 p-5">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {/* CUSTOMER */}

                      <div>
                        <p className="text-xs text-gray-400">Customer</p>

                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {selectedApplication.user?.name || "Unknown User"}
                        </p>
                      </div>

                      {/* APPLICATION */}

                      <div>
                        <p className="text-xs text-gray-400">Application</p>

                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {selectedApplication.applicationNumber ||
                            selectedApplication._id}
                        </p>
                      </div>

                      {/* REQUESTED */}

                      <div>
                        <p className="text-xs text-gray-400">
                          Requested Amount
                        </p>

                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {formatMoney(
                            requestedAmount,
                            selectedApplication.loanProduct?.currency || "NGN",
                          )}
                        </p>
                      </div>

                      {/* PRODUCT */}

                      <div>
                        <p className="text-xs text-gray-400">Product</p>

                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {selectedApplication.loanProduct?.name ||
                            selectedApplication.loanProduct?.title ||
                            "Loan"}
                        </p>
                      </div>

                      {/* INTEREST */}

                      <div>
                        <p className="text-xs text-gray-400">Interest Rate</p>

                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {selectedApplication.loanProduct?.interestRate ?? 0}%
                        </p>
                      </div>

                      {/* DURATION */}

                      <div>
                        <p className="text-xs text-gray-400">Duration</p>

                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {selectedApplication.durationDays ?? 0} days
                        </p>
                      </div>

                      {/* FREQUENCY */}

                      <div>
                        <p className="text-xs text-gray-400">
                          Repayment Frequency
                        </p>

                        <p className="mt-1 text-sm font-semibold capitalize text-gray-900">
                          {formatStatus(
                            selectedApplication.loanProduct?.repaymentFrequency,
                          )}
                        </p>
                      </div>

                      {/* STATUS */}

                      <div>
                        <p className="text-xs text-gray-400">
                          Application Status
                        </p>

                        <p className="mt-1">
                          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                            {formatStatus(selectedApplication.status)}
                          </span>
                        </p>
                      </div>

                      {/* PURPOSE */}

                      <div className="col-span-2 sm:col-span-3">
                        <p className="text-xs text-gray-400">Purpose</p>

                        <p className="mt-1 text-sm text-gray-700">
                          {selectedApplication.purpose || "No purpose provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* APPROVED AMOUNT */}

              {selectedApplication && (
                <section>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Approved Amount
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={requestedAmount}
                      step="0.01"
                      value={approvedAmount}
                      onChange={(event) =>
                        setApprovedAmount(event.target.value)
                      }
                      disabled={creatingOffer}
                      placeholder="Enter approved amount"
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-20 text-lg font-semibold text-gray-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">
                      {selectedApplication.loanProduct?.currency || "NGN"}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-400">
                      Requested:{" "}
                      {formatMoney(
                        requestedAmount,
                        selectedApplication.loanProduct?.currency || "NGN",
                      )}
                    </span>

                    <span className="text-gray-400">Maximum allowed</span>
                  </div>

                  {approvedAmountNumber > requestedAmount &&
                    requestedAmount > 0 && (
                      <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                        Approved amount cannot exceed the requested amount.
                      </div>
                    )}
                </section>
              )}

              {/* OFFER PREVIEW */}

              {offerPreview && (
                <section>
                  <div className="flex items-center gap-2">
                    <Calculator size={18} className="text-orange-500" />

                    <h3 className="text-sm font-semibold text-gray-900">
                      Offer Preview
                    </h3>
                  </div>

                  <p className="mt-1 text-xs text-gray-400">
                    These figures are calculated for preview. The backend will
                    perform the final calculation when the offer is created.
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {/* APPROVED */}

                    <div className="rounded-xl bg-orange-50 p-4">
                      <p className="text-xs text-gray-500">Approved Amount</p>

                      <p className="mt-1 font-bold text-orange-600">
                        {formatMoney(
                          offerPreview.approvedAmount,
                          offerPreview.currency,
                        )}
                      </p>
                    </div>

                    {/* INTEREST RATE */}

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-400">Interest Rate</p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {offerPreview.interestRate}%
                      </p>
                    </div>

                    {/* TOTAL INTEREST */}

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-400">Total Interest</p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {formatMoney(
                          offerPreview.totalInterest,
                          offerPreview.currency,
                        )}
                      </p>
                    </div>

                    {/* PROCESSING FEE */}

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-400">Processing Fee</p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {formatMoney(
                          offerPreview.processingFee,
                          offerPreview.currency,
                        )}
                      </p>
                    </div>

                    {/* SERVICE FEE */}

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-400">Service Fee</p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {formatMoney(
                          offerPreview.serviceFee,
                          offerPreview.currency,
                        )}
                      </p>
                    </div>

                    {/* TOTAL FEES */}

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-400">Total Fees</p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {formatMoney(
                          offerPreview.totalFees,
                          offerPreview.currency,
                        )}
                      </p>
                    </div>

                    {/* TOTAL REPAYMENT */}

                    <div className="col-span-2 rounded-xl bg-green-50 p-4 sm:col-span-3">
                      <p className="text-xs text-green-700">Total Repayment</p>

                      <p className="mt-1 text-2xl font-bold text-green-700">
                        {formatMoney(
                          offerPreview.totalRepayment,
                          offerPreview.currency,
                        )}
                      </p>
                    </div>

                    {/* INSTALLMENT */}

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-400">
                        Installment Amount
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {formatMoney(
                          offerPreview.installmentAmount,
                          offerPreview.currency,
                        )}
                      </p>
                    </div>

                    {/* INSTALLMENTS */}

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-400">
                        Number of Installments
                      </p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {offerPreview.numberOfInstallments}
                      </p>
                    </div>

                    {/* FREQUENCY */}

                    <div className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-400">Frequency</p>

                      <p className="mt-1 font-semibold capitalize text-gray-900">
                        {formatStatus(offerPreview.repaymentFrequency)}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* FOOTER */}

            <div className="sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white p-6">
              <button
                type="button"
                disabled={creatingOffer}
                onClick={closeCreateModal}
                className="flex-1 rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  creatingOffer ||
                  !selectedApplication ||
                  !approvedAmount ||
                  approvedAmountNumber <= 0 ||
                  approvedAmountNumber > requestedAmount
                }
                onClick={createOffer}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {creatingOffer ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={17} />
                    Create Offer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          OFFER DETAILS MODAL
      ===================================================== */}

      {selectedOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedOffer(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-gray-100 p-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Loan Offer Details
                </h2>

                <p className="mt-1 text-xs text-gray-400">
                  ID: {selectedOffer._id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}

            <div className="space-y-6 p-6">
              {/* CUSTOMER */}

              <section>
                <h3 className="text-sm font-semibold text-gray-900">
                  Customer
                </h3>

                <div className="mt-3 rounded-xl bg-gray-50 p-4">
                  <p className="font-semibold text-gray-900">
                    {selectedOffer.user?.name || "Unknown User"}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {selectedOffer.user?.email || "-"}
                  </p>

                  <p className="text-sm text-gray-500">
                    {selectedOffer.user?.phone || "-"}
                  </p>
                </div>
              </section>

              {/* PRODUCT */}

              <section>
                <h3 className="text-sm font-semibold text-gray-900">
                  Loan Product
                </h3>

                <div className="mt-3 rounded-xl bg-gray-50 p-4">
                  <p className="font-semibold text-gray-900">
                    {selectedOffer.loanProduct?.name ||
                      selectedOffer.loanProduct?.title ||
                      "Loan Product"}
                  </p>

                  {selectedOffer.loanProduct?.code && (
                    <p className="mt-1 text-xs text-gray-400">
                      {selectedOffer.loanProduct.code}
                    </p>
                  )}
                </div>
              </section>

              {/* FINANCIAL DETAILS */}

              <section>
                <h3 className="text-sm font-semibold text-gray-900">
                  Financial Details
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {[
                    [
                      "Approved Amount",
                      formatMoney(
                        selectedOffer.approvedAmount,
                        selectedOffer.loanProduct?.currency || "NGN",
                      ),
                    ],

                    ["Interest", `${selectedOffer.interestRate ?? 0}%`],

                    [
                      "Total Interest",
                      formatMoney(
                        selectedOffer.totalInterest,
                        selectedOffer.loanProduct?.currency || "NGN",
                      ),
                    ],

                    [
                      "Processing Fee",
                      formatMoney(
                        selectedOffer.processingFee,
                        selectedOffer.loanProduct?.currency || "NGN",
                      ),
                    ],

                    [
                      "Service Fee",
                      formatMoney(
                        selectedOffer.serviceFee,
                        selectedOffer.loanProduct?.currency || "NGN",
                      ),
                    ],

                    [
                      "Total Fees",
                      formatMoney(
                        selectedOffer.totalFees,
                        selectedOffer.loanProduct?.currency || "NGN",
                      ),
                    ],

                    [
                      "Total Repayment",
                      formatMoney(
                        selectedOffer.totalRepayment,
                        selectedOffer.loanProduct?.currency || "NGN",
                      ),
                    ],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-gray-50 p-4">
                      <p className="text-xs text-gray-400">{label}</p>

                      <p className="mt-1 font-semibold text-gray-900">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>

              {/* REPAYMENT */}

              <section>
                <h3 className="text-sm font-semibold text-gray-900">
                  Repayment
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-400">Installment</p>

                    <p className="mt-1 font-semibold">
                      {formatMoney(
                        selectedOffer.installmentAmount,
                        selectedOffer.loanProduct?.currency || "NGN",
                      )}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-400">
                      Number of Installments
                    </p>

                    <p className="mt-1 font-semibold">
                      {selectedOffer.numberOfInstallments ?? 0}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-400">Frequency</p>

                    <p className="mt-1 font-semibold capitalize">
                      {formatStatus(selectedOffer.repaymentFrequency)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-400">Duration</p>

                    <p className="mt-1 font-semibold">
                      {selectedOffer.durationDays ?? 0} days
                    </p>
                  </div>
                </div>
              </section>

              {/* STATUS */}

              <section>
                <h3 className="text-sm font-semibold text-gray-900">Status</h3>

                <div className="mt-3 flex flex-wrap gap-3">
                  <span
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClass(
                      selectedOffer.status,
                    )}`}
                  >
                    {formatStatus(selectedOffer.status)}
                  </span>

                  <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600">
                    Expires: {formatDateTime(selectedOffer.expiresAt)}
                  </span>
                </div>
              </section>

              {/* APPLICATION */}

              {selectedOffer.loanApplication && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Application
                  </h3>

                  <div className="mt-3 rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-400">Application</p>

                    <p className="mt-1 text-sm font-semibold text-gray-900">
                      {selectedOffer.loanApplication.applicationNumber ||
                        selectedOffer.loanApplication._id}
                    </p>

                    <p className="mt-1 text-xs text-gray-400">
                      ID: {selectedOffer.loanApplication._id}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Status</p>

                        <p className="mt-1 text-sm font-semibold">
                          {formatStatus(selectedOffer.loanApplication.status)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-gray-400">
                          Requested Amount
                        </p>

                        <p className="mt-1 text-sm font-semibold">
                          {formatMoney(
                            selectedOffer.loanApplication.amountRequested ??
                              selectedOffer.loanApplication.amount ??
                              0,
                            selectedOffer.loanProduct?.currency || "NGN",
                          )}
                        </p>
                      </div>
                    </div>

                    {selectedOffer.loanApplication.purpose && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-400">Purpose</p>

                        <p className="mt-1 text-sm text-gray-700">
                          {selectedOffer.loanApplication.purpose}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* DATES */}

              <section>
                <h3 className="text-sm font-semibold text-gray-900">
                  Timeline
                </h3>

                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-400">Created</p>

                    <p className="mt-1 text-sm font-medium">
                      {formatDateTime(selectedOffer.createdAt)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-400">Accepted</p>

                    <p className="mt-1 text-sm font-medium">
                      {formatDateTime(selectedOffer.acceptedAt || undefined)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-400">Rejected</p>

                    <p className="mt-1 text-sm font-medium">
                      {formatDateTime(selectedOffer.rejectedAt || undefined)}
                    </p>
                  </div>

                  <div className="rounded-xl bg-gray-50 p-4">
                    <p className="text-xs text-gray-400">Expires</p>

                    <p className="mt-1 text-sm font-medium">
                      {formatDateTime(selectedOffer.expiresAt)}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* FOOTER */}

            <div className="border-t border-gray-100 p-6">
              <button
                type="button"
                onClick={() => setSelectedOffer(null)}
                className="w-full rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
