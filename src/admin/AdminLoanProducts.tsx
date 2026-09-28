import { FormEvent, useEffect, useState } from "react";
import { Plus, RefreshCw, Trash2, CreditCard } from "lucide-react";
import { toast } from "react-toastify";

import API from "../services/Api";

interface LoanProduct {
  _id: string;
  name: string;
  code: string;
  description?: string;
  minAmount: number;
  maxAmount: number;
  minDurationDays: number;
  maxDurationDays: number;
  interestRate: number;
  interestType: "flat" | "reducing_balance";
  repaymentFrequency: "daily" | "weekly" | "biweekly" | "monthly";
  currency?: string;
  status?: "draft" | "active" | "inactive" | "archived";
}

interface ProductsResponse {
  success?: boolean;
  data?: LoanProduct[];
}

interface CreateProductResponse {
  success?: boolean;
  message?: string;
  data?: LoanProduct;
  errors?: Record<string, string>;
}

const INITIAL_FORM = {
  name: "",
  code: "",
  description: "",
  minAmount: "",
  maxAmount: "",
  minDurationDays: "",
  maxDurationDays: "",
  interestRate: "",
  interestType: "reducing_balance" as "flat" | "reducing_balance",
  repaymentFrequency: "monthly" as "daily" | "weekly" | "biweekly" | "monthly",
  currency: "NGN",
};

