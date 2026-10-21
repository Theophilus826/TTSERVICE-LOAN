
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  Plus,
  RefreshCw,
  CreditCard,
  Power,
  Trash2,
} from "lucide-react";
import { toast } from "react-toastify";

import API from "../services/Api";

type ProductStatus = "draft" | "active" | "inactive" | "archived";
type InterestType = "flat" | "reducing_balance";
type RepaymentFrequency = "daily" | "weekly" | "biweekly" | "monthly";

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
  interestType: InterestType;
  repaymentFrequency: RepaymentFrequency;
  currency?: string;
  status?: ProductStatus;
}

interface ProductsResponse {
  success?: boolean;
  message?: string;
  data?: LoanProduct[];
}

interface ProductResponse {
  success?: boolean;
  message?: string;
  data?: LoanProduct;
  errors?: Record<string, string>;
}

type LoanProductForm = {
  name: string;
  code: string;
  description: string;
  minAmount: string;
  maxAmount: string;
  minDurationDays: string;
  maxDurationDays: string;
  interestRate: string;
  interestType: InterestType;
  repaymentFrequency: RepaymentFrequency;
  currency: string;
};

const INITIAL_FORM: LoanProductForm = {
  name: "",
  code: "",
  description: "",
  minAmount: "",
  maxAmount: "",
  minDurationDays: "",
  maxDurationDays: "",
  interestRate: "",
  interestType: "reducing_balance",
  repaymentFrequency: "monthly",
  currency: "NGN",
};

