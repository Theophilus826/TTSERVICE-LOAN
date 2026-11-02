
package com.menumoney;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.TextView;

public class FloatingReminderService extends Service {

    private static final String TAG = "FloatingReminderService";

    private static final String PREFS = "menumoney_loan_widget";
    private static final String CONSENT_PREFS = "menumoney_floating_consent";

    private static final String CHANNEL_ID = "loan_floating_reminder";
    private static final int NOTIFICATION_ID = 7314;
    private static final int ALARM_REQUEST_CODE = 7315;

    private WindowManager windowManager;
    private TextView floatingView;

    /**
     * Schedule a recheck for the end of the 24-hour cooldown.
     */
    public static void scheduleReminderRecheck(
            Context context,
            long triggerAtMillis
    ) {
        AlarmManager alarmManager =
                (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager is unavailable.");
            return;
        }

        Intent intent = new Intent(
                context,
                FloatingReminderReceiver.class
        );

        intent.setAction("com.menumoney.RECHECK_FLOATING_REMINDER");

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT
                        | PendingIntent.FLAG_IMMUTABLE
        );

        if (triggerAtMillis <= System.currentTimeMillis()) {
            triggerAtMillis = System.currentTimeMillis() + 1000L;
        }

        // Inexact while-idle alarm: Android may delay delivery.
        alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAtMillis,
                pendingIntent
        );

        Log.d(TAG, "Reminder recheck scheduled for: " + triggerAtMillis);
    }

    /**
     * Cancel any previously scheduled reminder recheck.
     */
    public static void cancelReminderRecheck(Context context) {
        AlarmManager alarmManager =
                (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);

        if (alarmManager == null) return;

        Intent intent = new Intent(
                context,
                FloatingReminderReceiver.class
        );

        intent.setAction("com.menumoney.RECHECK_FLOATING_REMINDER");

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT
                        | PendingIntent.FLAG_IMMUTABLE
        );

        alarmManager.cancel(pendingIntent);
        pendingIntent.cancel();
    }

    @Override
    public void onCreate() {
        super.onCreate();

        createNotificationChannel();

        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {

        // Start foreground immediately.
        startForeground(NOTIFICATION_ID, buildNotification());

        SharedPreferences prefs = getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        SharedPreferences consentPrefs = getSharedPreferences(
                CONSENT_PREFS,
                Context.MODE_PRIVATE
        );

        String userId = prefs.getString("activeUserId", "");

        boolean consent = !userId.isEmpty()
                && consentPrefs.getBoolean("enabled_" + userId, false);

        boolean enabled =
                prefs.getBoolean("floatingReminderEnabled", false);

        boolean paymentDue =
                prefs.getBoolean("paymentDue", false);

        boolean hasCustomerData =
                prefs.getBoolean("hasCustomerData", false);

        long reminderSnoozeUntil =
                prefs.getLong("reminderSnoozeUntil", 0L);

        // If a payment was made, wait until the cooldown expires.
        if (System.currentTimeMillis() < reminderSnoozeUntil) {

            scheduleReminderRecheck(this, reminderSnoozeUntil);

            stopSelf();

            return START_NOT_STICKY;
        }

        // Do not show the reminder if any requirement is missing.
        if (!enabled
                || !consent
                || !paymentDue
                || !hasCustomerData
                || !Settings.canDrawOverlays(this)) {

            cancelReminderRecheck(this);
            stopSelf();

            return START_NOT_STICKY;
        }

        showReminder(prefs);

        return START_NOT_STICKY;
    }

    private void showReminder(SharedPreferences prefs) {

        removeReminder();

        String amount = prefs.getString("amount", "Payment due");
        String dueDate = prefs.getString("dueDate", "");

        floatingView = new TextView(this);

        floatingView.setText(
                "LOAN PAYMENT REMINDER\n"
                        + amount
                        + (dueDate.isEmpty() ? "" : "\nDue: " + dueDate)
                        + "\nOpen MenuMoney for details"
        );

        floatingView.setTextColor(0xFFFFFFFF);
        floatingView.setTextSize(14);
        floatingView.setPadding(28, 22, 28, 22);
        floatingView.setBackgroundColor(0xFF173B68);
        floatingView.setElevation(8);

        int overlayType =
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                        ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                        : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params =
                new WindowManager.LayoutParams(
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        WindowManager.LayoutParams.WRAP_CONTENT,
                        overlayType,
                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                        PixelFormat.TRANSLUCENT
                );

        params.gravity = Gravity.TOP | Gravity.CENTER_HORIZONTAL;
        params.y = 100;

        try {
            windowManager.addView(floatingView, params);

        } catch (Exception e) {
            Log.e(TAG, "Could not display reminder overlay", e);

            floatingView = null;
            stopSelf();
        }
    }

    private Notification buildNotification() {

        Notification.Builder builder;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }

        return builder
                .setContentTitle("MenuMoney loan reminder")
                .setContentText("Your floating loan reminder is active.")
                .setSmallIcon(getApplicationInfo().icon)
                .setOngoing(true)
                .build();
    }

    private void createNotificationChannel() {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Floating loan reminder",
                    NotificationManager.IMPORTANCE_LOW
            );

            NotificationManager manager =
                    getSystemService(NotificationManager.class);

            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void removeReminder() {

        if (floatingView != null && windowManager != null) {

            try {
                windowManager.removeView(floatingView);
            } catch (Exception ignored) {
            }

            floatingView = null;
        }
    }

    @Override
    public void onDestroy() {
        removeReminder();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
