
import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  ChevronRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import { toast } from "react-toastify";

import loanApi, {
  type EmploymentStatus,
  type LoanPreview,
  type LoanProduct,
} from "../services/loanApi";

import { getApiErrorMessage } from "../services/Api";

export default function LoanApplication() {
  const { productId } =
    useParams<{ productId: string }>();

  const navigate = useNavigate();

  const [product, setProduct] =
    useState<LoanProduct | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [previewing, setPreviewing] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [step, setStep] =
    useState<1 | 2>(1);

  const [amountRequested, setAmountRequested] =
    useState("");

  const [durationDays, setDurationDays] =
    useState("");

  const [purpose, setPurpose] =
    useState("");

  const [monthlyIncome, setMonthlyIncome] =
    useState("");

  const [employmentStatus, setEmploymentStatus] =
    useState<EmploymentStatus | "">("");

  const [preview, setPreview] =
    useState<LoanPreview | null>(null);

  // =======================================================
  // LOAD PRODUCT
  // =======================================================

  useEffect(() => {
    let mounted = true;

    const loadProduct = async () => {
      if (!productId) {
        toast.error(
          "Loan product was not specified.",
        );

        navigate("/loans", {
          replace: true,
        });

        return;
      }

      try {
        setLoading(true);

        const result =
          await loanApi.getLoanProduct(
            productId,
          );

        if (!mounted) return;

        setProduct(result);

        setAmountRequested(
          String(result.minAmount),
        );

        setDurationDays(
          String(result.minDurationDays),
        );
      } catch (error: unknown) {
        if (!mounted) return;

        console.error(
          "Failed to load loan product:",
          error,
        );

        toast.error(
          getApiErrorMessage(
            error,
            "Loan product is unavailable.",
          ),
        );

        navigate("/loans", {
          replace: true,
        });
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      mounted = false;
    };
  }, [productId, navigate]);

  // =======================================================
  // FORMATTERS
  // =======================================================

  const formatAmount = (
    amount: number,
    currency = "NGN",
  ) => {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      },
    ).format(amount);
  };

  // =======================================================
  // VALIDATION
  // =======================================================

  const validateForm = () => {
    if (!productId || !product) {
      toast.error(
        "Loan product was not specified.",
      );

      return false;
    }

    const amount =
      Number(amountRequested);

    const duration =
      Number(durationDays);

    const income =
      Number(monthlyIncome);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error(
        "Please enter a valid loan amount.",
      );

      return false;
    }

    if (
      amount < product.minAmount ||
      amount > product.maxAmount
    ) {
      toast.error(
        `Loan amount must be between ${formatAmount(
          product.minAmount,
          product.currency,
        )} and ${formatAmount(
          product.maxAmount,
          product.currency,
        )}.`,
      );

      return false;
    }

    if (
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      toast.error(
        "Please enter a valid loan duration.",
      );

      return false;
    }

    if (
      duration < product.minDurationDays ||
      duration > product.maxDurationDays
    ) {
      toast.error(
        `Loan duration must be between ${product.minDurationDays} and ${product.maxDurationDays} days.`,
      );

      return false;
    }

    if (
      !monthlyIncome ||
      !Number.isFinite(income) ||
      income <= 0
    ) {
      toast.error(
        "Please enter your monthly income.",
      );

      return false;
    }

    if (!employmentStatus) {
      toast.error(
        "Please select your employment status.",
      );

      return false;
    }

    return true;
  };

  // =======================================================
  // PREVIEW
  // =======================================================

  const handlePreview = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!validateForm()) return;

    if (!productId) return;

    try {
      setPreviewing(true);

      const result =
        await loanApi.previewLoan({
          loanProductId: productId,
          amountRequested:
            Number(amountRequested),
          durationDays:
            Number(durationDays),
        });

      setPreview(result);

      setStep(2);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error: unknown) {
      console.error(
        "Loan preview failed:",
        error,
      );

      handleLoanError(error);
    } finally {
      setPreviewing(false);
    }
  };

  // =======================================================
  // SUBMIT APPLICATION
  // =======================================================

  const handleSubmit = async () => {
    if (!productId || !preview) {
      toast.error(
        "Please review your loan before submitting.",
      );

      return;
    }

    /*
     * Validate again because the user can return
     * to step 1 and modify the application.
     */
    if (!validateForm()) {
      setStep(1);
      return;
    }

    try {
      setSubmitting(true);

      const application =
        await loanApi.createLoanApplication({
          loanProductId: productId,

          amountRequested:
            Number(amountRequested),

          durationDays:
            Number(durationDays),

          purpose:
            purpose.trim() || undefined,

          monthlyIncome:
            Number(monthlyIncome),

          employmentStatus:
            employmentStatus as EmploymentStatus,
        });

      console.log(
        "LOAN APPLICATION CREATED:",
        application,
      );

      toast.success(
        "Loan application submitted successfully.",
      );

      navigate("/dashboard", {
        replace: true,
      });
    } catch (error: unknown) {
      console.error(
        "Loan application failed:",
        error,
      );

      handleLoanError(error);
    } finally {
      setSubmitting(false);
    }
  };

  // =======================================================
  // ERROR HANDLING
  // =======================================================

  const handleLoanError = (
    error: unknown,
  ) => {
    const axiosError =
      error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            errors?: Record<
              string,
              unknown
            >;
          };
        };
      };

    const status =
      axiosError.response?.status;

    const responseData =
      axiosError.response?.data;

    const message =
      responseData?.message ||
      getApiErrorMessage(
        error,
        "Unable to process your loan application.",
      );

    const lowerMessage =
      message.toLowerCase();

    // -----------------------------------------------------
    // ACTIVE APPLICATION
    // -----------------------------------------------------

    if (
      lowerMessage.includes(
        "active loan application",
      )
    ) {
      toast.warning(
        "You already have an active loan application. Please wait for it to be reviewed.",
      );

      return;
    }

    // -----------------------------------------------------
    // KYC
    // -----------------------------------------------------

    if (
      lowerMessage.includes(
        "complete your kyc",
      ) ||
      lowerMessage.includes(
        "kyc must be verified",
      ) ||
      lowerMessage.includes(
        "kyc verification",
      )
    ) {
      toast.warning(
        "Your KYC must be verified before applying for a loan.",
      );

      navigate("/kyc");

      return;
    }

    // -----------------------------------------------------
    // BANK ACCOUNT
    // -----------------------------------------------------

    if (
      lowerMessage.includes(
        "primary bank account",
      ) ||
      lowerMessage.includes(
        "bank account",
      )
    ) {
      toast.warning(
        "Please add and verify a primary bank account before applying for a loan.",
      );

      navigate("/bank-accounts");

      return;
    }

    // -----------------------------------------------------
    // LOAN PRODUCT
    // -----------------------------------------------------

    if (
      lowerMessage.includes(
        "loan product",
      )
    ) {
      toast.error(message);

      navigate("/loans");

      return;
    }

    // -----------------------------------------------------
    // VALIDATION ERRORS
    // -----------------------------------------------------

    if (
      status === 400 &&
      responseData?.errors
    ) {
      const firstError =
        Object.values(
          responseData.errors,
        )[0];

      toast.error(
        typeof firstError === "string"
          ? firstError
          : message,
      );

      return;
    }

    // -----------------------------------------------------
    // DEFAULT
    // -----------------------------------------------------

    toast.error(message);
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Loader2
            className="mx-auto mb-3 animate-spin text-orange-500"
            size={35}
          />

          <p className="text-sm text-gray-500">
            Loading loan product...
          </p>
        </div>
      </div>
    );
  }

  // =======================================================
  // PRODUCT NOT FOUND
  // =======================================================

  if (!product) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <Banknote
          className="mx-auto mb-4 text-gray-300"
          size={48}
        />

        <h2 className="text-lg font-semibold text-gray-900">
          Loan product unavailable
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          The selected loan product could not be found.
        </p>

        <Link
          to="/loans"
          className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Back to Loans
        </Link>
      </div>
    );
  }

  // =======================================================
  // PAGE
  // =======================================================

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}

      <div className="flex items-center gap-3">
        <Link
          to="/loans"
          className="rounded-xl border border-gray-200 bg-white p-2.5 text-gray-600 hover:bg-gray-50"
        >
          <ArrowLeft size={19} />
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Apply for a Loan
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            {step === 1
              ? "Enter your loan application details."
              : "Review your loan terms before submitting."}
          </p>
        </div>
      </div>

      {/* Progress */}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                step >= 1
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {step > 1 ? (
                <CheckCircle2 size={18} />
              ) : (
                "1"
              )}
            </div>

            <span className="text-sm font-medium text-gray-700">
              Application
            </span>
          </div>

          <div className="mx-4 h-px flex-1 bg-gray-200" />

          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                step === 2
                  ? "bg-orange-500 text-white"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              2
            </div>

            <span className="text-sm font-medium text-gray-700">
              Review
            </span>
          </div>
        </div>
      </div>

      {/* Product */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-orange-100 p-3">
            <Banknote
              size={25}
              className="text-orange-500"
            />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              {product.name}
            </h2>

            {product.code && (
              <p className="text-xs text-gray-400">
                {product.code}
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t pt-5 sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-400">
              Minimum
            </p>

            <p className="mt-1 text-sm font-semibold">
              {formatAmount(
                product.minAmount,
                product.currency,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">
              Maximum
            </p>

            <p className="mt-1 text-sm font-semibold">
              {formatAmount(
                product.maxAmount,
                product.currency,
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">
              Interest
            </p>

            <p className="mt-1 text-sm font-semibold">
              {product.interestRate}%
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-400">
              Repayment
            </p>

            <p className="mt-1 text-sm font-semibold capitalize">
              {product.repaymentFrequency}
            </p>
          </div>
        </div>
      </div>

      {/* =================================================
          STEP 1
          ================================================= */}

      {step === 1 && (
        <form
          onSubmit={handlePreview}
          className="rounded-2xl bg-white p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Application Details
          </h2>

          <div className="mt-6 space-y-5">
            {/* Amount */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Loan Amount
              </label>

              <input
                type="number"
                min={product.minAmount}
                max={product.maxAmount}
                step="0.01"
                value={amountRequested}
                onChange={(event) =>
                  setAmountRequested(
                    event.target.value,
                  )
                }
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />

              <p className="mt-1 text-xs text-gray-400">
                {formatAmount(
                  product.minAmount,
                  product.currency,
                )}{" "}
                -{" "}
                {formatAmount(
                  product.maxAmount,
                  product.currency,
                )}
              </p>
            </div>

            {/* Duration */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Loan Duration
              </label>

              <input
                type="number"
                min={product.minDurationDays}
                max={product.maxDurationDays}
                step="1"
                value={durationDays}
                onChange={(event) =>
                  setDurationDays(
                    event.target.value,
                  )
                }
                required
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />

              <p className="mt-1 text-xs text-gray-400">
                {product.minDurationDays} -{" "}
                {product.maxDurationDays} days
              </p>
            </div>

            {/* Income */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Monthly Income
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                value={monthlyIncome}
                onChange={(event) =>
                  setMonthlyIncome(
                    event.target.value,
                  )
                }
                required
                placeholder="Enter your monthly income"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </div>

            {/* Employment */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Employment Status
              </label>

              <select
                value={employmentStatus}
                onChange={(event) =>
                  setEmploymentStatus(
                    event.target
                      .value as
                      | EmploymentStatus
                      | "",
                  )
                }
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              >
                <option value="">
                  Select employment status
                </option>

                <option value="employed">
                  Employed
                </option>

                <option value="self_employed">
                  Self Employed
                </option>

                <option value="business_owner">
                  Business Owner
                </option>

                <option value="student">
                  Student
                </option>

                <option value="unemployed">
                  Unemployed
                </option>

                <option value="retired">
                  Retired
                </option>

                <option value="other">
                  Other
                </option>
              </select>
            </div>

            {/* Purpose */}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Loan Purpose
              </label>

              <textarea
                value={purpose}
                onChange={(event) =>
                  setPurpose(
                    event.target.value,
                  )
                }
                maxLength={500}
                rows={4}
                placeholder="Tell us what you need the loan for..."
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />

              <p className="mt-1 text-right text-xs text-gray-400">
                {purpose.length}/500
              </p>
            </div>

            {/* Preview */}

            <button
              type="submit"
              disabled={previewing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {previewing && (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              )}

              {previewing
                ? "Calculating Loan..."
                : "Review Loan"}

              {!previewing && (
                <ChevronRight size={18} />
              )}
            </button>
          </div>
        </form>
      )}

      {/* =================================================
          STEP 2
          ================================================= */}

      {step === 2 && preview && (
        <div className="space-y-5">
          {/* Review Header */}

          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-green-100 p-3">
                <ShieldCheck
                  size={23}
                  className="text-green-600"
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Review Your Loan
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  These terms were calculated by
                  our system. Review them carefully
                  before submitting your application.
                </p>
              </div>
            </div>
          </div>

          {/* Loan Summary */}

          <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
            <div className="border-b px-6 py-5">
              <h3 className="font-semibold text-gray-900">
                Loan Summary
              </h3>
            </div>

            <div className="divide-y">
              <SummaryRow
                label="Loan Amount"
                value={formatAmount(
                  preview.terms
                    .principalAmount,
                  preview.terms.currency,
                )}
              />

              <SummaryRow
                label="Loan Duration"
                value={`${preview.terms.durationDays} days`}
              />

              <SummaryRow
                label="Interest Rate"
                value={`${preview.terms.interestRate}% (${formatInterestType(
                  preview.terms
                    .interestType,
                )})`}
              />

              <SummaryRow
                label="Interest"
                value={formatAmount(
                  preview.terms
                    .interestAmount,
                  preview.terms.currency,
                )}
              />

              <SummaryRow
                label="Processing Fee"
                value={formatAmount(
                  preview.terms
                    .processingFee,
                  preview.terms.currency,
                )}
              />

              <SummaryRow
                label="Service Fee"
                value={formatAmount(
                  preview.terms
                    .serviceFee,
                  preview.terms.currency,
                )}
              />

              <SummaryRow
                label="Total Fees"
                value={formatAmount(
                  preview.terms.feeAmount,
                  preview.terms.currency,
                )}
              />

              <SummaryRow
                label="Repayment Frequency"
                value={capitalize(
                  preview.terms
                    .repaymentFrequency,
                )}
              />

              <SummaryRow
                label="Number of Installments"
                value={String(
                  preview.terms
                    .numberOfInstallments,
                )}
              />

              <SummaryRow
                label="Installment Amount"
                value={formatAmount(
                  preview.terms
                    .installmentAmount,
                  preview.terms.currency,
                )}
              />
            </div>

            <div className="bg-orange-50 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Repayment
                  </p>

                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {formatAmount(
                      preview.terms
                        .totalRepayment,
                      preview.terms.currency,
                    )}
                  </p>
                </div>

                <CheckCircle2
                  size={32}
                  className="text-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Application Information */}

          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <h3 className="font-semibold text-gray-900">
              Application Information
            </h3>

            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  Employment
                </span>

                <span className="font-medium capitalize text-gray-900">
                  {employmentStatus
                    ? employmentStatus.replace(
                        "_",
                        " ",
                      )
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">
                  Monthly Income
                </span>

                <span className="font-medium text-gray-900">
                  {formatAmount(
                    Number(
                      monthlyIncome,
                    ),
                    preview.terms
                      .currency,
                  )}
                </span>
              </div>

              {purpose.trim() && (
                <div className="border-t pt-3">
                  <span className="text-gray-500">
                    Purpose
                  </span>

                  <p className="mt-1 text-gray-900">
                    {purpose.trim()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submission Notice */}

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <p className="text-sm leading-6 text-blue-800">
              By submitting this application, you
              confirm that the information provided
              is accurate and agree to the displayed
              application terms. Submission does not
              guarantee loan approval. Your application
              will be reviewed before an offer is
              created.
            </p>
          </div>

          {/* Actions */}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowLeft size={18} />
              Edit Application
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {submitting && (
                <Loader2
                  size={18}
                  className="animate-spin"
                />
              )}

              {submitting
                ? "Submitting..."
                : "Confirm & Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================
// SUMMARY ROW
// =========================================================

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-6 py-4">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-gray-900">
        {value}
      </span>
    </div>
  );
}

// =========================================================
// HELPERS
// =========================================================

function capitalize(
  value: string,
) {
  if (!value) return "-";

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function formatInterestType(
  value: string,
) {
  return value ===
    "reducing_balance"
    ? "Reducing Balance"
    : "Flat";
}

