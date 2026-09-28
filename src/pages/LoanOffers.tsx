
import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";

import loanOfferApi, {
  type LoanOffer,
  type LoanOfferStatus,
} from "../services/LoanOfferService";

import API, { getApiErrorMessage } from "../services/Api";

import type { Mandate } from "../services/MandateService";
import RepaymentMandateStep from "../pages/RepaymentMandateStep";

const formatMoney = (
  amount: number | undefined | null,
  currency = "NGN",
): string => {
  if (amount === undefined || amount === null) {
    return "—";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (
  value?: string | null,
): string => {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getProductName = (
  offer: LoanOffer,
): string => {
  if (
    typeof offer.loanProduct === "object" &&
    offer.loanProduct
  ) {
    return offer.loanProduct.name;
  }

  return "Loan Offer";
};

const getProductCurrency = (
  offer: LoanOffer,
): string => {
  if (
    typeof offer.loanProduct === "object" &&
    offer.loanProduct?.currency
  ) {
    return offer.loanProduct.currency;
  }

  return "NGN";
};

const getApplicationNumber = (
  offer: LoanOffer,
): string | null => {
  if (
    typeof offer.loanApplication === "object" &&
    offer.loanApplication?.applicationNumber
  ) {
    return offer.loanApplication.applicationNumber;
  }

  return null;
};

const getStatusLabel = (
  status: LoanOfferStatus,
): string => {
  switch (status) {
    case "pending":
      return "Pending acceptance";

    case "accepted":
      return "Accepted";

    case "rejected":
      return "Rejected";

    case "expired":
      return "Expired";

    case "cancelled":
      return "Cancelled";

    default:
      return status;
  }
};

const isExpired = (
  offer: LoanOffer,
): boolean => {
  if (offer.status !== "pending") {
    return false;
  }

  if (!offer.expiresAt) {
    return false;
  }

  const expiryTime = new Date(
    offer.expiresAt,
  ).getTime();

  if (Number.isNaN(expiryTime)) {
    return false;
  }

  return expiryTime <= Date.now();
};

const getEffectiveStatus = (
  offer: LoanOffer,
): LoanOfferStatus => {
  return isExpired(offer)
    ? "expired"
    : offer.status;
};

const getStatusClasses = (
  status: LoanOfferStatus,
): string => {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-700 border-amber-200";

    case "accepted":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case "rejected":
      return "bg-red-50 text-red-700 border-red-200";

    case "expired":
      return "bg-slate-100 text-slate-600 border-slate-200";

    case "cancelled":
      return "bg-slate-100 text-slate-600 border-slate-200";

    default:
      return "bg-slate-100 text-slate-600 border-slate-200";
  }
};

const StatusBadge = ({
  status,
}: {
  status: LoanOfferStatus;
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
        status,
      )}`}
    >
      {status === "accepted" && (
        <CheckCircle2 size={14} />
      )}

      {status === "pending" && (
        <Clock3 size={14} />
      )}

      {status === "rejected" && (
        <XCircle size={14} />
      )}

      {status === "expired" && (
        <AlertCircle size={14} />
      )}

      {status === "cancelled" && (
        <XCircle size={14} />
      )}

      {getStatusLabel(status)}
    </span>
  );
};

const Detail = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) => {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 rounded-lg bg-slate-100 p-2 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">
          {label}
        </p>

        <p className="mt-0.5 break-words text-sm font-semibold text-slate-900">
          {value}
        </p>
      </div>
    </div>
  );
};

const LoanCard = ({
  offer,
  onAccept,
  onReject,
  actionLoading,
}: {
  offer: LoanOffer;
  onAccept: (offer: LoanOffer) => void;
  onReject: (offer: LoanOffer) => void;
  actionLoading: string | null;
}) => {
  const currency =
    getProductCurrency(offer);

  const effectiveStatus =
    getEffectiveStatus(offer);

  const canAct =
    offer.status === "pending" &&
    effectiveStatus === "pending";

  const isActing =
    actionLoading === offer._id;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-white">
              <Banknote size={20} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {getProductName(offer)}
              </h2>

              {getApplicationNumber(
                offer,
              ) && (
                <p className="text-xs text-slate-500">
                  Application #
                  {getApplicationNumber(
                    offer,
                  )}
                </p>
              )}
            </div>
          </div>

          <StatusBadge
            status={effectiveStatus}
          />
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-sm text-slate-500">
            Approved amount
          </p>

          <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            {formatMoney(
              offer.approvedAmount,
              currency,
            )}
          </p>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Detail
            icon={<Banknote size={17} />}
            label="Interest"
            value={`${offer.interestRate}% ${offer.interestType.replace(
              "_",
              " ",
            )}`}
          />

          <Detail
            icon={<CreditCard size={17} />}
            label="Interest amount"
            value={formatMoney(
              offer.totalInterest,
              currency,
            )}
          />

          <Detail
            icon={<FileText size={17} />}
            label="Total fees"
            value={formatMoney(
              offer.totalFees,
              currency,
            )}
          />

          <Detail
            icon={<CalendarDays size={17} />}
            label="Duration"
            value={`${offer.durationDays} days`}
          />

          <Detail
            icon={<RefreshCw size={17} />}
            label="Repayment frequency"
            value={
              offer.repaymentFrequency
                .charAt(0)
                .toUpperCase() +
              offer.repaymentFrequency.slice(1)
            }
          />

          <Detail
            icon={<CreditCard size={17} />}
            label="Installment"
            value={formatMoney(
              offer.installmentAmount,
              currency,
            )}
          />

          <Detail
            icon={<FileText size={17} />}
            label="Number of installments"
            value={String(
              offer.numberOfInstallments,
            )}
          />

          <Detail
            icon={<Banknote size={17} />}
            label="Total repayment"
            value={formatMoney(
              offer.totalRepayment,
              currency,
            )}
          />

          <Detail
            icon={<CalendarDays size={17} />}
            label="Offer expires"
            value={formatDate(
              offer.expiresAt,
            )}
          />
        </div>

        {canAct && (
          <div className="mt-6 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <ShieldCheck
              className="mt-0.5 shrink-0 text-blue-600"
              size={19}
            />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Review your loan terms
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Accepting this offer creates the
                loan. Disbursement is handled
                separately after acceptance, so
                funds are not sent from this screen.
              </p>
            </div>
          </div>
        )}

        {offer.status === "accepted" && (
          <div className="mt-6 flex gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
            <CheckCircle2
              className="mt-0.5 shrink-0 text-emerald-600"
              size={19}
            />

            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Offer accepted
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-700">
                Your loan has been created and is
                awaiting disbursement.
              </p>

              {offer.acceptedAt && (
                <p className="mt-2 text-xs text-emerald-700">
                  Accepted on{" "}
                  {formatDate(
                    offer.acceptedAt,
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {offer.status === "rejected" && (
          <div className="mt-6 flex gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
            <XCircle
              className="mt-0.5 shrink-0 text-red-600"
              size={19}
            />

            <div>
              <p className="text-sm font-semibold text-red-900">
                Offer rejected
              </p>

              {offer.rejectedAt && (
                <p className="mt-1 text-xs text-red-700">
                  Rejected on{" "}
                  {formatDate(
                    offer.rejectedAt,
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {effectiveStatus === "expired" && (
          <div className="mt-6 flex gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <AlertCircle
              className="mt-0.5 shrink-0 text-amber-600"
              size={19}
            />

            <div>
              <p className="text-sm font-semibold text-amber-900">
                This offer has expired
              </p>

              <p className="mt-1 text-xs leading-5 text-amber-700">
                The acceptance period ended on{" "}
                {formatDate(
                  offer.expiresAt,
                )}
                .
              </p>
            </div>
          </div>
        )}

        {canAct && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={isActing}
              onClick={() =>
                onReject(offer)
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isActing ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <XCircle size={17} />
              )}

              Reject
            </button>

            <button
              type="button"
              disabled={isActing}
              onClick={() =>
                onAccept(offer)
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isActing ? (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2 size={17} />
              )}

              Accept offer
            </button>
          </div>
        )}
      </div>
    </article>
  );
};



type LoanFlowStep = 1 | 2;

const MANDATES_BASE_URL = "/mandates";

function formatOfferStatusClass(status: string, expired: boolean) {
  if (expired && status === "pending") {
    return "bg-amber-100 text-amber-700";
  }

  switch (status) {
    case "pending":
      return "bg-blue-100 text-blue-700";
    case "accepted":
      return "bg-emerald-100 text-emerald-700";
    case "rejected":
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "expired":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getMandateStatusClass(status?: string) {
  switch (status?.toLowerCase()) {
    case "authorized":
    case "active":
      return "bg-emerald-100 text-emerald-700";
    case "authorization_required":
      return "bg-blue-100 text-blue-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "failed":
    case "cancelled":
    case "expired":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function OfferDetail({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-sm ${highlight ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>
        {value}
      </p>
    </div>
  );
}

function OfferStep({
  number,
  title,
  active,
  completed,
}: {
  number: number;
  title: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${active || completed ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500"}`}>
        {completed ? <CheckCircle2 size={17} /> : <span className="text-xs font-bold">{number}</span>}
      </div>
      <div className="hidden sm:block">
        <p className="text-xs font-semibold text-slate-900">{title}</p>
      </div>
    </div>
  );
}

