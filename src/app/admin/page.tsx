"use client";

import { useState, useEffect, useRef } from "react";
import { cancelOrder as cancelOrderAction, completeOrder as completeOrderAction, clearPendingOrders, deleteOrder as deleteOrderAction, listOrders, type OrderFilter } from "./actions";
import { actionFailed, confirmDialog } from "./client-helpers";
import { toast } from "./Toaster";
import Pagination from "./Pagination";
import BookingOrders from "./BookingOrders";
import { ChefHat, MapPin, Truck, TrendingUp, Utensils, DollarSign, Clock, Check, AlertCircle, RefreshCw, BellOff, ChevronDown, ChevronUp, User, Phone, Trash2, X, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cookingLabel, dubaiClock } from "@/lib/deliveries";


// Orders per page (2 rows of 4 on wide screens)
const ORDERS_PAGE_SIZE = 8;

// true = the live feed shows the website orders (All / Pending / Completed / Cancelled, with
// Complete, Cancel and Delete on each order) next to the table bookings; false = bookings only
const MENU_ORDERS_FEED = true;

// The tabs: orders by status, and the upcoming table bookings (with their pre-ordered food)
type Tab = OrderFilter | "bookings";
const FILTERS: { value: Tab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "delivery", label: "Delivery" },
  { value: "bookings", label: "Table Bookings" },
];

const LIST_TITLE: Record<Tab, string> = { all: "All Orders", pending: "Active Orders", completed: "Completed Orders", cancelled: "Cancelled Orders", delivery: "Delivery Orders", bookings: "Table Bookings" };
const EMPTY_TEXT: Record<OrderFilter, string> = {
  all: "No orders yet.",
  pending: "No active orders right now.",
  completed: "No completed orders yet.",
  cancelled: "No cancelled orders.",
  delivery: "No delivery orders yet.",
};

// How often the live feed checks for new orders
const ORDER_POLL_MS = 5000;

