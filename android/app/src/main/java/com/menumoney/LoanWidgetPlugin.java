package com.menumoney;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LoanWidget")
public class LoanWidgetPlugin extends Plugin {


private static final String PREFS = "menumoney_loan_widget";

@PluginMethod
public void updateData(PluginCall call) {
    String amount = call.getString("amount", "—");

    String dueDate = call.getString("dueDate", "No payment due");
    String accountNumber = call.getString("accountNumber", "");
    String bankName = call.getString("bankName", "");
    String message = call.getString(
        "message",
        "Check your next loan installment and repayment details."
    );

    Context context = getContext();

    SharedPreferences prefs = context.getSharedPreferences(
        PREFS,
        Context.MODE_PRIVATE
    );

    boolean saved = prefs.edit()
        .putString("amount", amount)
        .putString("dueDate", dueDate)
        .putString("accountNumber", accountNumber)
        .putString("bankName", bankName)
        .putString("message", message)
        .putBoolean("hasCustomerData", true)
        .commit();

    if (!saved) {
        call.reject("Could not save widget data.");
        return;
    }

    LoanWidget.updateWidget(context);
    call.resolve(new JSObject().put("success", true));
}

@PluginMethod
public void clearData(PluginCall call) {
    Context context = getContext();

    SharedPreferences prefs = context.getSharedPreferences(
        PREFS,
        Context.MODE_PRIVATE
    );

    boolean cleared = prefs.edit().clear().commit();

    if (!cleared) {
        call.reject("Could not clear widget data.");
        return;
    }

    LoanWidget.updateWidget(context);
    call.resolve(new JSObject().put("success", true));
}


}

