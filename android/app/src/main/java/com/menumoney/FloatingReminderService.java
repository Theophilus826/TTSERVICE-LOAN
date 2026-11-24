
package com.menumoney;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.TextView;
import android.widget.Button;
import android.widget.LinearLayout;

public class FloatingReminderService extends Service {

    private static final String TAG =
            "FloatingReminderService";

    private static final String PREFS =
            "menumoney_loan_widget";

    private static final String CONSENT_PREFS =
            "menumoney_floating_consent";

    private static final String CHANNEL_ID =
            "loan_floating_reminder";

    private static final int NOTIFICATION_ID = 7314;

    private static final String ACTION_REFRESH_APPEARANCE =
            "com.menumoney.REFRESH_FLOATING_APPEARANCE";

    private WindowManager windowManager;

    private LinearLayout floatingContainer;

    private TextView floatingView;

    private TextView countdownView;

    private final Handler countdownHandler =
            new Handler(Looper.getMainLooper());

    private Runnable countdownRunnable;

    // =====================================================
    // ALARM MANAGEMENT
    // =====================================================

    public static void cancelReminderRecheck(
            Context context
    ) {

        LoanReminderScheduler.cancelAlarm(context);
    }

    // =====================================================
    // REFRESH APPEARANCE
    // =====================================================

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

