
import { useEffect } from "react";
import { Outlet } from "react-router-dom";

import CustomerBottomNav from "../dashboard/ButtomNarve";
import FloatingReminderPrompt from "./FloatingReminderPrompt";
import { initializeNativePushNotifications } from "../services/NativePushNotifications";

export default function MainLayout() {
  useEffect(() => {
    void initializeNativePushNotifications();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl px-4 pt-6 pb-24 sm:px-6 lg:px-8"
      >
        <Outlet />
      </main>

      <CustomerBottomNav />

      <FloatingReminderPrompt />

      
    </div>
  );
}
