
import { useEffect, useState } from "react";
import {
  Download,
  X,
  Smartphone,
  LoaderCircle,
  CheckCircle2,
} from "lucide-react";

// Change this to your deployed backend URL.
const API_URL = import.meta.env.VITE_API_URL;

const DISMISSED_KEY = "ttservice_update_dismissed";
const DOWNLOADED_KEY = "ttservice_apk_downloaded";

export default function FloatingAppUpdatePrompt() {
  const [update, setUpdate] = useState(null);
  const [visible, setVisible] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function checkForUpdate() {
      // Show only on mobile-sized screens.
      if (!window.matchMedia("(max-width: 767px)").matches) {
        return;
      }

      // Don't show again after a successful download or dismissal.
      if (
        localStorage.getItem(DOWNLOADED_KEY) === "true" ||
        localStorage.getItem(DISMISSED_KEY) === "true"
      ) {
        return;
      }

      try {
        // Set this to your currently installed app version code.
        const currentVersionCode = 1;

        const response = await fetch(
          `${API_URL}/api/app-version/latest?currentVersionCode=${currentVersionCode}`
        );

        if (!response.ok) {
          throw new Error("Could not check for app updates.");
        }

        const data = await response.json();

        if (cancelled) return;

        if (data.success && data.updateAvailable && data.apkUrl) {
          setUpdate(data);
          setVisible(true);
        }
      } catch (err) {
        console.error("App update check failed:", err);
      }
    }

    // Wait until the page has fully loaded.
    if (document.readyState === "complete") {
      checkForUpdate();
    } else {
      window.addEventListener("load", checkForUpdate, {
        once: true,
      });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", checkForUpdate);
    };
  }, []);

  async function handleDownload() {
    if (!update?.apkUrl || downloading) return;

    setDownloading(true);
    setError("");

    try {
      const url = new URL(update.apkUrl);

      // Only permit your configured GitHub repository's release assets.
      if (
        url.protocol !== "https:" ||
        url.hostname !== "github.com" ||
        !url.pathname.startsWith(
          "/Theophilus826/App-release/releases/download/"
        ) ||
        !url.pathname.endsWith("/TTSERVICE.apk")
      ) {
        throw new Error("The APK download URL is invalid.");
      }

      // The browser handles downloading the APK.
      const link = document.createElement("a");
      link.href = url.href;
      link.download = "TTSERVICE.apk";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();

      // This records that download was initiated, not verified completed.
      localStorage.setItem(DOWNLOADED_KEY, "true");
      setVisible(false);
    } catch (err) {
      setError(err.message || "Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "true");
    setVisible(false);
  }

  if (!visible || !update) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-[100] mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-2xl">
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Smartphone size={25} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-gray-900">
                  TTSERVICE update available
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  Version {update.version}
                </p>
              </div>

              {!update.forceUpdate && (
                <button
                  type="button"
                  onClick={handleDismiss}
                  aria-label="Dismiss update prompt"
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                >
                  <X size={19} />
                </button>
              )}
            </div>

            {update.changelog && (
              <p className="mt-2 text-sm leading-5 text-gray-600">
                {update.changelog}
              </p>
            )}
          </div>
        </div>

        {error && (
          <p className="px-4 pb-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <div className="border-t border-gray-100 p-3">
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloading ? (
              <LoaderCircle size={19} className="animate-spin" />
            ) : (
              <Download size={19} />
            )}

            {downloading ? "Preparing download..." : "Download update"}
          </button>

          {update.forceUpdate && (
            <p className="mt-2 text-center text-xs text-gray-500">
              This update is required.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
