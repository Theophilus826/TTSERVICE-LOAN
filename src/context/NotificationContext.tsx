import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import API from "../services/Api";
import type { AppNotification } from "../services/NotificationService";

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

const NotificationContext =
  createContext<NotificationContextValue | undefined>(
    undefined,
  );

const getNotificationStreamUrl = (): string => {
  const baseUrl =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api";

  return `${baseUrl.replace(/\/+$/, "")}/notifications/stream`;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({
  children,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<
    AppNotification[]
  >([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notificationsRef = useRef<AppNotification[]>([]);
  const refreshInProgressRef = useRef(false);

  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);

  const refreshNotifications = useCallback(async () => {
    if (refreshInProgressRef.current) return;

    refreshInProgressRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const response = await API.get("/notifications", {
        params: { page: 1, limit: 50 },
      });

      const data = response.data;

      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
      refreshInProgressRef.current = false;
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    const previous = notificationsRef.current;

    const target = previous.find(
      (notification) => notification._id === id,
    );

    if (!target || target.isRead) return;

    // Optimistic UI update.
    setNotifications((current) =>
      current.map((notification) =>
        notification._id === id
          ? {
              ...notification,
              isRead: true,
              readAt: new Date().toISOString(),
            }
          : notification,
      ),
    );

    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      const response = await API.patch(
        `/notifications/${id}/read`,
      );

      const updated: AppNotification =
        response.data.notification;

      setNotifications((current) =>
        current.map((notification) =>
          notification._id === id ? updated : notification,
        ),
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
      await refreshNotifications();
      throw err;
    }
  }, [refreshNotifications]);

  const markAllAsRead = useCallback(async () => {
    const previous = notificationsRef.current;

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        isRead: true,
        readAt:
          notification.readAt ?? new Date().toISOString(),
      })),
    );

    setUnreadCount(0);

    try {
      await API.patch("/notifications/read-all");
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
      setNotifications(previous);
      setUnreadCount(
        previous.filter((notification) => !notification.isRead)
          .length,
      );
      throw err;
    }
  }, []);

  const deleteNotification = useCallback(async (id: string) => {
    const previous = notificationsRef.current;
    const target = previous.find(
      (notification) => notification._id === id,
    );

    setNotifications((current) =>
      current.filter((notification) => notification._id !== id),
    );

    if (target && !target.isRead) {
      setUnreadCount((count) => Math.max(0, count - 1));
    }

    try {
      await API.delete(`/notifications/${id}`);
    } catch (err) {
      console.error("Failed to delete notification:", err);
      await refreshNotifications();
      throw err;
    }
  }, [refreshNotifications]);

  // Load saved notifications and maintain the authenticated SSE stream.
  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let stopped = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let activeController: AbortController | undefined;
    let retryDelay = 1000;

    void refreshNotifications();

    const connect = async () => {
      if (stopped) return;

      const controller = new AbortController();
      activeController = controller;

      try {
        const response = await fetch(
          getNotificationStreamUrl(),
          {
            method: "GET",
            headers: {
              Accept: "text/event-stream",
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error(
            `Notification stream returned ${response.status}`,
          );
        }

        if (!response.body) {
          throw new Error("Notification stream has no response body.");
        }

        retryDelay = 1000;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!stopped) {
          const { value, done } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const events = buffer.split(/\r?\n\r?\n/);
          buffer = events.pop() ?? "";

          for (const event of events) {
            const dataLines = event
              .split(/\r?\n/)
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim());

            if (!dataLines.length) continue;

            try {
              const payload = JSON.parse(dataLines.join("\n"));

              if (
                payload.scope !== "notification" ||
                payload.type !== "notification" ||
                !payload.notification?._id
              ) {
                continue;
              }

              const incoming: AppNotification =
                payload.notification;

              setNotifications((current) => {
                const exists = current.some(
                  (item) => item._id === incoming._id,
                );

                if (exists) return current;

                return [incoming, ...current].slice(0, 50);
              });

              if (!incoming.isRead) {
                setUnreadCount((count) => count + 1);
              }
            } catch (parseError) {
              console.error(
                "Invalid notification SSE payload:",
                parseError,
              );
            }
          }
        }
      } catch (streamError) {
        if (
          !stopped &&
          !(streamError instanceof DOMException &&
            streamError.name === "AbortError")
        ) {
          console.error(
            "Notification stream disconnected:",
            streamError,
          );
        }
      } finally {
        if (!stopped) {
          retryTimer = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 2, 30000);
            void connect();
          }, retryDelay);
        }
      }
    };

    void connect();

    return () => {
      stopped = true;
      activeController?.abort();

      if (retryTimer) {
        clearTimeout(retryTimer);
      }
    };
  }, [refreshNotifications]);

  const value: NotificationContextValue = {
    notifications,
    unreadCount,
    loading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error(
      "useNotifications must be used inside NotificationProvider.",
    );
  }

  return context;
}