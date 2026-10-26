"use client";

import { useState, useEffect, useRef } from "react";
import { completeOrder as completeOrderAction, clearPendingOrders, listOrders, type OrderFilter } from "./actions";
import { actionFailed } from "./client-helpers";
import Pagination from "./Pagination";
import { TrendingUp, Utensils, DollarSign, Clock, Check, AlertCircle, RefreshCw, BellOff, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// Items shown per order card before "View more"
const VISIBLE_ITEMS = 3;

// Orders per page (2 rows of 4 on wide screens)
const ORDERS_PAGE_SIZE = 8;

const FILTERS: { value: OrderFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

const LIST_TITLE: Record<OrderFilter, string> = { all: "All Orders", pending: "Active Orders", completed: "Completed Orders" };
const EMPTY_TEXT: Record<OrderFilter, string> = {
  all: "No orders yet.",
  pending: "No active orders right now.",
  completed: "No completed orders yet.",
};

// How often the live feed checks for new orders
const ORDER_POLL_MS = 5000;

interface Order {
  id: string;
  table: string;
  items: { name: string; quantity: number }[];
  total: number;
  timestamp: string;
  status: 'pending' | 'completed';
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    pendingOrdersCount: 0,
  });

  const [orders, setOrders] = useState<Order[]>([]);
  // Order ids whose full item list is shown (others show the first VISIBLE_ITEMS)
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Which orders and which page (0-based) are shown. The ref lets the polling timer load them.
  const [view, setView] = useState<{ filter: OrderFilter; page: number }>({ filter: "pending", page: 0 });
  const viewRef = useRef(view);
  const [counts, setCounts] = useState({ all: 0, pending: 0, completed: 0 });
  const [listTotal, setListTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const loadData = async () => {
    const requested = viewRef.current;
    const res = await listOrders(requested.page, ORDERS_PAGE_SIZE, requested.filter);
    if (requested !== viewRef.current) return; // another filter or page was opened meanwhile
    if (!res.ok) {
      // Logged out: back to login. Other errors (e.g. offline): keep showing the last data
      if (res.status === 401) actionFailed(res);
      return;
    }
    const { orders: rows, total, counts, revenue } = res.data!;
    // This page has emptied (e.g. orders completed): go to the last page that still has orders
    if (rows.length === 0 && total > 0 && requested.page > 0) {
      show(requested.filter, Math.ceil(total / ORDERS_PAGE_SIZE) - 1);
      return;
    }
    setStats({ totalOrders: counts.all, revenue, pendingOrdersCount: counts.pending });
    setCounts(counts);
    setListTotal(total);
    setOrders(rows);
    setLoaded(true);
  };

  const show = (filter: OrderFilter, page: number) => {
    viewRef.current = { filter, page };
    setView(viewRef.current);
    if (filter !== view.filter) setLoaded(false);
    loadData();
  };

  // Live feed: check for new orders every few seconds (and right away when the tab is shown again)
  useEffect(() => {
    loadData();
    const timer = setInterval(() => {
      if (!document.hidden) loadData();
    }, ORDER_POLL_MS);
    const onVisible = () => {
      if (!document.hidden) loadData();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const completeOrder = async (id: string) => {
    if (actionFailed(await completeOrderAction(id))) return;
    loadData();
  };

  const clearAll = async () => {
    if (confirm("Are you sure you want to clear all pending orders?")) {
      if (actionFailed(await clearPendingOrders())) return;
      show(view.filter, 0);
    }
  };


  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-playfair font-bold text-navy mb-1 md:mb-2 leading-tight md:leading-normal">Overview</h1>
        <p className="text-sm md:text-base text-gray-500">Welcome to your restaurant dashboard.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
            <p className="text-2xl font-bold text-navy">AED {stats.revenue}</p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center">
            <Utensils size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Orders</p>
            <p className="text-2xl font-bold text-navy">{stats.totalOrders}</p>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pending Orders</p>
            <p className="text-2xl font-bold text-navy">{stats.pendingOrdersCount}</p>
          </div>
        </div>
      </div>

      {/* Live Order Feed */}
      <div className="mt-6 md:mt-12 bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-8">
        <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:items-center mb-6 md:mb-8 border-b border-gray-100 pb-4 md:pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              <h2 className="text-[10px] tracking-[4px] uppercase font-bold text-red-500 whitespace-nowrap">Live Feed</h2>
            </div>
            <h3 className="text-xl md:text-2xl font-playfair font-bold text-navy whitespace-nowrap">{LIST_TITLE[view.filter]}</h3>
          </div>

          <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
            <button
              onClick={loadData}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 whitespace-nowrap bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-2.5 md:py-2 rounded-lg transition-all"
            >
              <RefreshCw size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Refresh</span>
            </button>
            <button
              onClick={clearAll}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 whitespace-nowrap bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 md:py-2 rounded-lg transition-all"
            >
              <AlertCircle size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Clear Pending</span>
            </button>
          </div>
        </div>

        {/* Filter: which orders from the database are listed */}
        <div role="tablist" aria-label="Show orders" className="flex gap-1 p-1 mb-6 md:mb-8 bg-gray-100 rounded-lg w-full sm:w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              role="tab"
              aria-selected={view.filter === f.value}
              onClick={() => show(f.value, 0)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
                view.filter === f.value ? "bg-white text-navy shadow-sm" : "text-gray-500 hover:text-navy"
              }`}
            >
              {f.label}
              <span className={`min-w-6 px-1.5 py-0.5 rounded-full text-[10px] ${view.filter === f.value ? "bg-navy text-white" : "bg-gray-200 text-gray-600"}`}>
                {counts[f.value]}
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          <AnimatePresence mode="popLayout">
            {!loaded ? (
              <div className="col-span-full h-40 flex items-center justify-center text-gray-400 text-sm">Loading orders...</div>
            ) : orders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full h-40 flex flex-col items-center justify-center text-gray-400"
              >
                <Utensils size={40} className="mb-4 opacity-20" />
                <p className="font-playfair text-xl italic text-gray-400">{EMPTY_TEXT[view.filter]}</p>
              </motion.div>
            ) : (
              orders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden flex flex-col"
                >
                  <div className="p-4 md:p-5 border-b border-gray-100 bg-white flex justify-between items-start gap-3">
                    <div>
                      <div className="text-[9px] tracking-[2px] uppercase text-gray-500 font-bold mb-1">Table</div>
                      <div className="text-2xl font-playfair font-bold text-navy">{order.table}</div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 text-gray-400 mb-1">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold">
                          {new Date(order.timestamp).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400">#{order.id.slice(0,8)}</div>
                      <div className="text-xs font-bold text-navy mt-1">AED {order.total}</div>
                    </div>
                  </div>


                  <div className="p-4 md:p-5 flex-grow flex flex-col gap-3 md:gap-4">
                    {(expandedOrders.has(order.id) ? order.items : order.items.slice(0, VISIBLE_ITEMS)).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <span className="bg-navy text-white min-w-[24px] h-6 rounded flex items-center justify-center text-xs font-bold">
                            {item.quantity}
                          </span>
                          <span className="text-sm font-medium text-navy/80">{item.name}</span>
                        </div>
                      </div>
                    ))}

                    {order.items.length > VISIBLE_ITEMS && (
                      <button
                        onClick={() => toggleExpanded(order.id)}
                        aria-expanded={expandedOrders.has(order.id)}
                        className="self-start flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-ocean hover:text-navy transition-colors"
                      >
                        {expandedOrders.has(order.id) ? (
                          <>View less <ChevronUp size={14} /></>
                        ) : (
                          <>View more (+{order.items.length - VISIBLE_ITEMS}) <ChevronDown size={14} /></>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="p-4 bg-white border-t border-gray-100">
                    {order.status === "completed" ? (
                      <div className="w-full bg-green-50 text-green-700 py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider">
                        <Check size={16} />
                        Completed
                      </div>
                    ) : (
                    <button
                      onClick={() => completeOrder(order.id)}
                      className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-wider shadow-sm"
                    >
                      <Check size={16} />
                      Complete Order
                    </button>
                    )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="mt-6 md:mt-8">
          <Pagination
            page={view.page}
            pageSize={ORDERS_PAGE_SIZE}
            total={listTotal}
            onPage={(p) => show(view.filter, p)}
            noun={view.filter === "all" ? "orders" : `${view.filter} orders`}
            label="Orders pages"
          />
        </div>
      </div>
    </div>
  );
}
