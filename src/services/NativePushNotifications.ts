
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type Token,
} from "@capacitor/push-notifications";
import API from "./Api";

let initialized = false;

export async function initializeNativePushNotifications() {
  if (!Capacitor.isNativePlatform() || initialized) return;

  initialized = true;

  try {
    await PushNotifications.addListener(
      "registration",
      async (token: Token) => {
        console.log("Native push token received");

        try {
          // Implement this endpoint in your backend.
          await API.post("/notifications/register-device", {
            token: token.value,
            platform: Capacitor.getPlatform(),
          });
        } catch (error) {
          console.error("Failed to save push token:", error);
        }
      },
    );

    await PushNotifications.addListener(
      "registrationError",
      (error) => {
        console.error("Push registration failed:", error);
      },
    );

    await PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("Push received in foreground:", notification);
      },
    );

    await PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        console.log("Notification opened:", action.notification);
      },
    );

    let permission = await PushNotifications.checkPermissions();

    if (permission.receive !== "granted") {
      permission = await PushNotifications.requestPermissions();
    }

    if (permission.receive !== "granted") {
      console.error("Push notification permission denied");
      return;
    }

    await PushNotifications.register();
  } catch (error) {
    initialized = false;
    console.error("Native push initialization failed:", error);
  }
}
