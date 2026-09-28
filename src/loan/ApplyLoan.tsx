
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Banknote, Loader2 } from "lucide-react";
import { toast } from "react-toastify";

import loanApi, {
  type LoanProduct,
} from "../services/loanApi";

interface LoanApplicationForm {
  amountRequested: string;
  durationDays: string;
  purpose: string;
  monthlyIncome: string;
  employmentStatus: string;
}

interface LoanPreview {
  principalAmount?: number;
  interestAmount?: number;
  feeAmount?: number;
  processingFee?: number;
  serviceFee?: number;
  totalRepayment?: number;
  interestRate?: number;
  interestType?: string;
  repaymentFrequency?: string;
  numberOfInstallments?: number;
  installmentAmount?: number;
  durationDays?: number;
}

export default function ApplyLoan() {
  const { productId } = useParams<{
    productId: string;
  }>();

  const navigate = useNavigate();

  const [product, setProduct] = useState<LoanProduct | null>(null);

  const [form, setForm] = useState<LoanApplicationForm>({
    amountRequested: "",
    durationDays: "",
    purpose: "",
    monthlyIncome: "",
    employmentStatus: "",
  });

  const [preview, setPreview] = useState<LoanPreview | null>(null);

  const [loading, setLoading] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // =========================================================
  // LOAD PRODUCT
  // =========================================================

  useEffect(() => {
    const loadProduct = async () => {
      if (!productId) {
        toast.error("Loan product was not specified.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const response = await loanApi.getLoanProduct(productId);

        if (!response?.success || !response?.data) {
          throw new Error(
            response?.message || "Loan product unavailable",
          );
        }

        const loadedProduct = response.data;

        setProduct(loadedProduct);

        // ---------------------------------------------------
        // Default amount
        // ---------------------------------------------------

        if (loadedProduct.minAmount !== undefined) {
          setForm((current) => ({
            ...current,
            amountRequested: String(
              loadedProduct.minAmount,
            ),
          }));
        }

        // ---------------------------------------------------
        // Default duration
        // ---------------------------------------------------

        if (loadedProduct.duration !== undefined) {
          const durationUnit =
            loadedProduct.durationUnit || "months";

          let durationDays = loadedProduct.duration;

          if (durationUnit === "months") {
            durationDays = loadedProduct.duration * 30;
          } else if (durationUnit === "weeks") {
            durationDays = loadedProduct.duration * 7;
          } else if (durationUnit === "years") {
            durationDays = loadedProduct.duration * 365;
          }

          setForm((current) => ({
            ...current,
            durationDays: String(durationDays),
          }));
        }
      } catch (error: any) {
        console.error(
          "Failed to load loan product:",
          error,
        );

        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Loan product unavailable",
        );

        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId]);

  // =========================================================
  // FORMAT MONEY
  // =========================================================

  const formatAmount = (value?: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  // =========================================================
  // FORM UPDATE
  // =========================================================

  const updateForm = (
    field: keyof LoanApplicationForm,
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    // New input invalidates an old preview.
    setPreview(null);
  };

  // =========================================================
  // VALIDATE FORM
  // =========================================================

  const validateForm = () => {
    if (!productId) {
      toast.error("Loan product was not specified.");
      return false;
    }

    if (!product) {
      toast.error("Loan product is unavailable.");
      return false;
    }

    const amountRequested = Number(
      form.amountRequested,
    );

    const durationDays = Number(
      form.durationDays,
    );

    const monthlyIncome = Number(
      form.monthlyIncome,
    );

    // -------------------------------------------------------
    // Amount
    // -------------------------------------------------------

    if (
      !Number.isFinite(amountRequested) ||
      amountRequested <= 0
    ) {
      toast.error("Enter a valid loan amount.");
      return false;
    }

    if (
      product.minAmount !== undefined &&
      amountRequested < product.minAmount
    ) {
      toast.error(
        `Minimum loan amount is ${formatAmount(
          product.minAmount,
        )}`,
      );
      return false;
    }

    if (
      product.maxAmount !== undefined &&
      amountRequested > product.maxAmount
    ) {
      toast.error(
        `Maximum loan amount is ${formatAmount(
          product.maxAmount,
        )}`,
      );
      return false;
    }

    // -------------------------------------------------------
    // Duration
    // -------------------------------------------------------

    if (
      !Number.isFinite(durationDays) ||
      durationDays <= 0
    ) {
      toast.error("Enter a valid loan duration.");
      return false;
    }

    // -------------------------------------------------------
    // Purpose
    // -------------------------------------------------------

    if (!form.purpose.trim()) {
      toast.error("Please enter the purpose of the loan.");
      return false;
    }

    // -------------------------------------------------------
    // Income
    // -------------------------------------------------------

    if (
      !Number.isFinite(monthlyIncome) ||
      monthlyIncome <= 0
    ) {
      toast.error("Enter a valid monthly income.");
      return false;
    }

    // -------------------------------------------------------
    // Employment
    // -------------------------------------------------------

    if (!form.employmentStatus) {
      toast.error("Select your employment status.");
      return false;
    }

    return true;
  };

  // =========================================================
  // PREVIEW
  // =========================================================

  const handlePreview = async () => {
    if (previewing || submitting) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setPreviewing(true);

      const response = await loanApi.previewLoan({
        loanProductId: productId as string,
        amountRequested: Number(
          form.amountRequested,
        ),
        durationDays: Number(
          form.durationDays,
        ),
        purpose: form.purpose.trim(),
        monthlyIncome: Number(
          form.monthlyIncome,
        ),
        employmentStatus:
          form.employmentStatus,
      });

      if (!response?.success || !response?.data) {
        throw new Error(
          response?.message ||
            "Unable to calculate loan preview.",
        );
      }

      setPreview(response.data);

      toast.success(
        "Loan repayment estimate calculated.",
      );
    } catch (error: any) {
      console.error(
        "Failed to preview loan:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to calculate loan preview.",
      );
    } finally {
      setPreviewing(false);
    }
  };

  // =========================================================
  // SUBMIT APPLICATION
  // =========================================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (submitting || previewing) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    // -------------------------------------------------------
    // Require preview before submission.
    // -------------------------------------------------------

    if (!preview) {
      toast.info(
        "Please calculate your repayment estimate first.",
      );
      return;
    }

    try {
      setSubmitting(true);

      const response =
        await loanApi.createLoanApplication({
          loanProductId: productId as string,
          amountRequested: Number(
            form.amountRequested,
          ),
          durationDays: Number(
            form.durationDays,
          ),
          purpose: form.purpose.trim(),
          monthlyIncome: Number(
            form.monthlyIncome,
          ),
          employmentStatus:
            form.employmentStatus,
        });

      if (!response?.success) {
        throw new Error(
          response?.message ||
            "Failed to submit loan application.",
        );
      }

      toast.success(
        response?.message ||
          "Loan application submitted successfully.",
      );

      navigate("/loans/applications", {
        replace: true,
      });
    } catch (error: any) {
      console.error(
        "Failed to submit loan application:",
        error,
      );

      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to submit loan application.";

      // -----------------------------------------------------
      // KYC / bank eligibility
      // -----------------------------------------------------

      if (
        message.toLowerCase().includes("kyc") ||
        message
          .toLowerCase()
          .includes("verification")
      ) {
        toast.error(message);
        return;
      }

      if (
        message
          .toLowerCase()
          .includes("bank account") ||
        message
          .toLowerCase()
          .includes("primary bank")
      ) {
        toast.error(message);
        return;
      }

      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <Loader2
          className="mx-auto animate-spin text-orange-500"
          size={35}
        />

        <p className="mt-3 text-sm text-gray-500">
          Loading loan product...
        </p>
      </div>
    );
  }

  // =========================================================
  // PRODUCT NOT FOUND
  // =========================================================

  if (!product) {
    return (
      <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
        <Banknote
          className="mx-auto text-gray-300"
          size={48}
        />

        <h1 className="mt-4 text-xl font-bold text-gray-900">
          Loan product unavailable
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          The selected loan product could not be found
          or is no longer available.
        </p>

        <Link
          to="/loans"
          className="mt-5 inline-flex rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Back to Loan Products
        </Link>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* =====================================================
          BACK
      ===================================================== */}

      <Link
        to="/loans"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-orange-500"
      >
        <ArrowLeft size={17} />
        Back to Loan Products
      </Link>

      {/* =====================================================
          PRODUCT
      ===================================================== */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-orange-100 p-3">
            <Banknote
              size={25}
              className="text-orange-500"
            />
          </div>

          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {product.name || "Loan Product"}
            </h1>

            {product.description && (
              <p className="mt-1 text-sm text-gray-500">
                {product.description}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          {product.minAmount !== undefined && (
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">
                Minimum
              </p>

              <p className="mt-1 font-semibold">
                {formatAmount(product.minAmount)}
              </p>
            </div>
          )}

          {product.maxAmount !== undefined && (
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">
                Maximum
              </p>

              <p className="mt-1 font-semibold">
                {formatAmount(product.maxAmount)}
              </p>
            </div>
          )}

          {product.interestRate !== undefined && (
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">
                Indicative Interest
              </p>

              <p className="mt-1 font-semibold">
                {product.interestRate}%
              </p>
            </div>
          )}

          {product.duration !== undefined && (
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-xs text-gray-500">
                Product Duration
              </p>

              <p className="mt-1 font-semibold">
                {product.duration}{" "}
                {product.durationUnit || "months"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          APPLICATION FORM
      ===================================================== */}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-semibold text-gray-900">
          Loan Application
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Provide your loan details. Final pricing is
          calculated and controlled by the server.
        </p>

        {/* ===================================================
            AMOUNT
        =================================================== */}

        <div className="mt-6">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Loan Amount
          </label>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              ₦
            </span>

            <input
              type="number"
              min={product.minAmount ?? 1}
              max={product.maxAmount ?? undefined}
              value={form.amountRequested}
              onChange={(event) =>
                updateForm(
                  "amountRequested",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              placeholder="Enter loan amount"
              required
              disabled={submitting || previewing}
            />
          </div>
        </div>

        {/* ===================================================
            DURATION
        =================================================== */}

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Repayment Duration
          </label>

          <input
            type="number"
            min={1}
            value={form.durationDays}
            onChange={(event) =>
              updateForm(
                "durationDays",
                event.target.value,
              )
            }
            className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            placeholder="Duration in days"
            required
            disabled={submitting || previewing}
          />
        </div>

        {/* ===================================================
            MONTHLY INCOME
        =================================================== */}

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Monthly Income
          </label>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
              ₦
            </span>

            <input
              type="number"
              min={1}
              value={form.monthlyIncome}
              onChange={(event) =>
                updateForm(
                  "monthlyIncome",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              placeholder="Enter monthly income"
              required
              disabled={submitting || previewing}
            />
          </div>
        </div>

        {/* ===================================================
            EMPLOYMENT STATUS
        =================================================== */}

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Employment Status
          </label>

          <select
            value={form.employmentStatus}
            onChange={(event) =>
              updateForm(
                "employmentStatus",
                event.target.value,
              )
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            required
            disabled={submitting || previewing}
          >
            <option value="">
              Select employment status
            </option>
            <option value="employed">
              Employed
            </option>
            <option value="self_employed">
              Self-employed
            </option>
            <option value="business_owner">
              Business Owner
            </option>
            <option value="contract">
              Contract
            </option>
            <option value="unemployed">
              Unemployed
            </option>
            <option value="student">
              Student
            </option>
            <option value="retired">
              Retired
            </option>
          </select>
        </div>

        {/* ===================================================
            PURPOSE
        =================================================== */}

        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Purpose of Loan
          </label>

          <textarea
            value={form.purpose}
            onChange={(event) =>
              updateForm(
                "purpose",
                event.target.value,
              )
            }
            rows={4}
            className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            placeholder="Tell us what you intend to use the loan for"
            required
            disabled={submitting || previewing}
          />
        </div>

        {/* ===================================================
            PREVIEW
        =================================================== */}

        {preview && (
          <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50 p-5">
            <h3 className="font-semibold text-gray-900">
              Repayment Estimate
            </h3>

            <div className="mt-4 space-y-3 text-sm">
              {preview.principalAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Principal
                  </span>

                  <span className="font-medium">
                    {formatAmount(
                      preview.principalAmount,
                    )}
                  </span>
                </div>
              )}

              {preview.interestAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Interest
                  </span>

                  <span className="font-medium">
                    {formatAmount(
                      preview.interestAmount,
                    )}
                  </span>
                </div>
              )}

              {preview.feeAmount !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Fees
                  </span>

                  <span className="font-medium">
                    {formatAmount(
                      preview.feeAmount,
                    )}
                  </span>
                </div>
              )}

              {preview.totalRepayment !== undefined && (
                <div className="flex justify-between border-t border-orange-200 pt-3">
                  <span className="font-semibold text-gray-900">
                    Total Repayment
                  </span>

                  <span className="font-bold text-orange-600">
                    {formatAmount(
                      preview.totalRepayment,
                    )}
                  </span>
                </div>
              )}

              {preview.installmentAmount !==
                undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Installment
                  </span>

                  <span className="font-medium">
                    {formatAmount(
                      preview.installmentAmount,
                    )}
                  </span>
                </div>
              )}

              {preview.numberOfInstallments !==
                undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Installments
                  </span>

                  <span className="font-medium">
                    {preview.numberOfInstallments}
                  </span>
                </div>
              )}

              {preview.repaymentFrequency && (
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Frequency
                  </span>

                  <span className="font-medium capitalize">
                    {preview.repaymentFrequency}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================
            ACTIONS
        =================================================== */}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handlePreview}
            disabled={submitting || previewing}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-500 px-5 py-3 font-semibold text-orange-600 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {previewing && (
              <Loader2
                size={18}
                className="animate-spin"
              />
            )}

            {previewing
              ? "Calculating..."
              : "Calculate Repayment"}
          </button>

          <button
            type="submit"
            disabled={
              submitting ||
              previewing ||
              !preview
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            {submitting && (
              <Loader2
                size={18}
                className="animate-spin"
              />
            )}

            {submitting
              ? "Submitting..."
              : "Submit Application"}
          </button>
        </div>

        {!preview && (
          <p className="mt-3 text-center text-xs text-gray-500">
            Calculate your repayment estimate before
            submitting the application.
          </p>
        )}
      </form>
    </div>
  );
}
