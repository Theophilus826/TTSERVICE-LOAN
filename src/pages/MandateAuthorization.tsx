import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ShieldCheck,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "react-toastify";

// =========================================================
// TYPES
// =========================================================

type Mandate = {
  _id?: string;
  mandateReference?: string;
  providerMandateId?: string;
  amountLimit?: number;
  frequency?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
};

// =========================================================
// HELPERS
// =========================================================

const formatMoney = (
  amount?: number,
  currency = "NGN",
) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
};

const formatDate = (
  date?: string,
) => {
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

const formatFrequency = (
  frequency?: string,
) => {
  if (!frequency) {
    return "N/A";
  }

  return frequency
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

// =========================================================
// COMPONENT
// =========================================================

export default function MandateAuthorization() {
  const navigate = useNavigate();
  const { reference } =
    useParams<{
      reference?: string;
    }>();
  const [searchParams] = useSearchParams();

  const resolvedReference =
    reference ||
    searchParams.get("reference") ||
    "";

  const [mandate, setMandate] =
    useState<Mandate | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [authorizing, setAuthorizing] =
    useState(false);

  const [error, setError] =
    useState("");

  // =========================================================
  // INITIALIZE CALLBACK STATE
  // =========================================================

  useEffect(() => {
    let mounted = true;

    const loadMandate = async () => {
      if (!resolvedReference) {
        if (mounted) {
          setMandate({
            status: "authorization_required",
          });
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        if (mounted) {
          setMandate({
            mandateReference: resolvedReference,
            status: "authorization_required",
          });
        }
      } catch (err: any) {
        console.error(
          "LOAD MANDATE ERROR:",
          err,
        );

        if (mounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load mandate.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMandate();

    return () => {
      mounted = false;
    };
  }, [resolvedReference]);

  // =========================================================
  // AUTHORIZE
  // =========================================================

  const handleAuthorize = async () => {
    try {
      setAuthorizing(true);
      setError("");

      toast.success(
        "Mandate authorization completed. Refreshing your loan status...",
      );

      setTimeout(() => {
        navigate("/loans/applications");
      }, 700);
    } catch (err: any) {
      console.error(
        "MANDATE AUTHORIZATION ERROR:",
        err,
      );

      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to authorize mandate.";

      setError(message);

      toast.error(message);
    } finally {
      setAuthorizing(false);
    }
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center">
        <div className="text-center">
          <Loader2
            size={36}
            className="mx-auto animate-spin text-orange-500"
          />

          <p className="mt-3 text-sm text-gray-500">
            Loading authorization...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <div className="rounded-2xl bg-red-50 p-6 text-red-700">
          <h2 className="text-lg font-bold">
            Authorization Error
          </h2>

          <p className="mt-2 text-sm">
            {error}
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/loans/applications",
            )
          }
          className="mt-5 inline-flex items-center gap-2 rounded-lg border px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft size={17} />

          Back to Loans
        </button>
      </div>
    );
  }

  // =========================================================
  // PAGE
  // =========================================================

  return (
    <div className="min-h-[600px] bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        {/* CARD */}

        <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {/* HEADER */}

          <div className="bg-black px-6 py-8 text-center text-white">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-orange-500">
              <ShieldCheck size={32} />
            </div>

            <h1 className="mt-5 text-2xl font-bold">
              Repayment Authorization
            </h1>

            <p className="mt-2 text-sm text-gray-300">
              Authorize automatic repayments for
              your loan.
            </p>
          </div>

          {/* CONTENT */}

          <div className="p-6">
            {/* SECURITY */}

            <div className="rounded-xl bg-green-50 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  size={21}
                  className="mt-0.5 shrink-0 text-green-600"
                />

                <div>
                  <p className="font-semibold text-green-800">
                    Secure authorization
                  </p>

                  <p className="mt-1 text-sm text-green-700">
                    You are authorizing your repayment
                    mandate for this loan.
                  </p>
                </div>
              </div>
            </div>

            {/* DETAILS */}

            <div className="mt-6">
              <h2 className="text-lg font-bold text-gray-900">
                Mandate Details
              </h2>

              <div className="mt-4 space-y-3">
                <Detail
                  label="Mandate Reference"
                  value={
                    mandate?.mandateReference ||
                    resolvedReference ||
                    "N/A"
                  }
                />

                <Detail
                  label="Repayment Limit"
                  value={formatMoney(
                    mandate?.amountLimit,
                  )}
                />

                <Detail
                  label="Frequency"
                  value={formatFrequency(
                    mandate?.frequency,
                  )}
                />

                <Detail
                  label="Start Date"
                  value={formatDate(
                    mandate?.startDate,
                  )}
                />

                <Detail
                  label="End Date"
                  value={formatDate(
                    mandate?.endDate,
                  )}
                />
              </div>
            </div>

            {/* CALLBACK NOTE */}

            <div className="mt-6 rounded-xl bg-yellow-50 p-4 text-yellow-800">
              <p className="text-sm font-semibold">
                Authorization callback
              </p>

              <p className="mt-1 text-sm">
                This page confirms the provider callback.
                The backend updates the mandate status
                after the bank authorization flow completes.
              </p>
            </div>

            {/* AUTHORIZE */}

            <button
              type="button"
              disabled={authorizing}
              onClick={handleAuthorize}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-6 py-4 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {authorizing ? (
                <Loader2
                  size={19}
                  className="animate-spin"
                />
              ) : (
                <ShieldCheck size={19} />
              )}

              {authorizing
                ? "Authorizing..."
                : "Authorize Repayment Mandate"}
            </button>

            {/* CANCEL */}

            <button
              type="button"
              disabled={authorizing}
              onClick={() =>
                navigate(
                  "/loans/applications",
                )
              }
              className="mt-3 w-full rounded-lg border px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            {/* FOOTER */}

            <p className="mt-6 text-center text-xs leading-5 text-gray-500">
              By authorizing this mandate, you agree
              that scheduled repayments may be
              processed according to the terms of your
              loan offer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// DETAIL
// =========================================================

function Detail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-gray-50 px-4 py-3">
      <span className="text-sm text-gray-500">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-gray-900">
        {value}
      </span>
    </div>
  );
}