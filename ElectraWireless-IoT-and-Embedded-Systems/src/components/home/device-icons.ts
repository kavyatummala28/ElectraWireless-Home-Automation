import {
  Lightbulb,
  Plug,
  AirVent,
  Fan,
  Refrigerator,
  CookingPot,
  Radar,
  Zap,
  Tv,
  type LucideIcon,
} from "lucide-react";
import type { DeviceType } from "@/lib/home/types";

export const deviceIcon: Record<DeviceType, LucideIcon> = {
  light: Lightbulb,
  plug: Plug,
  ac: AirVent,
  fan: Fan,
  fridge: Refrigerator,
  appliance: CookingPot,
  sensor: Radar,
  tv: Tv,
  wpt: Zap,
};

export const deviceTypeLabel: Record<DeviceType, string> = {
  light: "Lighting",
  plug: "Smart Plug",
  ac: "Air Conditioning",
  fan: "Fan",
  fridge: "Refrigerator",
  appliance: "Appliance",
  sensor: "Sensor",
  tv: "Television",
  wpt: "Wireless Power",
};
