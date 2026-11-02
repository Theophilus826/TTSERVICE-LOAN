package com.menumoney;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LoanWidgetPlugin.class);
        registerPlugin(NativeHeartbeatPlugin.class);
        registerPlugin(OverlayPermissionPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @CapacitorPlugin(name = "OverlayPermission")
    public static class OverlayPermissionPlugin extends Plugin {

        @PluginMethod
        public void checkPermission(PluginCall call) {
            boolean granted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                    || Settings.canDrawOverlays(getContext());

            JSObject result = new JSObject();
            result.put("granted", granted);
            call.resolve(result);
        }

        @PluginMethod
        public void requestPermission(PluginCall call) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                    && !Settings.canDrawOverlays(getContext())) {

                Intent intent = new Intent(
                        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName())
                );

                getActivity().startActivity(intent);
            }

            call.resolve();
        }
    }
}