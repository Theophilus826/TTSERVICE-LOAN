
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
            call.reject("Customer ID is required.");
            return;
        }

        String amount = call.getString("amount", "No payment due");
        String dueDate = call.getString("dueDate", "No payment due");
        String accountNumber = call.getString("accountNumber", "");
        String bankName = call.getString("bankName", "");
        String message = call.getString(
                "message",
                "Check your next loan installment and repayment details."
        );

        boolean paymentDue =
                Boolean.TRUE.equals(call.getBoolean("paymentDue", false));

        boolean floatingEnabled =
                Boolean.TRUE.equals(
                        call.getBoolean("floatingReminderEnabled", false)
                );

        // Read the unpaid installment IDs sent from loanWidget.ts.
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

        // Do not compare payment records belonging to different customers.
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
            previousIds.clear();
            reminderSnoozeUntil = 0L;
        }

        /*
         * A payment has been made if an installment that was previously
         * unpaid is no longer present in the current unpaid installment list.
         */
        boolean paymentWasMade =
                !previousIds.isEmpty()
                        && !currentIds.containsAll(previousIds);

        if (paymentWasMade) {
            reminderSnoozeUntil =
                    System.currentTimeMillis() + REMINDER_COOLDOWN_MS;

            Log.d(
                    TAG,
                    "Payment detected. Floating reminder paused for 24 hours."
            );
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

        LoanWidget.updateWidget(context);

        reconcileFloatingReminder(context);

        call.resolve(new JSObject().put("success", true));
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
            call.reject("Customer ID is required.");
            return;
        }

        SharedPreferences consentPrefs = getContext()
                .getSharedPreferences(
                        CONSENT_PREFS,
                        Context.MODE_PRIVATE
                );

        JSObject result = new JSObject();

        result.put(
                "asked",
                consentPrefs.getBoolean("asked_" + userId, false)
        );

        result.put(
                "enabled",
                consentPrefs.getBoolean("enabled_" + userId, false)
        );

        result.put(
                "overlayGranted",
                Settings.canDrawOverlays(getContext())
        );

        call.resolve(result);
    }

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {
        call.resolve(
                new JSObject().put(
                        "granted",
                        Settings.canDrawOverlays(getContext())
                )
        );
    }

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {
        Context context = getContext();

        if (Settings.canDrawOverlays(context)) {
            call.resolve(new JSObject().put("granted", true));
            return;
        }

        Intent intent = new Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + context.getPackageName())
        );

        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);

        // The permission must be checked again when the app resumes.
        call.resolve(new JSObject().put("granted", false));
    }

    @PluginMethod
    public void setFloatingReminderConsent(PluginCall call) {
        String userId = call.getString("userId");
        Boolean enabled = call.getBoolean("enabled");

        if (userId == null || userId.trim().isEmpty() || enabled == null) {
            call.reject("Customer ID and enabled value are required.");
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

        if (!enabled) {
            stopFloatingReminder(context);
        } else {
            reconcileFloatingReminder(context);
        }

        call.resolve(new JSObject().put("success", true));
    }

    @PluginMethod
    public void stopFloatingReminder(PluginCall call) {
        stopFloatingReminder(getContext());

        call.resolve(new JSObject().put("success", true));
    }

    /**
     * Check whether the floating reminder is allowed to run.
     */
    private void reconcileFloatingReminder(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        SharedPreferences consentPrefs = context.getSharedPreferences(
                CONSENT_PREFS,
                Context.MODE_PRIVATE
        );

        String userId = prefs.getString("activeUserId", "");

        boolean consent = !userId.isEmpty()
                && consentPrefs.getBoolean("enabled_" + userId, false);

        long reminderSnoozeUntil =
                prefs.getLong("reminderSnoozeUntil", 0L);

        boolean cooldownFinished =
                System.currentTimeMillis() >= reminderSnoozeUntil;

        boolean allowed =
                prefs.getBoolean("floatingReminderEnabled", false)
                        && consent
                        && prefs.getBoolean("paymentDue", false)
                        && prefs.getBoolean("hasCustomerData", false)
                        && Settings.canDrawOverlays(context)
                        && cooldownFinished;

        if (!allowed) {
            stopFloatingReminder(context);
            return;
        }

        Intent intent = new Intent(
                context,
                FloatingReminderService.class
        );

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            Log.e(
                    TAG,
                    "Unable to start floating reminder",
                    e
            );
        }
    }

    private void stopFloatingReminder(Context context) {
        context.stopService(
                new Intent(context, FloatingReminderService.class)
        );
    }
}
