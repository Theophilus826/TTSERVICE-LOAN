
package com.menumoney;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootCompletedReceiver extends BroadcastReceiver {

    private static final String TAG = "BootCompletedReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {

        if (context == null || intent == null) {
            return;
        }

        String action = intent.getAction();

        // ---------------------------------------------
        // ACCEPT ONLY BOOT AND APP UPDATE EVENTS
        // ---------------------------------------------

        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {

            Log.d(TAG, "Ignoring unrelated broadcast: " + action);
            return;
        }

        Log.d(TAG, "Device boot completed or MenuMoney updated.");

        final Context appContext = context.getApplicationContext();

        // Keep the receiver alive while calendar sync runs.
        final PendingResult pendingResult = goAsync();

        // ---------------------------------------------
        // 1. RESTORE FLOATING LOAN REMINDERS
        // ---------------------------------------------

        try {

            Intent restoreIntent = new Intent(
                    appContext,
                    FloatingReminderReceiver.class
            );

            restoreIntent.setAction(
                    FloatingReminderReceiver.ACTION_RESTORE
            );

            appContext.sendBroadcast(restoreIntent);

            Log.d(
                    TAG,
                    "Floating reminder restoration broadcast sent."
            );

        } catch (Exception e) {

            Log.e(
                    TAG,
                    "Floating reminder restoration failed.",
                    e
            );
        }

        // ---------------------------------------------
        // 2. RESTORE LOAN CALENDAR EVENTS
        // ---------------------------------------------

        new Thread(() -> {

            try {

                if (LoanCalendarManager.hasCalendarPermission(appContext)) {

                    LoanCalendarManager.syncFromPreferences(appContext);

                    Log.d(
                            TAG,
                            "Loan calendar synchronization completed."
                    );

                } else {

                    Log.w(
                            TAG,
                            "Calendar permission unavailable. " +
                                    "Synchronization postponed."
                    );
                }

            } catch (Exception e) {

                Log.e(
                        TAG,
                        "Loan calendar restoration failed.",
                        e
                );

            } finally {

                pendingResult.finish();
            }

        }, "MenuMoney-Boot-Restore").start();
    }
}