function LoanOfferFlow({
  offer,
  step,
  setStep,
  mandate,
  setMandate,
  mandateLoading,
  setMandateLoading,
  processing,
  onAccept,
  onReject,
  onRefreshMandate,
  onMandateSuccess,
}: {
  offer: LoanOffer;
  step: LoanFlowStep;
  setStep: (step: LoanFlowStep) => void;
  mandate: Mandate | null;
  setMandate: Dispatch<SetStateAction<Mandate | null>>;
  mandateLoading: boolean;
  setMandateLoading: Dispatch<SetStateAction<boolean>>;
  processing: boolean;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
  onRefreshMandate: () => Promise<void>;
  onMandateSuccess: (mandate: Mandate) => void;
}) {
  const offerStatus = offer.status || "unknown";
  const expired = isExpired(offer);
  const currency = getProductCurrency(offer);
  const productName = getProductName(offer);

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Loan application</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{step === 1 ? "Review your loan offer" : "Set up repayment mandate"}</h2>
            <p className="mt-1 text-sm text-slate-500">{step === 1 ? "Review the approved terms before accepting your offer." : "Authorize your repayment card to complete the loan setup."}</p>
          </div>
          <div className="flex items-center gap-3">
            <OfferStep number={1} title="Review offer" active={step === 1} completed={step === 2} />
            <div className="h-px w-8 bg-slate-200" />
            <OfferStep number={2} title="Repayment mandate" active={step === 2} completed={mandate?.status === "active" || mandate?.status === "authorized"} />
          </div>
        </div>
      </div>

      {step === 1 && (
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{productName}</h3>
              <p className="mt-1 text-sm text-slate-500">Review the approved loan terms below.</p>
            </div>
            <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${formatOfferStatusClass(offerStatus, expired)}`}>
              {expired && offerStatus === "pending" ? "Expired" : offerStatus.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <OfferDetail label="Approved amount" value={formatMoney(offer.approvedAmount, currency)} highlight />
            <OfferDetail label="Interest rate" value={offer.interestRate !== undefined ? `${offer.interestRate}%` : "—"} />
            <OfferDetail label="Interest type" value={offer.interestType.replace(/_/g, " ")} />
            <OfferDetail label="Total interest" value={formatMoney(offer.totalInterest, currency)} />
            <OfferDetail label="Processing fee" value={formatMoney(offer.processingFee, currency)} />
            <OfferDetail label="Service fee" value={formatMoney(offer.serviceFee, currency)} />
            <OfferDetail label="Total fees" value={formatMoney(offer.totalFees, currency)} />
            <OfferDetail label="Total repayment" value={formatMoney(offer.totalRepayment, currency)} highlight />
            <OfferDetail label="Duration" value={offer.durationDays ? `${offer.durationDays} days` : "—"} />
            <OfferDetail label="Repayment frequency" value={offer.repaymentFrequency.charAt(0).toUpperCase() + offer.repaymentFrequency.slice(1)} />
            <OfferDetail label="Installment amount" value={formatMoney(offer.installmentAmount, currency)} highlight />
            <OfferDetail label="Number of installments" value={offer.numberOfInstallments ? String(offer.numberOfInstallments) : "—"} />
          </div>

          {offer.expiresAt && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
              <Clock3 size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900">Offer expiry</p>
                <p className="mt-1 text-xs text-amber-700">This offer expires on {formatDate(offer.expiresAt)}.</p>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {offerStatus === "pending" && !expired && (
              <>
                <button type="button" onClick={() => void onReject()} disabled={processing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
                  {processing ? <Loader2 size={17} className="animate-spin" /> : <XCircle size={17} />} Reject offer
                </button>
                <button type="button" onClick={() => void onAccept()} disabled={processing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                  {processing ? <Loader2 size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Accept offer
                </button>
              </>
            )}
            {offerStatus === "accepted" && (
              <button type="button" onClick={() => setStep(2)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition hover:bg-slate-800">
                Continue to repayment mandate <CreditCard size={17} />
              </button>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <button type="button" onClick={() => setStep(1)} disabled={processing || mandateLoading} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50">
              <ArrowLeft size={17} /> Back to offer
            </button>
            <button type="button" onClick={() => void onRefreshMandate()} disabled={mandateLoading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
              <RefreshCw size={15} className={mandateLoading ? "animate-spin" : ""} /> Refresh status
            </button>
          </div>

          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-slate-900 p-2.5 text-white"><CreditCard size={19} /></div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Repayment mandate</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">Authorize your card so repayments can be collected according to the agreed loan schedule.</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-500">Status:</span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getMandateStatusClass(mandate?.status)}`}>
                    {mandate?.status ? mandate.status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not created"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <RepaymentMandateStep offerId={offer._id} offer={offer} mandate={mandate} setMandate={setMandate} mandateLoading={mandateLoading} setMandateLoading={setMandateLoading} currency={currency} onMandateSuccess={onMandateSuccess} />
        </div>
      )}
    </section>
  );
}

