
package com.menumoney;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "LoanWidget")
public class LoanWidgetPlugin extends Plugin {

    private static final String TAG = "LoanWidgetPlugin";
    private static final String PREFS = "menumoney_loan_widget";
    private static final String CONSENT_PREFS = "menumoney_floating_consent";

    private static final long REMINDER_COOLDOWN_MS =
            24L * 60L * 60L * 1000L;

    @PluginMethod
    public void updateData(PluginCall call) {

        String userId = call.getString("userId");

        if (userId == null || userId.trim().isEmpty()) {
            call.reject("User ID is required.");
            return;
        }

        String amount = call.getString("amount", "No payment due");
        String dueDate = call.getString("dueDate", "—");
        String accountNumber = call.getString("accountNumber", "");
        String bankName = call.getString("bankName", "");

        String message = call.getString(
                "message",
                "Check your next loan installment and repayment details."
        );

        boolean paymentDue = Boolean.TRUE.equals(
                call.getBoolean("paymentDue", false)
        );

        boolean floatingEnabled = Boolean.TRUE.equals(
                call.getBoolean("floatingReminderEnabled", false)
        );

        JSArray ids = call.getArray("unpaidInstallmentIds");

        if (ids == null) {
            call.reject("Unpaid installment IDs are required.");
            return;
        }

        Set<String> currentIds = new HashSet<>();

        for (int i = 0; i < ids.length(); i++) {
            String id = ids.optString(i, "");

            if (id != null && !id.trim().isEmpty()) {
                currentIds.add(id.trim());
            }
        }

        Context context = getContext();

        SharedPreferences prefs = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        String previousUserId = prefs.getString("activeUserId", "");

        Set<String> previousIds = new HashSet<>(
                prefs.getStringSet(
                        "unpaidInstallmentIds",
                        new HashSet<>()
                )
        );

        long reminderSnoozeUntil =
                prefs.getLong("reminderSnoozeUntil", 0L);

        if (!userId.equals(previousUserId)) {
            Log.d(TAG, "Account changed. Resetting previous payment tracking.");

            previousIds.clear();
            reminderSnoozeUntil = 0L;
        }

        boolean paymentWasMade =
                !previousIds.isEmpty()
                        && !currentIds.containsAll(previousIds);

        if (paymentWasMade) {
            reminderSnoozeUntil =
                    System.currentTimeMillis() + REMINDER_COOLDOWN_MS;

            Log.d(TAG, "Payment detected. Reminder paused for 24 hours.");
        }

        boolean saved = prefs.edit()
                .putString("amount", amount)
                .putString("dueDate", dueDate)
                .putString("accountNumber", accountNumber)
                .putString("bankName", bankName)
                .putString("message", message)
                .putString("activeUserId", userId)
                .putBoolean("paymentDue", paymentDue)
                .putBoolean("floatingReminderEnabled", floatingEnabled)
                .putBoolean("hasCustomerData", true)
                .putStringSet(
                        "unpaidInstallmentIds",
                        new HashSet<>(currentIds)
                )
                .putLong("reminderSnoozeUntil", reminderSnoozeUntil)
                .commit();

        if (!saved) {
            call.reject("Could not save loan reminder data.");
            return;
        }

        Log.d(TAG, "Loan widget data saved successfully.");
        Log.d(TAG, "User ID: " + userId);
        Log.d(TAG, "Payment due: " + paymentDue);
        Log.d(TAG, "Unpaid installments: " + currentIds.size());
        Log.d(TAG, "Admin enabled: " + floatingEnabled);

        try {
            LoanWidget.updateWidget(context);
            reconcileFloatingReminder(context, false);

            call.resolve(
                    new JSObject()
                            .put("success", true)
                            .put("paymentDue", paymentDue)
                            .put("floatingReminderEnabled", floatingEnabled)
            );

        } catch (Exception e) {
            Log.e(TAG, "Error updating native loan widget.", e);
            call.reject("Widget update failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void clearData(PluginCall call) {

        Context context = getContext();

        SharedPreferences prefs = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        boolean cleared = prefs.edit().clear().commit();

        stopFloatingReminder(context);
        LoanWidget.updateWidget(context);

        Log.w(TAG, "Loan widget data cleared.");

        if (!cleared) {
            call.reject("Could not clear loan widget data.");
            return;
        }

        call.resolve(new JSObject().put("success", true));
    }

    @PluginMethod
    public void getFloatingReminderConsentStatus(PluginCall call) {

        String userId = call.getString("userId");

        if (userId == null || userId.trim().isEmpty()) {
            call.reject("User ID is required.");
            return;
        }

        SharedPreferences consentPrefs = getContext()
                .getSharedPreferences(CONSENT_PREFS, Context.MODE_PRIVATE);

        boolean overlayGranted = Settings.canDrawOverlays(getContext());

        JSObject result = new JSObject()
                .put("asked", consentPrefs.getBoolean("asked_" + userId, false))
                .put("enabled", consentPrefs.getBoolean("enabled_" + userId, false))
                .put("overlayGranted", overlayGranted);

        Log.d(TAG, "Consent status for " + userId + ": " + result);

        call.resolve(result);
    }

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {

        boolean granted = Settings.canDrawOverlays(getContext());

        Log.d(TAG, "Overlay permission: " + granted);

        call.resolve(
                new JSObject().put("granted", granted)
        );
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {

        Context context = getContext();

        if (Settings.canDrawOverlays(context)) {
            call.resolve(new JSObject().put("granted", true));
            return;
        }

        try {
            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + context.getPackageName())
            );

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);

            Log.d(TAG, "Opened Android overlay permission settings.");

            call.resolve(new JSObject().put("granted", false));

        } catch (Exception e) {
            Log.e(TAG, "Could not open overlay settings.", e);
            call.reject("Could not open overlay settings: " + e.getMessage());
        }
    }

