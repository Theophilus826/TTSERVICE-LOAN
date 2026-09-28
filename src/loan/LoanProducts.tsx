import { useCallback, useEffect, useState } from "react";

import loanApi, { type LoanProduct } from "../services/loanApi";
import LoanProductCard from "../component/LoanProductCard";

function LoanProducts() {
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await loanApi.getLoanProducts();

      console.log("Loan products:", data);
      console.log("Number of products:", data.length);

      setProducts(data);
    } catch (err: unknown) {
      console.error("Failed to load loan products:", err);

      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "message" in err.response.data &&
        typeof err.response.data.message === "string"
          ? err.response.data.message
          : "Unable to load loan products. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Loan Products
        </h1>

        <p className="mt-1 text-gray-600">
          Choose a loan product that suits your needs.
        </p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex min-h-[250px] items-center justify-center rounded-xl border border-gray-200 bg-white">
          <div className="text-center">
            <div
              className="
                mx-auto mb-3 h-8 w-8
                animate-spin rounded-full
                border-4 border-gray-300
                border-t-blue-600
              "
              aria-label="Loading"
            />

            <p className="text-gray-600">
              Loading loan products...
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h2 className="font-semibold text-red-800">
            Unable to load products
          </h2>

          <p className="mt-2 text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() => void loadProducts()}
            className="
              mt-4 rounded-lg
              bg-red-600 px-4 py-2
              text-sm font-medium text-white
              transition hover:bg-red-700
              focus:outline-none focus:ring-2
              focus:ring-red-500 focus:ring-offset-2
            "
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            No loan products available
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            There are currently no active loan products.
          </p>

          <button
            type="button"
            onClick={() => void loadProducts()}
            className="
              mt-5 rounded-lg
              border border-gray-300
              px-4 py-2
              text-sm font-medium text-gray-700
              transition hover:bg-gray-50
            "
          >
            Refresh
          </button>
        </div>
      )}

      {/* Products */}
      {!loading && !error && products.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <LoanProductCard
              key={product._id}
              product={product}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default LoanProducts;

