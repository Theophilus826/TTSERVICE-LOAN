
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

import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;

import android.os.Build;
import android.os.IBinder;

import android.provider.Settings;

import android.util.Log;
import android.util.TypedValue;

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

    private static final String RECHECK_ACTION =
            "com.menumoney.RECHECK_FLOATING_REMINDER";

    private static final String ACTION_REFRESH_APPEARANCE =
            "com.menumoney.REFRESH_FLOATING_APPEARANCE";

    private WindowManager windowManager;
    private TextView floatingView;

    // =========================================================
    // ALARM MANAGEMENT
    // =========================================================

    public static void scheduleReminderRecheck(
            Context context,
            long triggerAtMillis
    ) {

        AlarmManager alarmManager =
                (AlarmManager) context.getSystemService(
                        Context.ALARM_SERVICE
                );

        if (alarmManager == null) {
            Log.e(TAG, "AlarmManager is unavailable.");
            return;
        }

        Intent intent = new Intent(
                context,
                FloatingReminderReceiver.class
        );

        intent.setAction(RECHECK_ACTION);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT |
                        PendingIntent.FLAG_IMMUTABLE
        );

        if (triggerAtMillis <= System.currentTimeMillis()) {
            triggerAtMillis = System.currentTimeMillis() + 1000L;
        }

        alarmManager.setAndAllowWhileIdle(
                AlarmManager.RTC_WAKEUP,
                triggerAtMillis,
                pendingIntent
        );

        Log.d(TAG, "Reminder recheck scheduled: " + triggerAtMillis);
    }

    public static void cancelReminderRecheck(Context context) {

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

        intent.setAction(RECHECK_ACTION);

        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                ALARM_REQUEST_CODE,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT |
                        PendingIntent.FLAG_IMMUTABLE
        );

        alarmManager.cancel(pendingIntent);
        pendingIntent.cancel();

        Log.d(TAG, "Reminder recheck cancelled.");
    }

    // =========================================================
    // REFRESH APPEARANCE
    // Call after saving new settings to SharedPreferences.
    // =========================================================

    public static void refreshAppearance(Context context) {

        Intent intent = new Intent(
                context,
                FloatingReminderService.class
        );

        intent.setAction(ACTION_REFRESH_APPEARANCE);

        try {

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent);
            } else {
                context.startService(intent);
            }

        } catch (Exception e) {

            Log.e(TAG, "Could not refresh floating reminder.", e);
        }
    }

    // =========================================================
    // SERVICE LIFECYCLE
    // =========================================================

    @Override
    public void onCreate() {

        super.onCreate();

        createNotificationChannel();

        windowManager = (WindowManager)
                getSystemService(WINDOW_SERVICE);

        Log.d(TAG, "Floating reminder service created.");
    }

    @Override
    public int onStartCommand(
            Intent intent,
            int flags,
            int startId
    ) {

        startForeground(
                NOTIFICATION_ID,
                buildNotification()
        );

        SharedPreferences prefs = getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        SharedPreferences consentPrefs = getSharedPreferences(
                CONSENT_PREFS,
                Context.MODE_PRIVATE
        );

        String userId = prefs.getString(
                "activeUserId",
                ""
        );

        boolean consent = !userId.isEmpty()
                && consentPrefs.getBoolean(
                "enabled_" + userId,
                false
        );

        boolean enabled = prefs.getBoolean(
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

        long reminderSnoozeUntil = prefs.getLong(
                "reminderSnoozeUntil",
                0L
        );

        // -----------------------------------------------------
        // CHECK COOLDOWN
        // -----------------------------------------------------

        if (System.currentTimeMillis() < reminderSnoozeUntil) {

            scheduleReminderRecheck(
                    this,
                    reminderSnoozeUntil
            );

            removeReminder();

            stopSelf(startId);

            return START_NOT_STICKY;
        }

        // -----------------------------------------------------
        // VALIDATE REMINDER REQUIREMENTS
        // -----------------------------------------------------

        if (!enabled
                || !consent
                || !paymentDue
                || !hasCustomerData
                || !Settings.canDrawOverlays(this)) {

            cancelReminderRecheck(this);

            removeReminder();

            stopSelf(startId);

            return START_NOT_STICKY;
        }

        // -----------------------------------------------------
        // DISPLAY OR REFRESH REMINDER
        // -----------------------------------------------------

        cancelReminderRecheck(this);

        showReminder(prefs);

        return START_NOT_STICKY;
    }

    // =========================================================
    // FLOATING REMINDER DISPLAY
    // =========================================================

    private void showReminder(SharedPreferences prefs) {

        removeReminder();

        // -----------------------------------------------------
        // CUSTOMER REPAYMENT INFORMATION
        // -----------------------------------------------------

        String amount = prefs.getString(
                "amount",
                "Payment due"
        );

        String dueDate = prefs.getString(
                "dueDate",
                ""
        );

        String bankName = prefs.getString(
                "bankName",
                ""
        );

        String accountNumber = prefs.getString(
                "accountNumber",
                ""
        );

        String message = prefs.getString(
                "message",
                ""
        );

        // -----------------------------------------------------
        // ACCOUNT NUMBER DISPLAY OPTION
        // -----------------------------------------------------

        boolean maskAccountNumber = prefs.getBoolean(
                "maskReminderAccountNumber",
                false
        );

        if (maskAccountNumber && !accountNumber.isEmpty()) {
            accountNumber = maskAccount(accountNumber);
        }

        // -----------------------------------------------------
        // BUILD REMINDER CONTENT
        // -----------------------------------------------------

        StringBuilder reminderContent = new StringBuilder();

        reminderContent.append("LOAN PAYMENT REMINDER\n\n");

        reminderContent.append("Amount Due: ")
                .append(amount);

        if (!dueDate.isEmpty()) {
            reminderContent.append("\nDue Date: ")
                    .append(dueDate);
        }

        if (!bankName.isEmpty()) {
            reminderContent.append("\nBank: ")
                    .append(bankName);
        }

        if (!accountNumber.isEmpty()) {
            reminderContent.append("\nAccount Number: ")
                    .append(accountNumber);
        }

        if (!message.isEmpty()) {
            reminderContent.append("\n\n")
                    .append(message);
        }

        reminderContent.append("\n\nOpen MenuMoney for details");

        // -----------------------------------------------------
        // ADMIN-CONTROLLED APPEARANCE SETTINGS
        // -----------------------------------------------------

        int widthDp = prefs.getInt(
                "reminderWidth",
                320
        );

        int horizontalPaddingDp = prefs.getInt(
                "reminderHorizontalPadding",
                20
        );

        int verticalPaddingDp = prefs.getInt(
                "reminderVerticalPadding",
                16
        );

        int cornerRadiusDp = prefs.getInt(
                "reminderCornerRadius",
                18
        );

        int positionYDp = prefs.getInt(
                "reminderPositionY",
                100
        );

        float textSize = prefs.getFloat(
                "reminderTextSize",
                14f
        );

        // -----------------------------------------------------
        // BACKGROUND COLOUR
        // -----------------------------------------------------

        String backgroundHex = prefs.getString(
                "reminderBackgroundHex",
                "#173B68"
        );

        int backgroundColor;

        try {

            backgroundColor = Color.parseColor(backgroundHex);

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Invalid reminder background colour: " + backgroundHex,
                    e
            );

            backgroundColor = Color.rgb(23, 59, 104);
        }

        // -----------------------------------------------------
        // TEXT COLOUR
        // Supports HEX strings and old integer preferences.
        // -----------------------------------------------------

        int textColor = getReminderTextColor(prefs);

        // -----------------------------------------------------
        // VALIDATE APPEARANCE VALUES
        // Keep these limits aligned with backend validation.
        // -----------------------------------------------------

        widthDp = Math.max(200, Math.min(widthDp, 600));

        horizontalPaddingDp = Math.max(
                0,
                Math.min(horizontalPaddingDp, 60)
        );

        verticalPaddingDp = Math.max(
                0,
                Math.min(verticalPaddingDp, 60)
        );

        cornerRadiusDp = Math.max(
                0,
                Math.min(cornerRadiusDp, 50)
        );

        positionYDp = Math.max(
                0,
                Math.min(positionYDp, 2000)
        );

        textSize = Math.max(
                10f,
                Math.min(textSize, 30f)
        );

        // -----------------------------------------------------
        // CONVERT DP TO PIXELS
        // -----------------------------------------------------

        int widthPx = dpToPx(widthDp);

        int horizontalPaddingPx = dpToPx(
                horizontalPaddingDp
        );

        int verticalPaddingPx = dpToPx(
                verticalPaddingDp
        );

        int cornerRadiusPx = dpToPx(
                cornerRadiusDp
        );

        // -----------------------------------------------------
        // CREATE REMINDER VIEW
        // -----------------------------------------------------

        floatingView = new TextView(this);

        floatingView.setText(
                reminderContent.toString()
        );

        floatingView.setTextColor(textColor);

        floatingView.setTextSize(
                TypedValue.COMPLEX_UNIT_SP,
                textSize
        );

        floatingView.setPadding(
                horizontalPaddingPx,
                verticalPaddingPx,
                horizontalPaddingPx,
                verticalPaddingPx
        );

        floatingView.setGravity(
                Gravity.CENTER_VERTICAL
        );

        floatingView.setMaxWidth(widthPx);

        floatingView.setElevation(
                dpToPx(8)
        );

        // -----------------------------------------------------
        // ROUNDED BACKGROUND
        // -----------------------------------------------------

        GradientDrawable background = new GradientDrawable();

        background.setColor(backgroundColor);

        background.setCornerRadius(
                cornerRadiusPx
        );

        floatingView.setBackground(background);

        // -----------------------------------------------------
        // OVERLAY WINDOW PARAMETERS
        // -----------------------------------------------------

        int overlayType;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            overlayType =
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;

        } else {

            overlayType =
                    WindowManager.LayoutParams.TYPE_PHONE;
        }

        WindowManager.LayoutParams params =
                new WindowManager.LayoutParams(

                        widthPx,

                        WindowManager.LayoutParams.WRAP_CONTENT,

                        overlayType,

                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,

                        PixelFormat.TRANSLUCENT
                );

        params.gravity =
                Gravity.TOP | Gravity.CENTER_HORIZONTAL;

        params.y = dpToPx(positionYDp);

        // -----------------------------------------------------
        // ADD OVERLAY TO SCREEN
        // -----------------------------------------------------

        try {

            if (windowManager != null) {

                windowManager.addView(
                        floatingView,
                        params
                );

                Log.d(
                        TAG,
                        "Floating reminder displayed successfully."
                );

                Log.d(
                        TAG,
                        "Background: " + backgroundHex
                );

                Log.d(
                        TAG,
                        "Width: " + widthDp + "dp"
                );

                Log.d(
                        TAG,
                        "Text size: " + textSize + "sp"
                );

                Log.d(
                        TAG,
                        "Account details included: "
                                + !accountNumber.isEmpty()
                );
            }

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Could not display reminder overlay.",
                    e
            );

            floatingView = null;

            stopSelf();
        }
    }

    // =========================================================
    // READ TEXT COLOUR
    // =========================================================

    private int getReminderTextColor(SharedPreferences prefs) {

        Object storedValue = prefs.getAll().get(
                "reminderTextColor"
        );

        if (storedValue instanceof String) {

            try {

                return Color.parseColor((String) storedValue);

            } catch (IllegalArgumentException e) {

                Log.e(
                        TAG,
                        "Invalid reminder text colour.",
                        e
                );
            }
        }

        // Backward compatibility with previous integer values.
        if (storedValue instanceof Integer) {
            return (Integer) storedValue;
        }

        return Color.WHITE;
    }

    // =========================================================
    // MASK ACCOUNT NUMBER
    // =========================================================

    private String maskAccount(String accountNumber) {

        String digits = accountNumber.replaceAll(
                "[^0-9]",
                ""
        );

        if (digits.length() <= 4) {
            return "****";
        }

        return "****" +
                digits.substring(digits.length() - 4);
    }

    // =========================================================
    // DISPLAY UTILITIES
    // =========================================================

    private int dpToPx(float dp) {

        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                dp,
                getResources().getDisplayMetrics()
        );
    }

    // =========================================================
    // FOREGROUND NOTIFICATION
    // =========================================================

    private Notification buildNotification() {

        Notification.Builder builder;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            builder = new Notification.Builder(
                    this,
                    CHANNEL_ID
            );

        } else {

            builder = new Notification.Builder(this);
        }

        int smallIcon = getApplicationInfo().icon;

        if (smallIcon == 0) {
            smallIcon = android.R.drawable.ic_dialog_info;
        }

        return builder
                .setContentTitle("MenuMoney loan reminder")
                .setContentText(
                        "Your floating loan reminder is active."
                )
                .setSmallIcon(smallIcon)
                .setOngoing(true)
                .build();
    }

    // =========================================================
    // NOTIFICATION CHANNEL
    // =========================================================

    private void createNotificationChannel() {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            NotificationChannel channel =
                    new NotificationChannel(
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

    // =========================================================
    // REMOVE FLOATING REMINDER
    // =========================================================

    private void removeReminder() {

        if (floatingView != null && windowManager != null) {

            try {

                windowManager.removeView(floatingView);

            } catch (Exception e) {

                Log.w(
                        TAG,
                        "Could not remove previous reminder view.",
                        e
                );
            }

            floatingView = null;
        }
    }

    // =========================================================
    // SERVICE CLEANUP
    // =========================================================

    @Override
    public void onDestroy() {

        removeReminder();

        Log.d(
                TAG,
                "Floating reminder service destroyed."
        );

        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
