
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
    private static final String CONSENT_PREFS = "menumoney_floating_consent";

    @Override
    public void onReceive(Context context, Intent intent) {

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

        boolean allowed =
                prefs.getBoolean("floatingReminderEnabled", false)
                        && prefs.getBoolean("paymentDue", false)
                        && prefs.getBoolean("hasCustomerData", false)
                        && consent
                        && Settings.canDrawOverlays(context);

        long snoozeUntil =
                prefs.getLong("reminderSnoozeUntil", 0L);

        if (!allowed) {
            Log.d(TAG, "Reminder conditions are no longer satisfied.");
            return;
        }

        // If Android delivered the alarm early, schedule another check.
        if (System.currentTimeMillis() < snoozeUntil) {
            FloatingReminderService.scheduleReminderRecheck(
                    context,
                    snoozeUntil
            );
            return;
        }

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
        } catch (Exception e) {
            Log.e(TAG, "Could not restart floating reminder", e);
        }
    }
}
