
import React from "react";

export interface PersonalFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other" | "";
}

interface PersonalStepProps {
  form: PersonalFormData;
  onChange: (
    field: keyof PersonalFormData,
    value: string,
  ) => void;
  errors?: Record<string, string>;
}

const PersonalStep: React.FC<PersonalStepProps> = ({
  form,
  onChange,
  errors = {},
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Personal Information
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Enter your personal information exactly as it appears on your
          official records.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            placeholder="Enter first name"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
            placeholder="Enter last name"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Date of Birth
          </label>
          <input
            type="date"
            value={form.dateOfBirth}
            onChange={(e) => onChange("dateOfBirth", e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
          />
          {errors.dateOfBirth && (
            <p className="mt-1 text-sm text-red-600">
              {errors.dateOfBirth}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Gender
          </label>
          <select
            value={form.gender}
            onChange={(e) => onChange("gender", e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default PersonalStep;

