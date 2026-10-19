import { Preferences } from "@capacitor/preferences";
import API from "./Api";

const INSTALLATION_KEY = "tts_loan_installation_id";

interface HeartbeatPayload {
  installationId: string;
  appVersion: string;
}

interface HeartbeatResponse {
  success: boolean;
  lastSeenAt?: string;
}

/**
 * Gets or creates a persistent installation ID.
 * Shared by JavaScript heartbeat and native Android heartbeat.
 */
export async function getInstallationId(): Promise<string> {
  const { value } = await Preferences.get({
    key: INSTALLATION_KEY,
  });

  if (value) {
    return value;
  }

  if (
    typeof crypto === "undefined" ||
    typeof crypto.randomUUID !== "function"
  ) {
    throw new Error("UUID generation is not supported on this device");
  }

  const installationId = crypto.randomUUID();

  await Preferences.set({
    key: INSTALLATION_KEY,
    value: installationId,
  });

  return installationId;
}

/**
 * Sends an app activity heartbeat using the configured API client.
 */
export async function sendAppHeartbeat(): Promise<void> {
  const token = localStorage.getItem("token");

  if (!token?.trim()) {
    return;
  }

  const installationId = await getInstallationId();

  const payload: HeartbeatPayload = {
    installationId,
    appVersion: "unknown",
  };

  try {
    await API.post<HeartbeatResponse>(
      "/app-activity/heartbeat",
      payload,
    );
  } catch (error: unknown) {
    const status = (
      error as { response?: { status?: number } }
    )?.response?.status;

    if (status === 401) {
      // Api.ts handles unauthorized sessions.
      return;
    }

    throw error;
  }
}