    @PluginMethod
    public void setFloatingReminderConsent(PluginCall call) {

        String userId = call.getString("userId");
        Boolean enabled = call.getBoolean("enabled");

        if (userId == null || userId.trim().isEmpty() || enabled == null) {
            call.reject("User ID and enabled value are required.");
            return;
        }

        Context context = getContext();

        SharedPreferences consentPrefs = context.getSharedPreferences(
                CONSENT_PREFS,
                Context.MODE_PRIVATE
        );

        boolean saved = consentPrefs.edit()
                .putBoolean("asked_" + userId, true)
                .putBoolean("enabled_" + userId, enabled)
                .commit();

        if (!saved) {
            call.reject("Could not save reminder preference.");
            return;
        }

        Log.d(TAG, "Consent saved. User: " + userId + ", enabled: " + enabled);

        if (!enabled) {
            stopFloatingReminder(context);
        } else {
            reconcileFloatingReminder(context, false);
        }

        call.resolve(new JSObject().put("success", true));
    }

    @PluginMethod
    public void stopFloatingReminder(PluginCall call) {

        stopFloatingReminder(getContext());

        call.resolve(new JSObject().put("success", true));
    }

    /*
     * TEST METHOD
     *
     * Tests native floating service startup.
     * Requires an authenticated user ID and saved consent.
     * Bypasses admin-enabled, payment-due and cooldown checks.
     */
    @PluginMethod
    public void testFloatingReminder(PluginCall call) {

        Context context = getContext();

        String userId = call.getString("userId");

        if (userId == null || userId.trim().isEmpty()) {
            call.reject("Provide userId to test the floating reminder.");
            return;
        }

        SharedPreferences consentPrefs = context.getSharedPreferences(
                CONSENT_PREFS,
                Context.MODE_PRIVATE
        );

        boolean consent = consentPrefs.getBoolean(
                "enabled_" + userId,
                false
        );

        boolean overlayGranted = Settings.canDrawOverlays(context);

        Log.w(TAG, "========== FLOATING REMINDER TEST ==========");
        Log.w(TAG, "User: " + userId);
        Log.w(TAG, "Consent: " + consent);
        Log.w(TAG, "Overlay permission: " + overlayGranted);

        if (!consent) {
            call.reject("User has not enabled floating reminder consent.");
            return;
        }

        if (!overlayGranted) {
            call.reject("Android overlay permission has not been granted.");
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        // Set temporary test display data.
        prefs.edit()
                .putString("activeUserId", userId)
                .putString("amount", "TEST: ₦5,000")
                .putString("dueDate", "TEST REMINDER")
                .putString("message", "Your floating reminder is working!")
                .putBoolean("paymentDue", true)
                .putBoolean("hasCustomerData", true)
                .putBoolean("floatingReminderEnabled", true)
                .putLong("reminderSnoozeUntil", 0L)
                .commit();

        try {
            startFloatingReminderService(context);

            Log.w(TAG, "Test service start requested successfully.");

            call.resolve(
                    new JSObject()
                            .put("success", true)
                            .put("message", "Floating reminder test started.")
            );

        } catch (Exception e) {
            Log.e(TAG, "Floating reminder test failed.", e);
            call.reject("Test failed: " + e.getMessage());
        }
    }

    /*
     * DIAGNOSTIC METHOD
     */
    @PluginMethod
    public void diagnoseFloatingReminder(PluginCall call) {

        Context context = getContext();

        SharedPreferences prefs = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        SharedPreferences consentPrefs = context.getSharedPreferences(
                CONSENT_PREFS,
                Context.MODE_PRIVATE
        );

        String userId = prefs.getString("activeUserId", "");

        boolean adminEnabled =
                prefs.getBoolean("floatingReminderEnabled", false);

        boolean paymentDue =
                prefs.getBoolean("paymentDue", false);

        boolean hasData =
                prefs.getBoolean("hasCustomerData", false);

        boolean consent = !userId.isEmpty()
                && consentPrefs.getBoolean("enabled_" + userId, false);

        boolean overlayGranted = Settings.canDrawOverlays(context);

        long snoozeUntil = prefs.getLong("reminderSnoozeUntil", 0L);

        boolean cooldownFinished =
                System.currentTimeMillis() >= snoozeUntil;

        boolean allowed = adminEnabled
                && consent
                && paymentDue
                && hasData
                && overlayGranted
                && cooldownFinished;

        JSObject result = new JSObject()
                .put("userId", userId)
                .put("adminEnabled", adminEnabled)
                .put("consent", consent)
                .put("paymentDue", paymentDue)
                .put("hasData", hasData)
                .put("overlayGranted", overlayGranted)
                .put("cooldownFinished", cooldownFinished)
                .put("allowed", allowed)
                .put("snoozeUntil", snoozeUntil);

        Log.w(TAG, "========== FLOATING REMINDER DIAGNOSTICS ==========");
        Log.w(TAG, result.toString());
        Log.w(TAG, "===================================================");

        call.resolve(result);
    }

    private void reconcileFloatingReminder(Context context, boolean testMode) {

        SharedPreferences prefs = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        SharedPreferences consentPrefs = context.getSharedPreferences(
                CONSENT_PREFS,
                Context.MODE_PRIVATE
        );

        String userId = prefs.getString("activeUserId", "");

        boolean adminEnabled =
                prefs.getBoolean("floatingReminderEnabled", false);

        boolean consent = !userId.isEmpty()
                && consentPrefs.getBoolean("enabled_" + userId, false);

        boolean paymentDue =
                prefs.getBoolean("paymentDue", false);

        boolean hasData =
                prefs.getBoolean("hasCustomerData", false);

        boolean overlayGranted = Settings.canDrawOverlays(context);

        long snoozeUntil = prefs.getLong("reminderSnoozeUntil", 0L);

        boolean cooldownFinished =
                System.currentTimeMillis() >= snoozeUntil;

        boolean allowed = adminEnabled
                && consent
                && paymentDue
                && hasData
                && overlayGranted
                && cooldownFinished;

        Log.w(TAG, "========== FLOATING REMINDER CHECK ==========");
        Log.w(TAG, "User ID: " + userId);
        Log.w(TAG, "Admin enabled: " + adminEnabled);
        Log.w(TAG, "User consent: " + consent);
        Log.w(TAG, "Payment due: " + paymentDue);
        Log.w(TAG, "Has data: " + hasData);
        Log.w(TAG, "Overlay permission: " + overlayGranted);
        Log.w(TAG, "Cooldown finished: " + cooldownFinished);
        Log.w(TAG, "Allowed: " + allowed);
        Log.w(TAG, "==============================================");

        if (!allowed) {
            Log.w(TAG, "Floating reminder blocked. Stopping service.");
            stopFloatingReminder(context);
            return;
        }

        try {
            startFloatingReminderService(context);
        } catch (Exception e) {
            Log.e(TAG, "Unable to start floating reminder.", e);
        }
    }

    private void startFloatingReminderService(Context context) {

        Intent intent = new Intent(
                context,
                FloatingReminderService.class
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Log.d(TAG, "Starting foreground floating reminder service.");
            context.startForegroundService(intent);
        } else {
            Log.d(TAG, "Starting floating reminder service.");
            context.startService(intent);
        }
    }

    private void stopFloatingReminder(Context context) {

        Log.d(TAG, "Stopping floating reminder service.");

        context.stopService(
                new Intent(context, FloatingReminderService.class)
        );
    }
}
