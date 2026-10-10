
package com.menumoney;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.IBinder;
import android.provider.Settings;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.TextView;

public class FloatingReminderService extends Service {
    private static final String PREFS = "menumoney_loan_widget";
    private static final String CONSENT_PREFS = "menumoney_floating_consent";
    private static final String CHANNEL_ID = "loan_floating_reminder";
    private static final int NOTIFICATION_ID = 7314;

    private WindowManager windowManager;
    private TextView floatingView;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        // Promote the service promptly after it starts.
        startForeground(NOTIFICATION_ID, buildNotification());

        SharedPreferences prefs =
                getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        SharedPreferences consentPrefs =
                getSharedPreferences(CONSENT_PREFS, Context.MODE_PRIVATE);

        String userId = prefs.getString("activeUserId", "");

        boolean consent = !userId.isEmpty()
                && consentPrefs.getBoolean("enabled_" + userId, false);

        boolean enabled =
                prefs.getBoolean("floatingReminderEnabled", false);
        boolean paymentDue = prefs.getBoolean("paymentDue", false);
        boolean hasCustomerData =
                prefs.getBoolean("hasCustomerData", false);

        if (!enabled || !consent || !paymentDue || !hasCustomerData
                || !Settings.canDrawOverlays(this)) {
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

        int overlayType = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
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
            android.util.Log.e(
                    "FloatingReminderService",
                    "Could not display reminder overlay",
                    e
            );
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
                .setContentText("Your floating reminder service is active.")
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
