"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu as MenuIcon, Fish, Percent, CalendarDays, Settings, LogOut, PanelLeft, X, ArrowLeft } from "lucide-react";
import { logout } from "./login/actions";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // Mobile only: the sidebar is a slide-in drawer; on desktop it is always visible
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Deletes this browser's session cookie (other devices, e.g. the kitchen tablet, stay logged in)
  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout("admin").catch((e) => console.error("Logout error:", e));
    // Full page load so no admin data stays in memory; the proxy now sees no token
    window.location.replace("/admin/login");
  };

  // If it's the login page, don't show the sidebar
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Menu", href: "/admin/menu", icon: MenuIcon },
    { name: "Daily Catch", href: "/admin/daily-catch", icon: Fish },
    { name: "Offers", href: "/admin/offers", icon: Percent },
    { name: "Bookings", href: "/admin/bookings", icon: CalendarDays },
    { name: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="flex h-dvh bg-gray-50 text-navy font-sans">
      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy text-white flex flex-col shrink-0 transition-transform duration-300 ease-out md:static md:z-auto md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-20 flex items-center justify-between px-8 border-b border-white/10">
          <span className="font-playfair text-xl font-bold tracking-widest uppercase whitespace-nowrap">Boat Admin</span>
          <button
            onClick={closeSidebar}
            className="md:hidden -mr-2 p-2 text-white/60 hover:text-white"
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 py-6 px-4 flex flex-col gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-ocean/20 text-ocean font-semibold"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={20} />
                <span className="text-sm tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 flex flex-col gap-1">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm tracking-wide">Back to Site</span>
          </Link>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/60 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-50 text-left"
          >
            <LogOut size={20} />
            <span className="text-sm tracking-wide">{isLoggingOut ? "Logging out..." : "Log Out"}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="md:hidden h-14 shrink-0 flex items-center gap-3 px-4 bg-navy text-white">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-white/80 hover:text-white"
            aria-label="Open menu"
            aria-expanded={isSidebarOpen}
          >
            <PanelLeft size={22} />
          </button>
          <span className="font-playfair text-lg font-bold tracking-widest uppercase whitespace-nowrap">Boat Admin</span>
        </div>

        <div data-lenis-prevent className="admin-scroll flex-1 overflow-y-auto overscroll-contain p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
