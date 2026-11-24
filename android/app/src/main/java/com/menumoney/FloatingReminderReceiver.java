
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

    public static final String ACTION_RECHECK =
            "com.menumoney.RECHECK_FLOATING_REMINDER";

    @Override
    public void onReceive(Context context, Intent intent) {

        if (context == null || intent == null) {
            return;
        }

        String action = intent.getAction();

        boolean restoring = ACTION_RESTORE.equals(action);

        Log.d(TAG, "Received action: " + action);

        try {
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

            // ---------------------------------------------
            // CHECK ACTIVE CUSTOMER AND CONSENT
            // ---------------------------------------------

            String userId = prefs.getString("activeUserId", "");

            boolean consent = !userId.isEmpty()
                    && consentPrefs.getBoolean(
                            "enabled_" + userId,
                            false
                    );

            // ---------------------------------------------
            // CHECK REMINDER SETTINGS
            // ---------------------------------------------

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

            boolean overlayPermission =
                    Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                            || Settings.canDrawOverlays(context);

            boolean allowed =
                    reminderEnabled
                            && paymentDue
                            && hasCustomerData
                            && consent
                            && overlayPermission;

            // ---------------------------------------------
            // STOP IF REMINDERS ARE NOT ALLOWED
            // ---------------------------------------------

            if (!allowed) {
                Log.d(TAG, "Reminder conditions not satisfied.");

                LoanReminderScheduler.cancelAlarm(context);
                stopReminderService(context);
                return;
            }

            // ---------------------------------------------
            // RESTORE OR RECHECK THE SCHEDULE
            // ---------------------------------------------

            long now = System.currentTimeMillis();

            long nextReminderAt = prefs.getLong(
                    "nextReminderAt",
                    0L
            );

            long snoozeUntil = prefs.getLong(
                    "reminderSnoozeUntil",
                    0L
            );

            // Schedule creation belongs to loan-data reconciliation.
            if (nextReminderAt <= 0L) {
                Log.d(TAG, "No reminder schedule exists.");
                stopReminderService(context);
                return;
            }

            // ---------------------------------------------
            // SNOOZE IS STILL ACTIVE
            // ---------------------------------------------

            if (snoozeUntil > now) {
                Log.d(
                        TAG,
                        "Reminder is snoozed until " + snoozeUntil
                );

                LoanReminderScheduler.scheduleNextWake(context);
                stopReminderService(context);
                return;
            }

            // ---------------------------------------------
            // CLEAR EXPIRED SNOOZE
            // ---------------------------------------------

            boolean snoozeExpired = snoozeUntil > 0L
                    && snoozeUntil <= now;

            if (snoozeExpired) {
                prefs.edit()
                        .putLong("reminderSnoozeUntil", 0L)
                        .putBoolean("reminderCurrentlyShown", true)
                        .apply();
            }

            // ---------------------------------------------
            // SCHEDULE NEXT WAKE-UP
            // ---------------------------------------------

            LoanReminderScheduler.scheduleNextWake(context);

            // ---------------------------------------------
            // START SERVICE WHEN REMINDER IS DUE
            // ---------------------------------------------

            boolean reminderCurrentlyShown = prefs.getBoolean(
                    "reminderCurrentlyShown",
                    false
            );

            boolean reminderDue = now >= nextReminderAt
                    || snoozeExpired
                    || (restoring && reminderCurrentlyShown);

            if (reminderDue) {
                Log.d(
                        TAG,
                        restoring
                                ? "Restoring due reminder after boot."
                                : "Reminder deadline reached."
                );

                startReminderService(context);
            } else {
                Log.d(
                        TAG,
                        "Reminder is not due yet. Next deadline: "
                                + nextReminderAt
                );

                stopReminderService(context);
            }

        } catch (Exception e) {
            Log.e(TAG, "Error processing reminder broadcast.", e);
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

            Log.d(TAG, "Reminder service start requested.");

        } catch (Exception e) {
            Log.e(TAG, "Could not start reminder service.", e);
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

            Log.d(TAG, "Reminder service stopped.");

        } catch (Exception e) {
            Log.e(TAG, "Could not stop reminder service.", e);
        }
    }
}
