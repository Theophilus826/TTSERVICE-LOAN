
import {
  Home,
  CreditCard,
  User,
} from "lucide-react";
import { NavLink } from "react-router-dom";

/* =========================================================
   NAVIGATION ITEMS
========================================================= */

const navItems = [
  {
    label: "Home",
    path: "/dashboard",
    icon: Home,
    end: true,
  },
  {
    label: "Repayments",
    path: "/loans/repayments/history",
    icon: CreditCard,
    end: false,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: User,
    end: true,
  },
];

/* =========================================================
   CUSTOMER BOTTOM NAVIGATION
========================================================= */

export default function CustomerBottomNav() {
  return (
    <nav
      aria-label="Customer navigation"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-lg md:hidden"
    >
      <div className="grid grid-cols-3">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              aria-label={item.label}
              className={({ isActive }) =>
                [
                  "flex",
                  "min-h-[64px]",
                  "flex-col",
                  "items-center",
                  "justify-center",
                  "gap-1",
                  "py-3",
                  "text-xs",
                  "font-medium",
                  "transition-colors",
                  "duration-200",
                  "focus:outline-none",
                  "focus-visible:ring-2",
                  "focus-visible:ring-orange-500",
                  "focus-visible:ring-inset",
                  isActive
                    ? "text-orange-500"
                    : "text-gray-500 hover:text-gray-700",
                ].join(" ")
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={21}
                    strokeWidth={isActive ? 2.5 : 2}
                    aria-hidden="true"
                  />

                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

