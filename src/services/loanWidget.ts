

import { Capacitor, registerPlugin } from "@capacitor/core";
import API from "./Api";
import repaymentApi, {
  type RepaymentSchedule,
  type RepaymentInstallment,
} from "./repaymentApi";

interface LoanWidgetPlugin {
  updateData(options: {
    amount: string;
    dueDate: string;
    accountNumber: string;
    bankName: string;
    message: string;
  }): Promise<{ success: boolean }>;
  clearData(): Promise<{ success: boolean }>;
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

  const total = installment.totalAmount ?? installment.total ?? installment.amount;
  const paid = installment.paidAmount ?? installment.paid ?? 0;

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
      const aTime = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
      const bTime = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    })[0];
};

export async function syncLoanWidget(): Promise<void> {
  if (!isNative()) return;

  // Do not replace cached repayment details if the schedule request fails.
  const scheduleResponse =
    await repaymentApi.getMyRepaymentSchedules();

  const schedules = Array.isArray(scheduleResponse.data)
    ? scheduleResponse.data
    : [];

  const [accountResult, settingsResult] = await Promise.allSettled([
    repaymentApi.getRepaymentAccount(),
    API.get<{
      success?: boolean;
      data?: { widgetMessage?: string };
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
    amount,
    dueDate,
    accountNumber: account?.accountNumber ?? "",
    bankName: account?.bankName ?? "",
    message:
      adminMessage?.trim() ||
      "Check your next loan installment and repayment details.",
  });
}

export async function clearLoanWidget(): Promise<void> {
  if (!isNative()) return;
  await NativeLoanWidget.clearData();
}
