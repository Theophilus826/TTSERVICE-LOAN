
import {
  useCallback,
  useEffect,
  useState,
} from "react";

import repaymentApi, {
  RepaymentAccount as RepaymentAccountType,
  RepaymentAccountTransaction,
} from "../services/repaymentApi";

/* =========================================================
HELPERS
========================================================= */

const formatMoney = (
  amount: number,
  currency = "NGN",
) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));
};

const formatDate = (
  date?: string | null,
) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString(
    "en-NG",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    },
  );
};

const getTransactionLabel = (
  transaction: RepaymentAccountTransaction,
) => {
  switch (transaction.purpose) {
    case "account_funding":
      return "Account Funding";

    case "loan_repayment":
      return "Loan Repayment";

    case "repayment_reversal":
      return "Repayment Reversal";

    case "refund":
      return "Refund";

    case "manual_adjustment":
      return "Manual Adjustment";

    default:
      return "Account Transaction";
  }
};

/* =========================================================
COMPONENT
========================================================= */

const RepaymentAccount = () => {
  const [account, setAccount] =
    useState<RepaymentAccountType | null>(
      null,
    );

  const [transactions, setTransactions] =
    useState<
      RepaymentAccountTransaction[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [funding, setFunding] =
    useState(false);

  const [fundAmount, setFundAmount] =
    useState("");

  const [copied, setCopied] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =======================================================
  LOAD ACCOUNT
  ======================================================= */

  const loadAccount = useCallback(
    async () => {
      try {
        setLoading(true);
        setError("");

        const [
          accountResponse,
          transactionsResponse,
        ] = await Promise.all([
          repaymentApi.getRepaymentAccount(),

          repaymentApi.getRepaymentAccountTransactions(
            {
              page: 1,
              limit: 20,
            },
          ),
        ]);

        setAccount(
          accountResponse.data || null,
        );

        setTransactions(
          transactionsResponse.data
            ?.transactions || [],
        );
      } catch (err: any) {
        console.error(
          "Failed to load repayment account:",
          err,
        );

        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Unable to load repayment account.",
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /* =======================================================
  INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadAccount();
  }, [loadAccount]);

  /* =======================================================
  COPY DVA ACCOUNT NUMBER
  ======================================================= */

  const handleCopyAccountNumber =
    async () => {
      if (!account?.accountNumber) {
        return;
      }

      try {
        await navigator.clipboard.writeText(
          account.accountNumber,
        );

        setCopied(true);

        window.setTimeout(() => {
          setCopied(false);
        }, 2000);
      } catch (err) {
        console.error(
          "Unable to copy account number:",
          err,
        );

        setError(
          "Unable to copy account number.",
        );
      }
    };

  /* =======================================================
  FUND USING PAYSTACK CHECKOUT
  ======================================================= */

  const handleFundAccount = async () => {
    const amount = Number(fundAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setError(
        "Enter a valid funding amount.",
      );

      return;
    }

    try {
      setFunding(true);
      setError("");

      const response =
        await repaymentApi.fundRepaymentAccount(
          {
            amount,
          },
        );

      const payment =
        response.data;

      if (
        payment?.authorizationUrl
      ) {
        window.location.href =
          payment.authorizationUrl;

        return;
      }

      setError(
        "Payment initialization succeeded but no payment URL was returned.",
      );
    } catch (err: any) {
      console.error(
        "Failed to fund repayment account:",
        err,
      );

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to initialize account funding.",
      );
    } finally {
      setFunding(false);
    }
  };

  /* =======================================================
  LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="repayment-account-page">
        <div className="repayment-account-loading">
          Loading repayment account...
        </div>
      </div>
    );
  }

  /* =======================================================
  ERROR
  ======================================================= */

  if (error && !account) {
    return (
      <div className="repayment-account-page">
        <div className="repayment-account-error">
          <p>{error}</p>

          <button
            type="button"
            onClick={loadAccount}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
  RENDER
  ======================================================= */

  return (
    <div className="repayment-account-page">

      {/* ===================================================
      HEADER
      =================================================== */}

      <div className="repayment-account-header">
        <div>
          <h1>
            Repayment Account
          </h1>

          <p>
            Keep money in your repayment account
            and use it to make loan repayments.
          </p>
        </div>

        <button
          type="button"
          onClick={loadAccount}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {/* ===================================================
      ERROR
      =================================================== */}

      {error && (
        <div className="repayment-account-error">
          {error}
        </div>
      )}

      {/* ===================================================
      BALANCE
      =================================================== */}

      <section className="repayment-account-balance-card">

        <div>
          <span>
            Available Balance
          </span>

          <h2>
            {formatMoney(
              account?.balance || 0,
              account?.currency || "NGN",
            )}
          </h2>
        </div>

        <div>
          <span>
            Account Status
          </span>

          <strong>
            {account?.status || "Unknown"}
          </strong>
        </div>

      </section>

      {/* ===================================================
      DEDICATED VIRTUAL ACCOUNT
      =================================================== */}

      <section className="repayment-account-dva">

        <div className="dva-header">
          <div>
            <h2>
              Your Repayment Account
            </h2>

            <p>
              Transfer money to this account to
              fund your repayment balance.
            </p>
          </div>
        </div>

        <div className="dva-details">

          <div className="dva-detail-row">
            <span>
              Account Name
            </span>

            <strong>
              {account?.accountName ||
                "Not available"}
            </strong>
          </div>

          <div className="dva-detail-row">
            <span>
              Account Number
            </span>

            <div className="dva-account-number">

              <strong>
                {account?.accountNumber ||
                  "Not available"}
              </strong>

              {account?.accountNumber && (
                <button
                  type="button"
                  onClick={
                    handleCopyAccountNumber
                  }
                >
                  {copied
                    ? "Copied"
                    : "Copy"}
                </button>
              )}

            </div>
          </div>

          <div className="dva-detail-row">
            <span>
              Bank
            </span>

            <strong>
              {account?.bankName ||
                "Not available"}
            </strong>
          </div>

          <div className="dva-detail-row">
            <span>
              Currency
            </span>

            <strong>
              {account?.currency || "NGN"}
            </strong>
          </div>

        </div>

        <div className="dva-instructions">
          <strong>
            How to fund your repayment account
          </strong>

          <ol>
            <li>
              Copy your repayment account number.
            </li>

            <li>
              Transfer money from your bank app
              or another bank account.
            </li>

            <li>
              Once the transfer is confirmed,
              your repayment balance will be
              updated automatically.
            </li>
          </ol>
        </div>

      </section>

      {/* ===================================================
      PAYSTACK CHECKOUT FUNDING
      =================================================== */}

      <section className="repayment-account-funding">

        <h2>
          Fund With Online Payment
        </h2>

        <p>
          You can also fund your repayment account
          through Paystack checkout.
        </p>

        <div>
          <input
            type="number"
            min="1"
            step="0.01"
            placeholder="Enter amount"
            value={fundAmount}
            onChange={(event) =>
              setFundAmount(
                event.target.value,
              )
            }
            disabled={funding}
          />

          <button
            type="button"
            onClick={
              handleFundAccount
            }
            disabled={funding}
          >
            {funding
              ? "Initializing..."
              : "Pay With Paystack"}
          </button>
        </div>

      </section>

      {/* ===================================================
      ACCOUNT TOTALS
      =================================================== */}

      <section className="repayment-account-summary">

        <div>
          <span>
            Total Funded
          </span>

          <strong>
            {formatMoney(
              account?.totalCredited || 0,
              account?.currency || "NGN",
            )}
          </strong>
        </div>

        <div>
          <span>
            Total Repaid
          </span>

          <strong>
            {formatMoney(
              account?.totalRepaid || 0,
              account?.currency || "NGN",
            )}
          </strong>
        </div>

      </section>

      {/* ===================================================
      TRANSACTIONS
      =================================================== */}

      <section className="repayment-account-transactions">

        <div className="transactions-header">
          <div>
            <h2>
              Recent Transactions
            </h2>

            <p>
              Your repayment account activity.
            </p>
          </div>
        </div>

        {transactions.length === 0 ? (
          <div className="transactions-empty">
            <p>
              No transactions yet.
            </p>
          </div>
        ) : (
          <div className="transactions-list">

            {transactions.map(
              (transaction) => {
                const isCredit =
                  transaction.type ===
                    "credit" ||
                  transaction.type ===
                    "refund";

                return (
                  <div
                    key={transaction._id}
                    className="transaction-row"
                  >
                    <div className="transaction-info">

                      <strong>
                        {getTransactionLabel(
                          transaction,
                        )}
                      </strong>

                      <span>
                        {transaction.description ||
                          transaction.purpose}
                      </span>

                      <small>
                        {formatDate(
                          transaction.createdAt,
                        )}
                      </small>

                    </div>

                    <div className="transaction-amount">

                      <strong
                        className={
                          isCredit
                            ? "credit"
                            : "debit"
                        }
                      >
                        {isCredit
                          ? "+"
                          : "-"}
                        {formatMoney(
                          transaction.amount,
                          transaction.currency,
                        )}
                      </strong>

                      <span>
                        {transaction.status}
                      </span>

                    </div>
                  </div>
                );
              },
            )}

          </div>
        )}

      </section>

    </div>
  );
};

export default RepaymentAccount;

