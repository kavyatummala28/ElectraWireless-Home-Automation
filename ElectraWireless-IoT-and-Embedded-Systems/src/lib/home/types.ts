export type DeviceType =
  | "light"
  | "plug"
  | "ac"
  | "fan"
  | "fridge"
  | "appliance"
  | "sensor"
  | "tv"
  | "lock"
  | "vacuum"
  | "sprinkler"
  | "speaker"
  | "hub"
  | "wpt"; // wireless power transmitter

export type Role = "owner" | "family" | "guest";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  roomId: string;
  on: boolean;
  online: boolean;
  watts: number; // current draw when on
  // optional per-type state
  brightness?: number; // 0-100
  colorTemp?: number; // 2700-6500
  color?: string; // hex string for RGB
  lightMode?: "warm" | "cool" | "normal" | "rgb+"; // Added for light configuration step
  temperature?: number; // ac target C
  fanSpeed?: number; // 0-3
  mode?: string;
  output?: number; // wpt 0-100
  thermal?: number; // celsius
  assignedRoles?: Role[];
  macAddress?: string;
  ipAddress?: string;
  brand?: string;
  ecosystem?:
    // --- Existing 35 Ecosystems ---
    | "tuya" | "tplink" | "shelly" | "sonoff" | "wled" | "hue" | "govee" | "switchbot"
    | "yeelight" | "lifx" | "wiz" | "broadlink" | "magichome" | "wemo" | "nanoleaf" | "meross"
    | "ikea" | "xiaomi" | "aqara" | "lutron" | "bond" | "milight" | "august" | "sengled"
    | "somfy" | "ecobee" | "honeywell" | "nest" | "ring" | "eufy" | "wyze" | "dyson"
    | "samsung_tv" | "samsung_st" | "samsung_local" | "panasonic"
    | "homekit" | "google_cast" | "sony" | "lg_thinq" | "daikin" | "mitsubishi" | "ge_smarthq" | "bosch_homeconnect"
    // --- Community-Documented Hub Protocols ---
    | "esphome"        // ESPHome native HTTP API
    | "zigbee2mqtt"    // MQTT bridge for Zigbee devices
    | "zwave_js"       // Z-Wave JS WebSocket API
    | "homeassistant" // Home Assistant local REST API
    | "openhab"        // openHAB REST API
    | "hubitat"        // Hubitat Maker API
    | "domoticz"       // Domoticz JSON API
    | "deconz"         // deCONZ/Phoscon REST + WebSocket
    | "homematic"      // HomematicIP XML-RPC
    | "loxone"         // Loxone Miniserver WebSocket
    | "knx"            // KNX IP Tunneling
    | "fibaro"         // Fibaro HC REST API
    // --- Media & Entertainment ---
    | "kodi"           // Kodi JSON-RPC
    | "roku"           // Roku ECP (External Control Protocol)
    | "lg_tv"          // LG webOS WebSocket (ssap://)
    | "vizio"          // Vizio SmartCast local API
    | "sonos"          // Sonos UPnP SOAP
    | "denon"          // Denon/Marantz AVR HTTP
    | "yamaha"         // Yamaha MusicCast HTTP
    // --- Locks, Robots, Garden ---
    | "nuki"           // Nuki Smart Lock local HTTP
    | "roomba"         // iRobot Roomba local MQTT
    | "roborock"       // Roborock Miio (community)
    | "opensprinkler"  // OpenSprinkler REST
    | "mystrom"        // myStrom Switch HTTP
    | "fritzbox"       // Fritz!Box TR-064 UPnP SOAP
    | "fronius"        // Fronius Solar Inverter REST
    | "pihole"         // Pi-hole REST API
    // --- Matter / Thread (CSA Universal Standard) ---
    | "matter"         // Matter over WiFi/Thread (CHIP protocol, port 5540)
    | "thread"         // Thread Border Router (OpenThread, port 8080)
    | "tasmota"        // Tasmota open firmware HTTP API
    | "generic";
  cloudDeviceId?: string;  // For SmartThings / cloud-managed device IDs
  cloudToken?: string;     // For authorized cloud API integrations (PAT etc.)
  connectionType?: "direct" | "third-party" | "ble" | "wifi";
}

export interface Room {
  id: string;
  name: string;
}

export interface Automation {
  id: string;
  name: string;
  type: "time" | "condition" | "sensor" | "energy" | "presence";
  description: string;
  enabled: boolean;
}

export interface LogEntry {
  id: string;
  time: string;
  source: "manual" | "voice" | "system";
  text: string;
}

export type AccessScope = "all" | "rooms" | "devices";

export interface Member {
  id: string;
  name: string;
  role: Exclude<Role, "owner"> | "family" | "guest";
  scope: AccessScope; // all = full access, rooms = only listed rooms, devices = only listed devices
  roomIds: string[];
  deviceIds: string[];
  note?: string;
}

export type FallbackStatus = "active" | "standby" | "down";

export interface FallbackTier {
  key: string;
  label: string;
  path: string;
  scenario: string;
  status: FallbackStatus;
}

export interface HomeState {
  appMode: "demo" | "live";
  liveDevices: Device[];
  rooms: Room[];
  devices: Device[];
  automations: Automation[];
  logs: LogEntry[];
  role: Role;
  cameraEnabled: boolean;
  cameraPrivacy: boolean;
  cameraMotionAlerts: boolean;
  cameraRecording: boolean;
  fallback: FallbackTier[];
  members: Member[];
}