interface Order {
  id: string;
  table: string;
  name?: string | null; // who ordered (orders from before this have none)
  phone?: string | null;
  items: { name: string; quantity: number }[];
  total: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'cancelled';
  source?: 'booking' | 'delivery' | null; // a confirmed booking's pre-order, or a delivery
  booking_date?: string | null;
  booking_time?: string | null;
  location?: string | null; // delivery: the address
  location_map?: string | null; // delivery: a map pin from the customer's phone
  cooking_minutes?: number | null; // set when confirmed
  ready_at?: string | null; // delivery: when it is ready
  cook_at?: string | null; // booking pre-order: when to start cooking
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalOrders: 0,
    revenue: 0,
    pendingOrdersCount: 0,
  });

  const [orders, setOrders] = useState<Order[]>([]);
  // Order ids whose ordered items are open ("View Order Items")
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
  const [view, setView] = useState<{ filter: Tab; page: number }>({ filter: MENU_ORDERS_FEED ? "pending" : "bookings", page: 0 });
  // Refresh on the bookings feed: a new key reloads it
  const [bookingsKey, setBookingsKey] = useState(0);
  const viewRef = useRef(view);
  const [counts, setCounts] = useState({ all: 0, pending: 0, completed: 0, cancelled: 0, delivery: 0, bookings: 0 });
  const [listTotal, setListTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const loadData = async () => {
    const requested = viewRef.current;
    const onBookings = requested.filter === "bookings"; // that tab lists itself (BookingOrders): only the counts here
    const res = await listOrders(onBookings ? 0 : requested.page, ORDERS_PAGE_SIZE, onBookings ? "pending" : (requested.filter as OrderFilter));
    if (requested !== viewRef.current) return; // another filter or page was opened meanwhile
    if (!res.ok) {
      // Logged out: back to login. Other errors (e.g. offline): keep showing the last data
      if (res.status === 401) actionFailed(res);
      return;
    }
    const { orders: rows, total, counts, revenue, bookings } = res.data!;
    setStats({ totalOrders: counts.all, revenue, pendingOrdersCount: counts.pending });
    setCounts({ ...counts, bookings });
    if (onBookings) return;
    // This page has emptied (e.g. orders completed): go to the last page that still has orders
    if (rows.length === 0 && total > 0 && requested.page > 0) {
      show(requested.filter, Math.ceil(total / ORDERS_PAGE_SIZE) - 1);
      return;
    }
    setListTotal(total);
    setOrders(rows);
    setLoaded(true);
  };

  const show = (filter: Tab, page: number) => {
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
    toast("Order marked as completed");
    loadData();
  };

  const deleteOrder = async (order: Order) => {
    const ok = await confirmDialog({
      title: "Delete this order?",
      text: `${order.name ? `${order.name}'s order` : "This order"} (AED ${order.total}) will be removed for good and no longer counted in revenue. This can't be undone.`,
      confirmText: "Yes, delete",
      danger: true,
    });
    if (!ok) return;
    if (actionFailed(await deleteOrderAction(order.id))) return;
    toast("Order deleted");
    loadData();
  };

  const cancelOrder = async (order: Order) => {
    const ok = await confirmDialog({
      title: "Cancel this order?",
      text: `${order.name ? `${order.name}'s order` : "This order"} (AED ${order.total}) will leave the kitchen screen and won't count in revenue. You can delete it afterwards.`,
      confirmText: "Yes, cancel order",
      cancelText: "Keep order",
      danger: true,
    });
    if (!ok) return;
    if (actionFailed(await cancelOrderAction(order.id))) return;
    toast("Order cancelled");
    loadData();
  };

  const clearAll = async () => {
    const ok = await confirmDialog({
      title: "Clear all pending orders?",
      text: "Every pending order will be removed from the list.",
      confirmText: "Yes, clear all",
      danger: true,
    });
    if (ok) {
      if (actionFailed(await clearPendingOrders())) return;
      toast("Pending orders cleared");
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
              onClick={() => {
                loadData();
                if (view.filter === "bookings") setBookingsKey((k) => k + 1);
              }}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 whitespace-nowrap bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-2.5 md:py-2 rounded-lg transition-all"
            >
              <RefreshCw size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Refresh</span>
            </button>
            {MENU_ORDERS_FEED && <button
              onClick={clearAll}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 whitespace-nowrap bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 md:py-2 rounded-lg transition-all"
            >
              <AlertCircle size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Clear Pending</span>
            </button>}
          </div>
        </div>

        {/* Filter: which orders from the database are listed */}
        {MENU_ORDERS_FEED && <div role="tablist" aria-label="Show orders" className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 p-1 mb-6 md:mb-8 bg-gray-100 rounded-lg w-full sm:w-fit">
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
        </div>}

        {view.filter === "bookings" ? (
          <BookingOrders key={bookingsKey} />
        ) : (
        <>
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
                  {/* Who ordered and where: the name leads, then the table (none for takeaway) and
                      the number to call. Time, order number and total sit on the right, or under it
                      on a narrow card */}
                  <div className="p-4 md:p-5 border-b border-gray-100 bg-white flex flex-wrap justify-between items-start gap-x-3 gap-y-2">
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="flex items-start gap-1.5 text-lg sm:text-xl font-playfair font-bold text-navy leading-tight break-words">
                        <User size={16} className="shrink-0 mt-1 text-gray-400" aria-hidden />
                        <span className="min-w-0">{order.name || <span className="text-gray-400 font-normal italic text-base">No name given</span>}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {order.source === "booking" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                            <CalendarDays size={11} aria-hidden /> Booking {order.booking_date}{order.booking_time ? `, ${order.booking_time}` : ""}
                          </span>
                        )}
                        {order.source === "delivery" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                            <Truck size={11} aria-hidden /> Delivery
                          </span>
                        )}
                        {order.cooking_minutes ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                            <ChefHat size={12} aria-hidden /> {cookingLabel(order.cooking_minutes)}
                            {order.ready_at ? ` · ready ${dubaiClock(order.ready_at)}` : order.cook_at ? ` · start ${dubaiClock(order.cook_at)}` : ""}
                          </span>
                        ) : null}
                        {order.table && order.table !== "Takeaway" && order.source !== "delivery" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-navy text-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider">
                            <Utensils size={11} aria-hidden /> Table {order.table}
                          </span>
                        )}
                        {order.phone ? (
                          <a href={`tel:${order.phone.replace(/[^0-9+]/g, "")}`} className="inline-flex items-center gap-1 rounded-full border border-ocean/40 text-ocean hover:bg-ocean/10 px-2.5 py-1 text-xs font-semibold">
                            <Phone size={12} aria-hidden /> {order.phone}
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-400"><Phone size={12} aria-hidden /> No number</span>
                        )}
                      </div>
                      {/* Delivery: where to bring it (and the customer's map pin, when shared) */}
                      {order.source === "delivery" && order.location && (
                        <p className="mt-2 flex items-start gap-1.5 text-sm text-gray-700 break-words">
                          <MapPin size={14} className="shrink-0 mt-0.5 text-emerald-600" aria-hidden />
                          <span className="min-w-0">
                            {order.location}
                            {order.location_map && (
                              <a href={order.location_map} target="_blank" rel="noopener noreferrer" className="ml-2 whitespace-nowrap text-xs font-bold text-ocean hover:underline">
                                Open map
                              </a>
                            )}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center justify-end gap-1.5 text-gray-400 mb-1">
                        <Clock size={12} aria-hidden />
                        <span className="text-[10px] font-bold whitespace-nowrap">
                          {new Date(order.timestamp).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400">#{order.id.slice(0,8)}</div>
                      <div className="text-sm font-bold text-navy mt-1 whitespace-nowrap">AED {order.total}</div>
                    </div>
                  </div>

                  {/* The ordered food: hidden until "View Order Items" is pressed */}
                  <div className="p-4 md:p-5 flex-grow flex flex-col gap-3">
                    <button
                      onClick={() => toggleExpanded(order.id)}
                      aria-expanded={expandedOrders.has(order.id)}
                      aria-controls={`items-${order.id}`}
                      className="w-full flex items-center justify-between gap-2 rounded-lg border border-navy/15 bg-white px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider text-navy hover:border-navy transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Utensils size={14} aria-hidden />
                        {expandedOrders.has(order.id) ? "Hide Order Items" : "View Order Items"}
                        <span className="rounded-full bg-navy/10 px-2 py-0.5 text-[10px]">{order.items.reduce((n, i) => n + i.quantity, 0)}</span>
                      </span>
                      {expandedOrders.has(order.id) ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
                    </button>
                    {expandedOrders.has(order.id) && (
                      <ul id={`items-${order.id}`} className="flex flex-col gap-2.5">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="bg-navy text-white min-w-[24px] h-6 px-1 rounded flex items-center justify-center text-xs font-bold shrink-0">
                              {item.quantity}
                            </span>
                            <span className="text-sm font-medium text-navy/80 break-words min-w-0">{item.name}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="p-4 bg-white border-t border-gray-100">
                    {order.status !== "pending" ? (
                      <div className="flex gap-2">
                        {order.status === "completed" ? (
                          <div className="flex-1 bg-green-50 text-green-700 py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider">
                            <Check size={16} aria-hidden />
                            Completed
                          </div>
                        ) : (
                          <div className="flex-1 bg-red-50 text-red-700 py-3 rounded-lg flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-wider">
                            <X size={16} aria-hidden />
                            Cancelled
                          </div>
                        )}
                        <button
                          onClick={() => deleteOrder(order)}
                          aria-label={`Delete ${order.name ? `${order.name}'s` : "this"} order`}
                          title="Delete order"
                          className="shrink-0 flex items-center justify-center gap-1.5 px-3.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-bold text-xs uppercase tracking-wider"
                        >
                          <Trash2 size={15} aria-hidden />
                          <span className="hidden min-[400px]:inline">Delete</span>
                        </button>
                      </div>
                    ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => completeOrder(order.id)}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-bold text-xs uppercase tracking-wider shadow-sm"
                      >
                        <Check size={16} aria-hidden />
                        Complete Order
                      </button>
                      <button
                        onClick={() => cancelOrder(order)}
                        aria-label={`Cancel ${order.name ? `${order.name}'s` : "this"} order`}
                        title="Cancel order"
                        className="shrink-0 flex items-center justify-center gap-1.5 px-3.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors font-bold text-xs uppercase tracking-wider"
                      >
                        <X size={15} aria-hidden />
                        <span className="hidden min-[400px]:inline">Cancel</span>
                      </button>
                    </div>
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
        </>
        )}
      </div>
    </div>
  );
}
