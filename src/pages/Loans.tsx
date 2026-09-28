
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  Banknote,
  CalendarDays,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

import loanApi, {
  type LoanProduct,
} from "../services/loanApi";

import { getApiErrorMessage } from "../services/Api";

const formatAmount = (
  amount: number,
  currency = "NGN",
): string => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatFrequency = (
  frequency?: string,
): string => {
  if (!frequency) {
    return "—";
  }

  return frequency
    .replace("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
};

const ProductCard = ({
  product,
}: {
  product: LoanProduct;
}) => {
  const currency =
    product.currency || "NGN";

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="rounded-xl bg-slate-900 p-3 text-white">
            <Banknote size={24} />
          </div>

          {product.code && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {product.code}
            </span>
          )}
        </div>

        <h2 className="text-lg font-bold text-slate-900">
          {product.name}
        </h2>

        {product.description && (
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {product.description}
          </p>
        )}

        <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                Loan range
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatAmount(
                  product.minAmount,
                  currency,
                )}{" "}
                –{" "}
                {formatAmount(
                  product.maxAmount,
                  currency,
                )}
              </p>
            </div>

            <Banknote
              size={18}
              className="shrink-0 text-slate-400"
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                Duration
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {product.minDurationDays} –{" "}
                {product.maxDurationDays} days
              </p>
            </div>

            <CalendarDays
              size={18}
              className="shrink-0 text-slate-400"
            />
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                Interest rate
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-900">
                {product.interestRate ?? 0}%
                {product.interestType
                  ? ` (${product.interestType.replace(
                      "_",
                      " ",
                    )})`
                  : ""}
              </p>
            </div>

            <span className="text-sm font-bold text-slate-400">
              %
            </span>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">
                Repayment frequency
              </p>

              <p className="mt-1 text-sm font-semibold capitalize text-slate-900">
                {formatFrequency(
                  product.repaymentFrequency,
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-xs leading-5 text-blue-700">
            Final interest, fees, installment amount,
            and total repayment are calculated by the
            server when you apply.
          </p>
        </div>

        <Link
          to={`/loans/apply/${product._id}`}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Apply for this loan
          <ArrowRight size={17} />
        </Link>
      </div>
    </article>
  );
};

export default function Loans() {
  const [products, setProducts] =
    useState<LoanProduct[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const loadProducts = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const data =
          await loanApi.getLoanProducts();

        setProducts(data);
      } catch (error: unknown) {
        console.error(
          "Failed to load loan products:",
          error,
        );

        toast.error(
          getApiErrorMessage(
            error,
            "Failed to load loan products.",
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
    void loadProducts();
  }, [loadProducts]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2
            size={24}
            className="animate-spin"
          />

          <span className="text-sm font-medium">
            Loading loan products...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-white">
              <Banknote size={21} />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Loan Products
            </h1>
          </div>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Choose a loan product that suits your
            needs. Your final loan terms are
            calculated by the server when you apply.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            void loadProducts(true)
          }
          disabled={refreshing}
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            size={16}
            className={
              refreshing
                ? "animate-spin"
                : ""
            }
          />

          Refresh
        </button>
      </section>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Banknote
            size={45}
            className="mx-auto text-slate-300"
          />

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            No loan products available
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            There are currently no active loan
            products. Please check again later.
          </p>

          <button
            type="button"
            onClick={() =>
              void loadProducts(true)
            }
            disabled={refreshing}
            className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {refreshing ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={16} />
            )}

            Check again
          </button>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard
              key={product._id}
              product={product}
            />
          ))}
        </div>
      )}
    </div>
  );
}

