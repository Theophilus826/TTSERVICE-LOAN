
import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";
import API from "../services/Api";
import {
  checkFloatingOverlayPermission,
  getFloatingReminderConsentStatus,
  requestFloatingOverlayPermission,
  setFloatingReminderConsent,
  syncLoanWidget,
} from "../services/loanWidget";

export default function FloatingReminderPrompt() {
  const { user, initializing } = useAuth();
  const [showPrompt, setShowPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adminEnabled, setAdminEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [waitingForSettings, setWaitingForSettings] = useState(false);

  const userId = user?._id;
  const isCustomer = user?.role === "customer";
  const checkedUser = useRef<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (
      initializing ||
      !userId ||
      !isCustomer ||
      !Capacitor.isNativePlatform()
    ) {
      setShowPrompt(false);
      return;
    }

    try {
      const response = await API.get<{
        success?: boolean;
        data?: { floatingReminderEnabled?: boolean };
      }>("/settings/widget");

      const enabled =
        response.data?.data?.floatingReminderEnabled === true;

      setAdminEnabled(enabled);

      if (!enabled) {
        setShowPrompt(false);
        setWaitingForSettings(false);
        return;
      }

      const status = await getFloatingReminderConsentStatus(userId);

      if (status.asked) {
        setShowPrompt(false);
        setWaitingForSettings(false);
        return;
      }

      setShowPrompt(true);
    } catch (error) {
      console.error(
        "[FloatingReminderPrompt] Could not check settings:",
        error,
      );
      setShowPrompt(false);
    }
  }, [initializing, userId, isCustomer]);

  useEffect(() => {
    if (initializing) return;

    if (!userId || !isCustomer) {
      checkedUser.current = null;
      setShowPrompt(false);
      setWaitingForSettings(false);
      return;
    }

    if (checkedUser.current === userId) return;

    checkedUser.current = userId;
    void checkStatus();
  }, [initializing, userId, isCustomer, checkStatus]);

  useEffect(() => {
    if (!userId || !isCustomer || !Capacitor.isNativePlatform()) {
      return;
    }

    const onResume = () => {
      if (document.visibilityState !== "visible") return;

      if (waitingForSettings) {
        void (async () => {
          try {
            const granted = await checkFloatingOverlayPermission();

            setWaitingForSettings(false);

            if (granted) {
              await syncLoanWidget();
              setMessage(
                "Floating reminders are enabled when a payment is due.",
              );
            } else {
              setMessage(
                "Overlay permission was not granted. You can enable it later in Android Settings.",
              );
            }
          } catch (error) {
            console.error(
              "[FloatingReminderPrompt] Permission check failed:",
              error,
            );
            setWaitingForSettings(false);
          }
        })();
      } else {
        void syncLoanWidget().catch((error) => {
          console.error("[FloatingReminderPrompt] Sync failed:", error);
        });
      }
    };

    document.addEventListener("visibilitychange", onResume);

    return () => {
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [userId, isCustomer, waitingForSettings]);

  const handleEnable = async () => {
    if (!userId || busy || !adminEnabled) return;

    setBusy(true);
    setMessage("");

    try {
      await setFloatingReminderConsent(userId, true);

      const granted = await checkFloatingOverlayPermission();

      if (granted) {
        await syncLoanWidget();
        setShowPrompt(false);
        setMessage(
          "Floating reminders are enabled when a payment is due.",
        );
      } else {
        setWaitingForSettings(true);
        setMessage(
          "Allow MenuMoney to display over other apps. Return here afterward to finish setup.",
        );
        await requestFloatingOverlayPermission();
      }
    } catch (error) {
      console.error(
        "[FloatingReminderPrompt] Enable failed:",
        error,
      );
      setMessage(
        "We couldn't complete setup. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleNotNow = async () => {
    if (!userId || busy) return;

    setBusy(true);

    try {
      await setFloatingReminderConsent(userId, false);
      setShowPrompt(false);
      setMessage("");
    } catch (error) {
      console.error(
        "[FloatingReminderPrompt] Saving choice failed:",
        error,
      );
      setMessage("We couldn't save your choice. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (
    initializing ||
    !isCustomer ||
    !Capacitor.isNativePlatform() ||
    !showPrompt
  ) {
    return message ? (
      <div
        role="status"
        className="fixed bottom-24 left-4 right-4 z-[1000] mx-auto max-w-md rounded-xl bg-slate-900 p-3 text-sm text-white shadow-lg"
      >
        {message}
      </div>
    ) : null;
  }

  return (
    <>
      <div className="fixed inset-0 z-[1000] bg-black/50" />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="floating-reminder-title"
        className="fixed left-4 right-4 top-1/2 z-[1001] mx-auto w-auto max-w-md -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-2xl">
          🔔
        </div>

        <h2
          id="floating-reminder-title"
          className="text-xl font-bold text-slate-900"
        >
          Floating payment reminders
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Would you like MenuMoney to show a small reminder over
          other apps when you have an unpaid loan installment?
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-600">
          You can change your choice later. Android may ask you to
          allow MenuMoney to display over other apps.
        </p>

        {message && (
          <p role="status" className="mt-3 text-sm text-blue-700">
            {message}
          </p>
        )}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleNotNow()}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 disabled:opacity-50"
          >
            Not now
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleEnable()}
            className="flex-1 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:opacity-50"
          >
            {busy ? "Please wait…" : "Enable"}
          </button>
        </div>
      </section>
    </>
  );
}
