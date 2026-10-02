import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle,
  XCircle,
  ExternalLink,
  User,
  FileText,
  Camera,
  MapPin,
  Calendar,
  CreditCard,
} from "lucide-react";
import { toast } from "react-toastify";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import API from "../services/Api";

type KycStatus =
  | "pending"
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected";

type VerificationStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "failed";

type DvaStatus =
  | "pending"
  | "active"
  | "failed";

type RepaymentAccountStatus =
  | "active"
  | "suspended"
  | "closed";

interface KycUser {
  _id?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
}

interface RepaymentAccount {
  _id: string;

  accountNumber?: string | null;
  accountName?: string | null;

  bankName?: string | null;
  bankCode?: string | null;

  currency?: string | null;

  balance?: number;
  totalCredited?: number;
  totalRepaid?: number;

  status?: RepaymentAccountStatus;

  provider?: string | null;

  providerCustomerCode?: string | null;
  providerAccountId?: string | null;

  dvaStatus?: DvaStatus;

  createdAt?: string;
  updatedAt?: string;
}

interface Kyc {
  _id: string;

  user?: KycUser;

  firstName: string;
  lastName: string;

  dateOfBirth: string;
  gender?: string;

  address: string;
  city?: string;
  state?: string;
  country?: string;

  idType: string;
  idNumber?: string;

  idDocumentFront?: string | null;

  selfie?: string | null;

  bvnLast4?: string | null;

  bvnVerificationStatus?: VerificationStatus;
  bvnVerificationReference?: string | null;
  bvnVerificationReason?: string | null;
  bvnVerifiedAt?: string | null;

  customerVerificationStatus?: VerificationStatus;
  customerVerificationReference?: string | null;
  customerVerificationReason?: string | null;
  customerVerifiedAt?: string | null;

  verificationProvider?: string | null;

  faceVerificationStatus?: VerificationStatus;
  faceVerificationReference?: string | null;
  faceVerificationReason?: string | null;
  faceVerifiedAt?: string | null;

  faceVerificationProvider?: string | null;

  status: KycStatus;

  rejectionReason?: string | null;

  submittedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;

  repaymentAccount?: RepaymentAccount | null;

  repaymentAccountProvisioningError?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

interface KycResponse {
  success?: boolean;
  message?: string;

  data?: Kyc | null;

  repaymentAccount?: RepaymentAccount | null;

  repaymentAccountProvisioningError?: string | null;
}

const formatDate = (date?: string | null): string => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleString();
};

const formatStatus = (status?: string | null): string => {
  if (!status) return "Not available";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStatusClass = (status?: KycStatus | null): string => {
  switch (status) {
    case "verified":
      return "bg-green-100 text-green-700";

    case "rejected":
      return "bg-red-100 text-red-700";

    case "under_review":
      return "bg-yellow-100 text-yellow-700";

    case "submitted":
      return "bg-blue-100 text-blue-700";

    case "pending":
    default:
      return "bg-gray-100 text-gray-700";
  }
};

const getVerificationStatusClass = (
  status?: VerificationStatus | null
): string => {
  switch (status) {
    case "verified":
      return "bg-green-100 text-green-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "not_started":
    default:
      return "bg-gray-100 text-gray-600";
  }
};

const getDvaStatusClass = (
  status?: DvaStatus | null
): string => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "pending":
    default:
      return "bg-yellow-100 text-yellow-700";
  }
};

const getAccountStatusClass = (
  status?: RepaymentAccountStatus | null
): string => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";

    case "suspended":
      return "bg-yellow-100 text-yellow-700";

    case "closed":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-600";
  }
};

const formatVerificationStatus = (
  status?: string | null
): string => {
  if (!status) return "Not started";

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatCurrency = (
  amount?: number | null,
  currency = "NGN"
): string => {
  const numericAmount = Number(amount ?? 0);

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numericAmount);
};

const AdminKycDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [kyc, setKyc] = useState<Kyc | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const loadKyc = useCallback(async () => {
    if (!id) {
      toast.error("KYC ID is missing");
      return;
    }

    try {
      setLoading(true);

      const response = await API.get<KycResponse>(
        `/kyc/admin/${id}`
      );

      if (!response.data?.data) {
        toast.error(
          response.data?.message || "KYC record not found"
        );

        setKyc(null);
        return;
      }

      setKyc(response.data.data);
    } catch (error) {
      console.error("Failed to load KYC:", error);

      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message ||
            "Failed to load KYC details"
        );
      } else {
        toast.error("Failed to load KYC details");
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadKyc();
  }, [loadKyc]);

  const verifyKyc = async () => {
    if (!id || !kyc) return;

    const confirmed = window.confirm(
      "Are you sure you want to verify this KYC?"
    );

    if (!confirmed) return;

    try {
      setProcessing(true);

      const response = await API.patch<KycResponse>(
        `/kyc/admin/${id}/verify`
      );

      const updatedKyc = response.data?.data;

      if (updatedKyc) {
        setKyc(updatedKyc);
      }

      const repaymentAccount =
        updatedKyc?.repaymentAccount;

      if (
        repaymentAccount?.dvaStatus === "active"
      ) {
        toast.success(
          "KYC verified and repayment account activated"
        );
      } else if (
        repaymentAccount?.dvaStatus === "pending"
      ) {
        toast.success(
          "KYC verified. Repayment account provisioning is in progress."
        );
      } else if (
        response.data?.repaymentAccountProvisioningError
      ) {
        toast.warning(
          "KYC verified, but repayment account provisioning needs attention."
        );
      } else {
        toast.success(
          response.data?.message ||
            "KYC verified successfully"
        );
      }
    } catch (error) {
      console.error("Failed to verify KYC:", error);

      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message ||
            "Failed to verify KYC"
        );
      } else {
        toast.error("Failed to verify KYC");
      }
    } finally {
      setProcessing(false);
    }
  };

  const rejectKyc = async () => {
    if (!id || !kyc) return;

    const reason = window.prompt(
      "Enter the reason for rejecting this KYC:"
    );

    if (!reason?.trim()) {
      return;
    }

    try {
      setProcessing(true);

      const response = await API.patch<KycResponse>(
        `/kyc/admin/${id}/reject`,
        {
          rejectionReason: reason.trim(),
        }
      );

      if (response.data?.data) {
        setKyc(response.data.data);
      }

      toast.success(
        response.data?.message ||
          "KYC rejected successfully"
      );
    } catch (error) {
      console.error("Failed to reject KYC:", error);

      if (axios.isAxiosError(error)) {
        toast.error(
          error.response?.data?.message ||
            "Failed to reject KYC"
        );
      } else {
        toast.error("Failed to reject KYC");
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex items-center gap-3 text-gray-600">
          <RefreshCw className="h-5 w-5 animate-spin" />
          Loading KYC details...
        </div>
      </div>
    );
  }

  if (!kyc) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-gray-400" />

          <h2 className="text-lg font-semibold text-gray-900">
            KYC record not found
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            The requested KYC record could not be found.
          </p>

          <button
            type="button"
            onClick={() => navigate("/admin/kyc")}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to KYC
          </button>
        </div>
      </div>
    );
  }

  const customerName =
    `${kyc.firstName || ""} ${kyc.lastName || ""}`.trim() ||
    `${kyc.user?.firstName || ""} ${
      kyc.user?.lastName || ""
    }`.trim() ||
    kyc.user?.name ||
    "Unknown customer";

  const repaymentAccount = kyc.repaymentAccount;

  const canVerify =
    kyc.status !== "verified" &&
    kyc.status !== "rejected";

  const canReject =
    kyc.status !== "verified" &&
    kyc.status !== "rejected";

  return (
    <div className="space-y-6 pb-28">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/admin/kyc")}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
            title="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-xl font-bold text-gray-900">
              KYC Details
            </h1>

            <p className="text-sm text-gray-500">
              Review customer identity and verification
              information
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadKyc}
          disabled={loading || processing}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              loading ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Customer header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <User className="h-7 w-7 text-gray-500" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {customerName}
              </h2>

              <p className="text-sm text-gray-500">
                {kyc.user?.email || "No email"}
              </p>

              {kyc.user?.phone && (
                <p className="text-sm text-gray-500">
                  {kyc.user.phone}
                </p>
              )}
            </div>
          </div>

          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-sm font-medium ${getStatusClass(
              kyc.status
            )}`}
          >
            {formatStatus(kyc.status)}
          </span>
        </div>
      </div>

      {/* Personal information */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />

            <h2 className="font-semibold text-gray-900">
              Personal Information
            </h2>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="First Name"
            value={kyc.firstName}
          />

          <InfoItem
            label="Last Name"
            value={kyc.lastName}
          />

          <InfoItem
            label="Date of Birth"
            value={formatDate(kyc.dateOfBirth)}
          />

          <InfoItem
            label="Gender"
            value={kyc.gender}
          />

          <InfoItem
            label="Country"
            value={kyc.country}
          />

          <InfoItem
            label="KYC ID"
            value={kyc._id}
          />
        </div>
      </section>

      {/* Verification status */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-gray-500" />

            <h2 className="font-semibold text-gray-900">
              Verification Status
            </h2>
          </div>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-3">
          {/* BVN */}
          <VerificationCard
            title="BVN Verification"
            status={kyc.bvnVerificationStatus}
            reference={kyc.bvnVerificationReference}
            verifiedAt={kyc.bvnVerifiedAt}
          >
            {kyc.bvnLast4 && (
              <p className="mt-2 text-xs text-gray-500">
                BVN ending in{" "}
                <span className="font-medium">
                  {kyc.bvnLast4}
                </span>
              </p>
            )}

            {kyc.bvnVerificationReason && (
              <p className="mt-2 text-xs text-red-600">
                {kyc.bvnVerificationReason}
              </p>
            )}
          </VerificationCard>

          {/* Customer verification */}
          <VerificationCard
            title="Customer Verification"
            status={kyc.customerVerificationStatus}
            reference={
              kyc.customerVerificationReference
            }
            verifiedAt={kyc.customerVerifiedAt}
          >
            {kyc.verificationProvider && (
              <p className="mt-2 text-xs text-gray-500">
                Provider:{" "}
                <span className="font-medium">
                  {kyc.verificationProvider}
                </span>
              </p>
            )}

            {kyc.customerVerificationReason && (
              <p className="mt-2 text-xs text-red-600">
                {kyc.customerVerificationReason}
              </p>
            )}
          </VerificationCard>

          {/* Face */}
          <VerificationCard
            title="Face Verification"
            status={kyc.faceVerificationStatus}
            reference={kyc.faceVerificationReference}
            verifiedAt={kyc.faceVerifiedAt}
          >
            {kyc.faceVerificationProvider && (
              <p className="mt-2 text-xs text-gray-500">
                Provider:{" "}
                <span className="font-medium">
                  {kyc.faceVerificationProvider}
                </span>
              </p>
            )}

            {kyc.faceVerificationReason && (
              <p className="mt-2 text-xs text-red-600">
                {kyc.faceVerificationReason}
              </p>
            )}
          </VerificationCard>
        </div>
      </section>

      {/* Repayment account */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-500" />

              <h2 className="font-semibold text-gray-900">
                Repayment Account
              </h2>
            </div>

            {repaymentAccount && (
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getAccountStatusClass(
                  repaymentAccount.status
                )}`}
              >
                {formatStatus(repaymentAccount.status)}
              </span>
            )}
          </div>
        </div>

        <div className="p-5">
          {!repaymentAccount ? (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex gap-3">
                <CreditCard className="mt-0.5 h-5 w-5 text-yellow-600" />

                <div>
                  <p className="font-medium text-yellow-800">
                    Repayment account not provisioned
                  </p>

                  <p className="mt-1 text-sm text-yellow-700">
                    No repayment account is currently
                    attached to this customer.
                  </p>

                  {kyc.repaymentAccountProvisioningError && (
                    <p className="mt-2 text-sm text-red-600">
                      {
                        kyc.repaymentAccountProvisioningError
                      }
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* DVA status */}
              <div className="mb-5 rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Dedicated Virtual Account
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Paystack repayment account provisioning
                      status
                    </p>
                  </div>

                  <span
                    className={`inline-flex w-fit items-center rounded-full px-3 py-1.5 text-sm font-medium ${getDvaStatusClass(
                      repaymentAccount.dvaStatus
                    )}`}
                  >
                    {formatStatus(
                      repaymentAccount.dvaStatus
                    )}
                  </span>
                </div>

                {repaymentAccount.dvaStatus ===
                  "pending" && (
                  <div className="mt-3 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700">
                    The repayment account has been requested
                    and is waiting for Paystack to assign the
                    dedicated account.
                  </div>
                )}

                {repaymentAccount.dvaStatus ===
                  "failed" && (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    Dedicated virtual account provisioning
                    failed. The account may need to be retried.
                  </div>
                )}

                {repaymentAccount.dvaStatus ===
                  "active" && (
                  <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    Dedicated virtual account is active and
                    ready to receive repayments.
                  </div>
                )}
              </div>

              {/* Account details */}
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <InfoItem
                  label="Account Number"
                  value={
                    repaymentAccount.accountNumber ||
                    "Pending"
                  }
                  highlight={
                    repaymentAccount.dvaStatus === "active"
                  }
                />

                <InfoItem
                  label="Account Name"
                  value={
                    repaymentAccount.accountName ||
                    "Pending"
                  }
                />

                <InfoItem
                  label="Bank"
                  value={
                    repaymentAccount.bankName ||
                    "Pending"
                  }
                />

                <InfoItem
                  label="Bank Code"
                  value={
                    repaymentAccount.bankCode ||
                    "—"
                  }
                />

                <InfoItem
                  label="Currency"
                  value={
                    repaymentAccount.currency ||
                    "NGN"
                  }
                />

                <InfoItem
                  label="Provider"
                  value={
                    repaymentAccount.provider ||
                    "—"
                  }
                />

                <InfoItem
                  label="Balance"
                  value={formatCurrency(
                    repaymentAccount.balance,
                    repaymentAccount.currency ||
                      "NGN"
                  )}
                  highlight
                />

                <InfoItem
                  label="Total Credited"
                  value={formatCurrency(
                    repaymentAccount.totalCredited,
                    repaymentAccount.currency ||
                      "NGN"
                  )}
                />

                <InfoItem
                  label="Total Repaid"
                  value={formatCurrency(
                    repaymentAccount.totalRepaid,
                    repaymentAccount.currency ||
                      "NGN"
                  )}
                />
              </div>

              {/* Provider identifiers */}
              {(repaymentAccount.providerCustomerCode ||
                repaymentAccount.providerAccountId) && (
                <div className="mt-5 rounded-lg bg-gray-50 p-4">
                  <p className="mb-3 text-sm font-medium text-gray-900">
                    Provider Information
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <InfoItem
                      label="Provider Customer Code"
                      value={
                        repaymentAccount.providerCustomerCode ||
                        "—"
                      }
                    />

                    <InfoItem
                      label="Provider Account ID"
                      value={
                        repaymentAccount.providerAccountId ||
                        "—"
                      }
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Address */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-500" />

            <h2 className="font-semibold text-gray-900">
              Address
            </h2>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="Address"
            value={kyc.address}
            fullWidth
          />

          <InfoItem
            label="City"
            value={kyc.city}
          />

          <InfoItem
            label="State"
            value={kyc.state}
          />

          <InfoItem
            label="Country"
            value={kyc.country}
          />
        </div>
      </section>

      {/* Identification */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-500" />

            <h2 className="font-semibold text-gray-900">
              Identification
            </h2>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="ID Type"
            value={formatStatus(kyc.idType)}
          />

          <InfoItem
            label="ID Number"
            value={kyc.idNumber}
          />
        </div>
      </section>

      {/* Documents */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />

            <h2 className="font-semibold text-gray-900">
              Documents
            </h2>
          </div>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-2">
          <DocumentPreview
            title="ID Document"
            icon={<FileText className="h-5 w-5" />}
            url={kyc.idDocumentFront}
          />

          <DocumentPreview
            title="Selfie"
            icon={<Camera className="h-5 w-5" />}
            url={kyc.selfie}
          />
        </div>
      </section>

      {/* Review information */}
      <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />

            <h2 className="font-semibold text-gray-900">
              Review Information
            </h2>
          </div>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            label="Submitted At"
            value={formatDate(kyc.submittedAt)}
          />

          <InfoItem
            label="Verified At"
            value={formatDate(kyc.verifiedAt)}
          />

          <InfoItem
            label="Verified By"
            value={kyc.verifiedBy}
          />

          {kyc.rejectionReason && (
            <InfoItem
              label="Rejection Reason"
              value={kyc.rejectionReason}
              fullWidth
              danger
            />
          )}
        </div>
      </section>

      {/* Bottom actions */}
      {(canVerify || canReject) && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:justify-end">
            {canReject && (
              <button
                type="button"
                onClick={rejectKyc}
                disabled={processing}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />

                {processing
                  ? "Processing..."
                  : "Reject KYC"}
              </button>
            )}

            {canVerify && (
              <button
                type="button"
                onClick={verifyKyc}
                disabled={processing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {processing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}

                {processing
                  ? "Processing..."
                  : "Verify KYC"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface InfoItemProps {
  label: string;
  value?: string | number | null;
  fullWidth?: boolean;
  highlight?: boolean;
  danger?: boolean;
}

const InfoItem = ({
  label,
  value,
  fullWidth = false,
  highlight = false,
  danger = false,
}: InfoItemProps) => {
  return (
    <div className={fullWidth ? "sm:col-span-2 lg:col-span-3" : ""}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 break-words text-sm ${
          danger
            ? "text-red-600"
            : highlight
            ? "font-semibold text-gray-900"
            : "text-gray-800"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
};

interface VerificationCardProps {
  title: string;
  status?: VerificationStatus | null;
  reference?: string | null;
  verifiedAt?: string | null;
  children?: React.ReactNode;
}

const VerificationCard = ({
  title,
  status,
  reference,
  verifiedAt,
  children,
}: VerificationCardProps) => {
  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">
            {title}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            Verification result
          </p>
        </div>

        <span
          className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${getVerificationStatusClass(
            status
          )}`}
        >
          {formatVerificationStatus(status)}
        </span>
      </div>

      {reference && (
        <p className="mt-3 break-all text-xs text-gray-500">
          Reference: {reference}
        </p>
      )}

      {verifiedAt && (
        <p className="mt-1 text-xs text-gray-500">
          Verified: {formatDate(verifiedAt)}
        </p>
      )}

      {children}
    </div>
  );
};

interface DocumentPreviewProps {
  title: string;
  icon: React.ReactNode;
  url?: string | null;
}

const DocumentPreview = ({
  title,
  icon,
  url,
}: DocumentPreviewProps) => {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}

          <h3 className="text-sm font-medium text-gray-900">
            {title}
          </h3>
        </div>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Open
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {url ? (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          <img
            src={url}
            alt={title}
            className="max-h-[420px] w-full object-contain"
          />
        </div>
      ) : (
        <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50">
          <div className="text-center">
            <FileText className="mx-auto h-8 w-8 text-gray-400" />

            <p className="mt-2 text-sm text-gray-500">
              No {title.toLowerCase()} uploaded
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminKycDetail;