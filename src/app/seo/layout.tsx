"use client";

import { ReactNode, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, FileText, Image as ImageIcon, Store, LogOut, PanelLeft, X, ExternalLink } from "lucide-react";
import { logout } from "@/app/admin/login/actions";
import { STUDIO_PAGES } from "@/lib/content";
import { StudioProvider } from "./studio-context";
import PublishBar from "./PublishBar";

// SEO Studio: a separate dashboard for the SEO specialist (page text, titles, alt text,
// business info). Access: ADMIN_EMAILS + SEO_EMAILS, checked in the proxy and every action.
export default function SeoStudioLayout({ children }: { children: ReactNode }) {
  return (
    <StudioProvider>
      <StudioShell>{children}</StudioShell>
    </StudioProvider>
  );
}

function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout("seo").catch((e) => console.error("Logout error:", e));
    window.location.replace("/admin/login?next=/seo");
  };

  const closeSidebar = () => setIsSidebarOpen(false);
  const linkClass = (active: boolean) =>
    `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-sm ${
      active ? "bg-ocean/20 text-ocean font-semibold" : "text-white/60 hover:bg-white/5 hover:text-white"
    }`;

  return (
    <div className="studio flex h-dvh bg-gray-50 text-navy font-sans">
      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={closeSidebar} aria-hidden="true" />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-navy text-white flex flex-col shrink-0 transition-transform duration-300 ease-out md:static md:z-auto md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
          <div>
            <div className="font-playfair text-xl font-bold tracking-widest uppercase whitespace-nowrap">SEO Studio</div>
            <div className="text-[10px] tracking-[3px] uppercase text-white/40">Boat Seafood</div>
          </div>
          <button onClick={closeSidebar} className="md:hidden -mr-2 p-2 text-white/60 hover:text-white" aria-label="Close menu">
            <X size={22} />
          </button>
        </div>

        <nav data-lenis-prevent className="flex-1 overflow-y-auto py-5 px-4 flex flex-col gap-1">
          <Link href="/seo" onClick={closeSidebar} className={linkClass(pathname === "/seo")}>
            <Gauge size={18} /> Overview
          </Link>

          <div className="mt-4 mb-1 px-4 text-[10px] tracking-[3px] uppercase text-white/30 font-bold">Pages</div>
          {STUDIO_PAGES.map((p) => {
            const href = `/seo/pages/${p.slug}`;
            return (
              <Link key={p.slug} href={href} onClick={closeSidebar} className={linkClass(pathname === href)}>
                <FileText size={18} /> {p.name}
              </Link>
            );
          })}

          <div className="mt-4 mb-1 px-4 text-[10px] tracking-[3px] uppercase text-white/30 font-bold">Site</div>
          <Link href="/seo/images" onClick={closeSidebar} className={linkClass(pathname === "/seo/images")}>
            <ImageIcon size={18} /> Images &amp; Alt Text
          </Link>
          <Link href="/seo/business" onClick={closeSidebar} className={linkClass(pathname === "/seo/business")}>
            <Store size={18} /> Business Info
          </Link>
        </nav>

        <div className="p-4 border-t border-white/10 flex flex-col gap-1">
          <a href="/" target="_blank" className={linkClass(false)}>
            <ExternalLink size={18} /> View Website
          </a>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-white/60 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-50 text-left"
          >
            <LogOut size={18} /> {isLoggingOut ? "Logging out..." : "Log Out"}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden h-14 shrink-0 flex items-center gap-3 px-4 bg-navy text-white">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 text-white/80 hover:text-white"
            aria-label="Open menu"
            aria-expanded={isSidebarOpen}
          >
            <PanelLeft size={22} />
          </button>
          <span className="font-playfair text-lg font-bold tracking-widest uppercase whitespace-nowrap">SEO Studio</span>
        </div>

        <PublishBar />

        <div id="studio-scroll" data-lenis-prevent className="admin-scroll flex-1 overflow-y-auto overscroll-contain">
          {children}
        </div>
      </main>
    </div>
  );
}
