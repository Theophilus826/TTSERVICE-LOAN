
package com.menumoney.app;

import android.app.admin.DevicePolicyManager;
import android.content.ComponentName;
import android.content.Intent;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.JSObject;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LoanProtection")
public class LoanProtectionPlugin extends Plugin {

    private DevicePolicyManager policyManager;
    private ComponentName adminComponent;

    @Override
    public void load() {
        policyManager = (DevicePolicyManager)
            getContext().getSystemService(
                android.content.Context.DEVICE_POLICY_SERVICE
            );

        adminComponent = new ComponentName(
            getContext(),
            LoanDeviceAdminReceiver.class
        );
    }

    private boolean isAdminActive() {
        return policyManager != null &&
               policyManager.isAdminActive(adminComponent);
    }

    // 1. Request administrator activation
    @PluginMethod
    public void requestActivation(PluginCall call) {

        if (isAdminActive()) {
            JSObject result = new JSObject();
            result.put("active", true);
            call.resolve(result);
            return;
        }

        Intent intent = new Intent(
            DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN
        );

        intent.putExtra(
            DevicePolicyManager.EXTRA_DEVICE_ADMIN,
            adminComponent
        );

        intent.putExtra(
            DevicePolicyManager.EXTRA_ADD_EXPLANATION,
            "Enable an optional administrator setting for MenuMoney. " +
            "You can turn it off at any time in Android settings. " +
            "It does not prevent uninstalling, lock your phone, or enforce " +
            "loan repayment."
        );

        startActivityForResult(
            call,
            intent,
            "activationResult"
        );
    }

    // 2. Receive the result from Android
    @ActivityCallback
    private void activationResult(
        PluginCall call,
        ActivityResult result
    ) {
        if (call == null) {
            return;
        }

        JSObject response = new JSObject();
        response.put("active", isAdminActive());

        call.resolve(response);
    }

    // 3. Check administrator status
    @PluginMethod
    public void checkStatus(PluginCall call) {

        JSObject response = new JSObject();
        response.put("active", isAdminActive());

        call.resolve(response);
    }

    // 4. Voluntarily deactivate administrator protection
    @PluginMethod
    public void deactivate(PluginCall call) {

        if (isAdminActive()) {
            policyManager.removeActiveAdmin(adminComponent);
        }

        JSObject response = new JSObject();
        response.put("success", !isAdminActive());

        call.resolve(response);
    }

    // 5. Open Android security settings
    @PluginMethod
    public void openAdminSettings(PluginCall call) {

        try {
            Intent intent = new Intent(
                Settings.ACTION_SECURITY_SETTINGS
            );

            getActivity().startActivity(intent);
            call.resolve();

        } catch (Exception e) {
            call.reject(
                "Unable to open Android security settings",
                e
            );
        }
    }
}
