package com.menumoney;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LoanWidgetPlugin.class);
        registerPlugin(NativeHeartbeatPlugin.class);
        super.onCreate(savedInstanceState);
    }
}