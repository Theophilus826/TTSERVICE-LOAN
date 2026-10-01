
import React, { useEffect, useState } from "react";
import {
  CheckCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";

import kycApi from "../services/kycApi";

interface BvnStepProps {
  bankAccountId: string | null;
  bvnLast4?: string | null;
  bvnVerificationStatus?:
    | "not_started"
    | "pending"
    | "verified"
    | "failed";
  customerVerificationStatus?:
    | "not_started"
    | "pending"
    | "verified"
    | "failed";
  onVerified: () => void;
}

const BvnStep: React.FC<BvnStepProps> = ({
  bankAccountId,
  bvnLast4,
  bvnVerificationStatus = "not_started",
  customerVerificationStatus = "not_started",
  onVerified,
}) => {
  const [bvn, setBvn] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [status, setStatus] = useState(bvnVerificationStatus);
  const [customerStatus, setCustomerStatus] = useState(
    customerVerificationStatus,
  );

  useEffect(() => {
    setStatus(bvnVerificationStatus);
    setCustomerStatus(customerVerificationStatus);
  }, [bvnVerificationStatus, customerVerificationStatus]);

  const refreshStatus = async () => {
    try {
      const response = await kycApi.getVerificationStatus();

      const data = response?.data;

      setStatus(data?.bvnVerificationStatus || "not_started");
      setCustomerStatus(
        data?.customerVerificationStatus || "not_started",
      );

      if (
        data?.bvnVerificationStatus === "verified" &&
        data?.customerVerificationStatus === "verified"
      ) {
        onVerified();
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to refresh verification status",
      );
    }
  };

  const submitBvn = async () => {
    if (!bankAccountId) {
      toast.error("Please select a verified primary bank account first.");
      return;
    }

    if (!/^\d{11}$/.test(bvn)) {
      toast.error("BVN must contain exactly 11 digits.");
      return;
    }

    try {
      setSubmitting(true);

      const response = await kycApi.startBvnVerification({
        bvn,
        bankAccountId,
      });

      const data = response?.data;

      setStatus(data?.bvnVerificationStatus || "pending");
      setCustomerStatus(
        data?.customerVerificationStatus || "pending",
      );

      setBvn("");

      toast.success(
        "BVN verification has been submitted successfully.",
      );

      await refreshStatus();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to start BVN verification",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fullyVerified =
    status === "verified" && customerStatus === "verified";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          BVN Verification
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Verify your BVN against the bank account you selected.
        </p>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
        <div className="flex gap-3">
          <ShieldCheck className="mt-0.5 text-blue-600" size={21} />

          <div>
            <p className="font-medium text-blue-900">
              Your BVN is protected
            </p>

            <p className="mt-1 text-sm text-blue-800">
              Your full BVN is sent securely for verification and is
              never displayed back in the application.
            </p>
          </div>
        </div>
      </div>

      {fullyVerified ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5">
          <div className="flex gap-3">
            <CheckCircle
              className="mt-0.5 text-green-600"
              size={24}
            />

            <div>
              <h3 className="font-semibold text-green-900">
                BVN verification completed
              </h3>

              <p className="mt-1 text-sm text-green-800">
                Your BVN and customer identity have been successfully
                verified.
              </p>

              {bvnLast4 && (
                <p className="mt-2 text-sm font-medium text-green-800">
                  BVN ending in {bvnLast4}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {(status === "pending" ||
            customerStatus === "pending") && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex gap-3">
                <Loader2
                  className="mt-0.5 animate-spin text-yellow-600"
                  size={20}
                />

                <div>
                  <p className="font-medium text-yellow-900">
                    Verification in progress
                  </p>

                  <p className="mt-1 text-sm text-yellow-800">
                    Your verification request is being processed. You
                    can refresh the status below.
                  </p>
                </div>
              </div>
            </div>
          )}

          {status === "failed" ||
          customerStatus === "failed" ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex gap-3">
                <AlertCircle
                  className="mt-0.5 text-red-600"
                  size={20}
                />

                <div>
                  <p className="font-medium text-red-900">
                    Verification was not successful
                  </p>

                  <p className="mt-1 text-sm text-red-800">
                    Please confirm that your BVN details and selected
                    bank account are correct, then try again.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              BVN
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={11}
              value={bvn}
              onChange={(e) =>
                setBvn(e.target.value.replace(/\D/g, ""))
              }
              disabled={
                submitting ||
                status === "pending" ||
                customerStatus === "pending"
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3 text-lg tracking-widest outline-none focus:border-blue-500"
              placeholder="Enter your 11-digit BVN"
            />

            <p className="mt-2 text-xs text-gray-500">
              Your BVN must contain exactly 11 digits.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={submitBvn}
              disabled={
                submitting ||
                bvn.length !== 11 ||
                !bankAccountId ||
                status === "pending" ||
                customerStatus === "pending"
              }
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && (
                <Loader2 size={17} className="animate-spin" />
              )}
              Verify BVN
            </button>

            <button
              type="button"
              onClick={refreshStatus}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={17} />
              Refresh Status
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default BvnStep;

