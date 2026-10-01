package com.elly.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register local plugins BEFORE super.onCreate
        registerPlugin(TvDiscoveryPlugin.class);
        super.onCreate(savedInstanceState);
    }
}