
package com.menumoney;

import android.app.admin.DeviceAdminReceiver;
import android.content.Context;
import android.content.Intent;

public class LoanDeviceAdminReceiver extends DeviceAdminReceiver {

    @Override
    public CharSequence onDisableRequested(
            Context context,
            Intent intent
    ) {
        return "You are disabling optional loan reminder protection. " +
                "Your loan agreement, outstanding balance and " +
                "repayment obligations remain unchanged.";
    }

    @Override
    public void onEnabled(Context context, Intent intent) {
        super.onEnabled(context, intent);
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        super.onDisabled(context, intent);
    }
}
