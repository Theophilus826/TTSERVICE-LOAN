
package com.menumoney;

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "LoanCalendar",
    permissions = {
        @Permission(
            alias = "calendar",
            strings = {
                Manifest.permission.READ_CALENDAR,
                Manifest.permission.WRITE_CALENDAR
            }
        )
    }
)
public class LoanCalendarPlugin extends Plugin {

    private static final String TAG = "LoanCalendarPlugin";
    private static final String PREFS = "menumoney_loan_widget";

    // =============================================
    // SYNCHRONIZE LOAN WITH PHONE CALENDAR
    // =============================================

    @PluginMethod
    public void syncLoan(PluginCall call) {

        try {

            SharedPreferences prefs = getContext()
                    .getSharedPreferences(
                            PREFS,
                            Context.MODE_PRIVATE
                    );

            String dueDate = call.getString("dueDate", "");
            String amount = call.getString("amount", "Payment due");
            String bankName = call.getString("bankName", "");
            String message = call.getString("message", "");
            String accountNumber = call.getString("accountNumber", "");

            boolean hasCustomerData =
                    call.getBoolean("hasCustomerData", true);

            boolean paymentDue =
                    call.getBoolean("paymentDue", true);

            if (paymentDue && (dueDate == null || dueDate.trim().isEmpty())) {

                call.reject("A valid loan repayment due date is required.");
                return;
            }

            // Save the latest loan information for boot restoration.
            prefs.edit()
                    .putBoolean("hasCustomerData", hasCustomerData)
                    .putBoolean("paymentDue", paymentDue)
                    .putString("dueDate", dueDate)
                    .putString("amount", amount)
                    .putString("bankName", bankName)
                    .putString("message", message)
                    .putString("accountNumber", accountNumber)
                    .apply();

            // Remove calendar event when loan is no longer payable.
            if (!hasCustomerData || !paymentDue) {

                if (LoanCalendarManager.hasCalendarPermission(getContext())) {

                    LoanCalendarManager.removeLoanEvent(getContext());

                    resolveResult(call, true, false, "Loan calendar event removed.");

                } else {

                    resolveResult(
                            call,
                            false,
                            true,
                            "Calendar permission required to remove the existing event."
                    );
                }

                return;
            }

            // Check calendar permissions.
            if (!LoanCalendarManager.hasCalendarPermission(getContext())) {

                resolveResult(
                        call,
                        false,
                        true,
                        "Calendar permission is required."
                );

                return;
            }

            LoanCalendarManager.syncFromPreferences(getContext());

            resolveResult(
                    call,
                    true,
                    false,
                    "Loan calendar synchronized."
            );

        } catch (Exception e) {

            Log.e(TAG, "Loan synchronization failed.", e);

            call.reject("Unable to synchronize loan calendar.", e);
        }
    }

    // =============================================
    // REQUEST CALENDAR PERMISSION
    // =============================================

    @PluginMethod
    public void requestCalendarPermission(PluginCall call) {

        if (LoanCalendarManager.hasCalendarPermission(getContext())) {

            LoanCalendarManager.syncFromPreferences(getContext());

            resolveResult(
                    call,
                    true,
                    false,
                    "Calendar permission already granted."
            );

            return;
        }

        requestPermissionForAliases(
                new String[]{"calendar"},
                call,
                "calendarPermissionCallback"
        );
    }

    @PermissionCallback
    private void calendarPermissionCallback(PluginCall call) {

        if (LoanCalendarManager.hasCalendarPermission(getContext())) {

            try {

                LoanCalendarManager.syncFromPreferences(getContext());

                resolveResult(
                        call,
                        true,
                        false,
                        "Calendar permission granted and synchronization completed."
                );

            } catch (Exception e) {

                call.reject("Calendar synchronization failed.", e);
            }

        } else {

            resolveResult(
                    call,
                    false,
                    true,
                    "Calendar permission was denied."
            );
        }
    }

    // =============================================
    // CHECK CALENDAR PERMISSION
    // =============================================

    @PluginMethod
    public void hasCalendarPermission(PluginCall call) {

        JSObject result = new JSObject();

        result.put(
                "granted",
                LoanCalendarManager.hasCalendarPermission(getContext())
        );

        call.resolve(result);
    }

    // =============================================
    // REMOVE LOAN CALENDAR EVENT
    // =============================================

    @PluginMethod
    public void removeLoan(PluginCall call) {

        try {

            SharedPreferences prefs = getContext()
                    .getSharedPreferences(
                            PREFS,
                            Context.MODE_PRIVATE
                    );

            // Retain customer information but mark payment as completed.
            prefs.edit()
                    .putBoolean("paymentDue", false)
                    .apply();

            if (!LoanCalendarManager.hasCalendarPermission(getContext())) {

                resolveResult(
                        call,
                        false,
                        true,
                        "Payment recorded locally. Calendar permission is needed to remove the event."
                );

                return;
            }

            LoanCalendarManager.removeLoanEvent(getContext());

            resolveResult(
                    call,
                    true,
                    false,
                    "Loan calendar event removed."
            );

        } catch (Exception e) {

            Log.e(TAG, "Could not remove loan event.", e);

            call.reject("Unable to remove loan calendar event.", e);
        }
    }

    // =============================================
    // COMMON RESPONSE
    // =============================================

    private void resolveResult(
            PluginCall call,
            boolean synced,
            boolean permissionRequired,
            String message
    ) {

        JSObject result = new JSObject();

        result.put("synced", synced);
        result.put("permissionRequired", permissionRequired);
        result.put("message", message);

        call.resolve(result);
    }
}
