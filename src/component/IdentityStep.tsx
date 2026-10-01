
import React from "react";

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
  errors?: Record<string, string>;
}

const IdentityStep: React.FC<IdentityStepProps> = ({
  form,
  onChange,
  errors = {},
}) => {
  return (
    <div className="space-y-6">
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
          onChange={(e) => onChange("address", e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
          placeholder="Enter your residential address"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address}</p>
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
            onChange={(e) => onChange("city", e.target.value)}
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
            onChange={(e) => onChange("state", e.target.value)}
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
            onChange={(e) => onChange("idType", e.target.value)}
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

          {errors.idType && (
            <p className="mt-1 text-sm text-red-600">{errors.idType}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            ID Number
          </label>

          <input
            type="text"
            value={form.idNumber}
            onChange={(e) => onChange("idNumber", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            placeholder="Enter identification number"
          />

          {errors.idNumber && (
            <p className="mt-1 text-sm text-red-600">
              {errors.idNumber}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default IdentityStep;

