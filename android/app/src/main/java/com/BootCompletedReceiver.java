
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

        // Only handle boot completion and application updates.
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action)
                && !Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {

            Log.d(TAG, "Ignoring unrelated broadcast: " + action);
            return;
        }

        Log.d(TAG, "Boot completed or MenuMoney updated.");

        final Context appContext = context.getApplicationContext();

        // =============================================
        // 1. RESTORE FLOATING LOAN REMINDERS
        // =============================================

        try {

            Intent restoreIntent = new Intent(
                    appContext,
                    FloatingReminderReceiver.class
            );

            restoreIntent.setAction(
                    FloatingReminderReceiver.ACTION_RESTORE
            );

            appContext.sendBroadcast(restoreIntent);

            Log.d(TAG, "Floating reminder restoration requested.");

        } catch (Exception e) {

            Log.e(TAG, "Floating reminder restoration failed.", e);
        }

        // =============================================
        // 2. RESTORE LOAN CALENDAR EVENT
        // =============================================

        final PendingResult pendingResult = goAsync();

        new Thread(() -> {

            try {

                if (LoanCalendarManager.hasCalendarPermission(appContext)) {

                    LoanCalendarManager.syncFromPreferences(appContext);

                    Log.d(TAG, "Loan calendar synchronization completed.");

                } else {

                    Log.w(
                            TAG,
                            "Calendar permissions unavailable. " +
                                    "Synchronization will wait until permission is granted."
                    );
                }

            } catch (Exception e) {

                Log.e(TAG, "Loan calendar restoration failed.", e);

            } finally {

                pendingResult.finish();
            }

        }, "MenuMoney-Boot-Restore").start();
    }
}
