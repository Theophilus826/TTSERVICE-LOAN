
import {
  useEffect,
  useState,
} from "react";

import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock3,
  Loader2,
  ShieldCheck,
} from "lucide-react";

import {
  Link,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import { toast } from "react-toastify";

import autoDebitApi from "../services/autoDebitApi";

import repaymentApi from "../services/repaymentApi";

// =========================================================
// HELPERS
// =========================================================

const formatMoney = (
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

// =========================================================
// COMPONENT
// =========================================================

export default function AutoDebit() {
  const navigate = useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const repaymentScheduleId =
    searchParams.get(
      "schedule",
    );

  const [
    schedule,
    setSchedule,
  ] = useState<any>(null);

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  // =======================================================
  // LOAD SCHEDULE
  // =======================================================

  useEffect(() => {
    const loadSchedule =
      async () => {
        if (
          !repaymentScheduleId
        ) {
          toast.error(
            "Repayment schedule is missing.",
          );

          setLoading(false);

          return;
        }

        try {
          const response =
            await repaymentApi
              .getRepaymentSchedule(
                repaymentScheduleId,
              );

          if (
            !response.success ||
            !response.data
          ) {
            throw new Error(
              response.message ||
                "Unable to load repayment schedule.",
            );
          }

          setSchedule(
            response.data,
          );

          setAmount(
            String(
              response.data
                .amountOutstanding ||
                0,
            ),
          );
        } catch (error: any) {
          toast.error(
            error?.response?.data
              ?.message ||
              error?.message ||
              "Unable to load repayment schedule.",
          );
        } finally {
          setLoading(false);
        }
      };

    loadSchedule();
  }, [
    repaymentScheduleId,
  ]);

  // =======================================================
  // SUBMIT
  // =======================================================

  const handleSubmit =
    async (
      event: React.FormEvent,
    ) => {
      event.preventDefault();

      if (
        !repaymentScheduleId
      ) {
        toast.error(
          "Repayment schedule is missing.",
        );

        return;
      }

      const paymentAmount =
        Number(amount);

      const outstanding =
        Number(
          schedule?.amountOutstanding ||
            0,
        );

      if (
        !Number.isFinite(
          paymentAmount,
        ) ||
        paymentAmount <= 0
      ) {
        toast.error(
          "Enter a valid amount.",
        );

        return;
      }

      if (
        paymentAmount >
        outstanding
      ) {
        toast.error(
          "Amount cannot exceed your outstanding balance.",
        );

        return;
      }

      try {
        setSubmitting(true);

        const response =
          await autoDebitApi
            .initiateAutoDebit({
              repaymentScheduleId,

              amount:
                paymentAmount,
            });

        if (
          !response.success ||
          !response.data
        ) {
          throw new Error(
            response.message ||
              "Unable to initiate auto debit.",
          );
        }

        toast.success(
          "Auto debit initiated successfully.",
        );

        navigate(
          `/repayments/auto-debit/${response.data._id}`,
        );
      } catch (error: any) {
        toast.error(
          error?.response?.data
            ?.message ||
            error?.message ||
            "Unable to initiate auto debit.",
        );
      } finally {
        setSubmitting(false);
      }
    };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2
          size={35}
          className="animate-spin text-orange-500"
        />
      </div>
    );
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="mx-auto max-w-4xl p-6">
      <Link
        to="/repayments"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-orange-500"
      >
        <ArrowLeft size={16} />
        Back to Repayments
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
            <Banknote size={25} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Automatic Repayment
            </h1>

            <p className="text-sm text-gray-500">
              Pay your loan using your active
              debit mandate.
            </p>
          </div>
        </div>
      </div>

      {/* BALANCE */}

      <div className="mb-6 rounded-2xl bg-black p-6 text-white">
        <p className="text-sm text-gray-400">
          Outstanding Balance
        </p>

        <p className="mt-2 text-4xl font-bold">
          {formatMoney(
            Number(
              schedule?.amountOutstanding ||
                0,
            ),
            schedule?.currency ||
              "NGN",
          )}
        </p>

        <p className="mt-3 text-sm text-gray-400">
          Loan reference:{" "}
          {schedule?.loanApplication
            ?.applicationNumber ||
            "N/A"}
        </p>
      </div>

      {/* FORM */}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-gray-900">
          Debit Amount
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Enter the amount you want to
          automatically debit.
        </p>

        <div className="mt-6">
          <label className="mb-2 block text-sm font-semibold text-gray-700">
            Amount
          </label>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-gray-500">
              ₦
            </span>

            <input
              type="number"
              min="0.01"
              max={
                schedule?.amountOutstanding
              }
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value,
                )
              }
              className="w-full rounded-xl border px-10 py-3 text-lg font-semibold outline-none focus:border-orange-500"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* QUICK AMOUNT */}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              setAmount(
                String(
                  schedule?.amountOutstanding ||
                    0,
                ),
              )
            }
            className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
          >
            Pay Full Balance
          </button>
        </div>

        {/* SECURITY */}

        <div className="mt-6 rounded-xl bg-gray-50 p-4">
          <div className="flex gap-3">
            <ShieldCheck
              size={22}
              className="shrink-0 text-green-600"
            />

            <div>
              <p className="font-semibold text-gray-900">
                Secure automatic debit
              </p>

              <p className="mt-1 text-sm text-gray-500">
                Your payment will be processed
                through your active repayment
                mandate.
              </p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={
            submitting ||
            !schedule
          }
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3.5 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2
                size={18}
                className="animate-spin"
              />

              Processing...
            </>
          ) : (
            <>
              <CheckCircle2 size={18} />

              Start Automatic Payment
            </>
          )}
        </button>
      </form>
    </div>
  );
}

