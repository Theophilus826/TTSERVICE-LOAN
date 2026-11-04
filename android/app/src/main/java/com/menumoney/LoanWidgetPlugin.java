
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

    private static final String CONSENT_PREFS =
            "menumoney_floating_consent";

    private static final long REMINDER_COOLDOWN_MS =
            24L * 60L * 60L * 1000L;

    // =========================================================
    // UPDATE LOAN AND FLOATING REMINDER DATA
    // =========================================================

    @PluginMethod
    public void updateData(PluginCall call) {

        String userId = call.getString("userId");

        if (userId == null || userId.trim().isEmpty()) {
            call.reject("User ID is required.");
            return;
        }

        Context context = getContext();

        SharedPreferences prefs = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        // -----------------------------------------------------
        // CUSTOMER REPAYMENT DATA
        // -----------------------------------------------------

        String amount = call.getString(
                "amount",
                "No payment due"
        );

        String dueDate = call.getString(
                "dueDate",
                "—"
        );

        String accountNumber = call.getString(
                "accountNumber",
                ""
        );

        String bankName = call.getString(
                "bankName",
                ""
        );

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

        // -----------------------------------------------------
        // UNPAID INSTALLMENTS
        // -----------------------------------------------------

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

        // -----------------------------------------------------
        // PREVIOUS PAYMENT TRACKING
        // -----------------------------------------------------

        String previousUserId = prefs.getString(
                "activeUserId",
                ""
        );

        Set<String> previousIds = new HashSet<>(
                prefs.getStringSet(
                        "unpaidInstallmentIds",
                        new HashSet<>()
                )
        );

        long reminderSnoozeUntil = prefs.getLong(
                "reminderSnoozeUntil",
                0L
        );

        if (!userId.equals(previousUserId)) {

            Log.d(
                    TAG,
                    "Account changed. Resetting previous payment tracking."
            );

            previousIds.clear();
            reminderSnoozeUntil = 0L;
        }

        boolean paymentWasMade =
                !previousIds.isEmpty()
                        && !currentIds.containsAll(previousIds);

        if (paymentWasMade) {

            reminderSnoozeUntil =
                    System.currentTimeMillis() + REMINDER_COOLDOWN_MS;

            Log.d(
                    TAG,
                    "Payment detected. Reminder paused for 24 hours."
            );
        }

        // -----------------------------------------------------
        // SAVE CUSTOMER DATA
        // -----------------------------------------------------

        SharedPreferences.Editor editor = prefs.edit();

        editor.putString("amount", amount);
        editor.putString("dueDate", dueDate);
        editor.putString("accountNumber", accountNumber);
        editor.putString("bankName", bankName);
        editor.putString("message", message);

        editor.putString("activeUserId", userId);

        editor.putBoolean("paymentDue", paymentDue);
        editor.putBoolean("floatingReminderEnabled", floatingEnabled);
        editor.putBoolean("hasCustomerData", true);

        editor.putStringSet(
                "unpaidInstallmentIds",
                new HashSet<>(currentIds)
        );

        editor.putLong(
                "reminderSnoozeUntil",
                reminderSnoozeUntil
        );

        // -----------------------------------------------------
        // SAVE ADMIN APPEARANCE SETTINGS
        //
        // These arguments are optional.
        // If omitted, existing saved settings are preserved.
        // -----------------------------------------------------

        saveAppearanceSettings(call, prefs, editor);

        boolean saved = editor.commit();

        if (!saved) {

            call.reject("Could not save loan reminder data.");
            return;
        }

        Log.d(TAG, "Loan widget data saved successfully.");
        Log.d(TAG, "User ID: " + userId);
        Log.d(TAG, "Payment due: " + paymentDue);
        Log.d(TAG, "Unpaid installments: " + currentIds.size());
        Log.d(TAG, "Admin enabled: " + floatingEnabled);

        // -----------------------------------------------------
        // UPDATE WIDGET AND RECONCILE FLOATING REMINDER
        // -----------------------------------------------------

        try {

            LoanWidget.updateWidget(context);

            reconcileFloatingReminder(context, false);

            call.resolve(
                    new JSObject()
                            .put("success", true)
                            .put("paymentDue", paymentDue)
                            .put("floatingReminderEnabled", floatingEnabled)
                            .put("appearanceSaved", true)
            );

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Error updating native loan widget.",
                    e
            );

            call.reject(
                    "Widget update failed: " + e.getMessage()
            );
        }
    }

    // =========================================================
    // SAVE ADMIN APPEARANCE SETTINGS
    // =========================================================

    private void saveAppearanceSettings(
            PluginCall call,
            SharedPreferences prefs,
            SharedPreferences.Editor editor
    ) {

        // Width
        int width = call.getInt(
                "reminderWidth",
                prefs.getInt("reminderWidth", 320)
        );

        // Background colour
        String backgroundHex = call.getString(
                "reminderBackgroundHex",
                prefs.getString("reminderBackgroundHex", "#173B68")
        );

        // Text colour
        String textColor = call.getString(
                "reminderTextColor",
                prefs.getString("reminderTextColor", "#FFFFFF")
        );

        // Text size
        Double textSizeValue = call.getDouble(
                "reminderTextSize",
                (double) prefs.getFloat("reminderTextSize", 14f)
        );

        float textSize = textSizeValue == null
                ? 14f
                : textSizeValue.floatValue();

        // Corner radius
        int cornerRadius = call.getInt(
                "reminderCornerRadius",
                prefs.getInt("reminderCornerRadius", 18)
        );

        // Horizontal padding
        int horizontalPadding = call.getInt(
                "reminderHorizontalPadding",
                prefs.getInt("reminderHorizontalPadding", 20)
        );

        // Vertical padding
        int verticalPadding = call.getInt(
                "reminderVerticalPadding",
                prefs.getInt("reminderVerticalPadding", 16)
        );

        // Vertical screen position
        int positionY = call.getInt(
                "reminderPositionY",
                prefs.getInt("reminderPositionY", 100)
        );

        // -----------------------------------------------------
        // VALIDATE NUMERIC VALUES
        // -----------------------------------------------------

        width = Math.max(200, Math.min(width, 600));

        textSize = Math.max(
                10f,
                Math.min(textSize, 30f)
        );

        cornerRadius = Math.max(
                0,
                Math.min(cornerRadius, 50)
        );

        horizontalPadding = Math.max(
                0,
                Math.min(horizontalPadding, 60)
        );

        verticalPadding = Math.max(
                0,
                Math.min(verticalPadding, 60)
        );

        positionY = Math.max(
                0,
                Math.min(positionY, 2000)
        );

        // -----------------------------------------------------
        // VALIDATE HEX COLOURS
        // -----------------------------------------------------

        if (!isValidHexColor(backgroundHex)) {

            Log.w(
                    TAG,
                    "Invalid background colour. Using default."
            );

            backgroundHex = "#173B68";
        }

        if (!isValidHexColor(textColor)) {

            Log.w(
                    TAG,
                    "Invalid text colour. Using default."
            );

            textColor = "#FFFFFF";
        }

        backgroundHex = backgroundHex.toUpperCase();
        textColor = textColor.toUpperCase();

        // -----------------------------------------------------
        // SAVE APPEARANCE PREFERENCES
        // -----------------------------------------------------

        editor.putInt("reminderWidth", width);

        editor.putString(
                "reminderBackgroundHex",
                backgroundHex
        );

        editor.putString(
                "reminderTextColor",
                textColor
        );

        editor.putFloat(
                "reminderTextSize",
                textSize
        );

        editor.putInt(
                "reminderCornerRadius",
                cornerRadius
        );

        editor.putInt(
                "reminderHorizontalPadding",
                horizontalPadding
        );

        editor.putInt(
                "reminderVerticalPadding",
                verticalPadding
        );

        editor.putInt(
                "reminderPositionY",
                positionY
        );

        Log.d(
                TAG,
                "Floating reminder appearance settings prepared."
        );
    }

    private boolean isValidHexColor(String color) {

        return color != null
                && color.matches("^#[0-9A-Fa-f]{6}$");
    }

    // =========================================================
    // CLEAR LOAN DATA
    // =========================================================

    @PluginMethod
    public void clearData(PluginCall call) {

        Context context = getContext();

        SharedPreferences prefs = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        // Keep the global appearance configuration when a customer
        // logs out or loan data is cleared.

        SharedPreferences.Editor editor = prefs.edit();

        editor.remove("amount");
        editor.remove("dueDate");
        editor.remove("accountNumber");
        editor.remove("bankName");
        editor.remove("message");

        editor.remove("activeUserId");

        editor.remove("paymentDue");
        editor.remove("floatingReminderEnabled");
        editor.remove("hasCustomerData");

        editor.remove("unpaidInstallmentIds");
        editor.remove("reminderSnoozeUntil");

        boolean cleared = editor.commit();

        stopFloatingReminder(context);

        FloatingReminderService.cancelReminderRecheck(context);

        LoanWidget.updateWidget(context);

        Log.w(TAG, "Loan widget customer data cleared.");

        if (!cleared) {

            call.reject("Could not clear loan widget data.");
            return;
        }

        call.resolve(
                new JSObject().put("success", true)
        );
    }

    // =========================================================
    // GET FLOATING REMINDER CONSENT STATUS
    // =========================================================

    @PluginMethod
    public void getFloatingReminderConsentStatus(PluginCall call) {

        String userId = call.getString("userId");

        if (userId == null || userId.trim().isEmpty()) {

            call.reject("User ID is required.");
            return;
        }

        SharedPreferences consentPrefs = getContext()
                .getSharedPreferences(
                        CONSENT_PREFS,
                        Context.MODE_PRIVATE
                );

        boolean overlayGranted =
                Settings.canDrawOverlays(getContext());

        JSObject result = new JSObject()
                .put(
                        "asked",
                        consentPrefs.getBoolean(
                                "asked_" + userId,
                                false
                        )
                )
                .put(
                        "enabled",
                        consentPrefs.getBoolean(
                                "enabled_" + userId,
                                false
                        )
                )
                .put("overlayGranted", overlayGranted);

        Log.d(
                TAG,
                "Consent status for " + userId + ": " + result
        );

        call.resolve(result);
    }

    // =========================================================
    // CHECK OVERLAY PERMISSION
    // =========================================================

    @PluginMethod
    public void checkOverlayPermission(PluginCall call) {

        boolean granted =
                Settings.canDrawOverlays(getContext());

        Log.d(TAG, "Overlay permission: " + granted);

        call.resolve(
                new JSObject().put("granted", granted)
        );
    }

    // =========================================================
    // REQUEST OVERLAY PERMISSION
    // =========================================================

    @PluginMethod
    public void requestOverlayPermission(PluginCall call) {

        Context context = getContext();

        if (Settings.canDrawOverlays(context)) {

            call.resolve(
                    new JSObject().put("granted", true)
            );

            return;
        }

        try {

            Intent intent = new Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + context.getPackageName())
            );

            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

            context.startActivity(intent);

            Log.d(
                    TAG,
                    "Opened Android overlay permission settings."
            );

            call.resolve(
                    new JSObject().put("granted", false)
            );

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Could not open overlay settings.",
                    e
            );

            call.reject(
                    "Could not open overlay settings: " + e.getMessage()
            );
        }
    }

    // =========================================================
    // SET FLOATING REMINDER CONSENT
    // =========================================================

    @PluginMethod
    public void setFloatingReminderConsent(PluginCall call) {

        String userId = call.getString("userId");

        Boolean enabled = call.getBoolean("enabled");

        if (userId == null
                || userId.trim().isEmpty()
                || enabled == null) {

            call.reject(
                    "User ID and enabled value are required."
            );

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

            call.reject(
                    "Could not save reminder preference."
            );

            return;
        }

        Log.d(
                TAG,
                "Consent saved. User: " + userId
                        + ", enabled: " + enabled
        );

        if (!enabled) {

            stopFloatingReminder(context);

            FloatingReminderService.cancelReminderRecheck(context);

        } else {

            reconcileFloatingReminder(context, false);
        }

        call.resolve(
                new JSObject().put("success", true)
        );
    }

    // =========================================================
    // STOP FLOATING REMINDER
    // =========================================================

    @PluginMethod
    public void stopFloatingReminder(PluginCall call) {

        stopFloatingReminder(getContext());

        call.resolve(
                new JSObject().put("success", true)
        );
    }

    private void stopFloatingReminder(Context context) {

        Log.d(TAG, "Stopping floating reminder service.");

        context.stopService(
                new Intent(
                        context,
                        FloatingReminderService.class
                )
        );
    }

    // =========================================================
    // TEST FLOATING REMINDER
    // =========================================================

    @PluginMethod
    public void testFloatingReminder(PluginCall call) {

        Context context = getContext();

        String userId = call.getString("userId");

        if (userId == null || userId.trim().isEmpty()) {

            call.reject(
                    "Provide userId to test the floating reminder."
            );

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

        boolean overlayGranted =
                Settings.canDrawOverlays(context);

        Log.w(TAG, "========== FLOATING REMINDER TEST ==========");
        Log.w(TAG, "User: " + userId);
        Log.w(TAG, "Consent: " + consent);
        Log.w(TAG, "Overlay permission: " + overlayGranted);

        if (!consent) {

            call.reject(
                    "User has not enabled floating reminder consent."
            );

            return;
        }

        if (!overlayGranted) {

            call.reject(
                    "Android overlay permission has not been granted."
            );

            return;
        }

        SharedPreferences prefs = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        // Temporary test display data.
        prefs.edit()
                .putString("activeUserId", userId)
                .putString("amount", "TEST: ₦5,000")
                .putString("dueDate", "TEST REMINDER")
                .putString(
                        "message",
                        "Your floating reminder is working!"
                )
                .putBoolean("paymentDue", true)
                .putBoolean("hasCustomerData", true)
                .putBoolean("floatingReminderEnabled", true)
                .putLong("reminderSnoozeUntil", 0L)
                .commit();

        try {

            startFloatingReminderService(context);

            Log.w(
                    TAG,
                    "Test service start requested successfully."
            );

            call.resolve(
                    new JSObject()
                            .put("success", true)
                            .put(
                                    "message",
                                    "Floating reminder test started."
                            )
            );

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Floating reminder test failed.",
                    e
            );

            call.reject(
                    "Test failed: " + e.getMessage()
            );
        }
    }

    // =========================================================
    // DIAGNOSTIC METHOD
    // =========================================================

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

        String userId = prefs.getString(
                "activeUserId",
                ""
        );

        boolean adminEnabled = prefs.getBoolean(
                "floatingReminderEnabled",
                false
        );

        boolean paymentDue = prefs.getBoolean(
                "paymentDue",
                false
        );

        boolean hasData = prefs.getBoolean(
                "hasCustomerData",
                false
        );

        boolean consent = !userId.isEmpty()
                && consentPrefs.getBoolean(
                "enabled_" + userId,
                false
        );

        boolean overlayGranted =
                Settings.canDrawOverlays(context);

        long snoozeUntil = prefs.getLong(
                "reminderSnoozeUntil",
                0L
        );

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
                .put("snoozeUntil", snoozeUntil)
                .put(
                        "reminderWidth",
                        prefs.getInt("reminderWidth", 320)
                )
                .put(
                        "reminderBackgroundHex",
                        prefs.getString(
                                "reminderBackgroundHex",
                                "#173B68"
                        )
                )
                .put(
                        "reminderTextColor",
                        prefs.getString(
                                "reminderTextColor",
                                "#FFFFFF"
                        )
                )
                .put(
                        "reminderTextSize",
                        prefs.getFloat("reminderTextSize", 14f)
                );

        Log.w(
                TAG,
                "========== FLOATING REMINDER DIAGNOSTICS =========="
        );

        Log.w(TAG, result.toString());

        Log.w(
                TAG,
                "==================================================="
        );

        call.resolve(result);
    }

    // =========================================================
    // RECONCILE FLOATING REMINDER
    // =========================================================

    private void reconcileFloatingReminder(
            Context context,
            boolean testMode
    ) {

        SharedPreferences prefs = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        SharedPreferences consentPrefs = context.getSharedPreferences(
                CONSENT_PREFS,
                Context.MODE_PRIVATE
        );

        String userId = prefs.getString(
                "activeUserId",
                ""
        );

        boolean adminEnabled = prefs.getBoolean(
                "floatingReminderEnabled",
                false
        );

        boolean consent = !userId.isEmpty()
                && consentPrefs.getBoolean(
                "enabled_" + userId,
                false
        );

        boolean paymentDue = prefs.getBoolean(
                "paymentDue",
                false
        );

        boolean hasData = prefs.getBoolean(
                "hasCustomerData",
                false
        );

        boolean overlayGranted =
                Settings.canDrawOverlays(context);

        long snoozeUntil = prefs.getLong(
                "reminderSnoozeUntil",
                0L
        );

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

            Log.w(
                    TAG,
                    "Floating reminder blocked. Stopping service."
            );

            stopFloatingReminder(context);

            if (!cooldownFinished && adminEnabled && consent
                    && paymentDue && hasData && overlayGranted) {

                FloatingReminderService.scheduleReminderRecheck(
                        context,
                        snoozeUntil
                );
            } else {

                FloatingReminderService.cancelReminderRecheck(
                        context
                );
            }

            return;
        }

        try {

            startFloatingReminderService(context);

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Unable to start floating reminder.",
                    e
            );
        }
    }

    // =========================================================
    // START FLOATING REMINDER SERVICE
    // =========================================================

    private void startFloatingReminderService(Context context) {

        Intent intent = new Intent(
                context,
                FloatingReminderService.class
        );

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            Log.d(
                    TAG,
                    "Starting foreground floating reminder service."
            );

            context.startForegroundService(intent);

        } else {

            Log.d(
                    TAG,
                    "Starting floating reminder service."
            );

            context.startService(intent);
        }
    }
}
