
import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  type Token,
} from "@capacitor/push-notifications";
import API from "./Api";

let listenersPromise: Promise<void> | null = null;
let registrationPromise: Promise<void> | null = null;

export async function initializeNativePushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  if (registrationPromise) return registrationPromise;

  registrationPromise = (async () => {
    try {
      if (!listenersPromise) {
        listenersPromise = (async () => {
          await PushNotifications.addListener(
            "registration",
            async (token: Token) => {
              console.log("Native push token received");

              try {
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
        })().catch((error) => {
          listenersPromise = null;
          throw error;
        });
      }

      await listenersPromise;

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
      console.error("Native push initialization failed:", error);
    }
  })().finally(() => {
    registrationPromise = null;
  });

  return registrationPromise;
}
