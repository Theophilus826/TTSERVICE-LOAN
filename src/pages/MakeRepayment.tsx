import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Loader2,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";

import repaymentApi, {
  type PaymentMethod,
  type RepaymentSchedule,
} from "../services/repaymentApi";

// =========================================================
// HELPERS
// =========================================================

const roundMoney = (amount: number) =>
  Math.round((Number(amount) + Number.EPSILON) * 100) / 100;

const formatMoney = (amount: number, currency = "NGN") => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const formatDate = (date?: string | null) => {
  if (!date) {
    return "N/A";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "N/A";
  }

  return parsed.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

// =========================================================
// COMPONENT
// =========================================================

export default function MakeRepayment() {
  const navigate = useNavigate();

  const { repaymentScheduleId } = useParams<{
    repaymentScheduleId?: string;
  }>();

  const [schedule, setSchedule] = useState<RepaymentSchedule | null>(null);

  const [amount, setAmount] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  const [loading, setLoading] = useState(true);

  const [processing, setProcessing] = useState(false);

  const [error, setError] = useState("");

  // =========================================================
  // LOAD SCHEDULE
  // =========================================================

  useEffect(() => {
  let mounted = true;

  const loadSchedule = async () => {
    if (!repaymentScheduleId) {
      if (mounted) {
        setError("Repayment schedule ID is missing.");
        setLoading(false);
      }

      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await repaymentApi.getRepaymentSchedule(
          repaymentScheduleId,
        );

      if (!response.success || !response.data) {
        throw new Error(
          response.message ||
            "Repayment schedule not found.",
        );
      }

      if (!mounted) {
        return;
      }

      setSchedule(response.data);

      const outstanding = roundMoney(
        Number(
          response.data.amountOutstanding || 0,
        ),
      );

      if (outstanding > 0) {
        setAmount(
          outstanding.toFixed(2),
        );
      }
    } catch (err: any) {
      console.error(
        "LOAD REPAYMENT SCHEDULE ERROR:",
        err?.response?.data || err,
      );

      if (mounted) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load repayment schedule.",
        );
      }
    } finally {
      if (mounted) {
        setLoading(false);
      }
    }
  };

  loadSchedule();

  return () => {
    mounted = false;
  };
}, [repaymentScheduleId]);

  // =========================================================
  // VALUES
  // =========================================================

  const outstanding = roundMoney(Number(schedule?.amountOutstanding || 0));

  const paymentAmount = Number(amount);

  const amountIsValid =
    Number.isFinite(paymentAmount) &&
    paymentAmount > 0 &&
    paymentAmount <= outstanding;

  const isFullPayment =
    amountIsValid && roundMoney(paymentAmount) === roundMoney(outstanding);

  const remainingAfterPayment = useMemo(() => {
    if (!amountIsValid) {
      return outstanding;
    }

    return roundMoney(Math.max(0, outstanding - paymentAmount));
  }, [amountIsValid, outstanding, paymentAmount]);

  // =========================================================
  // SUBMIT
  // =========================================================

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!schedule) {
      toast.error("Repayment schedule not found.");
      return;
    }

    if (processing) {
      return;
    }

    // -----------------------------------------------
    // Validate amount
    // -----------------------------------------------

    if (!amount.trim()) {
      toast.error("Enter the repayment amount.");
      return;
    }

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      toast.error("Enter a valid repayment amount.");
      return;
    }

    if (paymentAmount > outstanding) {
      toast.error(
        `Payment cannot exceed your outstanding balance of ${formatMoney(
          outstanding,
          schedule.currency,
        )}.`,
      );
      return;
    }

    // -----------------------------------------------
    // Validate payment method
    // -----------------------------------------------

    if (!paymentMethod) {
      toast.error("Select a payment method.");
      return;
    }

    try {
      setProcessing(true);

      const response = await repaymentApi.initiateRepayment({
        repaymentScheduleId: schedule._id,

        amount: roundMoney(paymentAmount),

        paymentMethod,
      });

      if (!response.success) {
        throw new Error(response.message || "Unable to initialize repayment.");
      }

      const payment = response.data?.payment;

      // =================================================
      // PROVIDER REDIRECT
      // =================================================

      if (payment?.authorizationUrl) {
        toast.success("Payment initialized. Redirecting...");

        window.location.assign(payment.authorizationUrl);

        return;
      }

      // =================================================
      // NO AUTHORIZATION URL
      // =================================================

      /*
       * With the current backend, initiateRepayment
       * is expected to initialize a provider payment.
       *
       * If no authorizationUrl is returned, do not
       * call makeRepayment() here. The repayment should
       * only become successful after the provider confirms
       * payment through your backend callback/webhook.
       */

      toast.info(
        response.message ||
          "Payment has been initialized. Check your payment instructions.",
      );

      navigate("/loans/repayments/history");
    } catch (err: any) {
      console.error("INITIATE REPAYMENT ERROR:", err?.response?.data || err);

      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to initialize repayment.",
      );
    } finally {
      setProcessing(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <Loader2 size={36} className="mx-auto animate-spin text-orange-500" />

          <p className="mt-3 text-sm text-gray-500">
            Loading repayment details...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR / NOT FOUND
  // =========================================================

  if (error || !schedule) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
          <AlertCircle size={45} className="mx-auto text-red-400" />

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Repayment schedule not found
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            {error || "We could not find the repayment schedule for this loan."}
          </p>

          <Link
            to="/loans/repayments/history"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <ArrowLeft size={16} />
            Back to Repayments
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================
  // ALREADY PAID
  // =========================================================

  if (schedule.status === "paid" || outstanding <= 0) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
          <CheckCircle2 size={50} className="mx-auto text-green-500" />

          <h2 className="mt-4 text-xl font-bold text-gray-900">
            Loan Fully Repaid
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            This loan has no outstanding repayment balance.
          </p>

          <Link
            to="/loans/repayments/history"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800"
          >
            View Repayment History
          </Link>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="mb-6">
        <Link
          to={`/loans/repayments/schedule/${repaymentScheduleId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-500"
        >
          <ArrowLeft size={16} />
          Back to Schedule
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Banknote size={25} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">Make Repayment</h1>

            <p className="text-sm text-gray-500">
              Pay your outstanding loan balance
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================
          SUMMARY
      =================================================== */}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SummaryCard
          label="Total Repayment"
          value={formatMoney(schedule.totalRepaymentAmount, schedule.currency)}
        />

        <SummaryCard
          label="Amount Paid"
          value={formatMoney(schedule.amountPaid, schedule.currency)}
        />

        <SummaryCard
          label="Outstanding"
          value={formatMoney(outstanding, schedule.currency)}
          highlight
        />
      </div>

      {/* ===================================================
          LOAN DETAILS
      =================================================== */}

      <div className="mb-6 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Loan Repayment</h2>

            <p className="text-sm text-gray-500">
              {typeof schedule.loanApplication === "object"
                ? schedule.loanApplication?.applicationNumber || "Loan"
                : "Loan"}
            </p>
          </div>

          <div className="flex w-fit items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <CalendarDays size={14} />
            Due {formatDate(schedule.finalDueDate)}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Detail
            label="Principal"
            value={formatMoney(schedule.principalAmount, schedule.currency)}
          />

          <Detail
            label="Interest"
            value={formatMoney(schedule.totalInterest, schedule.currency)}
          />

          <Detail
            label="Fees"
            value={formatMoney(schedule.totalFees, schedule.currency)}
          />
        </div>
      </div>

      {/* ===================================================
          PAYMENT FORM
      =================================================== */}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-gray-900">Payment Details</h2>

        <p className="mt-1 text-sm text-gray-500">
          Choose how much you want to pay and your preferred payment method.
        </p>

        {/* =================================================
            AMOUNT
        ================================================= */}

        <div className="mt-6">
          <label
            htmlFor="amount"
            className="mb-2 block text-sm font-semibold text-gray-700"
          >
            Repayment Amount
          </label>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
              ₦
            </span>

            <input
              id="amount"
              name="amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              max={outstanding}
              step="0.01"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
              }}
              disabled={processing}
              placeholder="Enter amount"
              className="w-full rounded-xl border border-gray-200 py-3 pl-9 pr-4 text-lg font-semibold outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-gray-500">
              Maximum: {formatMoney(outstanding, schedule.currency)}
            </span>

            <button
              type="button"
              disabled={processing}
              onClick={() => setAmount(outstanding.toFixed(2))}
              className="font-semibold text-orange-500 hover:text-orange-600 disabled:opacity-50"
            >
              Pay full balance
            </button>
          </div>

          {paymentAmount > outstanding && (
            <p className="mt-2 text-sm text-red-600">
              Amount cannot exceed {formatMoney(outstanding, schedule.currency)}
              .
            </p>
          )}
        </div>

        {/* =================================================
            PAYMENT METHODS
        ================================================= */}

        <div className="mt-6">
          <p className="mb-3 text-sm font-semibold text-gray-700">
            Payment Method
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <PaymentMethodButton
              selected={paymentMethod === "card"}
              label="Card"
              icon={<CreditCard size={20} />}
              onClick={() => setPaymentMethod("card")}
              disabled={processing}
            />

            <PaymentMethodButton
              selected={paymentMethod === "bank_transfer"}
              label="Bank Transfer"
              icon={<Banknote size={20} />}
              onClick={() => setPaymentMethod("bank_transfer")}
              disabled={processing}
            />

            <PaymentMethodButton
              selected={paymentMethod === "wallet"}
              label="Wallet"
              icon={<Wallet size={20} />}
              onClick={() => setPaymentMethod("wallet")}
              disabled={processing}
            />
          </div>
        </div>

        {/* =================================================
            PAYMENT SUMMARY
        ================================================= */}

        <div className="mt-6 rounded-xl bg-gray-50 p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Payment</span>

            <span className="font-semibold text-gray-900">
              {formatMoney(
                Number.isFinite(paymentAmount) ? paymentAmount : 0,
                schedule.currency,
              )}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-gray-500">Remaining balance</span>

            <span className="font-semibold text-gray-900">
              {formatMoney(remainingAfterPayment, schedule.currency)}
            </span>
          </div>

          {isFullPayment && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">
              <CheckCircle2 size={17} />
              This payment will fully repay the loan.
            </div>
          )}
        </div>

        {/* =================================================
            SUBMIT
        ================================================= */}

        <button
          type="submit"
          disabled={processing || !amountIsValid}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Initializing Payment...
            </>
          ) : (
            <>
              <CreditCard size={18} />
              Continue to Payment
            </>
          )}
        </button>

        <p className="mt-4 text-center text-xs text-gray-400">
          You will be redirected to the secure payment provider to complete your
          repayment.
        </p>
      </form>
    </div>
  );
}

// =========================================================
// SUMMARY CARD
// =========================================================

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm ${
        highlight ? "border-orange-200 bg-orange-50" : "bg-white"
      }`}
    >
      <p className="text-sm text-gray-500">{label}</p>

      <p
        className={`mt-2 text-xl font-bold ${
          highlight ? "text-orange-600" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

// =========================================================
// DETAIL
// =========================================================

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <p className="text-sm text-gray-500">{label}</p>

      <p className="mt-1 font-semibold text-gray-900">{value}</p>
    </div>
  );
}

// =========================================================
// PAYMENT METHOD BUTTON
// =========================================================

function PaymentMethodButton({
  selected,
  label,
  icon,
  onClick,
  disabled,
}: {
  selected: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        selected
          ? "border-orange-500 bg-orange-50 text-orange-600 ring-2 ring-orange-100"
          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {icon}

      <span className="text-sm font-semibold">{label}</span>

      {selected && <CheckCircle2 size={17} className="ml-auto" />}
    </button>
  );
}
