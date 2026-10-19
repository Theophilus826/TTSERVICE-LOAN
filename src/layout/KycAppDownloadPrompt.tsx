
import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Download,
  Smartphone,
  LoaderCircle,
  X,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import API from "../services/Api";

type AppUpdateResponse = {
  success: boolean;
  updateAvailable?: boolean;
  version?: string;
  versionCode?: number;
  apkUrl?: string | null;
  changelog?: string;
  message?: string;
};

type AppUpdate = {
  version: string;
  versionCode: number;
  apkUrl: string;
  changelog: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

const TRUSTED_APK_URL =
  "https://github.com/Theophilus826/Tofads-loan/releases/download/TTSERVICE/app-debug.apk";

function isTrustedApkUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.pathname ===
        "/Theophilus826/Tofads-loan/releases/download/TTSERVICE/app-debug.apk" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export default function KycAppDownloadPrompt({
  open,
  onClose,
}: Props) {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  const loadApk = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError("");
    setUpdate(null);

    try {
      const response = await API.get<AppUpdateResponse>(
        "/app-version/latest",
        {
          params: {
            currentVersionCode: 0,
          },
          signal,
        }
      );

      const data = response.data;

      if (!data.success) {
        throw new Error(
          data.message || "Unable to load the Android app."
        );
      }

      if (!data.apkUrl) {
        throw new Error(
          "No APK download is currently available. Please try again later."
        );
      }

      if (!isTrustedApkUrl(data.apkUrl)) {
        throw new Error(
          "The APK download URL is invalid or not trusted."
        );
      }

      setUpdate({
        version: data.version || "Latest",
        versionCode: data.versionCode ?? 0,
        apkUrl: data.apkUrl,
        changelog: data.changelog || "",
      });
    } catch (err) {
      if (signal.aborted) return;

      const message =
        (
          err as {
            response?: {
              data?: {
                message?: string;
              };
            };
            message?: string;
          }
        )?.response?.data?.message ||
        (err instanceof Error ? err.message : "");

      setError(
        message || "Could not load the app download link."
      );
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open || Capacitor.isNativePlatform()) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    void loadApk(controller.signal);

    return () => {
      controller.abort();
    };
  }, [open, retryKey, loadApk]);

  const handleDownload = () => {
    if (!update?.apkUrl || downloading) return;

    setError("");

    if (!isTrustedApkUrl(update.apkUrl)) {
      setError("The APK download URL is invalid.");
      return;
    }

    try {
      setDownloading(true);

      // Open the GitHub release asset directly.
      // GitHub handles the actual APK download.
      window.location.assign(update.apkUrl);
    } catch {
      setDownloading(false);
      setError(
        "Could not open the APK download. Please try again."
      );
    }
  };

  if (!open || Capacitor.isNativePlatform()) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kyc-app-required-title"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close prompt"
          className="absolute right-4 top-4 rounded-full p-2 text-slate-500 transition hover:bg-slate-100"
        >
          <X size={20} />
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
          <Smartphone size={32} />
        </div>

        <h2
          id="kyc-app-required-title"
          className="mt-5 text-center text-2xl font-bold text-slate-950"
        >
          TTSERVICE app required
        </h2>

        <p className="mt-3 text-center text-sm leading-6 text-slate-600">
          Complete your KYC verification securely using the
          TTSERVICE Android app. Download and install the app,
          then open it and sign in to continue.
        </p>

        {loading && (
          <div
            className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-600"
            role="status"
          >
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
            Checking the latest app version...
          </div>
        )}

        {!loading && update && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Latest version
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {update.version}
                </p>
              </div>

              <div className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                <ShieldCheck size={14} />
                Verified URL
              </div>
            </div>

            {update.changelog && (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold text-slate-700">
                  What&apos;s new
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-5 text-slate-600">
                  {update.changelog}
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {error && !loading && (
          <button
            type="button"
            onClick={() => setRetryKey((key) => key + 1)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Retry loading app
          </button>
        )}

        <button
          type="button"
          onClick={handleDownload}
          disabled={loading || downloading || !update?.apkUrl}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading || downloading ? (
            <LoaderCircle
              size={19}
              className="animate-spin"
            />
          ) : (
            <Download size={19} />
          )}

          {loading
            ? "Checking app..."
            : downloading
              ? "Opening download..."
              : "Download Android app"}
        </button>

        <p className="mt-4 text-center text-xs leading-5 text-slate-500">
          After downloading, install TTSERVICE and reopen it
          to continue your KYC verification. Android may ask
          you to approve installation from your browser.
        </p>
      </div>
    </div>
  );
}
