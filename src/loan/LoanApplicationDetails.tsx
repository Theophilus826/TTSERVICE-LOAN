import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import loanApi, {
type LoanApplication,
type LoanProduct,
} from "../services/loanApi";

function formatCurrency(
amount: number,
currency = "NGN",
) {
return new Intl.NumberFormat("en-NG", {
style: "currency",
currency,
maximumFractionDigits: 2,
}).format(amount);
}

function getStatusClasses(status?: string) {
switch (status) {
case "approved":
return "bg-green-100 text-green-700";


case "disbursed":
  return "bg-green-100 text-green-700";

case "rejected":
  return "bg-red-100 text-red-700";

case "cancelled":
  return "bg-gray-100 text-gray-700";

case "under_review":
case "credit_check":
  return "bg-yellow-100 text-yellow-700";

case "offer_created":
  return "bg-blue-100 text-blue-700";

default:
  return "bg-gray-100 text-gray-700";


}
}

function formatStatus(status?: string) {
if (!status) {
return "Unknown";
}

return status
.replace(/_/g, " ")
.replace(/\b\w/g, (letter) =>
letter.toUpperCase(),
);
}

function LoanApplicationDetails() {
const { id } = useParams<{ id: string }>();

const [application, setApplication] =
useState<LoanApplication | null>(null);

const [loading, setLoading] =
useState(true);

const [error, setError] =
useState<string | null>(null);

useEffect(() => {
if (!id) {
setError("Application ID was not provided.");
setLoading(false);
return;
}


let mounted = true;

const loadApplication = async () => {
  try {
    setLoading(true);
    setError(null);

    const data =
      await loanApi.getUserApplication(id);

    if (mounted) {
      setApplication(data);
    }
  } catch (error: any) {
    console.error(
      "Failed to load loan application:",
      error,
    );

    if (mounted) {
      setError(
        error?.response?.data?.message ||
          "Unable to load this loan application.",
      );
    }
  } finally {
    if (mounted) {
      setLoading(false);
    }
  }
};

loadApplication();

return () => {
  mounted = false;
};


}, [id]);

if (loading) {
return ( <div className="flex min-h-[300px] items-center justify-center"> <div className="text-center"> <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600" />


      <p className="text-gray-600">
        Loading application...
      </p>
    </div>
  </div>
);


}

if (!application) {
return ( <div className="mx-auto max-w-2xl"> <div className="rounded-xl border border-red-200 bg-red-50 p-6"> <h1 className="text-xl font-semibold text-red-800">
Application unavailable </h1>


      <p className="mt-2 text-sm text-red-700">
        {error ||
          "This loan application could not be found."}
      </p>

      <Link
        to="/loans/applications"
        className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        My Applications
      </Link>
    </div>
  </div>
);


}

const product =
typeof application.loanProduct === "object"
? (application.loanProduct as LoanProduct)
: null;

const isDisbursed =
application.status === "disbursed";

return ( <div className="mx-auto max-w-3xl space-y-6">


  {/* HEADER */}

  <div>
    <Link
      to="/loans/applications"
      className="text-sm font-medium text-blue-600 hover:text-blue-700"
    >
      ← My Applications
    </Link>

    <div className="mt-4 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Loan Application
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Application #{application._id}
        </p>
      </div>

      <span
        className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusClasses(
          application.status,
        )}`}
      >
        {formatStatus(application.status)}
      </span>
    </div>
  </div>

  {/* APPLICATION SUMMARY */}

  <div className="rounded-xl border bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold text-gray-900">
      Application Details
    </h2>

    <div className="mt-5 grid gap-5 sm:grid-cols-2">

      <div>
        <p className="text-xs text-gray-500">
          Loan Product
        </p>

        <p className="mt-1 font-medium text-gray-900">
          {product?.name || "Loan Product"}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          Amount Requested
        </p>

        <p className="mt-1 font-medium text-gray-900">
          {formatCurrency(
            application.amountRequested ??
              application.amount ??
              0,
            product?.currency || "NGN",
          )}
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          Duration
        </p>

        <p className="mt-1 font-medium text-gray-900">
          {application.durationDays} days
        </p>
      </div>

      <div>
        <p className="text-xs text-gray-500">
          Status
        </p>

        <p className="mt-1 font-medium text-gray-900">
          {formatStatus(application.status)}
        </p>
      </div>

      {application.purpose && (
        <div className="sm:col-span-2">
          <p className="text-xs text-gray-500">
            Loan Purpose
          </p>

          <p className="mt-1 text-sm leading-6 text-gray-700">
            {application.purpose}
          </p>
        </div>
      )}
    </div>
  </div>

  {/* PRODUCT */}

  {product && (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Loan Product
      </h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">

        <div>
          <p className="text-xs text-gray-500">
            Interest
          </p>

          <p className="mt-1 font-medium text-gray-900">
            {product.interestRate}%
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">
            Interest Type
          </p>

          <p className="mt-1 font-medium text-gray-900">
            {product.interestType ===
            "reducing_balance"
              ? "Reducing Balance"
              : "Flat Rate"}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">
            Repayment
          </p>

          <p className="mt-1 font-medium capitalize text-gray-900">
            {product.repaymentFrequency}
          </p>
        </div>
      </div>
    </div>
  )}

  {/* =====================================================
      REPAYMENT
  ===================================================== */}

  {isDisbursed && (
    <div className="rounded-xl border border-green-200 bg-green-50 p-6">

      <div className="flex items-start justify-between gap-4">

        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
              ✓
            </div>

            <h2 className="text-lg font-semibold text-green-900">
              Loan Disbursed
            </h2>
          </div>

          <p className="mt-2 text-sm leading-6 text-green-800">
            Your loan has been successfully disbursed.
            Your repayment schedule is now available.
          </p>
        </div>

        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
          Active
        </span>
      </div>

      <div className="mt-5 rounded-xl border border-green-200 bg-white p-5">

        <div className="grid gap-5 sm:grid-cols-2">

          <div>
            <p className="text-xs text-gray-500">
              Loan Status
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              Disbursed
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">
              Repayment
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              Schedule Available
            </p>
          </div>
        </div>

        <Link
          to={`/loans/repayments/${application._id}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 sm:w-auto"
        >
          View Repayment Schedule
          <span className="ml-2">
            →
          </span>
        </Link>
      </div>
    </div>
  )}

  {/* NEXT STEP */}

  {!isDisbursed && (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-6">
      <h2 className="font-semibold text-blue-900">
        What happens next?
      </h2>

      <p className="mt-2 text-sm leading-6 text-blue-800">
        Your application has been submitted and
        will be reviewed. You can return to this
        page later to check for status updates.
      </p>
    </div>
  )}

</div>


);
}

export default LoanApplicationDetails;
