
package com.menumoney;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.provider.Settings;
import android.util.Log;

public class FloatingReminderReceiver extends BroadcastReceiver {

    private static final String TAG = "FloatingReminderReceiver";

    private static final String PREFS = "menumoney_loan_widget";

    private static final String CONSENT_PREFS =
            "menumoney_floating_consent";

    public static final String ACTION_RESTORE =
            "com.menumoney.RESTORE_AFTER_BOOT";

    @Override
    public void onReceive(Context context, Intent intent) {

        if (context == null || intent == null) {
            return;
        }

        String action = intent.getAction();

        boolean restoring = ACTION_RESTORE.equals(action);

        Log.d(TAG, restoring
                ? "Restoring loan reminders after boot/update."
                : "Loan reminder broadcast received: " + action);

        try {

            // =============================================
            // READ LOCALLY SAVED CUSTOMER DATA
            // =============================================

            SharedPreferences prefs =
                    context.getSharedPreferences(
                            PREFS,
                            Context.MODE_PRIVATE
                    );

            SharedPreferences consentPrefs =
                    context.getSharedPreferences(
                            CONSENT_PREFS,
                            Context.MODE_PRIVATE
                    );

            String userId = prefs.getString(
                    "activeUserId",
                    ""
            );

            // =============================================
            // CHECK CUSTOMER CONSENT
            // =============================================

            boolean consent = !userId.isEmpty()
                    && consentPrefs.getBoolean(
                            "enabled_" + userId,
                            false
                    );

            // =============================================
            // CHECK REMINDER SETTINGS
            // =============================================

            boolean reminderEnabled = prefs.getBoolean(
                    "floatingReminderEnabled",
                    false
            );

            boolean paymentDue = prefs.getBoolean(
                    "paymentDue",
                    false
            );

            boolean hasCustomerData = prefs.getBoolean(
                    "hasCustomerData",
                    false
            );

            // =============================================
            // CHECK OVERLAY PERMISSION
            // =============================================

            boolean overlayPermission =
                    Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                            || Settings.canDrawOverlays(context);

            // =============================================
            // VALIDATE REMINDER CONDITIONS
            // =============================================

            boolean allowed =
                    reminderEnabled
                            && paymentDue
                            && hasCustomerData
                            && consent
                            && overlayPermission;

            // =============================================
            // READ SAVED SNOOZE TIME
            // =============================================

            long snoozeUntil = prefs.getLong(
                    "reminderSnoozeUntil",
                    0L
            );

            long currentTime = System.currentTimeMillis();

            // =============================================
            // STOP IF REMINDER IS NOT ALLOWED
            // =============================================

            if (!allowed) {

                Log.d(
                        TAG,
                        "Reminder disabled or required conditions missing."
                );

                FloatingReminderService.cancelReminderRecheck(
                        context
                );

                stopReminderService(context);

                return;
            }

            // =============================================
            // RESTORE ACTIVE SNOOZE AFTER REBOOT
            // =============================================

            if (snoozeUntil > currentTime) {

                Log.d(
                        TAG,
                        "Restoring snoozed reminder until: "
                                + snoozeUntil
                );

                // Recreate the snooze recheck alarm locally.
                FloatingReminderService.scheduleReminderRecheck(
                        context,
                        snoozeUntil
                );

                return;
            }

            // =============================================
            // CLEAR EXPIRED SNOOZE
            // =============================================

            if (snoozeUntil != 0L) {

                prefs.edit()
                        .putLong("reminderSnoozeUntil", 0L)
                        .apply();
            }

            // =============================================
            // START REMINDER SERVICE
            // =============================================

            Log.d(
                    TAG,
                    restoring
                            ? "Boot restoration successful. Starting reminder service."
                            : "Reminder conditions satisfied. Starting service."
            );

            startReminderService(context);

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Error processing loan reminder broadcast.",
                    e
            );
        }
    }

    // =====================================================
    // START FLOATING REMINDER SERVICE
    // =====================================================

    private void startReminderService(Context context) {

        Intent serviceIntent = new Intent(
                context,
                FloatingReminderService.class
        );

        try {

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

                context.startForegroundService(serviceIntent);

            } else {

                context.startService(serviceIntent);
            }

            Log.d(
                    TAG,
                    "Floating reminder service start requested."
            );

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Could not start floating reminder service.",
                    e
            );
        }
    }

    // =====================================================
    // STOP FLOATING REMINDER SERVICE
    // =====================================================

    private void stopReminderService(Context context) {

        try {

            Intent serviceIntent = new Intent(
                    context,
                    FloatingReminderService.class
            );

            context.stopService(serviceIntent);

            Log.d(
                    TAG,
                    "Floating reminder service stopped."
            );

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Could not stop floating reminder service.",
                    e
            );
        }
    }
}
