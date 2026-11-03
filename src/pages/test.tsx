
import { useState } from "react";
import {
  testFloatingReminder,
  diagnoseFloatingReminder,
} from "../services/loanWidget";
import  authApi  from "../services/AuthService";

export default function FloatingReminderTest() {
  const [loading, setLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const handleTest = async () => {
    if (loading) return;

    setLoading(true);
    setDiagnostics(null);
    setTestResult(null);

    try {
      const user = authApi.getUser();

      if (!user?._id) {
        alert("Please log in first.");
        return;
      }

      console.log("[FloatingReminder] Starting diagnostics...");

      const diagnosticResult =
        await diagnoseFloatingReminder();

      setDiagnostics(diagnosticResult);

      console.log(
        "[FloatingReminder] Diagnostics:",
        diagnosticResult
      );

      console.log("[FloatingReminder] Starting test...");

      const result = await testFloatingReminder(user._id);

      setTestResult(result);

      console.log(
        "[FloatingReminder] Test result:",
        result
      );

      alert(
        result?.success
          ? "Floating reminder test started successfully. Check whether the floating window appears."
          : "Floating reminder test returned an unsuccessful result. Check the console for details."
      );

    } catch (error) {
      console.error(
        "[FloatingReminder] Test error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : String(error)
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={handleTest}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-5 py-3 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Running Floating Reminder Test..."
          : "Test Floating Reminder"}
      </button>

      {diagnostics && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold">
            Floating Reminder Diagnostics
          </h3>

          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(diagnostics, null, 2)}
          </pre>
        </div>
      )}

      {testResult && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 font-semibold">
            Floating Reminder Test Result
          </h3>

          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs">
            {JSON.stringify(testResult, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
