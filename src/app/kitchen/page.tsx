"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Utensils, AlertCircle, RefreshCw, LogOut, BellOff, User, Phone, CalendarDays, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { clearPendingOrders } from "@/app/admin/actions";
import { logout } from "@/app/admin/login/actions";
import { actionFailed } from "@/app/admin/client-helpers";
import Toaster from "@/app/admin/Toaster";
import { kitchenCompleteOrder, kitchenOrders, type KitchenOrder } from "./actions";

// How often the kitchen screen checks for new orders
const ORDER_POLL_MS = 5000;

type Order = KitchenOrder;

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  // Who is looking: kitchen accounts see only the orders; admins also get Clear All and the dashboard link
  const [role, setRole] = useState<string | null>(null);
  // Pending orders seen at the last check
  const lastOrderCount = useRef(0);
  const [isRinging, setIsRinging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.loop = true;
  }, []);

  const stopRinging = () => {
    setIsRinging(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const loadOrders = async () => {
    const res = await kitchenOrders();
    if (!res.ok) {
      // Logged out: back to login. Other errors (e.g. offline): keep showing the last orders
      if (res.status === 401) actionFailed(res);
      else console.error("Error loading orders:", res.error);
      return;
    }
    const data = res.data.orders;
    setOrders(data);
    setRole(res.data.role);
    // Ring when there are more pending orders than at the last check
    if (data.length > lastOrderCount.current) {
      setIsRinging(true);
      audioRef.current?.play().catch(() => console.log("Audio play blocked"));
    }
    lastOrderCount.current = data.length;
  };

  // Live feed: check for new orders every few seconds (and right away when the screen wakes up)
  useEffect(() => {
    loadOrders();
    const timer = setInterval(() => {
      if (!document.hidden) loadOrders();
    }, ORDER_POLL_MS);
    const onVisible = () => {
      if (!document.hidden) loadOrders();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const completeOrder = async (id: string) => {
    stopRinging();
    if (actionFailed(await kitchenCompleteOrder(id))) return;
    loadOrders();
  };

  const clearAll = async () => {
    if (confirm("Are you sure you want to clear all pending orders?")) {
      stopRinging();
      if (actionFailed(await clearPendingOrders())) return;
      loadOrders();
    }
  };

  const signOut = async () => {
    await logout("kitchen").catch((e) => console.error("Logout error:", e));
    window.location.assign("/admin/login?next=/kitchen");
  };

  return (
    <main className="bg-[#02080a] min-h-screen text-white p-4 sm:p-8">
      <Toaster />
      {/* Header */}
      <header className="flex flex-wrap gap-4 justify-between items-center mb-12 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-ocean animate-pulse"></div>
            <h1 className="text-[10px] tracking-[4px] uppercase font-bold text-ocean">Kitchen Live Feed</h1>
          </div>
          <h2 className="font-playfair text-4xl font-bold">Active Orders</h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          {isRinging && (
            <button 
              onClick={stopRinging}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-sm transition-all animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
            >
              <BellOff size={16} />
              <span className="text-[9px] tracking-[2px] uppercase font-bold">Silence Alarm</span>
            </button>
          )}
          <button 
            onClick={loadOrders}
            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-sm transition-all"
          >
            <RefreshCw size={16} />
            <span className="text-[9px] tracking-[2px] uppercase font-bold">Refresh</span>
          </button>
          {role === "admin" && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-sm transition-all"
            >
              <AlertCircle size={16} />
              <span className="text-[9px] tracking-[2px] uppercase font-bold">Clear All</span>
            </button>
          )}
          {role === "admin" ? (
            <Link href="/admin" title="Admin dashboard" className="text-white/40 hover:text-white transition-colors">
              <LayoutDashboard size={20} />
            </Link>
          ) : (
            <button onClick={signOut} title="Log out" aria-label="Log out" className="text-white/40 hover:text-white transition-colors">
              <LogOut size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {orders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full h-[60vh] flex flex-col items-center justify-center text-white/20"
            >
              <Utensils size={64} className="mb-6 opacity-10" />
              <p className="font-playfair text-2xl italic">Waiting for orders...</p>
            </motion.div>
          ) : (
            orders.map((order) => (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className="bg-white/5 border border-white/10 rounded-sm overflow-hidden flex flex-col"
              >
                {/* Order Header */}
                <div className="p-4 sm:p-6 border-b border-white/5 bg-white/[0.02] flex flex-wrap justify-between items-start gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="flex items-start gap-1.5 text-xl sm:text-2xl font-playfair font-bold leading-tight break-words">
                      <User size={16} className="shrink-0 mt-1.5 text-white/40" aria-hidden />
                      <span className="min-w-0">{order.name || <span className="text-white/40 font-normal italic text-base">No name given</span>}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {order.source === "booking" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-navy px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                          <CalendarDays size={11} aria-hidden /> Booking {order.booking_date}{order.booking_time ? `, ${order.booking_time}` : ""}
                        </span>
                      )}
                      {order.table === "Takeaway" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/20 text-white/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">Takeaway</span>
                      )}
                      {order.table && order.table !== "Takeaway" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ocean text-navy px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                          <Utensils size={11} aria-hidden /> Table {order.table}
                        </span>
                      )}
                      {order.phone && (
                        <a href={`tel:${order.phone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-1 rounded-full border border-white/20 text-white/85 hover:text-white px-2.5 py-1 text-xs font-semibold">
                          <Phone size={12} aria-hidden /> {order.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1.5 text-white/40 mb-1">
                      <Clock size={12} />
                      <span className="text-[9px] font-bold tracking-[1px]">
                        {new Date(order.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="text-[9px] text-white/20">#{order.id.slice(0,8)}</div>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-6 flex-grow flex flex-col gap-4">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="bg-ocean/20 text-ocean w-6 h-6 rounded-sm flex items-center justify-center text-[10px] font-bold">
                          {item.quantity}
                        </span>
                        <span className="text-sm font-medium text-white/80">{item.name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white/[0.02] border-t border-white/5">
                  <button 
                    onClick={() => completeOrder(order.id)}
                    className="w-full bg-ocean/90 hover:bg-ocean text-navy py-4 rounded-sm flex items-center justify-center gap-2 transition-all font-bold text-[10px] tracking-[2px] uppercase"
                  >
                    <Check size={18} />
                    Complete Order
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