            Log.e(
                    TAG,
                    "Could not refresh floating reminder.",
                    e
            );
        }
    }

    // =====================================================
    // SERVICE LIFECYCLE
    // =====================================================

    @Override
    public void onCreate() {

        super.onCreate();

        createNotificationChannel();

        windowManager = (WindowManager)
                getSystemService(WINDOW_SERVICE);

        Log.d(TAG, "Floating reminder service created.");
    }

    // =====================================================
    // SERVICE START
    // =====================================================

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

        // =================================================
        // USER CONSENT
        // =================================================

        String userId = prefs.getString(
                "activeUserId",
                ""
        );

        boolean consent = !userId.isEmpty()
                && consentPrefs.getBoolean(
                        "enabled_" + userId,
                        false
                );

        // =================================================
        // REMINDER SETTINGS
        // =================================================

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

        boolean overlayPermission =
                Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                        || Settings.canDrawOverlays(this);

        // =================================================
        // VALIDATE REMINDER REQUIREMENTS
        // =================================================

        if (!enabled
                || !consent
                || !paymentDue
                || !hasCustomerData
                || !overlayPermission) {

            Log.d(
                    TAG,
                    "Reminder requirements not satisfied."
            );

            cancelReminderRecheck(this);

            removeReminder();

            stopSelf(startId);

            return START_NOT_STICKY;
        }

        // =================================================
        // READ SAVED SCHEDULE
        // =================================================

        long now = System.currentTimeMillis();

        long nextReminder = prefs.getLong(
                "nextReminderAt",
                0L
        );

        long snoozeUntil = prefs.getLong(
                "reminderSnoozeUntil",
                0L
        );

        boolean currentlyShown = prefs.getBoolean(
                "reminderCurrentlyShown",
                false
        );

        // =================================================
        // REQUIRE A VALID TRANSACTION SCHEDULE
        // =================================================

        if (nextReminder <= 0L) {

            Log.d(
                    TAG,
                    "No transaction reminder schedule exists."
            );

            removeReminder();

            cancelReminderRecheck(this);

            stopSelf(startId);

            return START_NOT_STICKY;
        }

        // =================================================
        // ACTIVE SNOOZE
        // =================================================

        if (snoozeUntil > now) {

            Log.d(
                    TAG,
                    "Reminder snoozed until: " + snoozeUntil
            );

            removeReminder();

            LoanReminderScheduler.scheduleNextWake(this);

            stopSelf(startId);

            return START_NOT_STICKY;
        }

        // =================================================
        // SNOOZE EXPIRED
        // =================================================

        if (snoozeUntil > 0L && snoozeUntil <= now) {

            Log.d(TAG, "Five-minute snooze expired.");

            prefs.edit()

                    .putLong(
                            "reminderSnoozeUntil",
                            0L
                    )

                    .putBoolean(
                            "reminderCurrentlyShown",
                            true
                    )

                    .apply();

            currentlyShown = true;
        }

        // =================================================
        // 24-HOUR REMINDER DEADLINE
        // =================================================

        if (now >= nextReminder) {

            Log.d(TAG, "24-hour reminder deadline reached.");

            long elapsedIntervals =
                    (now - nextReminder)
                            / LoanReminderScheduler.REMINDER_INTERVAL
                            + 1L;
            nextReminder += elapsedIntervals
                    * LoanReminderScheduler.REMINDER_INTERVAL;

            prefs.edit()

                    .putLong(
                            "nextReminderAt",
                            nextReminder
                    )

                    .putBoolean(
                            "reminderCurrentlyShown",
                            true
                    )

                    .apply();

            currentlyShown = true;
        }

        // =================================================
        // BEFORE THE NEXT REMINDER
        // =================================================

        if (!currentlyShown) {

            Log.d(
                    TAG,
                    "Next reminder has not reached its deadline."
            );

            removeReminder();

            LoanReminderScheduler.scheduleNextWake(this);

            stopSelf(startId);

            return START_NOT_STICKY;
        }

        // =================================================
        // SHOW REMINDER
        // =================================================

        LoanReminderScheduler.scheduleNextWake(this);

        showReminder(prefs);

        return START_NOT_STICKY;
    }

    // =====================================================
    // FLOATING REMINDER DISPLAY
    // =====================================================

    private void showReminder(SharedPreferences prefs) {

        removeReminder();

        // =================================================
        // CUSTOMER INFORMATION
        // =================================================

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

        // =================================================
        // MASK ACCOUNT NUMBER
        // =================================================

        boolean maskAccountNumber = prefs.getBoolean(
                "maskReminderAccountNumber",
                false
        );

        if (maskAccountNumber && !accountNumber.isEmpty()) {

            accountNumber = maskAccount(accountNumber);
        }

        // =================================================
        // BUILD REMINDER CONTENT
        // =================================================

        StringBuilder reminderContent = new StringBuilder();

        reminderContent.append(
                "LOAN PAYMENT REMINDER\n\n"
        );

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

        reminderContent.append(
                "\n\nOpen MenuMoney for details"
        );

        // =================================================
        // APPEARANCE SETTINGS
        // =================================================

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

        // =================================================
        // BACKGROUND COLOUR
        // =================================================

        String backgroundHex = prefs.getString(
                "reminderBackgroundHex",
                "#173B68"
        );

        int backgroundColor;

        try {

            backgroundColor = Color.parseColor(
                    backgroundHex
            );

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Invalid background colour.",
                    e
            );

            backgroundColor = Color.rgb(
                    23,
                    59,
                    104
            );
        }

        // =================================================
        // TEXT COLOUR
        // =================================================

        int textColor = getReminderTextColor(prefs);

        // =================================================
        // VALIDATE APPEARANCE
        // =================================================

        widthDp = Math.max(
                200,
                Math.min(widthDp, 600)
        );

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

        // =================================================
        // DP TO PIXELS
        // =================================================

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

        // =================================================
        // CREATE CONTAINER
        // =================================================

        floatingContainer = new LinearLayout(this);

        floatingContainer.setOrientation(
                LinearLayout.VERTICAL
        );

        // =================================================
        // MAIN REMINDER TEXT
        // =================================================

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

        // =================================================
        // CONTAINER BACKGROUND
        // =================================================

        GradientDrawable background =
                new GradientDrawable();

        background.setColor(backgroundColor);

        background.setCornerRadius(
                cornerRadiusPx
        );

        floatingContainer.setBackground(background);

        // =================================================
        // ADD MAIN TEXT
        // =================================================

        floatingContainer.addView(
                floatingView,
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                )
        );

        // =================================================
        // COUNTDOWN DISPLAY
        // =================================================

        countdownView = new TextView(this);

        countdownView.setTextColor(textColor);

        countdownView.setTextSize(
                TypedValue.COMPLEX_UNIT_SP,
                13f
        );

        countdownView.setPadding(
                horizontalPaddingPx,
                dpToPx(5),
                horizontalPaddingPx,
                dpToPx(12)
        );

        floatingContainer.addView(
                countdownView,
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                )
        );

        // =================================================
        // OPEN BUTTON
        // =================================================

        Button openButton = new Button(this);

        openButton.setText("OPEN");

        openButton.setAllCaps(true);

        openButton.setBackgroundTintList(
                ColorStateList.valueOf(Color.WHITE)
        );

        openButton.setTextColor(
                Color.rgb(23, 59, 104)
        );

        openButton.setOnClickListener(v -> {

            Intent openIntent = new Intent(
                    FloatingReminderService.this,
                    MainActivity.class
            );

            openIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK
                            | Intent.FLAG_ACTIVITY_CLEAR_TOP
            );

            startActivity(openIntent);
        });

        floatingContainer.addView(
                openButton,
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                )
        );

        // =================================================
        // SNOOZE BUTTON
        // =================================================

        Button snoozeButton = new Button(this);

        snoozeButton.setText("SNOOZE 5 MINUTES");

        snoozeButton.setAllCaps(true);

        snoozeButton.setBackgroundTintList(
                ColorStateList.valueOf(
                        Color.rgb(45, 110, 170)
                )
        );

        snoozeButton.setTextColor(Color.WHITE);

        snoozeButton.setOnClickListener(v -> {

            Log.d(TAG, "User selected five-minute snooze.");

            boolean snoozed = LoanReminderScheduler.snooze(
                    FloatingReminderService.this
            );

            if (!snoozed) {
                Log.e(TAG, "Reminder snooze could not be scheduled.");
                return;
            }

            removeReminder();

            stopSelf();
        });

        floatingContainer.addView(
                snoozeButton,
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                )
        );

        // =================================================
        // ELEVATION
        // =================================================

        floatingContainer.setElevation(
                dpToPx(8)
        );

        // =================================================
        // OVERLAY TYPE
        // =================================================

        int overlayType;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            overlayType =
                    WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY;

        } else {

            overlayType =
                    WindowManager.LayoutParams.TYPE_PHONE;
        }

        // =================================================
        // OVERLAY PARAMETERS
        // =================================================

        WindowManager.LayoutParams params =
                new WindowManager.LayoutParams(

                        widthPx,

                        WindowManager.LayoutParams.WRAP_CONTENT,

                        overlayType,

                        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE
                                | WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,

                        PixelFormat.TRANSLUCENT
                );

        params.gravity =
                Gravity.TOP | Gravity.CENTER_HORIZONTAL;

        params.y = dpToPx(positionYDp);

        // =================================================
        // DISPLAY OVERLAY
        // =================================================

        try {

            if (windowManager != null
                    && Settings.canDrawOverlays(this)) {

                windowManager.addView(
                        floatingContainer,
                        params
                );

                Log.d(
                        TAG,
                        "Floating reminder displayed."
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

                // Start live countdown.
                startCountdown();

            } else {

                Log.w(
                        TAG,
                        "Overlay permission unavailable."
                );

                removeReminder();

                stopSelf();
            }

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Could not display reminder overlay.",
                    e
            );

            removeReminder();

            stopSelf();
        }
    }

    // =====================================================
    // LIVE COUNTDOWN
    // =====================================================

    private void startCountdown() {

        stopCountdown();

        countdownRunnable = new Runnable() {

            @Override
            public void run() {

                if (countdownView == null) {
                    return;
                }

                SharedPreferences prefs =
                        getSharedPreferences(
                                PREFS,
                                Context.MODE_PRIVATE
                        );

                long nextReminder = prefs.getLong(
                        "nextReminderAt",
                        0L
                );

                long snoozeUntil = prefs.getLong(
                        "reminderSnoozeUntil",
                        0L
                );

                long now = System.currentTimeMillis();

                if (snoozeUntil > now) {

                    countdownView.setText(
                            "Reminder snoozed. Reappears in: "
                                    + LoanReminderScheduler.formatRemaining(
                                            snoozeUntil
                                    )
                    );

                } else {

                    countdownView.setText(
                            "Next scheduled reminder in: "
                                    + LoanReminderScheduler.formatRemaining(
                                            nextReminder
                                    )
                    );
                }

                countdownHandler.postDelayed(
                        this,
                        1000L
                );
            }
        };

        countdownHandler.post(countdownRunnable);
    }

    private void stopCountdown() {

        if (countdownRunnable != null) {

            countdownHandler.removeCallbacks(
                    countdownRunnable
            );

            countdownRunnable = null;
        }
    }

    // =====================================================
    // READ TEXT COLOUR
    // =====================================================

    private int getReminderTextColor(
            SharedPreferences prefs
    ) {

        Object storedValue = prefs.getAll().get(
                "reminderTextColor"
        );

        if (storedValue instanceof String) {

            try {

                return Color.parseColor(
                        (String) storedValue
                );

            } catch (IllegalArgumentException e) {

                Log.e(
                        TAG,
                        "Invalid reminder text colour.",
                        e
                );
            }
        }

        if (storedValue instanceof Integer) {

            return (Integer) storedValue;
        }

        return Color.WHITE;
    }

    // =====================================================
    // MASK ACCOUNT NUMBER
    // =====================================================

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

    // =====================================================
    // DP TO PIXELS
    // =====================================================

    private int dpToPx(float dp) {

        return (int) TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP,
                dp,
                getResources().getDisplayMetrics()
        );
    }

    // =====================================================
    // FOREGROUND NOTIFICATION
    // =====================================================

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

            smallIcon =
                    android.R.drawable.ic_dialog_info;
        }

        return builder

                .setContentTitle(
                        "MenuMoney loan reminder"
                )

                .setContentText(
                        "Your floating loan reminder is active."
                )

                .setSmallIcon(smallIcon)

                .setOngoing(true)

                .build();
    }

    // =====================================================
    // NOTIFICATION CHANNEL
    // =====================================================

    private void createNotificationChannel() {

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {

            NotificationChannel channel =
                    new NotificationChannel(
                            CHANNEL_ID,
                            "Floating loan reminder",
                            NotificationManager.IMPORTANCE_LOW
                    );

            NotificationManager manager =
                    getSystemService(
                            NotificationManager.class
                    );

            if (manager != null) {

                manager.createNotificationChannel(channel);
            }
        }
    }

    // =====================================================
    // REMOVE FLOATING REMINDER
    // =====================================================

    private void removeReminder() {

        stopCountdown();

        if (floatingContainer != null
                && windowManager != null) {

            try {

                if (floatingContainer.isAttachedToWindow()) {

                    windowManager.removeView(
                            floatingContainer
                    );
                }

            } catch (Exception e) {

                Log.w(
                        TAG,
                        "Could not remove previous reminder view.",
                        e
                );
            }
        }

        floatingContainer = null;

        floatingView = null;

        countdownView = null;
    }

    // =====================================================
    // SERVICE DESTROY
    // =====================================================

    @Override
    public void onDestroy() {

        removeReminder();

        Log.d(
                TAG,
                "Floating reminder service destroyed."
        );

        super.onDestroy();
    }

    // =====================================================
    // BIND
    // =====================================================

    @Override
    public IBinder onBind(Intent intent) {

        return null;
    }
}
