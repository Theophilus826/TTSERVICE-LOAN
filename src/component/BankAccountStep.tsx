import React, { useEffect, useState } from "react";
import {
  CheckCircle,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-hot-toast";

import bankApi from "../services/BankService";
import type { Bank, BankAccount } from "../services/BankService";

interface BankAccountStepProps {
  selectedBankAccountId: string | null;
  onSelect: (accountId: string) => void;
}

interface BankAccountForm {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountType: "savings" | "current";
  currency: string;
}

const initialForm: BankAccountForm = {
  bankName: "",
  bankCode: "",
  accountNumber: "",
  accountType: "savings",
  currency: "NGN",
};

const BankAccountStep: React.FC<BankAccountStepProps> = ({
  selectedBankAccountId,
  onSelect,
}) => {
  console.log("BankAccountStep onSelect:", onSelect);
  console.log("typeof onSelect:", typeof onSelect);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BankAccountForm>(initialForm);

  const loadAccounts = async () => {
    try {
      setLoading(true);

      const response = await bankApi.getMyBankAccounts();

      const data = response?.data ?? response ?? [];

      setAccounts(Array.isArray(data) ? data : []);

      const verifiedPrimary = Array.isArray(data)
        ? data.find(
            (account: BankAccount) =>
              account.verificationStatus === "verified" && account.isPrimary,
          )
        : null;

      if (verifiedPrimary) {
        onSelect(verifiedPrimary._id);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load bank accounts",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadBanks = async () => {
    try {
      setLoadingBanks(true);

      const response = await bankApi.getBanks();

      const data = response?.data ?? response ?? [];

      setBanks(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to load banks",
      );
    } finally {
      setLoadingBanks(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadBanks();
  }, []);

  const updateForm = (field: keyof BankAccountForm, value: string) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleBankChange = (bankCode: string) => {
    const bank = banks.find((item) => String(item.code) === String(bankCode));

    setForm((previous) => ({
      ...previous,
      bankCode,
      bankName: bank?.name || "",
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setShowForm(false);
  };

  const addAccount = async () => {
    if (!form.bankCode) {
      toast.error("Select your bank");
      return;
    }

    if (!/^\d{10}$/.test(form.accountNumber)) {
      toast.error("Bank account number must contain exactly 10 digits");
      return;
    }

    try {
      setSubmitting(true);

      const response = await bankApi.addBankAccount({
        bankName: form.bankName,
        bankCode: form.bankCode,
        accountNumber: form.accountNumber,
        accountType: form.accountType,
        currency: form.currency,
      });

      const account = response?.data;

      toast.success("Bank account added successfully");

      resetForm();

      await loadAccounts();

      if (account?._id) {
        onSelect(account._id);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to add bank account",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const verifyAccount = async (accountId: string) => {
    try {
      setVerifyingId(accountId);

      const response = await bankApi.verifyBankAccount(accountId);

      const verifiedAccount = response?.data;

      toast.success("Bank account verified successfully");

      await loadAccounts();

      if (verifiedAccount?._id) {
        onSelect(verifiedAccount._id);
      } else {
        onSelect(accountId);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Bank account verification failed",
      );
    } finally {
      setVerifyingId(null);
    }
  };

  const makePrimary = async (accountId: string) => {
    try {
      await bankApi.setPrimaryBankAccount(accountId);

      toast.success("Bank account selected as primary");

      onSelect(accountId);

      await loadAccounts();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to make account primary",
      );
    }
  };

  const selectedAccount = accounts.find(
    (account) => account._id === selectedBankAccountId,
  );

  const canContinue =
    !!selectedAccount &&
    selectedAccount.verificationStatus === "verified" &&
    selectedAccount.isPrimary === true;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Bank Account</h2>

        <p className="mt-1 text-sm text-gray-500">
          Add and verify the bank account where your approved loan will be
          disbursed.
        </p>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 text-blue-600" size={20} />

          <div>
            <p className="font-medium text-blue-900">
              Bank account verification
            </p>

            <p className="mt-1 text-sm text-blue-800">
              Your account will be verified against the bank records before it
              can be used for loan disbursement.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Your Bank Accounts</h3>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadAccounts}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} />
            Add Account
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <h3 className="mb-4 font-semibold text-gray-900">Add Bank Account</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Bank
              </label>

              <select
                value={form.bankCode}
                onChange={(e) => handleBankChange(e.target.value)}
                disabled={loadingBanks || submitting}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="">
                  {loadingBanks ? "Loading banks..." : "Select bank"}
                </option>

                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Account Number
              </label>

              <input
                type="text"
                inputMode="numeric"
                maxLength={10}
                value={form.accountNumber}
                onChange={(e) =>
                  updateForm("accountNumber", e.target.value.replace(/\D/g, ""))
                }
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                placeholder="10-digit account number"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Account Type
              </label>

              <select
                value={form.accountType}
                onChange={(e) =>
                  updateForm(
                    "accountType",
                    e.target.value as "savings" | "current",
                  )
                }
                disabled={submitting}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
              >
                <option value="savings">Savings</option>
                <option value="current">Current</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Currency
              </label>

              <input
                type="text"
                value={form.currency}
                disabled
                className="w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-gray-600"
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={addAccount}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Add Account
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-blue-600" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center">
          <p className="font-medium text-gray-700">No bank account added yet</p>

          <p className="mt-1 text-sm text-gray-500">
            Add a bank account to continue.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((account) => {
            const verified = account.verificationStatus === "verified";

            const selected = account._id === selectedBankAccountId;

            return (
              <div
                key={account._id}
                className={[
                  "rounded-xl border p-5 transition",
                  selected
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white",
                ].join(" ")}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-1">
                      {verified ? (
                        <CheckCircle className="text-green-600" size={22} />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-yellow-500" />
                      )}
                    </div>

                    <div>
                      <p className="font-semibold text-gray-900">
                        {account.bankName}
                      </p>

                      <p className="mt-1 text-sm text-gray-600">
                        {account.accountName || "Account holder"}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        ****{account.accountNumberLast4}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            verified
                              ? "bg-green-100 text-green-700"
                              : account.verificationStatus === "failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700",
                          ].join(" ")}
                        >
                          {verified
                            ? "Verified"
                            : account.verificationStatus === "failed"
                              ? "Verification Failed"
                              : "Pending Verification"}
                        </span>

                        {account.isPrimary && (
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                            Primary
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!verified && (
                      <button
                        type="button"
                        onClick={() => verifyAccount(account._id)}
                        disabled={verifyingId === account._id}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {verifyingId === account._id && (
                          <Loader2 size={15} className="animate-spin" />
                        )}
                        Verify
                      </button>
                    )}

                    {verified && !account.isPrimary && (
                      <button
                        type="button"
                        onClick={() => makePrimary(account._id)}
                        className="rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        Make Primary
                      </button>
                    )}

                    {verified && (
                      <button
                        type="button"
                        onClick={() => {
                          console.log("=== BankAccountStep Select Click ===");
                          console.log("account._id:", account._id);
                          console.log("onSelect:", onSelect);
                          console.log("typeof onSelect:", typeof onSelect);

                          if (typeof onSelect !== "function") {
                            console.error("ERROR: onSelect is not a function", {
                              onSelect,
                              accountId: account._id,
                            });

                            alert(
                              `onSelect is ${typeof onSelect}. Check the browser console.`,
                            );

                            return;
                          }

                          console.log("Calling onSelect with:", account._id);

                          onSelect(account._id);
                        }}
                        className={[
                          "rounded-lg px-4 py-2 text-sm font-medium",
                          selected
                            ? "bg-green-600 text-white"
                            : "border border-gray-300 text-gray-700 hover:bg-gray-50",
                        ].join(" ")}
                      >
                        {selected ? "Selected" : "Select"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedAccount && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex gap-3">
            <CheckCircle className="mt-0.5 text-green-600" size={20} />

            <div>
              <p className="font-medium text-green-900">
                Bank account selected
              </p>

              <p className="mt-1 text-sm text-green-800">
                {selectedAccount.bankName} ••••
                {selectedAccount.accountNumberLast4}
              </p>

              {!canContinue && (
                <p className="mt-1 text-sm text-green-800">
                  This account must be verified and primary before you continue
                  to BVN verification.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountStep;
