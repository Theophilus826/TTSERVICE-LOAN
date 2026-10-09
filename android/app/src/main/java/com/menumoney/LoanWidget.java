package com.menumoney;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class LoanWidget extends AppWidgetProvider {


    private static final String PREFS = "menumoney_loan_widget";

    public static void updateWidget(Context context) {
        AppWidgetManager manager =
                AppWidgetManager.getInstance(context);

        ComponentName componentName =
                new ComponentName(context, LoanWidget.class);

        int[] widgetIds =
                manager.getAppWidgetIds(componentName);

        for (int widgetId : widgetIds) {
            updateSingleWidget(context, manager, widgetId);
        }
    }

    private static void updateSingleWidget(
            Context context,
            AppWidgetManager manager,
            int widgetId
    ) {
        RemoteViews views = new RemoteViews(
                context.getPackageName(),
                R.layout.loan_widget
        );

        SharedPreferences prefs = context.getSharedPreferences(
                PREFS,
                Context.MODE_PRIVATE
        );

        boolean hasData = prefs.getBoolean("hasCustomerData", false);

        String amount = prefs.getString("amount", "—");
        String dueDate = prefs.getString("dueDate", "No payment due");
        String accountNumber = prefs.getString("accountNumber", "");
        String bankName = prefs.getString("bankName", "");
        String message = prefs.getString(
                "message",
                "Open MenuMoney to check your loan details."
        );

        views.setTextViewText(
                R.id.loan_widget_title,
                hasData ? "NEXT LOAN PAYMENT" : "MENUMONEY LOANS"
        );

        StringBuilder details = new StringBuilder();

        if (hasData) {
            details.append("Amount due: ").append(amount);
            details.append("\nDue date: ").append(dueDate);

            if (!accountNumber.isEmpty()) {
                details.append("\nAccount: ").append(accountNumber);
            }

            if (!bankName.isEmpty()) {
                details.append("\nBank: ").append(bankName);
            }

            if (!message.isEmpty()) {
                details.append("\n").append(message);
            }
        } else {
            details.append("Sign in to view your next installment and personal repayment account.");
        }

        views.setTextViewText(
                R.id.loan_widget_message,
                details.toString()
        );

        Intent intent = new Intent(context, MainActivity.class);

        PendingIntent pendingIntent = PendingIntent.getActivity(
                context,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT |
                        PendingIntent.FLAG_IMMUTABLE
        );

        views.setOnClickPendingIntent(
                R.id.loan_widget_container,
                pendingIntent
        );

        manager.updateAppWidget(widgetId, views);
    }

    @Override
    public void onUpdate(
            Context context,
            AppWidgetManager appWidgetManager,
            int[] appWidgetIds
    ) {
        for (int widgetId : appWidgetIds) {
            updateSingleWidget(context, appWidgetManager, widgetId);
        }
    }


}
