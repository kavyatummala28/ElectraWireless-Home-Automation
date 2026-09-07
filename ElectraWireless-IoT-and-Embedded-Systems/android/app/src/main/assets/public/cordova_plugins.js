
  cordova.define('cordova/plugin_list', function(require, exports, module) {
    module.exports = [
      {
          "id": "cordova-plugin-android-permissions.Permissions",
          "file": "plugins/cordova-plugin-android-permissions/www/permissions.js",
          "pluginId": "cordova-plugin-android-permissions",
        "clobbers": [
          "cordova.plugins.permissions"
        ]
        },
      {
          "id": "cordova-plugin-device.device",
          "file": "plugins/cordova-plugin-device/www/device.js",
          "pluginId": "cordova-plugin-device",
        "clobbers": [
          "device"
        ]
        },
      {
          "id": "cordova-plugin-background-mode.BackgroundMode",
          "file": "plugins/cordova-plugin-background-mode/www/background-mode.js",
          "pluginId": "cordova-plugin-background-mode",
        "clobbers": [
          "cordova.plugins.backgroundMode",
          "plugin.backgroundMode"
        ]
        },
      {
          "id": "cordova-plugin-bluetooth-serial.bluetoothSerial",
          "file": "plugins/cordova-plugin-bluetooth-serial/www/bluetoothSerial.js",
          "pluginId": "cordova-plugin-bluetooth-serial",
        "clobbers": [
          "window.bluetoothSerial"
        ]
        }
    ];
    module.exports.metadata =
    // TOP OF METADATA
    {
      "cordova-plugin-android-permissions": "1.1.5",
      "cordova-plugin-background-mode": "0.7.3",
      "cordova-plugin-bluetooth-serial": "0.4.7",
      "cordova-plugin-device": "3.0.0"
    };
    // BOTTOM OF METADATA
    });
    