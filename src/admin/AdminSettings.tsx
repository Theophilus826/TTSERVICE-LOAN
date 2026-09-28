import { useEffect, useState } from "react";
import {
  Settings,
  Save,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";

import API from "../services/Api";

type RegistrationRole = "admin" | "super_admin";

interface SettingsData {
  platformName?: string;
  supportEmail?: string;
  supportPhone?: string;
  currency?: string;
  maintenanceMode?: boolean;
  allowNewApplications?: boolean;
  allowNewRegistrations?: boolean;

  // Role assigned to newly registered users
  registrationRole?: RegistrationRole;
}

interface SettingsResponse {
  success: boolean;
  data?: SettingsData;
  settings?: SettingsData;
  message?: string;
}

const defaultSettings: SettingsData = {
  platformName: "Lovest",
  supportEmail: "",
  supportPhone: "",
  currency: "NGN",
  maintenanceMode: false,
  allowNewApplications: true,
  allowNewRegistrations: true,

  // Default registration role
  registrationRole: "admin",
};

export default function AdminSettings() {
  const [settings, setSettings] =
    useState<SettingsData>(defaultSettings);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  // =========================================================
  // LOAD SETTINGS
  // =========================================================

  const loadSettings = async () => {
    try {
      setLoading(true);

      const response =
        await API.get<SettingsResponse>(
          "/settings/admin",
        );

      const result = response.data;

      const loadedSettings =
        result.data ||
        result.settings;

      if (loadedSettings) {
        setSettings((current) => ({
          ...current,
          ...loadedSettings,

          // Protect against old settings documents
          registrationRole:
            loadedSettings.registrationRole ===
              "super_admin"
              ? "super_admin"
              : "admin",
        }));
      }
    } catch (error: any) {
      console.error(
        "Failed to load settings:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to load settings",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  // =========================================================
  // UPDATE FIELD
  // =========================================================

  const updateSetting = <
    K extends keyof SettingsData
  >(
    key: K,
    value: SettingsData[K],
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  // =========================================================
  // SAVE
  // =========================================================

  const saveSettings = async () => {
    try {
      setSaving(true);

      await API.put(
        "/settings/admin",
        settings,
      );

      toast.success(
        "Settings saved successfully",
      );

      await loadSettings();
    } catch (error: any) {
      console.error(
        "Failed to save settings:",
        error,
      );

      toast.error(
        error?.response?.data?.message ||
          "Failed to save settings",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Settings
          </h1>

          <p className="text-sm text-gray-500">
            Configure your lending platform.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadSettings}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:bg-gray-400"
          >
            <Save size={17} />

            {saving
              ? "Saving..."
              : "Save Changes"}
          </button>
        </div>
      </div>

      {/* PLATFORM */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-orange-100 p-3">
            <Settings
              size={22}
              className="text-orange-500"
            />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Platform Settings
            </h2>

            <p className="text-sm text-gray-500">
              Basic platform configuration.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {/* PLATFORM NAME */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Platform Name
            </label>

            <input
              type="text"
              value={
                settings.platformName || ""
              }
              onChange={(event) =>
                updateSetting(
                  "platformName",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {/* CURRENCY */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Currency
            </label>

            <select
              value={
                settings.currency || "NGN"
              }
              onChange={(event) =>
                updateSetting(
                  "currency",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            >
              <option value="NGN">
                Nigerian Naira (NGN)
              </option>

              <option value="USD">
                US Dollar (USD)
              </option>

              <option value="GBP">
                British Pound (GBP)
              </option>
            </select>
          </div>

          {/* SUPPORT EMAIL */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Support Email
            </label>

            <input
              type="email"
              value={
                settings.supportEmail || ""
              }
              onChange={(event) =>
                updateSetting(
                  "supportEmail",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          {/* SUPPORT PHONE */}

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Support Phone
            </label>

            <input
              type="text"
              value={
                settings.supportPhone || ""
              }
              onChange={(event) =>
                updateSetting(
                  "supportPhone",
                  event.target.value,
                )
              }
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>
        </div>
      </div>

      {/* REGISTRATION ROLE */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-orange-100 p-3">
            <ShieldCheck
              size={22}
              className="text-orange-500"
            />
          </div>

          <div>
            <h2 className="font-semibold text-gray-900">
              Registration Role
            </h2>

            <p className="text-sm text-gray-500">
              Choose the role assigned to newly registered accounts.
            </p>
          </div>
        </div>

        <div className="max-w-xl">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            New Account Role
          </label>

          <select
            value={
              settings.registrationRole ||
              "admin"
            }
            onChange={(event) =>
              updateSetting(
                "registrationRole",
                event.target.value as RegistrationRole,
              )
            }
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          >
            <option value="admin">
              Admin
            </option>

            <option value="super_admin">
              Super Admin
            </option>
          </select>

          <p className="mt-2 text-xs text-gray-500">
            This setting controls the role assigned by the server when
            a new account is created.
          </p>
        </div>
      </div>

      {/* SYSTEM CONTROLS */}

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900">
          System Controls
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Control availability of important platform features.
        </p>

        <div className="mt-6 space-y-5">
          {/* MAINTENANCE */}

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 hover:bg-gray-50">
            <div>
              <p className="font-medium text-gray-900">
                Maintenance Mode
              </p>

              <p className="text-sm text-gray-500">
                Temporarily disable normal platform access.
              </p>
            </div>

            <input
              type="checkbox"
              checked={
                settings.maintenanceMode ||
                false
              }
              onChange={(event) =>
                updateSetting(
                  "maintenanceMode",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-orange-500"
            />
          </label>

          {/* APPLICATIONS */}

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 hover:bg-gray-50">
            <div>
              <p className="font-medium text-gray-900">
                New Loan Applications
              </p>

              <p className="text-sm text-gray-500">
                Allow customers to submit new loan applications.
              </p>
            </div>

            <input
              type="checkbox"
              checked={
                settings.allowNewApplications ??
                true
              }
              onChange={(event) =>
                updateSetting(
                  "allowNewApplications",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-orange-500"
            />
          </label>

          {/* REGISTRATION */}

          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-gray-100 p-4 hover:bg-gray-50">
            <div>
              <p className="font-medium text-gray-900">
                New Registrations
              </p>

              <p className="text-sm text-gray-500">
                Allow new accounts to be created.
              </p>
            </div>

            <input
              type="checkbox"
              checked={
                settings.allowNewRegistrations ??
                true
              }
              onChange={(event) =>
                updateSetting(
                  "allowNewRegistrations",
                  event.target.checked,
                )
              }
              className="h-5 w-5 accent-orange-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
}