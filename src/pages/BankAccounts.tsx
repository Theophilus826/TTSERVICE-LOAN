import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  RefreshCw,
  CheckCircle,
  Clock,
  XCircle,
  Star,
  ShieldCheck,
  Building2,
  ArrowRight,
} from "lucide-react";
import { toast } from "react-toastify";

import bankApi from "../services/BankService";
import type {
  Bank,
  BankAccount,
} from "../services/BankService";

interface BankAccountForm {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountType: "savings" | "current";
  currency: string;
}

export default function BankAccounts() {
  const navigate = useNavigate();

  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [form, setForm] = useState<BankAccountForm>({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountType: "savings",
    currency: "NGN",
  });

  // =====================================================
  // LOAD BANK ACCOUNTS
  // =====================================================

  const loadAccounts = async () => {
    try {
      setLoading(true);

      const response = await bankApi.getMyBankAccounts();

      setAccounts(
        Array.isArray(response?.data)
          ? response.data
          : [],
      );
    } catch (error: any) {
      console.error("Failed to load bank accounts:", error);

      toast.error(
        error?.response?.data?.message ||
          "Failed to load bank accounts",
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // LOAD AVAILABLE BANKS
  // =====================================================

  const loadBanks = async () => {
    try {
      setLoadingBanks(true);

      const response = await bankApi.getBanks();

      const rawBanks = Array.isArray(response?.data)
        ? response.data
        : [];

      const sortedBanks = [...rawBanks].sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      setBanks(sortedBanks);
    } catch (error: any) {
      console.error("Failed to load banks:", error);

      toast.error(
        error?.response?.data?.message ||
          "Failed to load available banks",
      );
    } finally {
      setLoadingBanks(false);
    }
  };

  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {
    void loadAccounts();
    void loadBanks();
  }, []);

  // =====================================================
  // FORM UPDATE
  // =====================================================

  const updateField = (
    field: keyof BankAccountForm,
    value: string,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // =====================================================
  // BANK SELECTION
  // =====================================================

  const handleBankChange = (bankCode: string) => {
    const selectedBank = banks.find(
      (bank) => bank.code === bankCode,
    );

    setForm((previous) => ({
      ...previous,
      bankCode,
      bankName: selectedBank?.name || "",
    }));
  };

  // =====================================================
  // RESET FORM
  // =====================================================

  const resetForm = () => {
    setForm({
      bankName: "",
      bankCode: "",
      accountNumber: "",
      accountType: "savings",
      currency: "NGN",
    });
  };

  // =====================================================
  // ADD BANK ACCOUNT
  // =====================================================

  const addAccount = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const bankName = form.bankName.trim();
    const bankCode = form.bankCode.trim();
    const accountNumber = form.accountNumber.replace(
      /\s/g,
      "",
    );

    if (!bankName || !bankCode) {
      toast.error("Please select your bank");
      return;
    }

    if (!/^\d{10}$/.test(accountNumber)) {
      toast.error(
        "Account number must contain exactly 10 digits",
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await bankApi.addBankAccount({
        bankName,
        bankCode,
        accountNumber,
        accountType: form.accountType,
        currency: "NGN",
      });

      toast.success(
        response.message ||
          "Bank account added successfully",
      );

      resetForm();
      setShowForm(false);

      await loadAccounts();
    } catch (error: any) {
      console.error(
        "Failed to add bank account:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to add bank account",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =====================================================
  // VERIFY BANK ACCOUNT
  // =====================================================

  const verifyAccount = async (
    accountId: string,
  ) => {
    try {
      setProcessingId(accountId);

      const response =
        await bankApi.verifyBankAccount(accountId);

      toast.success(
        response.message ||
          "Bank account verified successfully",
      );

      /*
       * Reload the accounts instead of assuming that
       * verification automatically makes the account
       * primary.
       *
       * The backend is responsible for deciding whether
       * this verified account becomes the primary account.
       */
      const accountsResponse =
        await bankApi.getMyBankAccounts();

      const updatedAccounts =
        Array.isArray(accountsResponse?.data)
          ? accountsResponse.data
          : [];

      setAccounts(updatedAccounts);

      const verifiedAccount =
        updatedAccounts.find(
          (account) => account._id === accountId,
        );

      /*
       * Only continue automatically when the backend
       * confirms that this account is BOTH:
       *
       * 1. verified
       * 2. primary
       *
       * This prevents an unselected verified account from
       * being treated as the loan account.
       */
      if (
        verifiedAccount?.verificationStatus ===
          "verified" &&
        verifiedAccount?.isPrimary === true
      ) {
        toast.success(
          "This account is now your primary loan account.",
        );

        setTimeout(() => {
          navigate("/loans", {
            replace: true,
          });
        }, 800);
      }
    } catch (error: any) {
      console.error(
        "Bank verification failed:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Bank verification failed",
      );

      await loadAccounts();
    } finally {
      setProcessingId(null);
    }
  };

  // =====================================================
  // SET PRIMARY BANK ACCOUNT
  // =====================================================

  const setPrimary = async (
    accountId: string,
  ) => {
    try {
      setProcessingId(accountId);

      const response =
        await bankApi.setPrimaryBankAccount(accountId);

      toast.success(
        response.message ||
          "Primary bank account updated",
      );

      await loadAccounts();
    } catch (error: any) {
      console.error(
        "Failed to set primary account:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to set primary account",
      );
    } finally {
      setProcessingId(null);
    }
  };

  // =====================================================
  // CURRENT VERIFIED PRIMARY ACCOUNT
  // =====================================================

  const primaryBankAccount = accounts.find(
    (account) =>
      account.isPrimary === true &&
      account.verificationStatus === "verified",
  );

  const hasVerifiedPrimary =
    Boolean(primaryBankAccount);

  // =====================================================
  // STATUS BADGE
  // =====================================================

  const statusBadge = (
    status: BankAccount["verificationStatus"],
  ) => {
    if (status === "verified") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          <CheckCircle size={13} />
          Verified
        </span>
      );
    }

    if (status === "failed") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
          <XCircle size={13} />
          Verification Failed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
        <Clock size={13} />
        Pending Verification
      </span>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="space-y-6">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bank Accounts
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Add and verify a bank account for your loan.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void loadAccounts()}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loading ? "animate-spin" : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              if (banks.length === 0) {
                void loadBanks();
              }

              setShowForm((previous) => !previous);
            }}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
          >
            <Plus size={17} />
            Add Account
          </button>
        </div>
      </div>

      {/* =================================================
          PRIMARY ACCOUNT SUMMARY
      ================================================= */}

      {!loading && hasVerifiedPrimary && primaryBankAccount && (
        <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-100">
                <ShieldCheck
                  size={22}
                  className="text-green-600"
                />
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold text-green-800">
                    Primary loan account
                  </p>

                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                    <CheckCircle size={11} />
                    Verified
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                    <Star size={11} />
                    Primary
                  </span>
                </div>

                <p className="mt-1 text-sm font-semibold text-green-800">
                  {primaryBankAccount.bankName}
                  {" • "}
                  ****
                  {primaryBankAccount.accountNumberLast4}
                </p>

                <p className="mt-1 text-xs leading-5 text-green-700">
                  This verified primary account will be used
                  automatically for loan disbursement and
                  Direct Debit repayment authorization.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                navigate("/onboarding/loan", {
                  replace: true,
                })
              }
              className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Continue to Loan
              <ArrowRight size={17} />
            </button>
          </div>
        </div>
      )}

      {/* =================================================
          ADD BANK ACCOUNT FORM
      ================================================= */}

      {showForm && (
        <form
          onSubmit={addAccount}
          className="rounded-2xl bg-white p-6 shadow-sm"
        >
          <div className="mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              Add Bank Account
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Select your bank and enter your account
              number. Your account name will be confirmed
              automatically during verification.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* BANK */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Bank
              </label>

              <div className="relative">
                <Building2
                  size={18}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                />

                <select
                  required
                  value={form.bankCode}
                  onChange={(event) =>
                    handleBankChange(
                      event.target.value,
                    )
                  }
                  disabled={
                    loadingBanks || submitting
                  }
                  className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-50"
                >
                  <option value="">
                    {loadingBanks
                      ? "Loading banks..."
                      : "Select your bank"}
                  </option>

                  {banks.map((bank) => (
                    <option
                      key={`${bank.code}-${bank.name}`}
                      value={bank.code}
                    >
                      {bank.name}
                    </option>
                  ))}
                </select>
              </div>

              {banks.length === 0 &&
                !loadingBanks && (
                  <button
                    type="button"
                    onClick={() => void loadBanks()}
                    className="mt-2 text-xs font-medium text-orange-600 hover:text-orange-700"
                  >
                    Reload bank list
                  </button>
                )}
            </div>

            {/* ACCOUNT NUMBER */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Account Number
              </label>

              <input
                required
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={10}
                value={form.accountNumber}
                onChange={(event) =>
                  updateField(
                    "accountNumber",
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 10),
                  )
                }
                placeholder="10-digit account number"
                disabled={submitting}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-50"
              />

              <div className="mt-1.5 flex justify-between">
                <p className="text-xs text-gray-500">
                  Enter your 10-digit Nigerian bank
                  account number.
                </p>

                <span className="text-xs text-gray-400">
                  {form.accountNumber.length}/10
                </span>
              </div>
            </div>

            {/* ACCOUNT TYPE */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Account Type
              </label>

              <select
                value={form.accountType}
                onChange={(event) =>
                  updateField(
                    "accountType",
                    event.target.value,
                  )
                }
                disabled={submitting}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:cursor-not-allowed disabled:bg-gray-50"
              >
                <option value="savings">
                  Savings
                </option>

                <option value="current">
                  Current
                </option>
              </select>
            </div>

            {/* CURRENCY */}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Currency
              </label>

              <input
                value="NGN"
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-500"
              />
            </div>
          </div>

          {/* VERIFICATION NOTICE */}

          <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <div>
                <p className="text-sm font-semibold text-blue-800">
                  Automatic account verification
                </p>

                <p className="mt-1 text-xs leading-5 text-blue-700">
                  After adding this account, verify it using
                  your selected bank and account number. The
                  verified account name will be retrieved
                  automatically.
                </p>
              </div>
            </div>
          </div>

          {/* FORM ACTIONS */}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              disabled={submitting}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingBanks ||
                !form.bankCode ||
                form.accountNumber.length !== 10
              }
              className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Adding..."
                : "Add Account"}
            </button>
          </div>
        </form>
      )}

      {/* =================================================
          BANK VERIFICATION REQUIREMENT
      ================================================= */}

      {!hasVerifiedPrimary && (
        <div className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
          <ShieldCheck
            size={22}
            className="mt-0.5 shrink-0 text-orange-500"
          />

          <div>
            <p className="font-semibold text-orange-800">
              Verified primary bank account required
            </p>

            <p className="mt-1 text-sm leading-6 text-orange-700">
              Verify a bank account and make it your primary
              account before submitting a loan application.
              Your verified primary account is selected
              automatically for both loan disbursement and
              Direct Debit repayment authorization.
            </p>
          </div>
        </div>
      )}

      {/* =================================================
          ACCOUNTS
      ================================================= */}

      {loading ? (
        <div className="flex min-h-60 items-center justify-center rounded-2xl bg-white shadow-sm">
          <RefreshCw
            size={28}
            className="animate-spin text-orange-500"
          />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-50 text-orange-500">
            <Plus size={25} />
          </div>

          <h3 className="mt-4 font-semibold text-gray-900">
            No bank account
          </h3>

          <p className="mt-1 text-sm text-gray-500">
            Add a bank account to continue with loan
            applications.
          </p>

          <button
            type="button"
            onClick={() => {
              if (banks.length === 0) {
                void loadBanks();
              }

              setShowForm(true);
            }}
            className="mt-5 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Add Bank Account
          </button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {accounts.map((account) => {
            const processing =
              processingId === account._id;

            const isVerified =
              account.verificationStatus ===
              "verified";

            const isFailed =
              account.verificationStatus ===
              "failed";

            const isPrimaryVerified =
              account.isPrimary === true &&
              isVerified;

            return (
              <div
                key={account._id}
                className={`rounded-2xl bg-white p-5 shadow-sm ${
                  isPrimaryVerified
                    ? "ring-2 ring-green-100"
                    : ""
                }`}
              >
                {/* ACCOUNT HEADER */}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900">
                        {account.bankName}
                      </h3>

                      {account.isPrimary && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700">
                          <Star size={11} />
                          Primary
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {account.accountType
                        ? `${account.accountType
                            .charAt(0)
                            .toUpperCase()}${account.accountType.slice(
                            1,
                          )} Account`
                        : "Bank Account"}
                    </p>
                  </div>

                  {statusBadge(
                    account.verificationStatus,
                  )}
                </div>

                {/* PRIMARY ACCOUNT MESSAGE */}

                {isPrimaryVerified && (
                  <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-3">
                    <div className="flex items-start gap-2">
                      <ShieldCheck
                        size={17}
                        className="mt-0.5 shrink-0 text-green-600"
                      />

                      <div>
                        <p className="text-xs font-semibold text-green-800">
                          Primary loan account
                        </p>

                        <p className="mt-1 text-xs leading-5 text-green-700">
                          This account will be used
                          automatically for loan disbursement
                          and Direct Debit repayment
                          authorization.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ACCOUNT DETAILS */}

                <div className="mt-5 rounded-xl bg-gray-50 p-4">
                  <p className="text-xs text-gray-500">
                    Account Name
                  </p>

                  <p className="mt-1 font-semibold text-gray-900">
                    {account.accountName ||
                      (isVerified
                        ? "Verified account"
                        : "Not verified yet")}
                  </p>

                  <p className="mt-3 text-xs text-gray-500">
                    Account Number
                  </p>

                  <p className="mt-1 font-mono font-semibold text-gray-900">
                    ****
                    {account.accountNumberLast4}
                  </p>

                  {account.currency && (
                    <>
                      <p className="mt-3 text-xs text-gray-500">
                        Currency
                      </p>

                      <p className="mt-1 text-sm font-semibold text-gray-900">
                        {account.currency}
                      </p>
                    </>
                  )}

                  {verifiedAccountDate(account.verifiedAt)}
                </div>

                {/* FAILED NOTICE */}

                {isFailed && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3">
                    <div className="flex items-start gap-2">
                      <XCircle
                        size={17}
                        className="mt-0.5 shrink-0 text-red-500"
                      />

                      <p className="text-xs leading-5 text-red-700">
                        We could not verify this bank
                        account. Check the selected bank and
                        account number, then try again.
                      </p>
                    </div>
                  </div>
                )}

                {/* ACTIONS */}

                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  {!isVerified && (
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() =>
                        void verifyAccount(
                          account._id,
                        )
                      }
                      className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {processing
                        ? "Verifying..."
                        : isFailed
                          ? "Try Again"
                          : "Verify Account"}
                    </button>
                  )}

                  {isVerified &&
                    !account.isPrimary && (
                      <button
                        type="button"
                        disabled={processing}
                        onClick={() =>
                          void setPrimary(
                            account._id,
                          )
                        }
                        className="rounded-xl border border-orange-200 px-4 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {processing
                          ? "Updating..."
                          : "Make Primary"}
                      </button>
                    )}

                  {isPrimaryVerified && (
                    <span className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-green-600">
                      <CheckCircle size={16} />
                      Ready for loans
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// =====================================================
// VERIFIED DATE
// =====================================================

function verifiedAccountDate(
  verifiedAt?: string | null,
) {
  if (!verifiedAt) {
    return null;
  }

  const date = new Date(verifiedAt);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return (
    <p className="mt-3 text-xs text-green-600">
      Verified on {date.toLocaleDateString()}
    </p>
  );
}