export default function AdminLoanProducts() {
  const [products, setProducts] = useState<LoanProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState<LoanProductForm>(INITIAL_FORM);

  // =========================================================
  // LOAD PRODUCTS
  // =========================================================

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);

      const response = await API.get<ProductsResponse>("/loans/products");

      setProducts(
        Array.isArray(response.data?.data) ? response.data.data : [],
      );
    } catch (error: any) {
      console.error("Failed to load loan products:", error);

      toast.error(
        error?.response?.data?.message || "Failed to load loan products",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // =========================================================
  // FORM HELPERS
  // =========================================================

  const updateField = <K extends keyof LoanProductForm>(
    field: K,
    value: LoanProductForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return false;
    }

    if (!form.code.trim()) {
      toast.error("Product code is required");
      return false;
    }

    const requiredFields: Array<[string, string]> = [
      [form.minAmount, "Minimum amount is required"],
      [form.maxAmount, "Maximum amount is required"],
      [form.minDurationDays, "Minimum duration is required"],
      [form.maxDurationDays, "Maximum duration is required"],
      [form.interestRate, "Interest rate is required"],
    ];

    for (const [value, message] of requiredFields) {
      if (value.trim() === "") {
        toast.error(message);
        return false;
      }
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

    if (!Number.isFinite(maxAmount) || maxAmount <= minAmount) {
      toast.error("Maximum amount must be greater than minimum amount");
      return false;
    }

    if (!Number.isInteger(minDurationDays) || minDurationDays < 1) {
      toast.error("Minimum duration must be a whole number of at least 1 day");
      return false;
    }

    if (!Number.isInteger(maxDurationDays) || maxDurationDays < 1) {
      toast.error("Maximum duration must be a whole number of at least 1 day");
      return false;
    }

    if (minDurationDays > maxDurationDays) {
      toast.error("Minimum duration cannot exceed maximum duration");
      return false;
    }

    if (!Number.isFinite(interestRate) || interestRate < 0) {
      toast.error("Please enter a valid interest rate");
      return false;
    }

    if (!form.currency.trim()) {
      toast.error("Currency is required");
      return false;
    }

    return true;
  };

  // =========================================================
  // CREATE PRODUCT
  // =========================================================

  const createProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (
      saving ||
      updatingStatusId !== null ||
      deletingId !== null ||
      !validateForm()
    ) {
      return;
    }

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
      status: "active" as const,
    };

    try {
      setSaving(true);

      const response = await API.post<ProductResponse>(
        "/loans/admin/products",
        payload,
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Failed to create loan product",
        );
      }

      toast.success(
        response.data?.message || "Loan product created successfully",
      );

      setForm({ ...INITIAL_FORM });
      await loadProducts();
    } catch (error: any) {
      console.error("Failed to create loan product:", error);

      const status = error?.response?.status;
      const responseData = error?.response?.data;

      if (status === 409) {
        toast.error(
          responseData?.message ||
            "A loan product with this code already exists",
        );
        return;
      }

      if (status === 400 && responseData?.errors) {
        const firstError = Object.values(
          responseData.errors as Record<string, string>,
        )[0];

        toast.error(
          String(
            firstError || responseData?.message || "Invalid product details",
          ),
        );
        return;
      }

      toast.error(
        responseData?.message ||
          error?.message ||
          "Failed to create loan product",
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // ACTIVATE / DISABLE PRODUCT
  // =========================================================

  const toggleProductStatus = async (product: LoanProduct) => {
    if (saving || updatingStatusId !== null || deletingId !== null) {
      return;
    }

    if (product.status === "archived") {
      toast.error("Archived products cannot be activated or disabled");
      return;
    }

    const nextStatus: "active" | "inactive" =
      product.status === "active" ? "inactive" : "active";

    const action = nextStatus === "active" ? "activate" : "disable";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${product.name}" (${product.code})?` +
        (nextStatus === "inactive"
          ? "\n\nCustomers should no longer be able to select this product for new loan applications. Existing loans should remain unchanged."
          : "\n\nCustomers will be able to select this product for new loan applications."),
    );

    if (!confirmed) return;

    try {
      setUpdatingStatusId(product._id);

      const response = await API.patch<ProductResponse>(
        `/admin/loan-products/${product._id}/status`,
        { status: nextStatus },
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || `Failed to ${action} loan product`,
        );
      }

      const updatedProduct = response.data?.data;

      setProducts((current) =>
        current.map((item) =>
          item._id === product._id
            ? {
                ...item,
                ...(updatedProduct || {}),
                status: updatedProduct?.status || nextStatus,
              }
            : item,
        ),
      );

      toast.success(
        response.data?.message ||
          `Loan product ${nextStatus === "active" ? "activated" : "disabled"} successfully`,
      );
    } catch (error: any) {
      console.error(`Failed to ${action} loan product:`, error);

      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error?.message ||
        `Failed to ${action} loan product`;

      if (status === 404) {
        toast.error(
          "Status endpoint or loan product not found. Check the backend route and API base URL.",
        );
      } else if (status === 401 || status === 403) {
        toast.error(`You are not authorized to ${action} this product`);
      } else {
        toast.error(message);
      }
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // =========================================================
  // DELETE PRODUCT
  // =========================================================

  const deleteProduct = async (product: LoanProduct) => {
    if (saving || updatingStatusId !== null || deletingId !== null) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}" (${product.code})?\n\n` +
        "This may be permanent. If existing loans reference this product, the backend should prevent deletion so loan history is preserved.",
    );

    if (!confirmed) return;

    try {
      setDeletingId(product._id);

      const response = await API.delete<ProductResponse>(
        `/admin/loan-products/${product._id}`,
      );

      if (response.data?.success === false) {
        throw new Error(
          response.data.message || "Failed to delete loan product",
        );
      }

      setProducts((current) =>
        current.filter((item) => item._id !== product._id),
      );

      toast.success(
        response.data?.message || "Loan product deleted successfully",
      );
    } catch (error: any) {
      console.error("Failed to delete loan product:", error);

      const status = error?.response?.status;
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete loan product";

      if (status === 401 || status === 403) {
        toast.error("You are not authorized to delete this product");
      } else if (status === 404) {
        toast.error("Loan product not found or delete endpoint is unavailable");
      } else if (status === 409) {
        toast.error(
          message ||
            "This product cannot be deleted because it is being used by existing loans",
        );
      } else {
        toast.error(message);
      }
    } finally {
      setDeletingId(null);
    }
  };

  // =========================================================
  // DISPLAY HELPERS
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

  const getStatusClass = (status?: ProductStatus) => {
    switch (status || "active") {
      case "active":
        return "bg-green-100 text-green-700";
      case "draft":
        return "bg-yellow-100 text-yellow-700";
      case "inactive":
        return "bg-gray-100 text-gray-600";
      case "archived":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-600";
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
          onClick={() => void loadProducts()}
          disabled={
            loading ||
            saving ||
            updatingStatusId !== null ||
            deletingId !== null
          }
          className="flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
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
            <h2 className="font-semibold text-gray-900">
              Create Loan Product
            </h2>
            <p className="text-sm text-gray-500">
              New products are active and available to customers by default.
            </p>
          </div>
        </div>

        <form onSubmit={createProduct} className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Product Name *
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              placeholder="Personal Loan"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Product Code *
            </label>
            <input
              required
              value={form.code}
              onChange={(e) => updateField("code", e.target.value.toUpperCase())}
              placeholder="PERSONAL-001"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 uppercase outline-none focus:border-orange-500"
            />
            <p className="mt-1 text-xs text-gray-400">Must be unique.</p>
          </div>

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

          <div>
            <label className="mb-2 block text-sm font-medium">
              Minimum Amount *
            </label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.minAmount}
              onChange={(e) => updateField("minAmount", e.target.value)}
              placeholder="50000"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Maximum Amount *
            </label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.maxAmount}
              onChange={(e) => updateField("maxAmount", e.target.value)}
              placeholder="1000000"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Minimum Duration (Days) *
            </label>
            <input
              required
              type="number"
              min="1"
              step="1"
              value={form.minDurationDays}
              onChange={(e) => updateField("minDurationDays", e.target.value)}
              placeholder="30"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Maximum Duration (Days) *
            </label>
            <input
              required
              type="number"
              min="1"
              step="1"
              value={form.maxDurationDays}
              onChange={(e) => updateField("maxDurationDays", e.target.value)}
              placeholder="180"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Interest Rate (%) *
            </label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.interestRate}
              onChange={(e) => updateField("interestRate", e.target.value)}
              placeholder="5"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
            <p className="mt-1 text-xs text-gray-400">Enter 5 for 5%.</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Interest Type
            </label>
            <select
              value={form.interestType}
              onChange={(e) =>
                updateField("interestType", e.target.value as InterestType)
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-500"
            >
              <option value="reducing_balance">Reducing Balance</option>
              <option value="flat">Flat</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Repayment Frequency
            </label>
            <select
              value={form.repaymentFrequency}
              onChange={(e) =>
                updateField(
                  "repaymentFrequency",
                  e.target.value as RepaymentFrequency,
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

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={
                saving ||
                updatingStatusId !== null ||
                deletingId !== null
              }
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
          <h2 className="font-semibold text-gray-900">Loan Products</h2>
          <p className="mt-1 text-sm text-gray-500">
            Disabled and archived products remain visible to administrators.
            Only active products should be offered for new customer applications.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw
              className="mx-auto animate-spin text-orange-500"
              size={28}
            />
            <p className="mt-3 text-sm text-gray-500">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-10 text-center">
            <CreditCard size={40} className="mx-auto text-gray-300" />
            <p className="mt-3 font-medium text-gray-700">
              No loan products to display
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Create a product above or refresh the list.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {products.map((product) => {
              const isUpdating = updatingStatusId === product._id;
              const isDeleting = deletingId === product._id;
              const isActive = (product.status || "active") === "active";
              const isArchived = product.status === "archived";

              const busy =
                saving ||
                updatingStatusId !== null ||
                deletingId !== null;

              return (
                <div
                  key={product._id}
                  className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0 md:flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {product.name}
                      </h3>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(product.status)}`}
                      >
                        {product.status || "active"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {product.description || "No description"}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      {product.code}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm md:flex-1 md:grid-cols-2 xl:grid-cols-4">
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
                        {product.minDurationDays} - {product.maxDurationDays} days
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

                  {/* ACTIONS: DISABLE/ACTIVATE AND DELETE SIDE BY SIDE */}
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {!isArchived ? (
                      <button
                        type="button"
                        onClick={() => void toggleProductStatus(product)}
                        disabled={busy}
                        className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          isActive
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-green-200 text-green-700 hover:bg-green-50"
                        }`}
                        title={
                          isActive
                            ? "Disable this product for new applications"
                            : "Activate this product for new applications"
                        }
                      >
                        {isUpdating ? (
                          <>
                            <RefreshCw size={17} className="animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Power size={17} />
                            {isActive ? "Disable" : "Activate"}
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="px-2 text-sm text-gray-400">
                        Archived
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => void deleteProduct(product)}
                      disabled={busy}
                      className="flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Delete this loan product"
                    >
                      {isDeleting ? (
                        <>
                          <RefreshCw size={17} className="animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 size={17} />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