export default function AdminLoanProducts() {
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(INITIAL_FORM);

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  const loadProducts = async () => {
    try {
      setLoading(true);

      const response = await API.get<ProductsResponse>("/loans/products");

      setProducts(response.data?.data || []);
    } catch (error: any) {
      console.error("Failed to load loan products:", error);

      toast.error(
        error?.response?.data?.message || "Failed to load loan products",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // =========================================================
  // UPDATE FORM
  // =========================================================

  const updateField = <K extends keyof typeof form>(
    field: K,
    value: (typeof form)[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // =========================================================
  // VALIDATE FORM
  // =========================================================

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return false;
    }

    if (!form.code.trim()) {
      toast.error("Product code is required");
      return false;
    }

    if (!form.minAmount) {
      toast.error("Minimum amount is required");
      return false;
    }

    if (!form.maxAmount) {
      toast.error("Maximum amount is required");
      return false;
    }

    if (!form.minDurationDays) {
      toast.error("Minimum duration is required");
      return false;
    }

    if (!form.maxDurationDays) {
      toast.error("Maximum duration is required");
      return false;
    }

    if (!form.interestRate) {
      toast.error("Interest rate is required");
      return false;
    }

    const minAmount = Number(form.minAmount);
    const maxAmount = Number(form.maxAmount);

    const minDurationDays = Number(form.minDurationDays);

    const maxDurationDays = Number(form.maxDurationDays);

    const interestRate = Number(form.interestRate);

    if (!Number.isFinite(minAmount) || minAmount < 0) {
      toast.error("Please enter a valid minimum amount");
      return false;
    }

    if (!Number.isFinite(maxAmount) || maxAmount < 0) {
      toast.error("Please enter a valid maximum amount");
      return false;
    }

    if (minAmount > maxAmount) {
      toast.error("Minimum amount cannot be greater than maximum amount");
      return false;
    }

    if (!Number.isFinite(minDurationDays) || minDurationDays < 1) {
      toast.error("Minimum duration must be at least 1 day");
      return false;
    }

    if (!Number.isFinite(maxDurationDays) || maxDurationDays < 1) {
      toast.error("Maximum duration must be at least 1 day");
      return false;
    }

    if (minDurationDays > maxDurationDays) {
      toast.error("Minimum duration cannot be greater than maximum duration");
      return false;
    }

    if (!Number.isFinite(interestRate) || interestRate < 0) {
      toast.error("Please enter a valid interest rate");
      return false;
    }

    return true;
  };

  // =========================================================
  // CREATE PRODUCT
  // =========================================================

  const createProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),

        code: form.code.trim().toUpperCase(),

        description: form.description.trim(),

        minAmount: Number(form.minAmount),

        maxAmount: Number(form.maxAmount),

        minDurationDays: Number(form.minDurationDays),

        maxDurationDays: Number(form.maxDurationDays),

        interestRate: Number(form.interestRate),

        interestType: form.interestType,

        repaymentFrequency: form.repaymentFrequency,

        currency: form.currency.trim().toUpperCase(),

        status: "active",
      };

      console.log("Creating loan product:", payload);

      const response = await API.post<CreateProductResponse>(
        "/loans/admin/products",
        payload,
      );

      toast.success(
        response.data?.message || "Loan product created successfully",
      );

      setForm({
        ...INITIAL_FORM,
      });

      await loadProducts();
    } catch (error: any) {
      console.error("Failed to create loan product:", error);

      console.error("Backend response:", error?.response?.data);

      const responseData = error?.response?.data;

      // Duplicate product code
      if (error?.response?.status === 409) {
        toast.error(
          responseData?.message ||
            "A loan product with this code already exists",
        );

        return;
      }

      // Validation errors
      if (error?.response?.status === 400 && responseData?.errors) {
        const firstError = Object.values(responseData.errors)[0];

        toast.error(String(firstError));

        return;
      }

      toast.error(responseData?.message || "Failed to create loan product");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // CURRENCY FORMATTER
  // =========================================================

  const formatAmount = (amount: number, currency = "NGN") => {
    try {
      return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toLocaleString()}`;
    }
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Products</h1>

          <p className="mt-1 text-sm text-gray-500">
            Create and manage loan products available to customers.
          </p>
        </div>

        <button
          type="button"
          onClick={loadProducts}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* CREATE PRODUCT */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-orange-50 p-3">
            <Plus size={22} className="text-orange-500" />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">Create Loan Product</h2>

            <p className="text-sm text-gray-500">
              Customers will be able to select active products when applying.
            </p>
          </div>
        </div>

        <form onSubmit={createProduct} className="grid gap-5 md:grid-cols-2">
          {/* NAME */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Product Name *
            </label>

            <input
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Personal Loan"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          {/* CODE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Product Code *
            </label>

            <input
              value={form.code}
              onChange={(e) =>
                updateField("code", e.target.value.toUpperCase())
              }
              placeholder="PERSONAL-001"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 uppercase outline-none focus:border-orange-500"
            />

            <p className="mt-1 text-xs text-gray-400">Must be unique.</p>
          </div>

          {/* DESCRIPTION */}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Description
            </label>

            <textarea
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
              placeholder="Short description of this loan product"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          {/* MIN AMOUNT */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Minimum Amount *
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.minAmount}
              onChange={(e) => updateField("minAmount", e.target.value)}
              placeholder="50000"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          {/* MAX AMOUNT */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Maximum Amount *
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.maxAmount}
              onChange={(e) => updateField("maxAmount", e.target.value)}
              placeholder="1000000"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          {/* MIN DURATION */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Minimum Duration (Days) *
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={form.minDurationDays}
              onChange={(e) => updateField("minDurationDays", e.target.value)}
              placeholder="30"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          {/* MAX DURATION */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Maximum Duration (Days) *
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={form.maxDurationDays}
              onChange={(e) => updateField("maxDurationDays", e.target.value)}
              placeholder="180"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          {/* INTEREST RATE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Interest Rate *
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.interestRate}
              onChange={(e) => updateField("interestRate", e.target.value)}
              placeholder="5"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />

            <p className="mt-1 text-xs text-gray-400">
              Enter the rate as a number, e.g. 5 for 5%.
            </p>
          </div>

          {/* INTEREST TYPE */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Interest Type
            </label>

            <select
              value={form.interestType}
              onChange={(e) =>
                updateField(
                  "interestType",
                  e.target.value as "flat" | "reducing_balance",
                )
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-500"
            >
              <option value="reducing_balance">Reducing Balance</option>

              <option value="flat">Flat</option>
            </select>
          </div>

          {/* REPAYMENT */}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Repayment Frequency
            </label>

            <select
              value={form.repaymentFrequency}
              onChange={(e) =>
                updateField(
                  "repaymentFrequency",
                  e.target.value as "daily" | "weekly" | "biweekly" | "monthly",
                )
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-500"
            >
              <option value="daily">Daily</option>

              <option value="weekly">Weekly</option>

              <option value="biweekly">Biweekly</option>

              <option value="monthly">Monthly</option>
            </select>
          </div>

          {/* CURRENCY */}

          <div>
            <label className="mb-2 block text-sm font-medium">Currency</label>

            <select
              value={form.currency}
              onChange={(e) => updateField("currency", e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-500"
            >
              <option value="NGN">Nigerian Naira (NGN)</option>

              <option value="USD">US Dollar (USD)</option>

              <option value="GBP">British Pound (GBP)</option>
            </select>
          </div>

          {/* SUBMIT */}

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {saving ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Create Loan Product
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* PRODUCTS */}

      <div className="rounded-2xl bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="font-semibold text-gray-900">
            Available Loan Products
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            These are the products customers can apply for.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw
              className="mx-auto animate-spin text-orange-500"
              size={28}
            />
          </div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center">
            <CreditCard size={40} className="mx-auto text-gray-300" />

            <p className="mt-3 font-medium text-gray-700">
              No loan products yet
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Create your first loan product above.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {products.map((product) => (
              <div
                key={product._id}
                className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900">
                      {product.name}
                    </h3>

                    <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                      {product.status || "active"}
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    {product.description || "No description"}
                  </p>

                  <p className="mt-2 text-xs text-gray-400">{product.code}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="text-gray-500">Amount</p>

                    <p className="font-semibold">
                      {formatAmount(product.minAmount, product.currency)}

                      {" - "}

                      {formatAmount(product.maxAmount, product.currency)}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Duration</p>

                    <p className="font-semibold">
                      {product.minDurationDays}
                      {" - "}
                      {product.maxDurationDays} days
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Interest</p>

                    <p className="font-semibold">{product.interestRate}%</p>

                    <p className="text-xs text-gray-400">
                      {product.interestType === "reducing_balance"
                        ? "Reducing balance"
                        : "Flat"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Repayment</p>

                    <p className="font-semibold capitalize">
                      {product.repaymentFrequency}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toast.info("Product editing will be added next.")
                  }
                  className="rounded-xl border border-gray-200 p-3 text-gray-500 hover:bg-gray-50"
                  title="Product actions"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
