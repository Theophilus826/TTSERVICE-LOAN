import { App } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { sendAppHeartbeat } from "./AppActivity";

let listenerHandle: PluginListenerHandle | undefined;
let started = false;

/**
 * Starts monitoring app activity.
 * Sends a heartbeat immediately and whenever the app resumes.
 */
export async function startAppMonitoring(): Promise<void> {
  if (started) {
    return;
  }

  started = true;

  try {
    listenerHandle = await App.addListener(
      "appStateChange",
      ({ isActive }) => {
        if (isActive) {
          void sendAppHeartbeat().catch((error: unknown) => {
            console.warn(
              "App activity check-in failed:",
              error instanceof Error ? error.message : error,
            );
          });
        }
      },
    );

    // Send the initial heartbeat after registering the listener.
    void sendAppHeartbeat().catch((error: unknown) => {
      console.warn(
        "App activity check-in failed:",
        error instanceof Error ? error.message : error,
      );
    });
  } catch (error: unknown) {
    started = false;

    console.error(
      "Failed to start app monitoring:",
      error instanceof Error ? error.message : error,
    );

    throw error;
  }
}

/**
 * Stops JavaScript app monitoring and removes its listener.
 * This does not stop the native Android WorkManager heartbeat.
 */
export async function stopAppMonitoring(): Promise<void> {
  const handle = listenerHandle;

  listenerHandle = undefined;
  started = false;

  if (handle) {
    await handle.remove();
  }
}