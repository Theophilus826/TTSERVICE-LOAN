
import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "../context/AuthContext";

import {
  checkFloatingOverlayPermission,
  checkExactAlarmPermission,
  getFloatingReminderConsentStatus,
  requestExactAlarmPermission,
  requestFloatingOverlayPermission,
  setFloatingReminderConsent,
  syncLoanWidget,
} from "../services/loanWidget";

type SetupStep = "consent" | "overlay" | "exact";

export default function FloatingReminderPrompt() {
  const { user, initializing } = useAuth();

  const [showPrompt, setShowPrompt] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adminEnabled, setAdminEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [waitingForSettings, setWaitingForSettings] = useState(false);
  const [step, setStep] = useState<SetupStep>("consent");

  const userId = user?._id;
  const checkingRef = useRef(false);

  const stepNumber =
    step === "consent" ? 1 : step === "overlay" ? 2 : 3;

  // Check all permissions and determine the next setup step.
  const checkStatus = useCallback(async () => {
    if (
      initializing ||
      !userId ||
      !Capacitor.isNativePlatform()
    ) {
      setShowPrompt(false);
      return;
    }

    if (checkingRef.current) return;

    checkingRef.current = true;

    try {
      const response = await fetchWidgetSetting();

      setAdminEnabled(response);

      if (!response) {
        setShowPrompt(false);
        return;
      }

      const status =
        await getFloatingReminderConsentStatus(userId);

      // User has already declined.
      if (status.asked && !status.enabled) {
        setShowPrompt(false);
        return;
      }

      // User has not yet made a choice.
      if (!status.asked) {
        setStep("consent");
        setShowPrompt(true);
        return;
      }

      // Check overlay permission.
      if (!status.overlayGranted) {
        setStep("overlay");
        setShowPrompt(true);
        return;
      }

      // Check exact alarm permission.
      if (!status.exactAlarmGranted) {
        setStep("exact");
        setShowPrompt(true);
        return;
      }

      // All permissions granted.
      setStep("exact");
      setShowPrompt(false);
      setMessage("All reminder permissions are enabled.");

      await syncLoanWidget();

    } catch (error) {
      console.error("[FloatingReminder] Check failed", error);
      setMessage(
        "We couldn't check your reminder settings. Please try again."
      );
    } finally {
      checkingRef.current = false;
    }
  }, [initializing, userId]);

  // Fetch the administrator's widget setting.
  async function fetchWidgetSetting(): Promise<boolean> {
    const API = (await import("../services/Api")).default;

    const response = await API.get<{
      data?: {
        floatingReminderEnabled?: boolean;
      };
    }>("/settings/widget");

    return (
      response.data?.data?.floatingReminderEnabled === true
    );
  }

  // Initial check after login.
  useEffect(() => {
    if (initializing) return;

    if (!userId) {
      setShowPrompt(false);
      setMessage("");
      setAdminEnabled(false);
      return;
    }

    if (!Capacitor.isNativePlatform()) return;

    void checkStatus();
  }, [initializing, userId, checkStatus]);

  // Recheck permissions when the user returns from Android Settings.
  useEffect(() => {
    if (!userId || !Capacitor.isNativePlatform()) return;

    const onVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;

      if (!waitingForSettings) return;

      setBusy(true);
      setMessage("Checking your permissions...");

      try {
        const [overlayGranted, exactAlarmGranted] =
          await Promise.all([
            checkFloatingOverlayPermission(),
            checkExactAlarmPermission(),
          ]);

        setWaitingForSettings(false);

        if (!overlayGranted) {
          setStep("overlay");
          setMessage(
            "Display over other apps permission is still required."
          );
          setShowPrompt(true);
        } else if (!exactAlarmGranted) {
          setStep("exact");
          setMessage(
            "Please allow exact alarms to complete setup."
          );
          setShowPrompt(true);
        } else {
          await syncLoanWidget();

          setShowPrompt(false);
          setMessage("Payment reminders are now fully enabled.");
        }

        await checkStatus();

      } catch (error) {
        console.error(
          "[FloatingReminder] Permission check failed",
          error
        );

        setMessage(
          "We couldn't verify your permissions. Please try again."
        );
      } finally {
        setBusy(false);
      }
    };

    document.addEventListener(
      "visibilitychange",
      onVisibilityChange
    );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange
      );
    };
  }, [userId, waitingForSettings, checkStatus]);

  // Move to the next permission automatically.
  const handleContinue = async () => {
    if (!userId || busy || !adminEnabled) return;

    setBusy(true);
    setMessage("");

    try {
      // STEP 1: Save customer consent.
      if (step === "consent") {
        await setFloatingReminderConsent(userId, true);

        setStep("overlay");
        setMessage(
          "Great! Now allow MenuMoney to display reminders over other apps."
        );

        const granted = await checkFloatingOverlayPermission();

        if (granted) {
          setStep("exact");
          setMessage("Display permission already granted.");
        }

        return;
      }

      // STEP 2: Request floating overlay permission.
      if (step === "overlay") {
        const granted = await checkFloatingOverlayPermission();

        if (granted) {
          setStep("exact");
          setMessage("Display permission granted. One more step!");
          return;
        }

        setWaitingForSettings(true);

        setMessage(
          "Opening Android Settings. Allow MenuMoney to display over other apps, then return here."
        );

        try {
          await requestFloatingOverlayPermission();
        } catch (error) {
          setWaitingForSettings(false);
          setMessage(
            "Go to Settings > Apps > MenuMoney > Display over other apps."
          );
          console.error(error);
        }

        return;
      }

      // STEP 3: Request exact alarm permission.
      if (step === "exact") {
        const granted = await checkExactAlarmPermission();

        if (granted) {
          await syncLoanWidget();
          setShowPrompt(false);
          setMessage("Payment reminders are fully enabled!");
          return;
        }

        setWaitingForSettings(true);

        setMessage(
          "Opening Android Settings. Allow exact alarms, then return here."
        );

        try {
          await requestExactAlarmPermission();
        } catch (error) {
          setWaitingForSettings(false);
          setMessage(
            "Please enable exact alarms in Android Settings."
          );
          console.error(error);
        }
      }

    } catch (error) {
      console.error("[FloatingReminder] Setup failed", error);

      setMessage(
        "Something went wrong. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  // Handle skipping or declining.
  const handleNotNow = async () => {
    if (!userId || busy) return;

    setBusy(true);

    try {
      if (step === "consent") {
        await setFloatingReminderConsent(userId, false);
        setShowPrompt(false);
        setMessage("");
      } else {
        setShowPrompt(false);
        setWaitingForSettings(false);

        setMessage(
          "You can enable the remaining reminder permissions later."
        );
      }
    } catch (error) {
      console.error(
        "[FloatingReminder] Saving choice failed",
        error
      );

      setMessage("We couldn't save your choice. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (
    initializing ||
    !userId ||
    !Capacitor.isNativePlatform() ||
    !adminEnabled ||
    !showPrompt
  ) {
    return message && userId ? (
      <div
        role="status"
        className="fixed bottom-24 left-4 right-4 z-[1000] mx-auto max-w-md rounded-xl bg-slate-900 p-4 text-sm text-white shadow-lg"
      >
        {message}
      </div>
    ) : null;
  }

  const steps = [
    {
      number: 1,
      title: "Enable payment reminders",
      description:
        "Allow MenuMoney to show helpful reminders when your loan installment is due.",
      icon: "🔔",
      active: step === "consent",
      completed: step !== "consent",
      button: "Enable reminders",
    },
    {
      number: 2,
      title: "Display over other apps",
      description:
        "Allow MenuMoney to show a small floating reminder while you use other apps.",
      icon: "📱",
      active: step === "overlay",
      completed: step === "exact",
      button: "Allow display permission",
    },
    {
      number: 3,
      title: "Allow exact alarms",
      description:
        "Make sure snoozed reminders resume at the correct time, even when the app is closed.",
      icon: "⏰",
      active: step === "exact",
      completed: false,
      button: "Enable exact alarms",
    },
  ];

  const activeStep = steps[stepNumber - 1];

  return (
    <div className="fixed inset-0 z-[1000] overflow-y-auto bg-slate-50">
      <div className="mx-auto flex min-h-full w-full max-w-lg flex-col px-5 py-8 sm:justify-center sm:px-8">

        {/* Header */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
            🔔
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Set up payment reminders
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Complete these quick steps so you never miss an
            important loan payment.
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">
              Setup progress
            </span>

            <span className="text-sm font-bold text-blue-700">
              Step {stepNumber} of 3
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${((stepNumber - 1) / 3) * 100 + 15}%`,
              }}
            />
          </div>
        </div>

        {/* All setup steps on one page */}
        <div className="space-y-4">
          {steps.map((item) => (
            <div
              key={item.number}
              className={`rounded-2xl border bg-white p-5 transition-all ${
                item.active
                  ? "border-blue-500 shadow-md ring-1 ring-blue-100"
                  : item.completed
                  ? "border-green-200"
                  : "border-slate-200 opacity-65"
              }`}
            >
              <div className="flex items-start gap-4">

                {/* Step icon */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl ${
                    item.completed
                      ? "bg-green-100"
                      : item.active
                      ? "bg-blue-100"
                      : "bg-slate-100"
                  }`}
                >
                  {item.completed ? "✓" : item.icon}
                </div>

                <div className="min-w-0 flex-1">

                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Step {item.number}
                    </span>

                    {item.completed && (
                      <span className="text-xs font-semibold text-green-600">
                        Completed
                      </span>
                    )}

                    {item.active && (
                      <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
                        Current step
                      </span>
                    )}
                  </div>

                  <h2 className="font-bold text-slate-900">
                    {item.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.description}
                  </p>

                  {item.active && (
                    <button
                      type="button"
                      disabled={busy || waitingForSettings}
                      onClick={() => void handleContinue()}
                      className="mt-4 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {busy
                        ? "Please wait..."
                        : waitingForSettings
                        ? "Waiting for Settings..."
                        : item.button}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Status message */}
        {message && (
          <div
            role="status"
            className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800"
          >
            {message}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            type="button"
            disabled={busy || waitingForSettings}
            onClick={() => void handleNotNow()}
            className="rounded-lg px-5 py-3 text-sm font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50"
          >
            {step === "consent"
              ? "Not now"
              : "Continue without this permission"}
          </button>

          <p className="mt-2 text-xs leading-5 text-slate-400">
            You don't need to change your reminder permissions later
            in Android Settings.
          </p>
        </div>

      </div>
    </div>
  );
}
