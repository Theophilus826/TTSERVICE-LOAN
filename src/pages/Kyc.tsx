import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileImage,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "react-toastify";

import kycApi, {
  type KycData,
  type KycGender,
  type KycIdType,
} from "../services/kycApi";

// =========================================================
// TYPES
// =========================================================

interface KycForm {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: KycGender;

  address: string;
  city: string;
  state: string;
  country: string;

  idType: KycIdType;
  idNumber: string;
}

interface UploadState {
  idDocumentFront: File | null;
  selfie: File | null;
}

// =========================================================
// INITIAL VALUES
// =========================================================

const INITIAL_FORM: KycForm = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "male",

  address: "",
  city: "",
  state: "",
  country: "Nigeria",

  idType: "nin",
  idNumber: "",
};

const INITIAL_UPLOADS: UploadState = {
  idDocumentFront: null,
  selfie: null,
};

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

// =========================================================
// HELPERS
// =========================================================

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    return (
      response?.data?.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

const formatFileSize = (
  bytes: number,
): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
};

// =========================================================
// COMPONENT
// =========================================================

export default function Kyc() {
  const navigate = useNavigate();

  const [form, setForm] =
    useState<KycForm>(INITIAL_FORM);

  const [uploads, setUploads] =
    useState<UploadState>(
      INITIAL_UPLOADS,
    );

  const [kyc, setKyc] =
    useState<KycData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  // =======================================================
  // LOAD KYC
  // =======================================================

  const loadKyc = async () => {
    try {
      setLoading(true);

      const response =
        await kycApi.getMyKyc();

      const data =
        response.data ?? null;

      setKyc(data);

      if (data) {
        setForm((current) => ({
          ...current,

          firstName:
            data.firstName || "",

          lastName:
            data.lastName || "",

          dateOfBirth:
            data.dateOfBirth
              ? data.dateOfBirth.slice(0, 10)
              : "",

          gender:
            data.gender || "male",

          address:
            data.address || "",

          city:
            data.city || "",

          state:
            data.state || "",

          country:
            data.country || "Nigeria",

          idType:
            data.idType || "nin",

          idNumber:
            data.idNumber || "",
        }));
      }
    } catch (error: unknown) {
      console.error(
        "Failed to load KYC:",
        error,
      );

      toast.error(
        getErrorMessage(
          error,
          "Failed to load KYC information.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadKyc();
  }, []);

  // =======================================================
  // FIELD UPDATE
  // =======================================================

  const updateField = <
    K extends keyof KycForm
  >(
    field: K,
    value: KycForm[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // =======================================================
  // FILE VALIDATION
  // =======================================================

  const validateImage = (
    file: File,
  ): boolean => {
    if (
      !ACCEPTED_IMAGE_TYPES.includes(
        file.type,
      )
    ) {
      toast.error(
        "Please select a JPG, PNG, or WEBP image.",
      );

      return false;
    }

    if (
      file.size > MAX_FILE_SIZE
    ) {
      toast.error(
        `Image must not exceed ${formatFileSize(
          MAX_FILE_SIZE,
        )}.`,
      );

      return false;
    }

    return true;
  };

  // =======================================================
  // FILE UPDATE
  // =======================================================

  const updateUpload = (
    field: keyof UploadState,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0] ||
      null;

    if (!file) {
      return;
    }

    if (!validateImage(file)) {
      event.target.value = "";
      return;
    }

    setUploads((current) => ({
      ...current,
      [field]: file,
    }));

    // Allow selecting the same file again.
    event.target.value = "";
  };

  // =======================================================
  // REMOVE FILE
  // =======================================================

  const removeUpload = (
    field: keyof UploadState,
  ) => {
    setUploads((current) => ({
      ...current,
      [field]: null,
    }));
  };

  // =======================================================
  // SUBMIT KYC
  // =======================================================

  const submitKyc = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (saving) {
      return;
    }

    // =====================================================
    // BASIC VALIDATION
    // =====================================================

    if (!form.firstName.trim()) {
      toast.error(
        "First name is required.",
      );
      return;
    }

    if (!form.lastName.trim()) {
      toast.error(
        "Last name is required.",
      );
      return;
    }

    if (!form.dateOfBirth) {
      toast.error(
        "Date of birth is required.",
      );
      return;
    }

    if (!form.address.trim()) {
      toast.error(
        "Address is required.",
      );
      return;
    }

    if (!form.city.trim()) {
      toast.error(
        "City is required.",
      );
      return;
    }

    if (!form.state.trim()) {
      toast.error(
        "State is required.",
      );
      return;
    }

    if (!form.country.trim()) {
      toast.error(
        "Country is required.",
      );
      return;
    }

    if (!form.idNumber.trim()) {
      toast.error(
        "ID number is required.",
      );
      return;
    }

    // =====================================================
    // FILE VALIDATION
    // =====================================================

    if (!uploads.idDocumentFront) {
      toast.error(
        "Please upload the front of your ID document.",
      );
      return;
    }

    if (!uploads.selfie) {
      toast.error(
        "Please capture or upload a selfie.",
      );
      return;
    }

    // =====================================================
    // CREATE FORM DATA
    // =====================================================

    const formData = new FormData();

    formData.append(
      "firstName",
      form.firstName.trim(),
    );

    formData.append(
      "lastName",
      form.lastName.trim(),
    );

    formData.append(
      "dateOfBirth",
      form.dateOfBirth,
    );

    formData.append(
      "gender",
      form.gender,
    );

    formData.append(
      "address",
      form.address.trim(),
    );

    formData.append(
      "city",
      form.city.trim(),
    );

    formData.append(
      "state",
      form.state.trim(),
    );

    formData.append(
      "country",
      form.country.trim(),
    );

    formData.append(
      "idType",
      form.idType,
    );

    formData.append(
      "idNumber",
      form.idNumber.trim(),
    );

    formData.append(
      "idDocumentFront",
      uploads.idDocumentFront,
    );

    formData.append(
      "selfie",
      uploads.selfie,
    );

    // =====================================================
    // SUBMIT
    // =====================================================

    try {
      setSaving(true);

      const response =
        await kycApi.submitKyc(
          formData,
        );

      if (!response.success) {
        throw new Error(
          response.message ||
            "Failed to submit KYC.",
        );
      }

      toast.success(
        response.message ||
          "KYC submitted successfully.",
      );

      /*
       * KYC has been submitted.
       *
       * Do not wait for admin verification.
       * Move the user directly to Bank.
       */

      navigate("/bank-accounts", {
        replace: true,
      });
    } catch (error: unknown) {
      console.error(
        "KYC submission failed:",
        error,
      );

      toast.error(
        getErrorMessage(
          error,
          "Failed to submit KYC.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  // =======================================================
  // LOADING
  // =======================================================

  if (loading) {
    return (
      <div className="flex min-h-60 items-center justify-center">
        <RefreshCw
          size={28}
          className="animate-spin text-orange-500"
        />
      </div>
    );
  }

  // =======================================================
  // STATUS
  // =======================================================

  const status = kyc?.status;

  const isRejected =
    status === "rejected";

  const isVerified =
    status === "verified";

  const isProcessing =
    status === "pending" ||
    status === "submitted" ||
    status === "under_review";

  // =======================================================
  // STATUS STYLING
  // =======================================================

  const statusContainerClass =
    isVerified
      ? "border-green-200 bg-green-50"
      : isRejected
        ? "border-red-200 bg-red-50"
        : "border-yellow-200 bg-yellow-50";

  const statusIconClass =
    isVerified
      ? "text-green-600"
      : isRejected
        ? "text-red-600"
        : "text-yellow-600";

  // =======================================================
  // UPLOAD BOX
  // =======================================================

  const renderUploadBox = (
    field: keyof UploadState,
    label: string,
    description: string,
    accept: string,
    capture:
      | "user"
      | "environment"
      | undefined,
    existingUrl?: string | null,
  ) => {
    const file = uploads[field];

    const previewUrl = file
      ? URL.createObjectURL(file)
      : existingUrl || null;

    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="mb-3">
          <p className="font-semibold text-gray-900">
            {label}
          </p>

          <p className="mt-1 text-xs text-gray-500">
            {description}
          </p>
        </div>

        {previewUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white">
            <img
              src={previewUrl}
              alt={label}
              className="h-56 w-full object-contain"
            />

            {file ? (
              <div className="flex items-center justify-between border-t border-gray-100 bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-700">
                    {file.name}
                  </p>

                  <p className="text-xs text-gray-400">
                    {formatFileSize(
                      file.size,
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeUpload(field)
                  }
                  disabled={saving}
                  className="ml-3 rounded-lg p-2 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                  aria-label={`Remove ${label}`}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ) : existingUrl ? (
              <div className="border-t border-gray-100 bg-white p-3">
                <p className="text-xs text-gray-500">
                  Existing document on file.
                  Select a new image below to
                  replace it.
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-white">
            <FileImage
              size={42}
              className="text-gray-300"
            />

            <p className="mt-3 text-sm font-medium text-gray-600">
              No image selected
            </p>
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600">
            <Camera size={18} />

            {file || existingUrl
              ? "Replace Image"
              : "Take Photo"}

            <input
              type="file"
              accept={accept}
              capture={capture}
              onChange={(event) =>
                updateUpload(
                  field,
                  event,
                )
              }
              disabled={saving}
              className="hidden"
            />
          </label>

          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-100">
            <Upload size={18} />

            Choose File

            <input
              type="file"
              accept={accept}
              onChange={(event) =>
                updateUpload(
                  field,
                  event,
                )
              }
              disabled={saving}
              className="hidden"
            />
          </label>
        </div>
      </div>
    );
  };

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* HEADER */}

      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          KYC Verification
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Complete your identity verification
          before applying for a loan.
        </p>
      </div>

      {/* STATUS */}

      {status && (
        <div
          className={`rounded-2xl border p-5 ${statusContainerClass}`}
        >
          <div className="flex items-start gap-3">
            {isRejected ? (
              <AlertCircle
                size={22}
                className={
                  statusIconClass
                }
              />
            ) : isVerified ? (
              <CheckCircle2
                size={22}
                className={
                  statusIconClass
                }
              />
            ) : (
              <ShieldCheck
                size={22}
                className={
                  statusIconClass
                }
              />
            )}

            <div>
              <p className="font-semibold capitalize text-gray-900">
                KYC status:{" "}
                {status.replace(
                  /_/g,
                  " ",
                )}
              </p>

              {isProcessing && (
                <p className="mt-1 text-sm text-gray-600">
                  Your KYC has been
                  submitted. You can
                  continue to the next step
                  while it is being reviewed.
                </p>
              )}

              {isVerified && (
                <p className="mt-1 text-sm text-gray-600">
                  Your KYC has been verified.
                </p>
              )}

              {isRejected &&
                kyc?.rejectionReason && (
                  <p className="mt-1 text-sm text-red-600">
                    Reason:{" "}
                    {kyc.rejectionReason}
                  </p>
                )}

              {isRejected && (
                <p className="mt-2 text-sm text-gray-600">
                  Please correct the
                  information below and
                  submit your KYC again.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FORM */}

      <form
        onSubmit={submitKyc}
        className="space-y-6 rounded-2xl bg-white p-6 shadow-sm"
      >
        {/* PERSONAL INFORMATION */}

        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Personal Information
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Enter your details exactly as
            they appear on your identity
            document.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* FIRST NAME */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              First Name *
            </label>

            <input
              value={form.firstName}
              onChange={(event) =>
                updateField(
                  "firstName",
                  event.target.value,
                )
              }
              disabled={saving}
              autoComplete="given-name"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          {/* LAST NAME */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Last Name *
            </label>

            <input
              value={form.lastName}
              onChange={(event) =>
                updateField(
                  "lastName",
                  event.target.value,
                )
              }
              disabled={saving}
              autoComplete="family-name"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          {/* DATE OF BIRTH */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Date of Birth *
            </label>

            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(event) =>
                updateField(
                  "dateOfBirth",
                  event.target.value,
                )
              }
              disabled={saving}
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          {/* GENDER */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Gender
            </label>

            <select
              value={form.gender}
              onChange={(event) =>
                updateField(
                  "gender",
                  event.target
                    .value as KycGender,
                )
              }
              disabled={saving}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 disabled:bg-gray-100"
            >
              <option value="male">
                Male
              </option>

              <option value="female">
                Female
              </option>

              <option value="other">
                Other
              </option>
            </select>
          </div>
        </div>

        {/* ADDRESS */}

        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Residential Address
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* ADDRESS */}

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Address *
            </label>

            <input
              value={form.address}
              onChange={(event) =>
                updateField(
                  "address",
                  event.target.value,
                )
              }
              disabled={saving}
              autoComplete="street-address"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          {/* CITY */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              City *
            </label>

            <input
              value={form.city}
              onChange={(event) =>
                updateField(
                  "city",
                  event.target.value,
                )
              }
              disabled={saving}
              autoComplete="address-level2"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          {/* STATE */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              State *
            </label>

            <input
              value={form.state}
              onChange={(event) =>
                updateField(
                  "state",
                  event.target.value,
                )
              }
              disabled={saving}
              autoComplete="address-level1"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>

          {/* COUNTRY */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Country *
            </label>

            <input
              value={form.country}
              onChange={(event) =>
                updateField(
                  "country",
                  event.target.value,
                )
              }
              disabled={saving}
              autoComplete="country-name"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* ID INFORMATION */}

        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Identity Document
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Upload a clear image of the
            front/data page of your identity
            document. Make sure all names,
            numbers and details are readable.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* ID TYPE */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              ID Type *
            </label>

            <select
              value={form.idType}
              onChange={(event) =>
                updateField(
                  "idType",
                  event.target
                    .value as KycIdType,
                )
              }
              disabled={saving}
              required
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 disabled:bg-gray-100"
            >
              <option value="nin">
                NIN
              </option>

              <option value="passport">
                Passport
              </option>

              <option value="drivers_license">
                Driver's License
              </option>

              <option value="voters_card">
                Voter's Card
              </option>
            </select>
          </div>

          {/* ID NUMBER */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              ID Number *
            </label>

            <input
              value={form.idNumber}
              onChange={(event) =>
                updateField(
                  "idNumber",
                  event.target.value,
                )
              }
              disabled={saving}
              autoComplete="off"
              required
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-gray-100"
            />
          </div>
        </div>

        {/* DOCUMENT UPLOADS */}

        <div className="space-y-5">
          {renderUploadBox(
            "idDocumentFront",
            "ID Document *",
            "Take a clear photo of the front/data page of your identity document.",
            "image/jpeg,image/jpg,image/png,image/webp",
            "environment",
            kyc?.idDocumentFront,
          )}

          {renderUploadBox(
            "selfie",
            "Selfie / Face Photo *",
            "Take a clear selfie using your front camera. Remove sunglasses, hats and face coverings.",
            "image/jpeg,image/jpg,image/png,image/webp",
            "user",
            kyc?.selfie,
          )}
        </div>

        {/* SECURITY NOTICE */}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0 text-orange-500"
            />

            <div>
              <p className="text-sm font-semibold text-gray-800">
                Your documents are protected
              </p>

              <p className="mt-1 text-xs leading-5 text-gray-500">
                Your identity documents
                will be uploaded securely
                through the backend. Do not
                upload documents belonging to
                another person.
              </p>
            </div>
          </div>
        </div>

        {/* SUBMIT */}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {saving ? (
            <>
              <RefreshCw
                size={18}
                className="animate-spin"
              />

              Uploading & Submitting...
            </>
          ) : isRejected ? (
            <>
              <Upload size={18} />

              Resubmit KYC
            </>
          ) : (
            <>
              <ShieldCheck size={18} />

              Submit KYC
            </>
          )}
        </button>
      </form>
    </div>
  );
}