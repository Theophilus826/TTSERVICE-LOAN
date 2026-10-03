
import React, { useState } from "react";

export interface IdentityFormData {
  address: string;
  city: string;
  state: string;
  country: string;
  idType:
    | "nin"
    | "passport"
    | "drivers_license"
    | "voters_card"
    | "";
  idNumber: string;
}

interface IdentityStepProps {
  form: IdentityFormData;
  onChange: (
    field: keyof IdentityFormData,
    value: string,
  ) => void;
  onComplete: (form: IdentityFormData) => void | Promise<void>;
  saving?: boolean;
  errors?: Record<string, string>;
}

const IdentityStep: React.FC<IdentityStepProps> = ({
  form,
  onChange,
  onComplete,
  saving = false,
  errors = {},
}) => {
  const [localErrors, setLocalErrors] =
    useState<Record<string, string>>({});

  const validate = () => {
    const validationErrors: Record<string, string> = {};

    if (!form.address.trim()) validationErrors.address = "Address is required.";
    if (!form.city.trim()) validationErrors.city = "City is required.";
    if (!form.state.trim()) validationErrors.state = "State is required.";
    if (!form.idType) validationErrors.idType = "Select an ID type.";
    if (!form.idNumber.trim()) validationErrors.idNumber = "ID number is required.";

    setLocalErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (validate()) {
      await onComplete(form);
    }
  };

  const getError = (field: keyof IdentityFormData) =>
    errors[field] || localErrors[field];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Address & Identity
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Provide your residential address and identification details.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Residential Address
        </label>
        <textarea
          value={form.address}
          onChange={(e) => {
            onChange("address", e.target.value);
            setLocalErrors((previous) => ({ ...previous, address: "" }));
          }}
          rows={3}
          disabled={saving}
          className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
          placeholder="Enter your residential address"
        />
        {getError("address") && (
          <p className="mt-1 text-sm text-red-600">{getError("address")}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            City
          </label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => {
              onChange("city", e.target.value);
              setLocalErrors((previous) => ({ ...previous, city: "" }));
            }}
            disabled={saving}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            placeholder="City"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            State
          </label>
          <input
            type="text"
            value={form.state}
            onChange={(e) => {
              onChange("state", e.target.value);
              setLocalErrors((previous) => ({ ...previous, state: "" }));
            }}
            disabled={saving}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            placeholder="State"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Country
          </label>
          <input
            type="text"
            value={form.country}
            onChange={(e) => onChange("country", e.target.value)}
            disabled={saving}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            placeholder="Country"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            ID Type
          </label>

          <select
            value={form.idType}
            onChange={(e) => {
              onChange("idType", e.target.value);
              setLocalErrors((previous) => ({ ...previous, idType: "" }));
            }}
            disabled={saving}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="">Select ID type</option>
            <option value="nin">NIN</option>
            <option value="passport">International Passport</option>
            <option value="drivers_license">
              Driver's License
            </option>
            <option value="voters_card">Voter's Card</option>
          </select>

          {getError("idType") && (
            <p className="mt-1 text-sm text-red-600">{getError("idType")}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            ID Number
          </label>

          <input
            type="text"
            value={form.idNumber}
            onChange={(e) => {
              onChange("idNumber", e.target.value);
              setLocalErrors((previous) => ({ ...previous, idNumber: "" }));
            }}
            disabled={saving}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            placeholder="Enter identification number"
          />

          {getError("idNumber") && (
            <p className="mt-1 text-sm text-red-600">
              {getError("idNumber")}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t pt-6">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </form>
  );
};

export default IdentityStep;

