
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  Eye,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "react-toastify";

import adminDisbursementApi, {
  type AdminDisbursement,
  type AdminDisbursementCreateOption,
  type DisbursementStatus,
} from "../services/adminDisbursementApi";

// ============================================================
// TYPES
// ============================================================

type CreateDisbursementForm = {
  user: string;
  loanApplication: string;
  loanOffer: string;
  bankAccount: string;
  amount: string;
  currency: string;
  provider: string;
};

type StatusFilter = "all" | DisbursementStatus;

type OptionsResponse =
  | AdminDisbursementCreateOption[]
  | {
      options?: AdminDisbursementCreateOption[];
      data?: AdminDisbursementCreateOption[];
    }
  | null
  | undefined;

type DisbursementsResponse =
  | AdminDisbursement[]
  | {
      disbursements?: AdminDisbursement[];
      data?: AdminDisbursement[];
    }
  | null
  | undefined;

// ============================================================
// CONSTANTS
// ============================================================

const EMPTY_FORM: CreateDisbursementForm = {
  user: "",
  loanApplication: "",
  loanOffer: "",
  bankAccount: "",
  amount: "",
  currency: "NGN",
  provider: "",
};

const STATUS_OPTIONS: Array<{
  value: StatusFilter;
  label: string;
}> = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "successful", label: "Successful" },
  { value: "failed", label: "Failed" },
  { value: "reversed", label: "Reversed" },
];

// ============================================================
// HELPERS
// ============================================================

function formatMoney(
  amount?: number | string | null,
  currency = "NGN",
): string {
  const numericAmount = Number(amount ?? 0);
  const safeCurrency = currency || "NGN";

  if (!Number.isFinite(numericAmount)) {
    return `${safeCurrency} 0`;
  }

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch {
    return `${safeCurrency} ${numericAmount.toLocaleString("en-NG")}`;
  }
}

function formatStatus(status?: string | null): string {
  if (!status) {
    return "Unknown";
  }

  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date?: string | null): string {
  if (!date) {
    return "N/A";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getStatusClass(
  status?: DisbursementStatus | null,
): string {
  switch (status) {
    case "successful":
      return "bg-green-100 text-green-700";

    case "processing":
      return "bg-blue-100 text-blue-700";

    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "failed":
      return "bg-red-100 text-red-700";

    case "reversed":
      return "bg-purple-100 text-purple-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function StatusIcon({
  status,
}: {
  status?: DisbursementStatus | null;
}) {
  switch (status) {
    case "successful":
      return <CheckCircle2 size={15} />;

    case "processing":
      return (
        <Loader2
          size={15}
          className="animate-spin"
        />
      );

    case "pending":
      return <Clock3 size={15} />;

    case "failed":
    case "reversed":
      return <XCircle size={15} />;

    default:
      return null;
  }
}

function getUserName(
  user?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null,
): string {
  if (!user) {
    return "Unknown borrower";
  }

  const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

  return name || "Unknown borrower";
}

function getErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (
    typeof error === "object" &&
    error !== null
  ) {
    const candidate = error as {
      message?: string;
      response?: {
        data?: {
          message?: string;
        };
      };
    };

    return (
      candidate.response?.data?.message ||
      candidate.message ||
      fallback
    );
  }

  return fallback;
}

function normalizeDisbursements(
  data: DisbursementsResponse,
): AdminDisbursement[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    Array.isArray(data.disbursements)
  ) {
    return data.disbursements;
  }

  if (
    data &&
    Array.isArray(data.data)
  ) {
    return data.data;
  }

  return [];
}

function normalizeCreateOptions(
  data: OptionsResponse,
): AdminDisbursementCreateOption[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (
    data &&
    Array.isArray(data.options)
  ) {
    return data.options;
  }

  if (
    data &&
    Array.isArray(data.data)
  ) {
    return data.data;
  }

  return [];
}

function isOtpRequiredDisbursement(
  disbursement: AdminDisbursement,
): boolean {
  if (!disbursement) {
    return false;
  }

  const providerStatus = String(
    disbursement.providerData?.status ||
      disbursement.providerData?.paystackStatus ||
      disbursement.providerData?.raw?.status ||
      "",
  )
    .trim()
    .toLowerCase();

  return (
    disbursement.status === "processing" &&
    (
      disbursement.otpRequired === true ||
      disbursement.canFinalizeOtp === true ||
      providerStatus === "otp"
    ) &&
    Boolean(disbursement.providerTransferCode)
  );
}

// ============================================================
// COMPONENT
// ============================================================

