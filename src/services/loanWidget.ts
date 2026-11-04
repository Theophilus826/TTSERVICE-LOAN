
import { Capacitor, registerPlugin } from "@capacitor/core";
import API from "./Api";
import authApi from "./AuthService";
import repaymentApi, {
  type RepaymentSchedule,
  type RepaymentInstallment,
} from "./repaymentApi";

interface FloatingReminderAppearance {
  reminderWidth: number;
  reminderBackgroundHex: string;
  reminderTextColor: string;
  reminderTextSize: number;
  reminderCornerRadius: number;
  reminderHorizontalPadding: number;
  reminderVerticalPadding: number;
  reminderPositionY: number;
}

const DEFAULT_REMINDER_APPEARANCE: FloatingReminderAppearance = {
  reminderWidth: 320,
  reminderBackgroundHex: "#173B68",
  reminderTextColor: "#FFFFFF",
  reminderTextSize: 14,
  reminderCornerRadius: 18,
  reminderHorizontalPadding: 20,
  reminderVerticalPadding: 16,
  reminderPositionY: 100,
};

interface LoanWidgetPlugin {
  updateData(options: {
    userId: string;
    amount: string;
    dueDate: string;
    accountNumber: string;
    bankName: string;
    message: string;
    paymentDue: boolean;
    floatingReminderEnabled: boolean;
    unpaidInstallmentIds: string[];

    reminderWidth: number;
    reminderBackgroundHex: string;
    reminderTextColor: string;
    reminderTextSize: number;
    reminderCornerRadius: number;
    reminderHorizontalPadding: number;
    reminderVerticalPadding: number;
    reminderPositionY: number;
  }): Promise<{ success: boolean }>;

  clearData(): Promise<{ success: boolean }>;

  checkOverlayPermission(): Promise<{ granted: boolean }>;

  requestOverlayPermission(): Promise<{ granted: boolean }>;

  getFloatingReminderConsentStatus(options: {
    userId: string;
  }): Promise<{
    asked: boolean;
    enabled: boolean;
    overlayGranted: boolean;
  }>;

  setFloatingReminderConsent(options: {
    userId: string;
    enabled: boolean;
  }): Promise<{ success: boolean }>;

  stopFloatingReminder(): Promise<{ success: boolean }>;

  testFloatingReminder(options: {
    userId: string;
  }): Promise<{ success: boolean }>;

  diagnoseFloatingReminder(): Promise<{
    success: boolean;
    [key: string]: any;
  }>;
}

const NativeLoanWidget =
  registerPlugin<LoanWidgetPlugin>("LoanWidget");

const isNative = (): boolean =>
  Capacitor.isNativePlatform();

