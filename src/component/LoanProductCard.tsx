import { Link } from "react-router-dom";

import type { LoanProduct } from "../services/loanApi";

interface LoanProductCardProps {
  product: LoanProduct;
}

/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(amount: number, currency: string = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/* =========================================================
   FORMAT INTEREST TYPE
========================================================= */

function formatInterestType(type: LoanProduct["interestType"]) {
  return type === "reducing_balance" ? "Reducing Balance" : "Flat Rate";
}

/* =========================================================
   FORMAT FREQUENCY
========================================================= */

function formatFrequency(frequency: LoanProduct["repaymentFrequency"]) {
  switch (frequency) {
    case "daily":
      return "Daily";

    case "weekly":
      return "Weekly";

    case "biweekly":
      return "Biweekly";

    case "monthly":
      return "Monthly";

    default:
      return frequency;
  }
}

/* =========================================================
   STATUS STYLE
========================================================= */

function getStatusClass(status: LoanProduct["status"]) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-700";

    case "draft":
      return "bg-yellow-100 text-yellow-700";

    case "inactive":
      return "bg-gray-100 text-gray-700";

    case "archived":
      return "bg-red-100 text-red-700";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

/* =========================================================
   COMPONENT
========================================================= */

function LoanProductCard({ product }: LoanProductCardProps) {
  const eligibility = product.eligibilityRules;

  return (
    <div
      className="
        flex
        flex-col
        rounded-xl
        border
        border-gray-200
        bg-white
        p-6
        shadow-sm
        transition
        hover:shadow-md
      "
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {product.name}
          </h2>

          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-500">
            {product.code}
          </p>
        </div>

        <span
          className={`
            rounded-full
            px-3
            py-1
            text-xs
            font-medium
            capitalize
            ${getStatusClass(product.status)}
          `}
        >
          {product.status}
        </span>
      </div>

      {/* =================================================
          DESCRIPTION
      ================================================= */}

      {product.description && (
        <p className="mt-4 text-sm leading-6 text-gray-600">
          {product.description}
        </p>
      )}

      {/* =================================================
          LOAN AMOUNT
      ================================================= */}

      <div className="mt-6 rounded-lg bg-gray-50 p-4">
        <p className="text-xs text-gray-500">Loan Amount</p>

        <p className="mt-1 font-semibold text-gray-900">
          {formatCurrency(product.minAmount, product.currency)}

          {" - "}

          {formatCurrency(product.maxAmount, product.currency)}
        </p>
      </div>

      {/* =================================================
          LOAN DETAILS
      ================================================= */}

      <div className="mt-5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Interest</p>

          <p className="mt-1 font-medium text-gray-900">
            {product.interestRate}%
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Interest Type</p>

          <p className="mt-1 font-medium text-gray-900">
            {formatInterestType(product.interestType)}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Duration</p>

          <p className="mt-1 font-medium text-gray-900">
            {product.minDurationDays}
            {" - "}
            {product.maxDurationDays} days
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Repayment</p>

          <p className="mt-1 font-medium text-gray-900">
            {formatFrequency(product.repaymentFrequency)}
          </p>
        </div>
      </div>

      {/* =================================================
          FEES
      ================================================= */}

      <div className="mt-5 border-t pt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Processing Fee</span>

          <span className="font-medium text-gray-900">
            {product.processingFee}

            {product.processingFeeType === "percentage"
              ? "%"
              : ` ${product.currency}`}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-500">Service Fee</span>

          <span className="font-medium text-gray-900">
            {formatCurrency(product.serviceFee, product.currency)}
          </span>
        </div>

        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-gray-500">Late Fee</span>

          <span className="font-medium text-gray-900">
            {product.lateFee}

            {product.lateFeeType === "percentage"
              ? "%"
              : ` ${product.currency}`}
          </span>
        </div>
      </div>

      {/* =================================================
          ELIGIBILITY
      ================================================= */}

      {eligibility && (
        <div className="mt-5 border-t pt-4">
          <p className="text-xs font-medium text-gray-500">Eligibility</p>

          <div className="mt-2 space-y-1 text-sm text-gray-600">
            <p>
              Age: {eligibility.minAge}
              {" - "}
              {eligibility.maxAge}
            </p>

            <p>
              Minimum income:{" "}
              {formatCurrency(eligibility.minMonthlyIncome, product.currency)}
            </p>

            {eligibility.requireKyc && <p>✓ KYC required</p>}

            {eligibility.requireBankAccount && <p>✓ Bank account required</p>}
          </div>
        </div>
      )}

      {/* =================================================
          ACTION
      ================================================= */}

      <div className="mt-6">
        {product.status === "active" ? (
          <Link
            to={`/loans/apply/${product._id}`}
            className="
    block
    w-full
    rounded-lg
    bg-blue-600
    px-4
    py-3
    text-center
    text-sm
    font-semibold
    text-white
    transition
    hover:bg-blue-700
  "
          >
            Apply for this loan
          </Link>
        ) : (
          <span
            className="
              block
              w-full
              cursor-not-allowed
              rounded-lg
              bg-gray-100
              px-4
              py-3
              text-center
              text-sm
              font-semibold
              text-gray-500
            "
          >
            Currently unavailable
          </span>
        )}
      </div>
    </div>
  );
}

export default LoanProductCard;
