
package com.menumoney;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativeHeartbeat")
public class NativeHeartbeatPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        AppHeartbeatScheduler.start(getContext());
        call.resolve();
    }

    @PluginMethod
    public void stop(PluginCall call) {
        AppHeartbeatScheduler.stop(getContext());
        call.resolve();
    }
}