const formatMoney = (
  amount: number,
  currency: string,
): string => {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "NGN"} ${amount.toLocaleString("en-NG")}`;
  }
};

const getInstallmentAmount = (
  installment: RepaymentInstallment,
): number => {
  if (typeof installment.remainingAmount === "number") {
    return installment.remainingAmount;
  }

  const total =
    installment.totalAmount ??
    installment.total ??
    installment.amount;

  const paid =
    installment.paidAmount ??
    installment.paid ??
    0;

  if (typeof total !== "number") return 0;

  return Math.max(0, total - paid);
};

const getInstallmentDate = (
  installment: RepaymentInstallment,
  schedule: RepaymentSchedule,
): string | undefined =>
  installment.dueDate ??
  installment.dueAt ??
  installment.finalDueDate ??
  schedule.finalDueDate;

const getUnpaidInstallmentIds = (
  schedules: RepaymentSchedule[],
): string[] => {
  const ids = schedules.flatMap((schedule) =>
    (schedule.installments ?? [])
      .filter((installment) => {
        const status = String(
          installment.status ?? ""
        ).toLowerCase();

        return (
          status !== "paid" &&
          status !== "waived" &&
          getInstallmentAmount(installment) > 0
        );
      })
      .map((installment) => {
        const item = installment as RepaymentInstallment & {
          _id?: string;
          id?: string;
          installmentId?: string;
        };

        return String(
          item._id ??
          item.id ??
          item.installmentId ??
          ""
        );
      })
      .filter(Boolean)
  );

  return [...new Set(ids)];
};

const getNextInstallment = (
  schedules: RepaymentSchedule[],
) => {
  const candidates = schedules.flatMap((schedule) =>
    (schedule.installments ?? []).map((installment) => ({
      schedule,
      installment,
      amount: getInstallmentAmount(installment),
      date: getInstallmentDate(installment, schedule),
    }))
  );

  return candidates
    .filter(({ installment, amount }) => {
      const status = String(
        installment.status ?? ""
      ).toLowerCase();

      return (
        status !== "paid" &&
        status !== "waived" &&
        amount > 0
      );
    })
    .sort((a, b) => {
      const aTime = a.date
        ? new Date(a.date).getTime()
        : Number.MAX_SAFE_INTEGER;

      const bTime = b.date
        ? new Date(b.date).getTime()
        : Number.MAX_SAFE_INTEGER;

      return aTime - bTime;
    })[0];
};

/**
 * Validate and normalize global reminder appearance.
 * Invalid or missing values fall back to the defaults.
 */
const normalizeReminderAppearance = (
  appearance?: Partial<FloatingReminderAppearance> | null,
): FloatingReminderAppearance => {
  const source = appearance ?? {};

  const validColor = (
    value: unknown,
    fallback: string,
  ): string => {
    if (
      typeof value === "string" &&
      /^#[0-9A-Fa-f]{6}$/.test(value)
    ) {
      return value.toUpperCase();
    }

    return fallback;
  };

  const validNumber = (
    value: unknown,
    fallback: number,
    min: number,
    max: number,
  ): number => {
    if (
      typeof value !== "number" ||
      !Number.isFinite(value)
    ) {
      return fallback;
    }

    return Math.min(max, Math.max(min, value));
  };

  return {
    reminderWidth: validNumber(
      source.reminderWidth,
      DEFAULT_REMINDER_APPEARANCE.reminderWidth,
      200,
      600
    ),

    reminderBackgroundHex: validColor(
      source.reminderBackgroundHex,
      DEFAULT_REMINDER_APPEARANCE.reminderBackgroundHex
    ),

    reminderTextColor: validColor(
      source.reminderTextColor,
      DEFAULT_REMINDER_APPEARANCE.reminderTextColor
    ),

    reminderTextSize: validNumber(
      source.reminderTextSize,
      DEFAULT_REMINDER_APPEARANCE.reminderTextSize,
      10,
      30
    ),

    reminderCornerRadius: validNumber(
      source.reminderCornerRadius,
      DEFAULT_REMINDER_APPEARANCE.reminderCornerRadius,
      0,
      50
    ),

    reminderHorizontalPadding: validNumber(
      source.reminderHorizontalPadding,
      DEFAULT_REMINDER_APPEARANCE.reminderHorizontalPadding,
      0,
      60
    ),

    reminderVerticalPadding: validNumber(
      source.reminderVerticalPadding,
      DEFAULT_REMINDER_APPEARANCE.reminderVerticalPadding,
      0,
      60
    ),

    reminderPositionY: validNumber(
      source.reminderPositionY,
      DEFAULT_REMINDER_APPEARANCE.reminderPositionY,
      0,
      2000
    ),
  };
};

/**
 * Synchronize floating reminder and home-screen widget.
 * Works for every authenticated user, regardless of role.
 */
export async function syncLoanWidget(): Promise<void> {
  if (!isNative()) return;

  const currentUser = authApi.getUser();

  if (!currentUser?._id) {
    console.log(
      "[LoanWidget] No authenticated user. Clearing widget data."
    );

    await NativeLoanWidget.clearData();
    return;
  }

  console.log("[LoanWidget] Sync started", {
    userId: currentUser._id,
  });

  try {
    const [
      scheduleResult,
      accountResult,
      settingsResult,
      appearanceResult,
    ] = await Promise.allSettled([
      repaymentApi.getMyRepaymentSchedules(),

      repaymentApi.getRepaymentAccount(),

      API.get<{
        success?: boolean;
        data?: {
          widgetMessage?: string;
          floatingReminderEnabled?: boolean;
        };
      }>("/settings/widget"),

      // Customer-accessible authenticated GET endpoint.
      API.get<{
        success?: boolean;
        data?: FloatingReminderAppearance;
      }>("/settings/floating-reminder-appearance"),
    ]);

    const schedules =
      scheduleResult.status === "fulfilled" &&
      Array.isArray(scheduleResult.value.data)
        ? scheduleResult.value.data
        : [];

    if (scheduleResult.status === "rejected") {
      console.warn(
        "[LoanWidget] Repayment schedules unavailable:",
        scheduleResult.reason
      );
    }

    const account =
      accountResult.status === "fulfilled"
        ? accountResult.value.data
        : null;

    if (accountResult.status === "rejected") {
      console.warn(
        "[LoanWidget] Repayment account unavailable:",
        accountResult.reason
      );
    }

    const settings =
      settingsResult.status === "fulfilled"
        ? settingsResult.value.data?.data
        : undefined;

    if (settingsResult.status === "rejected") {
      console.error(
        "[LoanWidget] Settings request failed:",
        settingsResult.reason
      );
    }

    const appearanceData =
      appearanceResult.status === "fulfilled"
        ? appearanceResult.value.data?.data
        : undefined;

    if (appearanceResult.status === "rejected") {
      console.warn(
        "[LoanWidget] Reminder appearance unavailable. Using defaults:",
        appearanceResult.reason
      );
    }

    const appearance =
      normalizeReminderAppearance(appearanceData);

    const adminMessage = settings?.widgetMessage;

    const adminFloatingReminderEnabled =
      settings?.floatingReminderEnabled === true;

    const unpaidInstallmentIds =
      getUnpaidInstallmentIds(schedules);

    const next = getNextInstallment(schedules);

    let amount = "No payment due";
    let dueDate = "—";

    if (next) {
      amount = formatMoney(
        next.amount,
        next.schedule.currency || "NGN"
      );

      if (next.date) {
        const parsedDate = new Date(next.date);

        if (!Number.isNaN(parsedDate.getTime())) {
          dueDate = new Intl.DateTimeFormat("en-NG", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }).format(parsedDate);
        }
      }
    }

    const result = await NativeLoanWidget.updateData({
      userId: currentUser._id,
      amount,
      dueDate,
      accountNumber: account?.accountNumber ?? "",
      bankName: account?.bankName ?? "",

      message:
        adminMessage?.trim() ||
        "Check your next loan installment and repayment details.",

      paymentDue: unpaidInstallmentIds.length > 0,

      floatingReminderEnabled:
        adminFloatingReminderEnabled,

      unpaidInstallmentIds,

      // Global admin-configured appearance.
      reminderWidth: appearance.reminderWidth,
      reminderBackgroundHex: appearance.reminderBackgroundHex,
      reminderTextColor: appearance.reminderTextColor,
      reminderTextSize: appearance.reminderTextSize,
      reminderCornerRadius: appearance.reminderCornerRadius,
      reminderHorizontalPadding:
        appearance.reminderHorizontalPadding,
      reminderVerticalPadding:
        appearance.reminderVerticalPadding,
      reminderPositionY: appearance.reminderPositionY,
    });

    console.log("[LoanWidget] Sync completed", {
      userId: currentUser._id,
      success: result.success,
      unpaidInstallments: unpaidInstallmentIds.length,
      floatingReminderEnabled:
        adminFloatingReminderEnabled,
      appearance,
    });

  } catch (error) {
    console.error(
      "[LoanWidget] Sync failed:",
      error
    );

    throw error;
  }
}

/**
 * Get consent for any authenticated user.
 */
export async function getFloatingReminderConsentStatus(
  userId: string,
): Promise<{
  asked: boolean;
  enabled: boolean;
  overlayGranted: boolean;
}> {
  if (!isNative() || !userId) {
    return {
      asked: false,
      enabled: false,
      overlayGranted: false,
    };
  }

  return NativeLoanWidget.getFloatingReminderConsentStatus({
    userId,
  });
}

/**
 * Save individual user consent.
 */
export async function setFloatingReminderConsent(
  userId: string,
  enabled: boolean,
): Promise<void> {
  if (!isNative() || !userId) return;

  await NativeLoanWidget.setFloatingReminderConsent({
    userId,
    enabled,
  });

  if (!enabled) {
    await NativeLoanWidget.stopFloatingReminder();
  }
}

/**
 * Check Android overlay permission.
 */
export async function checkFloatingOverlayPermission(): Promise<boolean> {
  if (!isNative()) return false;

  const result =
    await NativeLoanWidget.checkOverlayPermission();

  return result.granted;
}

/**
 * Request Android overlay permission.
 */
export async function requestFloatingOverlayPermission(): Promise<void> {
  if (!isNative()) return;

  const result =
    await NativeLoanWidget.checkOverlayPermission();

  if (!result.granted) {
    await NativeLoanWidget.requestOverlayPermission();
  }
}

/**
 * Clear widget data.
 */
export async function clearLoanWidget(): Promise<void> {
  if (!isNative()) return;

  await NativeLoanWidget.clearData();
}

/**
 * Stop floating reminder.
 */
export async function stopFloatingReminder(): Promise<void> {
  if (!isNative()) return;

  await NativeLoanWidget.stopFloatingReminder();
}

/**
 * Test floating reminder.
 */
export async function testFloatingReminder(userId: string) {
  if (!isNative()) {
    throw new Error("Floating reminder test requires the native app.");
  }

  const result = await NativeLoanWidget.testFloatingReminder({ userId });

  console.log("[LoanWidget TEST] Result:", result);

  return result;
}

/**
 * Diagnose floating reminder.
 */
export async function diagnoseFloatingReminder() {
  if (!isNative()) {
    throw new Error("Diagnostics require the native app.");
  }

  const result = await NativeLoanWidget.diagnoseFloatingReminder();

  console.log("[LoanWidget DIAGNOSTICS]", result);

  return result;
}