export default function AdminDisbursement() {
  const [
    disbursements,
    setDisbursements,
  ] = useState<AdminDisbursement[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [creating, setCreating] =
    useState(false);

  const [retryingId, setRetryingId] =
    useState<string | null>(null);

  const [
    finalizingId,
    setFinalizingId,
  ] = useState<string | null>(null);

  const [
    otpDisbursement,
    setOtpDisbursement,
  ] = useState<AdminDisbursement | null>(
    null,
  );

  const [otp, setOtp] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState<StatusFilter>("all");

  const [
    showCreateModal,
    setShowCreateModal,
  ] = useState(false);

  const [
    loadingCreateOptions,
    setLoadingCreateOptions,
  ] = useState(false);

  const [
    createOptions,
    setCreateOptions,
  ] = useState<AdminDisbursementCreateOption[]>(
    [],
  );

  const [form, setForm] =
    useState<CreateDisbursementForm>(
      EMPTY_FORM,
    );

  // ==========================================================
  // LOAD DISBURSEMENTS
  // ==========================================================

  const loadDisbursements = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await adminDisbursementApi.getDisbursements();

        if (!response.success) {
          throw new Error(
            response.message ||
              "Unable to load disbursements.",
          );
        }

        const normalized =
          normalizeDisbursements(
            response.data as DisbursementsResponse,
          );

        setDisbursements(normalized);
      } catch (error) {
        console.error(
          "ADMIN DISBURSEMENTS ERROR:",
          error,
        );

        setDisbursements([]);

        toast.error(
          getErrorMessage(
            error,
            "Unable to load disbursements.",
          ),
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadDisbursements();
  }, [loadDisbursements]);

  // ==========================================================
  // LOAD CREATE OPTIONS
  // ==========================================================

  const loadCreateOptions =
    useCallback(async () => {
      try {
        setLoadingCreateOptions(true);

        const response =
          await adminDisbursementApi.getCreateOptions();

        if (!response.success) {
          throw new Error(
            response.message ||
              "Unable to load disbursement options.",
          );
        }

        const normalized =
          normalizeCreateOptions(
            response.data as OptionsResponse,
          );

        setCreateOptions(normalized);
      } catch (error) {
        console.error(
          "DISBURSEMENT OPTIONS ERROR:",
          error,
        );

        setCreateOptions([]);

        toast.error(
          getErrorMessage(
            error,
            "Unable to load disbursement options.",
          ),
        );
      } finally {
        setLoadingCreateOptions(false);
      }
    }, []);

  // ==========================================================
  // OPEN CREATE MODAL
  // ==========================================================

  const openCreateModal = async () => {
    setShowCreateModal(true);
    setForm(EMPTY_FORM);

    await loadCreateOptions();
  };

  // ==========================================================
  // CLOSE CREATE MODAL
  // ==========================================================

  const closeCreateModal = () => {
    if (creating) {
      return;
    }

    setShowCreateModal(false);
    setForm(EMPTY_FORM);
  };

  // ==========================================================
  // FORM UPDATE
  // ==========================================================

  const updateForm = (
    field: keyof CreateDisbursementForm,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // ==========================================================
  // BORROWERS
  // ==========================================================

  const borrowerOptions = useMemo(() => {
    const map = new Map<
      string,
      AdminDisbursementCreateOption["borrower"]
    >();

    for (const option of createOptions) {
      const borrower = option.borrower;

      if (borrower?._id) {
        map.set(borrower._id, borrower);
      }
    }

    return Array.from(map.values()).sort(
      (a, b) =>
        getUserName(a).localeCompare(
          getUserName(b),
        ),
    );
  }, [createOptions]);

  // ==========================================================
  // OPTIONS FOR SELECTED BORROWER
  // ==========================================================

  const borrowerCreateOptions = useMemo(() => {
    if (!form.user) {
      return [];
    }

    return createOptions.filter(
      (option) =>
        option.borrower?._id ===
        form.user,
    );
  }, [createOptions, form.user]);

  // ==========================================================
  // APPLICATIONS
  // ==========================================================

  const availableApplications =
    useMemo(() => {
      const map = new Map<
        string,
        AdminDisbursementCreateOption
      >();

      for (const option of borrowerCreateOptions) {
        const application =
          option.loanApplication;

        if (application?._id) {
          map.set(application._id, option);
        }
      }

      return Array.from(map.values());
    }, [borrowerCreateOptions]);

  // ==========================================================
  // OFFERS
  // ==========================================================

  const availableOffers = useMemo(() => {
    return borrowerCreateOptions.filter(
      (option) => {
        if (!form.loanApplication) {
          return true;
        }

        return (
          option.loanApplication?._id ===
          form.loanApplication
        );
      },
    );
  }, [
    borrowerCreateOptions,
    form.loanApplication,
  ]);

  // ==========================================================
  // BANK ACCOUNTS
  // ==========================================================

  const availableBankAccounts =
    useMemo(() => {
      const map = new Map<
        string,
        AdminDisbursementCreateOption["bankAccount"]
      >();

      for (const option of borrowerCreateOptions) {
        const account = option.bankAccount;

        if (account?._id) {
          map.set(account._id, account);
        }
      }

      return Array.from(map.values());
    }, [borrowerCreateOptions]);

  // ==========================================================
  // SELECTED APPLICATION
  // ==========================================================

  const selectedApplication =
    useMemo(() => {
      if (!form.loanApplication) {
        return undefined;
      }

      return availableApplications.find(
        (option) =>
          option.loanApplication?._id ===
          form.loanApplication,
      );
    }, [
      availableApplications,
      form.loanApplication,
    ]);

  // ==========================================================
  // SELECTED OFFER
  // ==========================================================

  const selectedOption = useMemo(() => {
    if (!form.loanOffer) {
      return undefined;
    }

    return createOptions.find(
      (option) =>
        option.offerId === form.loanOffer,
    );
  }, [createOptions, form.loanOffer]);

  // ==========================================================
  // SELECTED BANK ACCOUNT
  // ==========================================================

  const selectedBankAccount =
    useMemo(() => {
      if (!form.bankAccount) {
        return undefined;
      }

      return availableBankAccounts.find(
        (account) =>
          account._id === form.bankAccount,
      );
    }, [
      availableBankAccounts,
      form.bankAccount,
    ]);

  // ==========================================================
  // USER CHANGE
  // ==========================================================

  const handleUserChange = (
    userId: string,
  ) => {
    if (!userId) {
      setForm((previous) => ({
        ...previous,
        user: "",
        loanApplication: "",
        loanOffer: "",
        bankAccount: "",
        amount: "",
      }));

      return;
    }

    const optionsForUser =
      createOptions.filter(
        (option) =>
          option.borrower?._id === userId,
      );

    const firstOption =
      optionsForUser[0];

    const shouldAutoSelect =
      optionsForUser.length === 1;

    const amount =
      firstOption?.approvedAmount ??
      firstOption?.loanApplication
        ?.amountRequested;

    setForm((previous) => ({
      ...previous,
      user: userId,
      loanApplication: shouldAutoSelect
        ? firstOption?.loanApplication?._id ||
          ""
        : "",
      loanOffer: shouldAutoSelect
        ? firstOption?.offerId || ""
        : "",
      bankAccount: shouldAutoSelect
        ? firstOption?.bankAccount?._id ||
          ""
        : "",
      amount:
        shouldAutoSelect &&
        amount != null
          ? String(amount)
          : "",
    }));
  };

  // ==========================================================
  // APPLICATION CHANGE
  // ==========================================================

  const handleApplicationChange = (
    applicationId: string,
  ) => {
    if (!applicationId) {
      setForm((previous) => ({
        ...previous,
        loanApplication: "",
        loanOffer: "",
        amount: "",
      }));

      return;
    }

    const matchingOptions =
      borrowerCreateOptions.filter(
        (option) =>
          option.loanApplication?._id ===
          applicationId,
      );

    const matchingOption =
      matchingOptions[0];

    const firstOffer =
      matchingOptions.length === 1
        ? matchingOptions[0]
        : undefined;

    const amount =
      matchingOption?.approvedAmount ??
      matchingOption?.loanApplication
        ?.amountRequested;

    setForm((previous) => ({
      ...previous,
      loanApplication: applicationId,
      loanOffer:
        firstOffer?.offerId ||
        "",
      bankAccount:
        firstOffer?.bankAccount?._id ||
        previous.bankAccount,
      amount:
        amount != null
          ? String(amount)
          : "",
    }));
  };

  // ==========================================================
  // OFFER CHANGE
  // ==========================================================

  const handleOfferChange = (
    offerId: string,
  ) => {
    if (!offerId) {
      setForm((previous) => ({
        ...previous,
        loanOffer: "",
        amount: "",
      }));

      return;
    }

    const option =
      createOptions.find(
        (item) =>
          item.offerId === offerId,
      );

    setForm((previous) => ({
      ...previous,
      loanOffer: offerId,
      loanApplication:
        option?.loanApplication?._id ||
        previous.loanApplication,
      bankAccount:
        option?.bankAccount?._id ||
        previous.bankAccount,
      amount:
        option?.approvedAmount != null
          ? String(option.approvedAmount)
          : previous.amount,
    }));
  };

  // ==========================================================
  // BANK ACCOUNT CHANGE
  // ==========================================================

  const handleBankAccountChange = (
    accountId: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      bankAccount: accountId,
    }));
  };

  // ==========================================================
  // RETRY FAILED DISBURSEMENT
  // ==========================================================

  const handleRetryDisbursement =
    async (disbursementId: string) => {
      if (!disbursementId) {
        toast.error(
          "Disbursement ID is missing.",
        );
        return;
      }

      const confirmed =
        window.confirm(
          "Are you sure you want to retry this failed disbursement?",
        );

      if (!confirmed) {
        return;
      }

      try {
        setRetryingId(disbursementId);

        const response =
          await adminDisbursementApi.retryDisbursement(
            disbursementId,
          );

        if (!response.success) {
          throw new Error(
            response.message ||
              "Unable to retry disbursement.",
          );
        }

        toast.success(
          response.message ||
            "Disbursement retry started successfully.",
        );

        await loadDisbursements(true);
      } catch (error) {
        console.error(
          "RETRY DISBURSEMENT ERROR:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Unable to retry disbursement.",
          ),
        );
      } finally {
        setRetryingId(null);
      }
    };

  // ==========================================================
  // OPEN OTP MODAL
  // ==========================================================

  const openOtpModal = (
    disbursement: AdminDisbursement,
  ) => {
    if (
      !disbursement._id
    ) {
      toast.error(
        "Disbursement ID is missing.",
      );
      return;
    }

    if (
      disbursement.status !==
      "processing"
    ) {
      toast.error(
        "This disbursement is no longer waiting for OTP.",
      );
      return;
    }

    if (
      !disbursement.providerTransferCode
    ) {
      toast.error(
        "Paystack transfer code is missing.",
      );
      return;
    }

    setOtp("");
    setOtpDisbursement(
      disbursement,
    );
  };

  // ==========================================================
  // CLOSE OTP MODAL
  // ==========================================================

  const closeOtpModal = () => {
    if (finalizingId) {
      return;
    }

    setOtp("");
    setOtpDisbursement(null);
  };

  // ==========================================================
  // FINALIZE OTP
  // ==========================================================

  const handleFinalizeOtp = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!otpDisbursement?._id) {
      toast.error(
        "Disbursement ID is missing.",
      );
      return;
    }

    const cleanOtp =
      otp.replace(/\D/g, "").trim();

    if (!cleanOtp) {
      toast.error(
        "Please enter the OTP.",
      );
      return;
    }

    if (cleanOtp.length < 4) {
      toast.error(
        "Please enter a valid OTP.",
      );
      return;
    }

    if (
      !otpDisbursement.providerTransferCode
    ) {
      toast.error(
        "Paystack transfer code is missing.",
      );
      return;
    }

    try {
      setFinalizingId(
        otpDisbursement._id,
      );

      const response =
        await adminDisbursementApi.finalizeDisbursement(
          otpDisbursement._id,
          cleanOtp,
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Unable to finalize disbursement.",
        );
      }

      toast.success(
        response.message ||
          "Disbursement finalized successfully.",
      );

      setOtp("");
      setOtpDisbursement(null);

      await loadDisbursements(true);
    } catch (error) {
      console.error(
        "FINALIZE DISBURSEMENT OTP ERROR:",
        error,
      );

      toast.error(
        getErrorMessage(
          error,
          "Unable to finalize disbursement OTP.",
        ),
      );
    } finally {
      setFinalizingId(null);
    }
  };

  // ==========================================================
  // CREATE
  // ==========================================================

  const handleCreate = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (creating) {
      return;
    }

    if (!form.user) {
      toast.error(
        "Please select a borrower.",
      );
      return;
    }

    if (!form.loanApplication) {
      toast.error(
        "Please select a loan application.",
      );
      return;
    }

    if (!form.loanOffer) {
      toast.error(
        "Please select a loan offer.",
      );
      return;
    }

    if (!form.bankAccount) {
      toast.error(
        "Please select a bank account.",
      );
      return;
    }

    const amount = Number(form.amount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error(
        "Please enter a valid disbursement amount.",
      );
      return;
    }

    if (
      selectedOption?.approvedAmount !=
        null &&
      amount >
        Number(selectedOption.approvedAmount)
    ) {
      toast.error(
        "Disbursement amount cannot exceed the approved loan amount.",
      );
      return;
    }

    if (
      selectedOption?.loanApplication?._id &&
      selectedOption.loanApplication._id !==
        form.loanApplication
    ) {
      toast.error(
        "Selected loan offer does not belong to the selected application.",
      );
      return;
    }

    if (
      selectedOption?.borrower?._id &&
      selectedOption.borrower._id !==
        form.user
    ) {
      toast.error(
        "Selected loan offer does not belong to the selected borrower.",
      );
      return;
    }

    try {
      setCreating(true);

      const response =
        await adminDisbursementApi.createDisbursement(
          form.loanOffer,
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Unable to create disbursement.",
        );
      }

      toast.success(
        response.message ||
          "Disbursement created successfully.",
      );

      setShowCreateModal(false);
      setForm(EMPTY_FORM);

      await loadDisbursements(true);
    } catch (error) {
      console.error(
        "CREATE DISBURSEMENT ERROR:",
        error,
      );

      toast.error(
        getErrorMessage(
          error,
          "Unable to create disbursement.",
        ),
      );
    } finally {
      setCreating(false);
    }
  };

  // ==========================================================
  // FILTERED DATA
  // ==========================================================

  const filteredDisbursements =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      return disbursements.filter(
        (item) => {
          if (
            status !== "all" &&
            item.status !== status
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const borrower =
            `${item.user?.firstName ?? ""} ${
              item.user?.lastName ?? ""
            }`
              .trim()
              .toLowerCase();

          const email =
            item.user?.email?.toLowerCase() ||
            "";

          const application =
            item.loanApplication?.applicationNumber?.toLowerCase() ||
            "";

          const providerReference =
            item.providerReference?.toLowerCase() ||
            "";

          const disbursementId =
            item._id?.toLowerCase() || "";

          const bankName =
            item.bankAccount?.bankName?.toLowerCase() ||
            "";

          const accountNumber =
            item.bankAccount?.accountNumber?.toLowerCase() ||
            "";

          return [
            borrower,
            email,
            application,
            providerReference,
            disbursementId,
            bankName,
            accountNumber,
          ].some((value) =>
            value.includes(query),
          );
        },
      );
    }, [
      disbursements,
      search,
      status,
    ]);

  // ==========================================================
  // STATS
  // ==========================================================

  const stats = useMemo(
    () => ({
      total: disbursements.length,

      pending: disbursements.filter(
        (item) =>
          item.status === "pending",
      ).length,

      processing: disbursements.filter(
        (item) =>
          item.status === "processing",
      ).length,

      otpRequired: disbursements.filter(
        (item) =>
          isOtpRequiredDisbursement(item),
      ).length,

      successful: disbursements.filter(
        (item) =>
          item.status === "successful",
      ).length,

      failed: disbursements.filter(
        (item) =>
          item.status === "failed",
      ).length,

      reversed: disbursements.filter(
        (item) =>
          item.status === "reversed",
      ).length,
    }),
    [disbursements],
  );

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={34}
            className="mx-auto animate-spin text-orange-500"
          />

          <p className="mt-3 text-sm text-gray-500">
            Loading disbursements...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <>
      <div className="mx-auto max-w-7xl p-4 sm:p-6">
        {/* HEADER */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <Link
              to="/admin"
              className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-orange-500"
            >
              <ArrowLeft size={16} />
              Admin Dashboard
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Banknote size={25} />
              </div>

              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Disbursements
                </h1>

                <p className="text-sm text-gray-500">
                  Create and manage loan
                  disbursements
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              <Plus size={17} />
              Create Disbursement
            </button>

            <button
              type="button"
              disabled={refreshing}
              onClick={() =>
                void loadDisbursements(true)
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>

        {/* STATS */}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-7">
          <StatCard
            label="Total"
            value={stats.total}
          />

          <StatCard
            label="Pending"
            value={stats.pending}
          />

          <StatCard
            label="Processing"
            value={stats.processing}
          />

          <StatCard
            label="OTP Required"
            value={stats.otpRequired}
            valueClassName="text-orange-600"
          />

          <StatCard
            label="Successful"
            value={stats.successful}
          />

          <StatCard
            label="Failed"
            value={stats.failed}
          />

          <StatCard
            label="Reversed"
            value={stats.reversed}
          />
        </div>

        {/* FILTERS */}

        <div className="mb-6 rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search borrower, application, bank, reference or ID..."
                className="w-full rounded-lg border bg-gray-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as StatusFilter,
                )
              }
              className="rounded-lg border bg-gray-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            >
              {STATUS_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {/* TABLE */}

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Borrower
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Application
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Amount
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Bank
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Status
                  </th>

                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Date
                  </th>

                  <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredDisbursements.map(
                  (item) => {
                    const borrowerName =
                      getUserName(item.user);

                    const otpRequired =
                      isOtpRequiredDisbursement(
                        item,
                      );

                    return (
                      <tr
                        key={item._id}
                        className="transition hover:bg-gray-50"
                      >
                        {/* BORROWER */}

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {borrowerName}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {item.user?.email ||
                              "No email"}
                          </p>
                        </td>

                        {/* APPLICATION */}

                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">
                            {item
                              .loanApplication
                              ?.applicationNumber ||
                              "N/A"}
                          </p>
                        </td>

                        {/* AMOUNT */}

                        <td className="px-5 py-4">
                          <p className="font-bold text-gray-900">
                            {formatMoney(
                              item.amount,
                              item.currency,
                            )}
                          </p>
                        </td>

                        {/* BANK */}

                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-900">
                            {item
                              .bankAccount
                              ?.bankName ||
                              "N/A"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {item
                              .bankAccount
                              ?.accountNumber ||
                              ""}
                          </p>
                        </td>

                        {/* STATUS */}

                        <td className="px-5 py-4">
                          <div className="flex flex-col items-start gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusClass(
                                item.status,
                              )}`}
                            >
                              <StatusIcon
                                status={
                                  item.status
                                }
                              />

                              {formatStatus(
                                item.status,
                              )}
                            </span>

                            {otpRequired && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
                                <KeyRound
                                  size={12}
                                />
                                OTP required
                              </span>
                            )}
                          </div>
                        </td>

                        {/* DATE */}

                        <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-500">
                          {formatDate(
                            item.createdAt,
                          )}
                        </td>

                        {/* ACTION */}

                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Link
                              to={`/admin/disbursements/${item._id}`}
                              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
                            >
                              <Eye size={16} />
                              View
                            </Link>

                            {/* OTP */}

                            {otpRequired && (
                              <button
                                type="button"
                                disabled={
                                  finalizingId ===
                                  item._id
                                }
                                onClick={() =>
                                  openOtpModal(
                                    item,
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <KeyRound
                                  size={16}
                                />
                                Enter OTP
                              </button>
                            )}

                            {/* PROCESSING WITHOUT OTP */}

                            {item.status ===
                              "processing" &&
                              !otpRequired && (
                                <span className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-600">
                                  <Loader2
                                    size={16}
                                    className="animate-spin"
                                  />
                                  Processing...
                                </span>
                              )}

                            {/* RETRY ONLY FAILED */}

                            {item.status ===
                              "failed" && (
                              <button
                                type="button"
                                disabled={
                                  retryingId ===
                                  item._id
                                }
                                onClick={() =>
                                  void handleRetryDisbursement(
                                    item._id,
                                  )
                                }
                                className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {retryingId ===
                                item._id ? (
                                  <>
                                    <Loader2
                                      size={
                                        16
                                      }
                                      className="animate-spin"
                                    />
                                    Retrying...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw
                                      size={
                                        16
                                      }
                                    />
                                    Retry
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          {filteredDisbursements.length ===
            0 && (
            <EmptyState
              search={search}
              status={status}
            />
          )}
        </div>
      </div>

      {/* ==================================================== */}
      {/* CREATE MODAL */}
      {/* ==================================================== */}

      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeCreateModal();
            }
          }}
        >
          <div className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Create Disbursement
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select an approved loan and
                  verified bank account.
                </p>
              </div>

              <button
                type="button"
                disabled={creating}
                onClick={closeCreateModal}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {loadingCreateOptions ? (
              <div className="flex min-h-[350px] items-center justify-center p-6">
                <div className="text-center">
                  <Loader2
                    size={32}
                    className="mx-auto animate-spin text-orange-500"
                  />

                  <p className="mt-3 text-sm text-gray-500">
                    Loading approved loans and
                    bank accounts...
                  </p>
                </div>
              </div>
            ) : createOptions.length ===
              0 ? (
              <div className="flex min-h-[240px] items-center justify-center p-6">
                <div className="max-w-md text-center">
                  <Banknote
                    size={36}
                    className="mx-auto text-gray-300"
                  />

                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    No eligible disbursements
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    There are no accepted loan
                    offers with active mandates
                    and verified bank accounts
                    available for disbursement.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      void loadCreateOptions()
                    }
                    className="mt-5 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    <RefreshCw size={16} />
                    Reload
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleCreate}
                className="space-y-5 p-6"
              >
                <FormField label="Borrower">
                  <select
                    value={form.user}
                    onChange={(event) =>
                      handleUserChange(
                        event.target.value,
                      )
                    }
                    disabled={creating}
                    className={inputClassName}
                  >
                    <option value="">
                      Select borrower
                    </option>

                    {borrowerOptions.map(
                      (user) => (
                        <option
                          key={user._id}
                          value={user._id}
                        >
                          {getUserName(user)}
                          {user.email
                            ? ` — ${user.email}`
                            : ""}
                        </option>
                      ),
                    )}
                  </select>
                </FormField>

                <FormField label="Loan Application">
                  <select
                    value={
                      form.loanApplication
                    }
                    onChange={(event) =>
                      handleApplicationChange(
                        event.target.value,
                      )
                    }
                    disabled={
                      creating ||
                      !form.user
                    }
                    className={`${inputClassName} disabled:bg-gray-100`}
                  >
                    <option value="">
                      {!form.user
                        ? "Select borrower first"
                        : "Select loan application"}
                    </option>

                    {availableApplications.map(
                      (option) => {
                        const application =
                          option.loanApplication;

                        if (!application?._id) {
                          return null;
                        }

                        return (
                          <option
                            key={
                              application._id
                            }
                            value={
                              application._id
                            }
                          >
                            {application.applicationNumber ||
                              application._id}

                            {application.amountRequested !=
                            null
                              ? ` — ${formatMoney(
                                  application.amountRequested,
                                )}`
                              : ""}
                          </option>
                        );
                      },
                    )}
                  </select>

                  {selectedApplication && (
                    <p className="mt-2 text-xs text-gray-500">
                      Requested amount:{" "}
                      <strong>
                        {formatMoney(
                          selectedApplication
                            .loanApplication
                            ?.amountRequested,
                        )}
                      </strong>
                    </p>
                  )}
                </FormField>

                <FormField label="Loan Offer">
                  <select
                    value={form.loanOffer}
                    onChange={(event) =>
                      handleOfferChange(
                        event.target.value,
                      )
                    }
                    disabled={
                      creating ||
                      !form.user
                    }
                    className={`${inputClassName} disabled:bg-gray-100`}
                  >
                    <option value="">
                      {!form.user
                        ? "Select borrower first"
                        : !form.loanApplication
                          ? "Select loan application first"
                          : "Select loan offer"}
                    </option>

                    {availableOffers.map(
                      (option) => (
                        <option
                          key={option.offerId}
                          value={
                            option.offerId
                          }
                        >
                          Approved:{" "}
                          {formatMoney(
                            option.approvedAmount,
                            form.currency,
                          )}

                          {option.interestRate !=
                          null
                            ? ` — ${option.interestRate}% interest`
                            : ""}
                        </option>
                      ),
                    )}
                  </select>

                  {selectedOption && (
                    <div className="mt-2 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                      <p>
                        Approved amount:{" "}
                        <strong>
                          {formatMoney(
                            selectedOption.approvedAmount,
                            form.currency,
                          )}
                        </strong>
                      </p>

                      {selectedOption.interestRate !=
                        null && (
                        <p className="mt-1">
                          Interest rate:{" "}
                          <strong>
                            {
                              selectedOption.interestRate
                            }
                            %
                          </strong>
                        </p>
                      )}

                      <p className="mt-1">
                        Mandate status:{" "}
                        <strong>
                          {formatStatus(
                            selectedOption
                              .mandate?.status,
                          )}
                        </strong>
                      </p>
                    </div>
                  )}
                </FormField>

                <FormField label="Bank Account">
                  <select
                    value={form.bankAccount}
                    onChange={(event) =>
                      handleBankAccountChange(
                        event.target.value,
                      )
                    }
                    disabled={
                      creating ||
                      !form.user
                    }
                    className={`${inputClassName} disabled:bg-gray-100`}
                  >
                    <option value="">
                      {!form.user
                        ? "Select borrower first"
                        : "Select bank account"}
                    </option>

                    {availableBankAccounts.map(
                      (account) => (
                        <option
                          key={account._id}
                          value={account._id}
                        >
                          {account.bankName ||
                            "Bank"}
                          {" — "}
                          {account.accountNumber ||
                            "No account number"}
                          {account.accountName
                            ? ` — ${account.accountName}`
                            : ""}
                        </option>
                      ),
                    )}
                  </select>

                  {selectedBankAccount && (
                    <div className="mt-2 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                      <p>
                        <strong>
                          Bank:
                        </strong>{" "}
                        {selectedBankAccount.bankName ||
                          "N/A"}
                      </p>

                      <p className="mt-1">
                        <strong>
                          Account:
                        </strong>{" "}
                        {selectedBankAccount.accountNumber ||
                          "N/A"}
                      </p>

                      <p className="mt-1">
                        <strong>
                          Name:
                        </strong>{" "}
                        {selectedBankAccount.accountName ||
                          "N/A"}
                      </p>
                    </div>
                  )}
                </FormField>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="sm:col-span-2">
                    <FormField label="Disbursement Amount">
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.amount}
                        onChange={(event) =>
                          updateForm(
                            "amount",
                            event.target
                              .value,
                          )
                        }
                        disabled={creating}
                        placeholder="Enter amount"
                        className={inputClassName}
                      />

                      {selectedOption?.approvedAmount !=
                        null && (
                        <p className="mt-2 text-xs text-gray-500">
                          Maximum:{" "}
                          <strong>
                            {formatMoney(
                              selectedOption.approvedAmount,
                              form.currency,
                            )}
                          </strong>
                        </p>
                      )}
                    </FormField>
                  </div>

                  <FormField label="Currency">
                    <select
                      value={form.currency}
                      onChange={(event) =>
                        updateForm(
                          "currency",
                          event.target.value,
                        )
                      }
                      disabled={creating}
                      className={inputClassName}
                    >
                      <option value="NGN">
                        NGN
                      </option>

                      <option value="USD">
                        USD
                      </option>

                      <option value="GBP">
                        GBP
                      </option>
                    </select>
                  </FormField>
                </div>

                <FormField
                  label={
                    <>
                      Provider
                      <span className="ml-1 font-normal text-gray-400">
                        Optional
                      </span>
                    </>
                  }
                >
                  <input
                    type="text"
                    value={form.provider}
                    onChange={(event) =>
                      updateForm(
                        "provider",
                        event.target.value,
                      )
                    }
                    disabled={creating}
                    placeholder="e.g. Paystack, Flutterwave, Bank Transfer"
                    className={inputClassName}
                  />
                </FormField>

                <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                  <h3 className="text-sm font-bold text-gray-900">
                    Disbursement Summary
                  </h3>

                  <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <SummaryItem
                      label="Borrower"
                      value={
                        getUserName(
                          borrowerOptions.find(
                            (user) =>
                              user._id ===
                              form.user,
                          ),
                        ) || "Not selected"
                      }
                    />

                    <SummaryItem
                      label="Amount"
                      value={formatMoney(
                        Number(
                          form.amount || 0,
                        ),
                        form.currency,
                      )}
                    />

                    <SummaryItem
                      label="Status"
                      value="Pending"
                      valueClassName="text-yellow-700"
                    />

                    <SummaryItem
                      label="Application"
                      value={
                        selectedApplication
                          ?.loanApplication
                          ?.applicationNumber ||
                        "Not selected"
                      }
                    />

                    <SummaryItem
                      label="Bank"
                      value={
                        selectedBankAccount?.bankName ||
                        "Not selected"
                      }
                    />

                    <SummaryItem
                      label="Account"
                      value={
                        selectedBankAccount?.accountNumber ||
                        "Not selected"
                      }
                    />

                    <SummaryItem
                      label="Mandate"
                      value={
                        selectedOption?.mandate
                          ?.status
                          ? formatStatus(
                              selectedOption
                                .mandate
                                .status,
                            )
                          : "Not selected"
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={creating}
                    onClick={
                      closeCreateModal
                    }
                    className="rounded-lg border px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      creating ||
                      !form.user ||
                      !form.loanApplication ||
                      !form.loanOffer ||
                      !form.bankAccount
                    }
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus size={17} />
                        Create Disbursement
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* OTP MODAL */}
      {/* ==================================================== */}

      {otpDisbursement && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeOtpModal();
            }
          }}
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            {/* HEADER */}

            <div className="flex items-center justify-between border-b px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <KeyRound size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Enter Paystack OTP
                  </h2>

                  <p className="text-sm text-gray-500">
                    Finalize this transfer
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={Boolean(
                  finalizingId,
                )}
                onClick={closeOtpModal}
                className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close OTP modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* BODY */}

            <form
              onSubmit={handleFinalizeOtp}
              className="space-y-5 p-6"
            >
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
                <p className="text-sm leading-6 text-orange-800">
                  Paystack is waiting for the
                  transfer OTP. Enter the OTP
                  sent by Paystack to finalize
                  the existing transfer.
                </p>
              </div>

              {/* AMOUNT */}

              <div className="rounded-xl border bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Amount
                  </span>

                  <strong className="text-lg text-gray-900">
                    {formatMoney(
                      otpDisbursement.amount,
                      otpDisbursement.currency,
                    )}
                  </strong>
                </div>

                {otpDisbursement.providerReference && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs text-gray-500">
                      Paystack reference
                    </p>

                    <p className="mt-1 break-all text-xs font-medium text-gray-700">
                      {
                        otpDisbursement.providerReference
                      }
                    </p>
                  </div>
                )}

                {otpDisbursement.providerTransferCode && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500">
                      Transfer code
                    </p>

                    <p className="mt-1 break-all text-xs font-medium text-gray-700">
                      {
                        otpDisbursement.providerTransferCode
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* OTP */}

              <div>
                <label
                  htmlFor="disbursement-otp"
                  className="mb-2 block text-sm font-semibold text-gray-700"
                >
                  Paystack OTP
                </label>

                <input
                  id="disbursement-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={8}
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value
                        .replace(/\D/g, ""),
                    )
                  }
                  disabled={Boolean(
                    finalizingId,
                  )}
                  autoFocus
                  placeholder="Enter OTP"
                  className="w-full rounded-xl border px-4 py-4 text-center text-2xl font-bold tracking-[0.4em] outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
                />

                <p className="mt-2 text-xs text-gray-500">
                  Enter the OTP exactly as
                  received.
                </p>
              </div>

              {/* ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={Boolean(
                    finalizingId,
                  )}
                  onClick={closeOtpModal}
                  className="rounded-lg border px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    Boolean(finalizingId) ||
                    otp.replace(/\D/g, "")
                      .length < 4
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {finalizingId ? (
                    <>
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                      Finalizing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2
                        size={17}
                      />
                      Finalize Transfer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// FORM FIELD
// ============================================================

function FormField({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">
        {label}
      </label>

      {children}
    </div>
  );
}

// ============================================================
// SUMMARY ITEM
// ============================================================

function SummaryItem({
  label,
  value,
  valueClassName = "text-gray-900",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 font-medium ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  valueClassName = "text-gray-900",
}: {
  label: string;
  value: number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p
        className={`mt-2 text-2xl font-bold ${valueClassName}`}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  search,
  status,
}: {
  search: string;
  status: StatusFilter;
}) {
  const hasFilters =
    Boolean(search.trim()) ||
    status !== "all";

  return (
    <div className="p-12 text-center">
      <Banknote
        size={40}
        className="mx-auto text-gray-300"
      />

      <h3 className="mt-4 font-semibold text-gray-900">
        No disbursements found
      </h3>

      <p className="mt-1 text-sm text-gray-500">
        {hasFilters
          ? "Try changing your search or status filter."
          : "There are no disbursements yet."}
      </p>
    </div>
  );
}

// ============================================================
// SHARED INPUT CLASS
// ============================================================

const inputClassName =
  "w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