const LoanOffers = () => {
  const [offers, setOffers] = useState<LoanOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeOffer, setActiveOffer] = useState<LoanOffer | null>(null);
  const [offerStep, setOfferStep] = useState<LoanFlowStep>(1);
  const [mandate, setMandate] = useState<Mandate | null>(null);
  const [mandateLoading, setMandateLoading] = useState(false);

  const loadOffers = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true); else setLoading(true);
      const data = await loanOfferApi.getMyOffers();
      setOffers(data);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Unable to load your loan offers."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const activeFlowOffer = offers
    .filter((offer) => offer.status === "pending" || offer.status === "accepted")
    .sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    })[0] ?? null;

  useEffect(() => {
    if (!activeFlowOffer) {
      setActiveOffer(null);
      setOfferStep(1);
      setMandate(null);
      return;
    }

    setActiveOffer((current) => current?._id === activeFlowOffer._id ? current : activeFlowOffer);
    setOfferStep(activeFlowOffer.status === "accepted" ? 2 : 1);
  }, [activeFlowOffer?._id, activeFlowOffer?.status]);

  const loadCurrentMandate = useCallback(async (offerId?: string) => {
    const id = offerId ?? activeOffer?._id;
    if (!id) return;

    try {
      setMandateLoading(true);
      const response = await API.get<{ data?: Mandate; mandate?: Mandate }>(
        `${MANDATES_BASE_URL}/offer/${encodeURIComponent(id)}/active`,
      );
      setMandate(response.data?.data ?? response.data?.mandate ?? null);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setMandate(null);
        return;
      }
      console.error("Failed to load mandate:", error);
    } finally {
      setMandateLoading(false);
    }
  }, [activeOffer?._id]);

  useEffect(() => {
    if (activeOffer?._id && offerStep === 2) {
      void loadCurrentMandate(activeOffer._id);
    }
  }, [activeOffer?._id, offerStep, loadCurrentMandate]);

  const handleAccept = useCallback(async (selectedOffer?: LoanOffer) => {
    const offerToAccept = selectedOffer ?? activeOffer;
    if (!offerToAccept) return;

    if (offerToAccept.status !== "pending" || isExpired(offerToAccept)) {
      toast.error(isExpired(offerToAccept) ? "This loan offer has expired." : "This offer can no longer be accepted.");
      return;
    }

    if (!window.confirm(`Accept this loan offer of ${formatMoney(offerToAccept.approvedAmount, getProductCurrency(offerToAccept))}?`)) return;

    try {
      setActionLoading(offerToAccept._id);
      const result = await loanOfferApi.acceptOffer(offerToAccept._id);
      const acceptedOffer = result.offer;

      setOffers((current) => current.map((item) => item._id === acceptedOffer._id ? acceptedOffer : item));
      setActiveOffer(acceptedOffer);
      setMandate(null);
      setOfferStep(2);

      toast.success(result.alreadyCreated ? "This loan has already been created." : "Loan offer accepted successfully.");
      await loadCurrentMandate(acceptedOffer._id);
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Unable to accept this offer."));
      await loadOffers();
    } finally {
      setActionLoading(null);
    }
  }, [activeOffer, loadCurrentMandate, loadOffers]);

  const handleReject = useCallback(async (selectedOffer?: LoanOffer) => {
    const offerToReject = selectedOffer ?? activeOffer;
    if (!offerToReject || offerToReject.status !== "pending") return;
    if (!window.confirm("Are you sure you want to reject this loan offer?")) return;

    try {
      setActionLoading(offerToReject._id);
      const updatedOffer = await loanOfferApi.rejectOffer(offerToReject._id);
      setOffers((current) => current.map((item) => item._id === offerToReject._id ? updatedOffer : item));
      if (activeOffer?._id === offerToReject._id) setActiveOffer(null);
      setOfferStep(1);
      setMandate(null);
      toast.success("Loan offer rejected.");
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Unable to reject this offer."));
      await loadOffers();
    } finally {
      setActionLoading(null);
    }
  }, [activeOffer, loadOffers]);

  const handleMandateSuccess = useCallback((completedMandate: Mandate) => {
    setMandate(completedMandate);
    toast.success("Repayment mandate completed successfully.");
    void loadOffers();
    void loadCurrentMandate();
  }, [loadCurrentMandate, loadOffers]);

  const pendingCount = offers.filter((offer) => getEffectiveStatus(offer) === "pending").length;
  const acceptedCount = offers.filter((offer) => offer.status === "accepted").length;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-600">
          <Loader2 size={22} className="animate-spin" />
          <span className="text-sm font-medium">Loading your loan offers...</span>
        </div>
      </div>
    );
  }

  const otherOffers = offers.filter((offer) => offer._id !== activeOffer?._id);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2.5 text-white"><Banknote size={21} /></div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Loan Offers</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Review loan offers available to you, then complete the repayment mandate after accepting an offer.</p>
        </div>

        <button type="button" onClick={() => void loadOffers(true)} disabled={refreshing} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto">
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {offers.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-slate-500">Total offers</p><p className="mt-1 text-2xl font-bold text-slate-900">{offers.length}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-slate-500">Offers awaiting action</p><p className="mt-1 text-2xl font-bold text-slate-900">{pendingCount}</p></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-medium text-slate-500">Accepted offers</p><p className="mt-1 text-2xl font-bold text-slate-900">{acceptedCount}</p></div>
        </div>
      )}

      {activeOffer && (
        <LoanOfferFlow
          offer={activeOffer}
          step={offerStep}
          setStep={setOfferStep}
          mandate={mandate}
          setMandate={setMandate}
          mandateLoading={mandateLoading}
          setMandateLoading={setMandateLoading}
          processing={actionLoading === activeOffer._id}
          onAccept={handleAccept}
          onReject={handleReject}
          onRefreshMandate={() => loadCurrentMandate(activeOffer._id)}
          onMandateSuccess={handleMandateSuccess}
        />
      )}

      {offers.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100"><FileText size={24} className="text-slate-500" /></div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">No loan offers yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">Once your loan application has been reviewed and an offer has been created, it will appear here.</p>
        </div>
      )}

      {otherOffers.length > 0 && (
        <div className="space-y-6">
          {otherOffers.map((offer) => (
            <LoanCard key={offer._id} offer={offer} onAccept={(selectedOffer) => void handleAccept(selectedOffer)} onReject={(selectedOffer) => void handleReject(selectedOffer)} actionLoading={actionLoading} />
          ))}
        </div>
      )}
    </div>
  );
};

export default LoanOffers;

