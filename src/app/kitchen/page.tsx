"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Utensils, AlertCircle, RefreshCw, LogOut, BellOff } from "lucide-react";
import Link from "next/link";
import { completeOrder as completeOrderAction, clearPendingOrders, listOrders } from "@/app/admin/actions";
import { actionFailed } from "@/app/admin/client-helpers";

// How often the kitchen screen checks for new orders
const ORDER_POLL_MS = 5000;

interface Order {
  id: string;
  table: string;
  items: { name: string; quantity: number }[];
  total: number;
  timestamp: string;
  status: 'pending' | 'completed';
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
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
    const res = await listOrders();
    if (!res.ok) {
      // Logged out: back to login. Other errors (e.g. offline): keep showing the last orders
      if (res.status === 401) actionFailed(res);
      else console.error("Error loading orders:", res.error);
      return;
    }
    const data = res.data!.pending;
    setOrders(data);
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
    if (actionFailed(await completeOrderAction(id))) return;
    loadOrders();
  };

  const clearAll = async () => {
    if (confirm("Are you sure you want to clear all pending orders?")) {
      stopRinging();
      if (actionFailed(await clearPendingOrders())) return;
      loadOrders();
    }
  };

  return (
    <main className="bg-[#02080a] min-h-screen text-white p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-12 border-b border-white/5 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-3 h-3 rounded-full bg-ocean animate-pulse"></div>
            <h1 className="text-[10px] tracking-[4px] uppercase font-bold text-ocean">Kitchen Live Feed</h1>
          </div>
          <h2 className="font-playfair text-4xl font-bold">Active Orders</h2>
        </div>
        
        <div className="flex items-center gap-6">
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
          <button 
            onClick={clearAll}
            className="flex items-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-sm transition-all"
          >
            <AlertCircle size={16} />
            <span className="text-[9px] tracking-[2px] uppercase font-bold">Clear All</span>
          </button>
          <Link href="/" className="text-white/40 hover:text-white transition-colors">
            <LogOut size={20} />
          </Link>
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
                <div className="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-start">
                  <div>
                    <div className="text-[9px] tracking-[2px] uppercase text-ocean font-bold mb-1">Table</div>
                    <div className="text-3xl font-playfair font-bold">{order.table}</div>
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
