
import React, { useEffect, useState } from "react";
import adminRepaymentApi, {
  type FloatingReminderAppearance,
} from "../services/adminRepaymentApi";

const DEFAULT_APPEARANCE: FloatingReminderAppearance = {
  reminderWidth: 320,
  reminderBackgroundHex: "#173B68",
  reminderTextColor: "#FFFFFF",
  reminderTextSize: 14,
  reminderCornerRadius: 18,
  reminderHorizontalPadding: 20,
  reminderVerticalPadding: 16,
  reminderPositionY: 100,
};

const FloatingReminderAppearanceEditor: React.FC = () => {
  const [settings, setSettings] =
    useState<FloatingReminderAppearance>(DEFAULT_APPEARANCE);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const result =
          await adminRepaymentApi.getFloatingReminderAppearance();

        if (!cancelled) {
          setSettings({
            ...DEFAULT_APPEARANCE,
            ...result,
          });
        }
      } catch (err) {
        console.error("Appearance loading failed:", err);

        if (!cancelled) {
          setError("Unable to load appearance settings.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const update = (
    key: keyof FloatingReminderAppearance,
    value: number | string
  ) => {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSuccess("");
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const result =
        await adminRepaymentApi.updateFloatingReminderAppearance(
          settings
        );

      setSettings({
        ...DEFAULT_APPEARANCE,
        ...result,
      });

      setSuccess(
        "Global floating reminder appearance saved successfully."
      );
    } catch (err: any) {
      console.error("Appearance save failed:", err);

      setError(
        err?.response?.data?.message ||
        err?.message ||
        "Unable to save appearance settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const numberField = (
    label: string,
    key: keyof FloatingReminderAppearance,
    min: number,
    max: number,
    unit = "px"
  ) => (
    <div>
      <div className="mb-2 flex justify-between">
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>

        <span className="text-sm font-semibold text-blue-700">
          {settings[key]} {unit}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={Number(settings[key])}
        onChange={(e) =>
          update(key, Number(e.target.value))
        }
        className="w-full accent-blue-600"
      />

      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6">
        Loading appearance settings...
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">
          Floating Reminder Appearance
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          These settings apply globally to all customers.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">

        {/* SETTINGS */}

        <div className="space-y-6">

          {numberField("Reminder width", "reminderWidth", 200, 600)}

          {numberField("Text size", "reminderTextSize", 10, 30, "px")}

          {numberField("Corner radius", "reminderCornerRadius", 0, 50)}

          {numberField(
            "Horizontal padding",
            "reminderHorizontalPadding",
            0,
            60
          )}

          {numberField(
            "Vertical padding",
            "reminderVerticalPadding",
            0,
            60
          )}

          {numberField(
            "Vertical screen position",
            "reminderPositionY",
            0,
            2000
          )}

          <div className="grid grid-cols-2 gap-4">

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Background colour
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.reminderBackgroundHex}
                  onChange={(e) =>
                    update("reminderBackgroundHex", e.target.value.toUpperCase())
                  }
                  className="h-11 w-14 cursor-pointer rounded border"
                />

                <span className="text-sm font-semibold">
                  {settings.reminderBackgroundHex}
                </span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Text colour
              </label>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings.reminderTextColor}
                  onChange={(e) =>
                    update("reminderTextColor", e.target.value.toUpperCase())
                  }
                  className="h-11 w-14 cursor-pointer rounded border"
                />

                <span className="text-sm font-semibold">
                  {settings.reminderTextColor}
                </span>
              </div>
            </div>

          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
              {success}
            </div>
          )}

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={() => setSettings(DEFAULT_APPEARANCE)}
              disabled={saving}
              className="rounded-lg border px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Reset preview
            </button>

            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Global Appearance"}
            </button>

          </div>
        </div>

        {/* LIVE PREVIEW */}

        <div className="rounded-xl bg-gray-100 p-6">

          <h3 className="mb-6 text-sm font-semibold text-gray-700">
            Live Preview
          </h3>

          <div className="flex min-h-64 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-200 p-4">

            <div
              style={{
                width: `min(${settings.reminderWidth}px, 100%)`,
                backgroundColor: settings.reminderBackgroundHex,
                color: settings.reminderTextColor,
                fontSize: `${settings.reminderTextSize}px`,
                borderRadius: `${settings.reminderCornerRadius}px`,
                padding: `${settings.reminderVerticalPadding}px ${settings.reminderHorizontalPadding}px`,
                boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
              }}
            >
              <div className="font-bold">
                Loan repayment reminder
              </div>

              <div className="mt-2">
                Your next installment is due soon.
              </div>

              <div className="mt-3 font-semibold">
                Amount: ₦25,000
              </div>

              <div className="mt-1">
                Due date: 15 Nov 2026
              </div>

              <div className="mt-3 text-xs opacity-80">
                MenuMoney
              </div>
            </div>

          </div>

          <p className="mt-4 text-xs text-gray-500">
            Preview only. Actual placement and available screen space
            depend on the Android device.
          </p>

        </div>
      </div>
    </section>
  );
};

export default FloatingReminderAppearanceEditor;
