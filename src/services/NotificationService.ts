import API from "./Api";

export interface AppNotification {
  _id: string;
  user: string;
  recipientRole: "user" | "admin";
  type:
    | "loan_application"
    | "loan_status"
    | "loan_approved"
    | "loan_rejected"
    | "loan_disbursed"
    | "repayment"
    | "repayment_failed"
    | "repayment_due"
    | "mandate"
    | "system";
  title: string;
  message: string;
  relatedLoan?: string | null;
  relatedRepayment?: string | null;
  relatedMandate?: string | null;
  isRead: boolean;
  readAt?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResponse {
  success: boolean;
  notifications: AppNotification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface UnreadCountResponse {
  success: boolean;
  unreadCount: number;
}

export const getNotifications = async (
  page = 1,
  limit = 20,
  unread = false,
): Promise<NotificationListResponse> => {
  const response = await API.get("/notifications", {
    params: { page, limit, ...(unread ? { unread: true } : {}) },
  });

  return response.data;
};

export const getUnreadNotificationCount =
  async (): Promise<number> => {
    const response =
      await API.get<UnreadCountResponse>(
        "/notifications/unread-count",
      );

    return response.data.unreadCount;
  };

export const markNotificationAsRead = async (
  id: string,
): Promise<AppNotification> => {
  const response = await API.patch(
    `/notifications/${id}/read`,
  );

  return response.data.notification;
};

export const markAllNotificationsAsRead =
  async (): Promise<void> => {
    await API.patch("/notifications/read-all");
  };

export const deleteNotification = async (
  id: string,
): Promise<void> => {
  await API.delete(`/notifications/${id}`);
};

export default {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
};