
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

    @Override
    public void onReceive(Context context, Intent intent) {

        if (context == null) {
            return;
        }

        // -----------------------------------------------------
        // READ CUSTOMER PREFERENCES
        // -----------------------------------------------------

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

        // -----------------------------------------------------
        // CHECK CUSTOMER CONSENT
        // -----------------------------------------------------

        boolean consent = !userId.isEmpty()
                && consentPrefs.getBoolean(
                "enabled_" + userId,
                false
        );

        // -----------------------------------------------------
        // CHECK REMINDER REQUIREMENTS
        // -----------------------------------------------------

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

        boolean overlayPermission = Settings.canDrawOverlays(
                context
        );

        boolean allowed =
                reminderEnabled
                        && paymentDue
                        && hasCustomerData
                        && consent
                        && overlayPermission;

        // -----------------------------------------------------
        // READ SNOOZE TIME
        // -----------------------------------------------------

        long snoozeUntil = prefs.getLong(
                "reminderSnoozeUntil",
                0L
        );

        // -----------------------------------------------------
        // STOP IF REMINDER CONDITIONS ARE NOT SATISFIED
        // -----------------------------------------------------

        if (!allowed) {

            Log.d(
                    TAG,
                    "Reminder conditions are no longer satisfied."
            );

            FloatingReminderService.cancelReminderRecheck(
                    context
            );

            // Ask the service to recheck its own conditions and
            // remove an existing overlay if necessary.
            startReminderService(context);

            return;
        }

        // -----------------------------------------------------
        // CHECK SNOOZE PERIOD
        // -----------------------------------------------------

        if (System.currentTimeMillis() < snoozeUntil) {

            Log.d(
                    TAG,
                    "Reminder is snoozed until: " + snoozeUntil
            );

            FloatingReminderService.scheduleReminderRecheck(
                    context,
                    snoozeUntil
            );

            return;
        }

        // -----------------------------------------------------
        // START FLOATING REMINDER SERVICE
        // -----------------------------------------------------

        Log.d(
                TAG,
                "Reminder conditions satisfied. Starting service."
        );

        startReminderService(context);
    }

    // =========================================================
    // START FLOATING REMINDER SERVICE
    // =========================================================

    private void startReminderService(Context context) {

        Intent serviceIntent = new Intent(
                context,
                FloatingReminderService.class
        );

        try {

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

                context.startForegroundService(
                        serviceIntent
                );

            } else {

                context.startService(
                        serviceIntent
                );
            }

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Could not start floating reminder service.",
                    e
            );
        }
    }
}
