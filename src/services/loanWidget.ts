
import { Capacitor, registerPlugin } from "@capacitor/core";
import API from "./Api";
import authApi from "./AuthService";
import repaymentApi, {
  type RepaymentSchedule,
  type RepaymentInstallment,
} from "./repaymentApi";

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
}

const NativeLoanWidget =
  registerPlugin<LoanWidgetPlugin>("LoanWidget");

const isNative = (): boolean => Capacitor.isNativePlatform();

const formatMoney = (amount: number, currency: string): string => {
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
    installment.totalAmount ?? installment.total ?? installment.amount;

  const paid =
    installment.paidAmount ?? installment.paid ?? 0;

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

/**
 * Get stable IDs for all currently unpaid installments.
 * These IDs allow Android to detect when an installment
 * previously unpaid has become paid.
 */
const getUnpaidInstallmentIds = (
  schedules: RepaymentSchedule[],
): string[] => {
  const ids = schedules.flatMap((schedule) =>
    (schedule.installments ?? [])
      .filter((installment) => {
        const status = String(installment.status ?? "").toLowerCase();

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
          item._id ?? item.id ?? item.installmentId ?? "",
        );
      })
      .filter(Boolean),
  );

  return [...new Set(ids)];
};

const getNextInstallment = (schedules: RepaymentSchedule[]) => {
  const candidates = schedules.flatMap((schedule) =>
    (schedule.installments ?? []).map((installment) => ({
      schedule,
      installment,
      amount: getInstallmentAmount(installment),
      date: getInstallmentDate(installment, schedule),
    })),
  );

  return candidates
    .filter(({ installment, amount }) => {
      const status = (installment.status ?? "").toLowerCase();

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
 * Sync the home-screen widget and floating reminder data.
 * Android handles payment-change detection and the 24-hour cooldown.
 */
export async function syncLoanWidget(): Promise<void> {
  if (!isNative()) return;

  const currentUser = authApi.getUser();

  if (!currentUser?._id || currentUser.role !== "customer") {
    await NativeLoanWidget.clearData();
    return;
  }

  console.log("[LoanWidget] Sync started");

  try {
    const scheduleResponse =
      await repaymentApi.getMyRepaymentSchedules();

    const schedules = Array.isArray(scheduleResponse.data)
      ? scheduleResponse.data
      : [];

    const unpaidInstallmentIds =
      getUnpaidInstallmentIds(schedules);

    const [accountResult, settingsResult] =
      await Promise.allSettled([
        repaymentApi.getRepaymentAccount(),
        API.get<{
          success?: boolean;
          data?: {
            widgetMessage?: string;
            floatingReminderEnabled?: boolean;
          };
        }>("/settings/widget"),
      ]);

    const account =
      accountResult.status === "fulfilled"
        ? accountResult.value.data
        : null;

    const adminMessage =
      settingsResult.status === "fulfilled"
        ? settingsResult.value.data?.data?.widgetMessage
        : undefined;

    const adminFloatingReminderEnabled =
      settingsResult.status === "fulfilled"
        ? settingsResult.value.data?.data
            ?.floatingReminderEnabled === true
        : false;

    const next = getNextInstallment(schedules);

    let amount = "No payment due";
    let dueDate = "—";

    if (next) {
      amount = formatMoney(
        next.amount,
        next.schedule.currency || "NGN",
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

    await NativeLoanWidget.updateData({
      userId: currentUser._id,
      amount,
      dueDate,
      accountNumber: account?.accountNumber ?? "",
      bankName: account?.bankName ?? "",
      message:
        adminMessage?.trim() ||
        "Check your next loan installment and repayment details.",
      paymentDue: unpaidInstallmentIds.length > 0,
      floatingReminderEnabled: adminFloatingReminderEnabled,
      unpaidInstallmentIds,
    });

    console.log("[LoanWidget] Sync completed", {
      unpaidInstallments: unpaidInstallmentIds.length,
      floatingReminderEnabled: adminFloatingReminderEnabled,
    });
  } catch (error) {
    console.error("[LoanWidget] Sync failed:", error);
    throw error;
  }
}

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

export async function checkFloatingOverlayPermission(): Promise<boolean> {
  if (!isNative()) return false;

  const result =
    await NativeLoanWidget.checkOverlayPermission();

  return result.granted;
}

export async function requestFloatingOverlayPermission(): Promise<void> {
  if (!isNative()) return;

  const result =
    await NativeLoanWidget.checkOverlayPermission();

  if (!result.granted) {
    await NativeLoanWidget.requestOverlayPermission();
  }
}

export async function clearLoanWidget(): Promise<void> {
  if (!isNative()) return;

  await NativeLoanWidget.clearData();
}

export async function stopFloatingReminder(): Promise<void> {
  if (!isNative()) return;

  await NativeLoanWidget.stopFloatingReminder();
}
