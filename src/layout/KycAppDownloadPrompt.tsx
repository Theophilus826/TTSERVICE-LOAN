
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Download,
  Smartphone,
  LoaderCircle,
  X,
} from "lucide-react";

import API from "../services/Api";

type AppUpdate = {
  version?: string;
  apkUrl: string;
  changelog?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
};

function isTrustedApkUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "github.com" &&
      url.pathname.startsWith(
        "/Theophilus826/App-release/releases/download/"
      ) &&
      url.pathname.endsWith("/TTSERVICE.apk")
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

  useEffect(() => {
    if (!open || Capacitor.isNativePlatform()) return;

    let cancelled = false;

    async function loadApk() {
      setLoading(true);
      setError("");

      try {
        // Fetch the latest app release using the shared API instance.
        const response = await API.get(
          "/api/app-version/latest",
          {
            params: {
              currentVersionCode: 0,
            },
          }
        );

        const data = response.data;

        if (!data.success || !data.apkUrl) {
          throw new Error(
            "The app download is temporarily unavailable. Please try again later."
          );
        }

        if (!isTrustedApkUrl(data.apkUrl)) {
          throw new Error("The APK download URL is invalid.");
        }

        if (!cancelled) {
          setUpdate({
            version: data.version,
            apkUrl: data.apkUrl,
            changelog: data.changelog,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load the app download link."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadApk();

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleDownload() {
    if (!update?.apkUrl || downloading) return;

    setDownloading(true);
    setError("");

    try {
      if (!isTrustedApkUrl(update.apkUrl)) {
        throw new Error("The APK download URL is invalid.");
      }

      const link = document.createElement("a");
      link.href = update.apkUrl;
      link.download = "TTSERVICE.apk";
      link.rel = "noopener noreferrer";

      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Download failed."
      );
    } finally {
      setDownloading(false);
    }
  }

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
          KYC verification must be completed in the TTSERVICE
          mobile app. Install the Android app, open it, and sign
          in to continue your verification.
        </p>

        {update?.version && (
          <p className="mt-2 text-center text-xs text-slate-500">
            Latest version: {update.version}
          </p>
        )}

        {update?.changelog && (
          <p className="mt-3 whitespace-pre-line text-sm text-slate-600">
            {update.changelog}
          </p>
        )}

        {error && (
          <p
            className="mt-4 text-sm text-red-600"
            role="alert"
          >
            {error}
          </p>
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
            ? "Loading download..."
            : downloading
              ? "Preparing download..."
              : "Download Android app"}
        </button>

        {error && (
          <button
            type="button"
            onClick={() => {
              setUpdate(null);
              setError("");
              onClose();
            }}
            className="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        )}

        <p className="mt-4 text-center text-xs text-slate-500">
          After installing, reopen TTSERVICE to continue KYC.
        </p>
      </div>
    </div>
  );
}

