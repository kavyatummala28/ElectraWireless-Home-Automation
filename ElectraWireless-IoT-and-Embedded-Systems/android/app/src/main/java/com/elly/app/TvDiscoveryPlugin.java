package com.elly.app;

import android.content.Context;
import android.net.wifi.WifiManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Finds smart devices on the same Wi-Fi using SSDP (UPnP discovery) —
 * the same way TVs, speakers and casting devices announce themselves.
 * Browsers/WebViews can't send UDP, so this runs natively.
 */
@CapacitorPlugin(name = "TvDiscovery")
public class TvDiscoveryPlugin extends Plugin {

    private static final String SSDP_ADDR = "239.255.255.250";
    private static final int SSDP_PORT = 1900;

    private static final String[] SEARCH_TARGETS = {
        "ssdp:all",
        "urn:panasonic-com:device:p00RemoteController:1",
        "urn:schemas-upnp-org:device:MediaRenderer:1",
        "urn:dial-multiscreen-org:service:dial:1",
        "urn:lge-com:service:webos-second-screen:1",
        "urn:samsung.com:device:RemoteControlReceiver:1",
    };

    @PluginMethod
    public void scan(PluginCall call) {
        final int timeoutMs = call.getInt("timeoutMs", 3000);

        new Thread(() -> {
            WifiManager wifi = (WifiManager) getContext().getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            WifiManager.MulticastLock lock = null;
            DatagramSocket socket = null;
            JSArray devices = new JSArray();
            Set<String> seen = new HashSet<>();

            try {
                if (wifi != null) {
                    lock = wifi.createMulticastLock("elly-ssdp");
                    lock.setReferenceCounted(false);
                    lock.acquire();
                }

                socket = new DatagramSocket();
                socket.setSoTimeout(250);
                InetAddress group = InetAddress.getByName(SSDP_ADDR);

                // Send each search twice (UDP can drop packets)
                for (int round = 0; round < 2; round++) {
                    for (String st : SEARCH_TARGETS) {
                        String msg = "M-SEARCH * HTTP/1.1\r\n" +
                                "HOST: " + SSDP_ADDR + ":" + SSDP_PORT + "\r\n" +
                                "MAN: \"ssdp:discover\"\r\n" +
                                "MX: 2\r\n" +
                                "ST: " + st + "\r\n\r\n";
                        byte[] data = msg.getBytes(StandardCharsets.UTF_8);
                        socket.send(new DatagramPacket(data, data.length, group, SSDP_PORT));
                    }
                }

                long end = System.currentTimeMillis() + timeoutMs;
                byte[] buf = new byte[4096];

                while (System.currentTimeMillis() < end) {
                    DatagramPacket packet = new DatagramPacket(buf, buf.length);
                    try {
                        socket.receive(packet);
                    } catch (SocketTimeoutException e) {
                        continue;
                    }

                    String ip = packet.getAddress().getHostAddress();
                    String text = new String(packet.getData(), 0, packet.getLength(), StandardCharsets.UTF_8);

                    JSObject d = new JSObject();
                    d.put("ip", ip);
                    for (String line : text.split("\r\n")) {
                        int idx = line.indexOf(':');
                        if (idx <= 0) continue;
                        String key = line.substring(0, idx).trim().toLowerCase(Locale.ROOT);
                        String value = line.substring(idx + 1).trim();
                        if (key.equals("location") || key.equals("server") || key.equals("st") || key.equals("usn")) {
                            d.put(key, value);
                        }
                    }

                    String dedupeKey = ip + "|" + d.optString("location", "") + "|" + d.optString("st", "");
                    if (seen.add(dedupeKey)) devices.put(d);
                }

                JSObject result = new JSObject();
                result.put("devices", devices);
                call.resolve(result);
            } catch (Exception e) {
                call.reject("SSDP scan failed: " + e.getMessage(), e);
            } finally {
                if (socket != null) socket.close();
                if (lock != null && lock.isHeld()) lock.release();
            }
        }).start();
    }

    /** The phone's own Wi-Fi IP (used for the fallback subnet scan). */
    @PluginMethod
    public void getWifiIp(PluginCall call) {
        JSObject result = new JSObject();
        try {
            WifiManager wifi = (WifiManager) getContext().getApplicationContext()
                    .getSystemService(Context.WIFI_SERVICE);
            int ip = wifi != null ? wifi.getConnectionInfo().getIpAddress() : 0;
            if (ip != 0) {
                result.put("ip", String.format(Locale.ROOT, "%d.%d.%d.%d",
                        ip & 0xff, (ip >> 8) & 0xff, (ip >> 16) & 0xff, (ip >> 24) & 0xff));
            }
        } catch (Exception ignored) { }
        call.resolve(result);
    }
}