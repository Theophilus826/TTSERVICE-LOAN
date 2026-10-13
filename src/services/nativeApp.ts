
import { Capacitor } from "@capacitor/core";

export function isNativeCapacitorApp(): boolean {
  return Capacitor.isNativePlatform();
}
