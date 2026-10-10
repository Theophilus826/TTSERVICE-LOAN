
import { Outlet } from "react-router-dom";
import CustomerBottomNav from "../dashboard/ButtomNarve";
import FloatingReminderPrompt from "./FloatingReminderPrompt";

/* MAIN CUSTOMER LAYOUT */
export default function MainLayout() {
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


