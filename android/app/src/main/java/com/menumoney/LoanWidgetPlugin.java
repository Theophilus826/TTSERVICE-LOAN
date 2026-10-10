
package com.menumoney;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LoanWidget")
public class LoanWidgetPlugin extends Plugin {
    private static final String PREFS = "menumoney_loan_widget";
    private static final String CONSENT_PREFS = "menumoney_floating_consent";

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
                Boolean.TRUE.equals(call.getBoolean("floatingReminderEnabled", false));

        Context context = getContext();
        SharedPreferences prefs =
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

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
        SharedPreferences prefs =
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

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

        SharedPreferences consentPrefs =
                getContext().getSharedPreferences(CONSENT_PREFS, Context.MODE_PRIVATE);

        JSObject result = new JSObject();
        result.put("asked", consentPrefs.getBoolean("asked_" + userId, false));
        result.put("enabled", consentPrefs.getBoolean("enabled_" + userId, false));
        result.put("overlayGranted", Settings.canDrawOverlays(getContext()));

        call.resolve(result);
    }

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {
        call.resolve(
                new JSObject().put("granted", Settings.canDrawOverlays(getContext()))
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

        // Re-check permission when the app returns from Android Settings.
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
        SharedPreferences consentPrefs =
                context.getSharedPreferences(CONSENT_PREFS, Context.MODE_PRIVATE);

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

    private void reconcileFloatingReminder(Context context) {
        SharedPreferences prefs =
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        SharedPreferences consentPrefs =
                context.getSharedPreferences(CONSENT_PREFS, Context.MODE_PRIVATE);

        String userId = prefs.getString("activeUserId", "");

        boolean consent = !userId.isEmpty()
                && consentPrefs.getBoolean("enabled_" + userId, false);

        boolean allowed =
                prefs.getBoolean("floatingReminderEnabled", false)
                        && consent
                        && prefs.getBoolean("paymentDue", false)
                        && prefs.getBoolean("hasCustomerData", false)
                        && Settings.canDrawOverlays(context);

        if (!allowed) {
            stopFloatingReminder(context);
            return;
        }

        Intent intent = new Intent(context, FloatingReminderService.class);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }
        } catch (Exception e) {
            android.util.Log.e(
                    "LoanWidgetPlugin",
                    "Unable to start floating reminder",
                    e
            );
        }
    }

    private void stopFloatingReminder(Context context) {
        context.stopService(new Intent(context, FloatingReminderService.class));
    }
}
