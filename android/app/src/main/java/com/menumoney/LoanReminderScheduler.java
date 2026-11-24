
package com.menumoney;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import java.util.Locale;

public final class LoanReminderScheduler {

    private static final String TAG = "LoanReminderScheduler";

    private static final String PREFS =
            "menumoney_loan_widget";

    public static final String ACTION_RECHECK =
            "com.menumoney.RECHECK_FLOATING_REMINDER";

    public static final long REMINDER_INTERVAL =
            24L * 60L * 60L * 1000L;

    public static final long SNOOZE_INTERVAL =
            5L * 60L * 1000L;

    private static final int ALARM_REQUEST_CODE = 7315;

    private LoanReminderScheduler() {}

    private static SharedPreferences prefs(Context context) {

        return context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );
    }

    // =====================================================
    // RECORD LATEST SUCCESSFUL TRANSACTION
    // =====================================================

    public static synchronized void recordTransaction(
            Context context,
            String transactionId,
            long transactionTime
    ) {

        if (context == null || transactionTime <= 0L) {
            return;
        }

        SharedPreferences preferences = prefs(context);

        // Prevent duplicate transaction callbacks.
        if (transactionId != null
                && !transactionId.trim().isEmpty()) {

            String lastTransactionId =
                    preferences.getString(
                            "lastReminderTransactionId",
                            ""
                    );

            if (transactionId.equals(lastTransactionId)) {

                Log.d(TAG, "Duplicate transaction ignored.");

                return;
            }
        }

        long nextReminder =
                transactionTime + REMINDER_INTERVAL;

        // New transaction replaces the previous schedule.
        preferences.edit()

                .putLong(
                        "lastLoanTransactionAt",
                        transactionTime
                )

                .putLong(
                        "nextReminderAt",
                        nextReminder
                )

                .putLong(
                        "reminderSnoozeUntil",
                        0L
                )

                .putBoolean(
                        "reminderCurrentlyShown",
                        false
                )

                .putString(
                        "lastReminderTransactionId",
                        transactionId == null ? "" : transactionId
                )

                .apply();

        // Schedule the new 24-hour deadline.
        scheduleNextWake(context);

        // Remove any previously displayed reminder.
        Intent serviceIntent = new Intent(
                context,
                FloatingReminderService.class
        );

        try {

            context.startService(
                    new Intent(context, FloatingReminderService.class)
                            .setAction("com.menumoney.REFRESH_FLOATING_APPEARANCE")
            );

        } catch (Exception e) {

            Log.w(TAG, "Service refresh deferred.", e);
        }

        Log.d(TAG, "Latest transaction recorded.");
        Log.d(TAG, "Next reminder: " + nextReminder);
    }

    // =====================================================
    // SNOOZE FOR FIVE MINUTES
    // =====================================================

    public static synchronized boolean snooze(Context context) {

        SharedPreferences preferences = prefs(context);

        long now = System.currentTimeMillis();

        long nextReminder = preferences.getLong(
                "nextReminderAt",
                0L
        );

        if (nextReminder <= 0L) {
            Log.e(TAG, "Cannot snooze without a scheduled reminder.");
            return false;
        }

        long snoozeUntil = now + SNOOZE_INTERVAL;

        boolean saved = preferences.edit()

                .putLong(
                        "reminderSnoozeUntil",
                        snoozeUntil
                )

                .putBoolean(
                        "reminderCurrentlyShown",
                        false
                )

                .commit();

        if (!saved) {
            Log.e(TAG, "Could not persist the reminder snooze.");
            return false;
        }

        scheduleNextWake(context);

        Log.d(TAG, "Reminder snoozed until: " + snoozeUntil);
        return true;
    }

    // =====================================================
    // GET NEXT ALARM TIME
    // =====================================================

    public static long getNextWakeTime(Context context) {

        SharedPreferences preferences = prefs(context);

        long nextReminder = preferences.getLong(
                "nextReminderAt",
                0L
        );

        long snoozeUntil = preferences.getLong(
                "reminderSnoozeUntil",
                0L
        );

        if (nextReminder <= 0L) {
            return 0L;
        }

        if (snoozeUntil > System.currentTimeMillis()) {
            return snoozeUntil;
        }

        return nextReminder;
    }

    // =====================================================
    // SCHEDULE ALARM
    // =====================================================

    public static void scheduleNextWake(Context context) {

        long triggerAt = getNextWakeTime(context);

        if (triggerAt <= 0L) {
            cancelAlarm(context);
            return;
        }

        AlarmManager alarmManager =
                (AlarmManager) context.getSystemService(
                        Context.ALARM_SERVICE
                );

        if (alarmManager == null) {
            return;
        }

        Intent intent = new Intent(
                context,
                FloatingReminderReceiver.class
        );

        intent.setAction(ACTION_RECHECK);

        PendingIntent pendingIntent =
                PendingIntent.getBroadcast(
                        context,
                        ALARM_REQUEST_CODE,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT
                                | PendingIntent.FLAG_IMMUTABLE
                );

        try {

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                    && !alarmManager.canScheduleExactAlarms()) {

                Log.w(
                        TAG,
                        "Exact alarm access is unavailable; Android may delay the reminder."
                );

                alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        pendingIntent
                );

            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {

                alarmManager.setExactAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        pendingIntent
                );

            } else {

                alarmManager.setExact(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        pendingIntent
                );
            }

            Log.d(TAG, "Alarm scheduled: " + triggerAt);

        } catch (SecurityException e) {

            Log.e(TAG, "Alarm permission unavailable.", e);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                alarmManager.setAndAllowWhileIdle(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        pendingIntent
                );
            } else {
                alarmManager.set(
                        AlarmManager.RTC_WAKEUP,
                        triggerAt,
                        pendingIntent
                );
            }
        }
    }

    // =====================================================
    // CANCEL ALARM
    // =====================================================

    public static void cancelAlarm(Context context) {

        AlarmManager alarmManager =
                (AlarmManager) context.getSystemService(
                        Context.ALARM_SERVICE
                );

        if (alarmManager == null) {
            return;
        }

        Intent intent = new Intent(
                context,
                FloatingReminderReceiver.class
        );

        intent.setAction(ACTION_RECHECK);

        PendingIntent pendingIntent =
                PendingIntent.getBroadcast(
                        context,
                        ALARM_REQUEST_CODE,
                        intent,
                        PendingIntent.FLAG_UPDATE_CURRENT
                                | PendingIntent.FLAG_IMMUTABLE
                );

        alarmManager.cancel(pendingIntent);
        pendingIntent.cancel();
    }

    // =====================================================
    // REMAINING TIME
    // =====================================================

    public static String formatRemaining(long targetTime) {

        long remaining = Math.max(
                0L,
                targetTime - System.currentTimeMillis()
        );

        long days = remaining / 86400000L;
        long hours = (remaining / 3600000L) % 24;
        long minutes = (remaining / 60000L) % 60;
        long seconds = (remaining / 1000L) % 60;

        if (days > 0) {

            return String.format(
                    Locale.getDefault(),
                    "%dd %02dh %02dm %02ds",
                    days,
                    hours,
                    minutes,
                    seconds
            );
        }

        return String.format(
                Locale.getDefault(),
                "%02dh %02dm %02ds",
                hours,
                minutes,
                seconds
        );
    }
}
