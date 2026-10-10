
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
  const checkingRef = useRef(false);

  const checkStatus = useCallback(async () => {
    if (
      initializing ||
      !userId ||
      !isCustomer ||
      !Capacitor.isNativePlatform()
    ) {
      console.log("[FloatingReminder TEST] Check skipped", {
        initializing,
        userId,
        role: user?.role,
        platform: Capacitor.getPlatform(),
      });

      setShowPrompt(false);
      return;
    }

    if (checkingRef.current) {
      console.log("[FloatingReminder TEST] Check already running");
      return;
    }

    checkingRef.current = true;

    try {
      console.log("[FloatingReminder TEST] Checking admin setting");

      const response = await API.get<{
        success?: boolean;
        data?: { floatingReminderEnabled?: boolean };
      }>("/settings/widget");

      const enabled =
        response.data?.data?.floatingReminderEnabled === true;

      console.log("[FloatingReminder TEST] API result", {
        httpStatus: response.status,
        success: response.data?.success,
        responseData: response.data,
        adminEnabled: enabled,
      });

      setAdminEnabled(enabled);

      if (!enabled) {
        setShowPrompt(false);
        setWaitingForSettings(false);
        setMessage("");
        console.log("[FloatingReminder TEST] Admin switch is OFF");
        return;
      }

      const status = await getFloatingReminderConsentStatus(userId);

      console.log("[FloatingReminder TEST] Consent status", {
        userId,
        asked: status.asked,
        enabled: status.enabled,
        overlayGranted: status.overlayGranted,
      });

      if (status.asked) {
        setShowPrompt(false);
        setWaitingForSettings(false);
        console.log(
          "[FloatingReminder TEST] Customer already answered",
        );
        return;
      }

      setShowPrompt(true);
      console.log("[FloatingReminder TEST] Prompt should appear");
    } catch (error) {
      console.error(
        "[FloatingReminder TEST] Status check FAILED",
        error,
      );

      setShowPrompt(false);
      setMessage(
        "We couldn't check reminder settings. Please check your connection and reopen the app.",
      );
    } finally {
      checkingRef.current = false;
    }
  }, [initializing, userId, isCustomer, user?.role]);

  useEffect(() => {
    if (initializing) return;

    if (!userId || !isCustomer) {
      checkedUser.current = null;
      setShowPrompt(false);
      setWaitingForSettings(false);
      setAdminEnabled(false);
      setMessage("");
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

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      console.log("[FloatingReminder TEST] App returned to foreground");

      void (async () => {
        if (waitingForSettings) {
          try {
            const granted = await checkFloatingOverlayPermission();

            console.log(
              "[FloatingReminder TEST] Overlay permission after return:",
              granted,
            );

            setWaitingForSettings(false);

            if (granted) {
              await syncLoanWidget();
              setMessage(
                "Permission checked. Floating reminders can appear when a payment is due.",
              );
            } else {
              setMessage(
                "Overlay permission is still off. Enable it in Android Settings to use floating reminders.",
              );
            }
          } catch (error) {
            console.error(
              "[FloatingReminder TEST] Permission recheck FAILED",
              error,
            );
            setWaitingForSettings(false);
            setMessage(
              "We couldn't verify Android permission. Please try again.",
            );
          }
        }

        await checkStatus();

        try {
          await syncLoanWidget();
        } catch (error) {
          console.error(
            "[FloatingReminder TEST] Widget sync FAILED",
            error,
          );
        }
      })();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );
    };
  }, [userId, isCustomer, waitingForSettings, checkStatus]);

  const handleEnable = async () => {
    if (!userId || busy || !adminEnabled) return;

    setBusy(true);
    setMessage("");

    console.log("[FloatingReminder TEST] Enable clicked", {
      userId,
      platform: Capacitor.getPlatform(),
      adminEnabled,
    });

    try {
      await setFloatingReminderConsent(userId, true);

      console.log("[FloatingReminder TEST] Consent saved as enabled");

      const granted = await checkFloatingOverlayPermission();

      console.log(
        "[FloatingReminder TEST] Current overlay permission:",
        granted,
      );

      if (granted) {
        await syncLoanWidget();
        setShowPrompt(false);
        setMessage(
          "Floating reminders are enabled when a payment is due.",
        );
        return;
      }

      setWaitingForSettings(true);
      setMessage(
        "Allow MenuMoney to display over other apps. Return here afterward to finish setup.",
      );

      try {
        await requestFloatingOverlayPermission();
        console.log(
          "[FloatingReminder TEST] Android permission settings requested",
        );
      } catch (error) {
        console.error(
          "[FloatingReminder TEST] Could not open Android settings",
          error,
        );
        setWaitingForSettings(false);
        setMessage(
          "Android settings could not be opened. Go to Settings > Apps > MenuMoney > Display over other apps.",
        );
      }
    } catch (error) {
      console.error("[FloatingReminder TEST] Enable FAILED", error);
      setMessage("We couldn't complete setup. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleNotNow = async () => {
    if (!userId || busy) return;

    setBusy(true);
    setMessage("");

    try {
      await setFloatingReminderConsent(userId, false);

      console.log(
        "[FloatingReminder TEST] Consent saved as declined",
        { userId },
      );

      setShowPrompt(false);
      setWaitingForSettings(false);
    } catch (error) {
      console.error(
        "[FloatingReminder TEST] Saving choice FAILED",
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
