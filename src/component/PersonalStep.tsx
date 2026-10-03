
import React, { useState } from "react";

export interface PersonalFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "";
}

const emptyPersonalForm: PersonalFormData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
};

interface PersonalStepProps {
  form?: PersonalFormData | null;

  onChange?: (
    field: keyof PersonalFormData,
    value: string,
  ) => void;

  onComplete?: (
    form: PersonalFormData,
  ) => void | Promise<void>;

  errors?: Record<string, string>;

  saving?: boolean;
}

const PersonalStep: React.FC<PersonalStepProps> = ({
  form = emptyPersonalForm,
  onChange = () => undefined,
  onComplete,
  errors = {},
  saving = false,
}) => {
  const [localErrors, setLocalErrors] =
    useState<Record<string, string>>({});

  const safeForm = {
    ...emptyPersonalForm,
    ...(form || {}),
  };

  const validate = () => {
    const validationErrors: Record<
      string,
      string
    > = {};

    if (!safeForm.firstName.trim()) {
      validationErrors.firstName =
        "First name is required.";
    }

    if (!safeForm.lastName.trim()) {
      validationErrors.lastName =
        "Last name is required.";
    }

    if (!safeForm.dateOfBirth) {
      validationErrors.dateOfBirth =
        "Date of birth is required.";
    }

    if (!safeForm.gender) {
      validationErrors.gender =
        "Please select your gender.";
    }

    setLocalErrors(validationErrors);

    return (
      Object.keys(validationErrors).length === 0
    );
  };

  const handleSubmit = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    if (!onComplete) {
      return;
    }

    await onComplete(safeForm);
  };

  const getError = (
    field: keyof PersonalFormData,
  ) => {
    return (
      errors[field] ||
      localErrors[field]
    );
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Personal Information
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Enter your personal information exactly
          as it appears on your official records.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

        {/* FIRST NAME */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            First Name
          </label>

          <input
            type="text"
            value={safeForm.firstName}
            onChange={(e) => {
              onChange(
                "firstName",
                e.target.value,
              );

              setLocalErrors(
                (previous) => ({
                  ...previous,
                  firstName: "",
                }),
              );
            }}
            className={[
              "w-full rounded-lg border px-4 py-3 outline-none transition",
              getError("firstName")
                ? "border-red-400 focus:border-red-500"
                : "border-gray-300 focus:border-blue-500",
            ].join(" ")}
            placeholder="Enter first name"
            disabled={saving}
          />

          {getError("firstName") && (
            <p className="mt-1 text-sm text-red-600">
              {getError("firstName")}
            </p>
          )}
        </div>

        {/* LAST NAME */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Last Name
          </label>

          <input
            type="text"
            value={safeForm.lastName}
            onChange={(e) => {
              onChange(
                "lastName",
                e.target.value,
              );

              setLocalErrors(
                (previous) => ({
                  ...previous,
                  lastName: "",
                }),
              );
            }}
            className={[
              "w-full rounded-lg border px-4 py-3 outline-none transition",
              getError("lastName")
                ? "border-red-400 focus:border-red-500"
                : "border-gray-300 focus:border-blue-500",
            ].join(" ")}
            placeholder="Enter last name"
            disabled={saving}
          />

          {getError("lastName") && (
            <p className="mt-1 text-sm text-red-600">
              {getError("lastName")}
            </p>
          )}
        </div>

        {/* DATE OF BIRTH */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Date of Birth
          </label>

          <input
            type="date"
            value={safeForm.dateOfBirth}
            onChange={(e) => {
              onChange(
                "dateOfBirth",
                e.target.value,
              );

              setLocalErrors(
                (previous) => ({
                  ...previous,
                  dateOfBirth: "",
                }),
              );
            }}
            className={[
              "w-full rounded-lg border px-4 py-3 outline-none transition",
              getError("dateOfBirth")
                ? "border-red-400 focus:border-red-500"
                : "border-gray-300 focus:border-blue-500",
            ].join(" ")}
            disabled={saving}
          />

          {getError("dateOfBirth") && (
            <p className="mt-1 text-sm text-red-600">
              {getError("dateOfBirth")}
            </p>
          )}
        </div>

        {/* GENDER */}

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Gender
          </label>

          <select
            value={safeForm.gender}
            onChange={(e) => {
              onChange(
                "gender",
                e.target.value,
              );

              setLocalErrors(
                (previous) => ({
                  ...previous,
                  gender: "",
                }),
              );
            }}
            className={[
              "w-full rounded-lg border bg-white px-4 py-3 outline-none transition",
              getError("gender")
                ? "border-red-400 focus:border-red-500"
                : "border-gray-300 focus:border-blue-500",
            ].join(" ")}
            disabled={saving}
          >
            <option value="">
              Select gender
            </option>

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

          {getError("gender") && (
            <p className="mt-1 text-sm text-red-600">
              {getError("gender")}
            </p>
          )}
        </div>
      </div>

      {/* CONTINUE */}

      <div className="flex justify-end border-t pt-6">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Saving..."
            : "Continue"}
        </button>
      </div>
    </form>
  );
};

export default PersonalStep;
