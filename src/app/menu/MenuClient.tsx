"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingBag, Plus, Minus, X, Check, Utensils, Truck, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { TABLE_AREAS, TABLES, tableLabel } from "@/lib/bookings";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FlipBookPopup from "@/components/FlipBookPopup";
import { scrollPageTo } from "@/components/SmoothScroll";
import { MENU_CATEGORIES, type MenuItem } from "@/data/menu";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useSection } from "@/context/ContentContext";
import { StyledHeading } from "@/components/ContentText";
import { placeOrder, type PlaceOrderResult } from "./actions";
import { formatPrice, unitPrice } from "@/lib/offers";

// Shown as a tab only while some dish has a live offer
const OFFERS_TAB = "Offers";
// Dishes per page: 3 rows of 3 on a wide screen
const MENU_PAGE_SIZE = 9;

// Dishes come from the server (page.tsx), so they are in the HTML Google reads.
// tableNumber = ?table= from the QR code on the restaurant table. openOffers = ?offers (from the
// homepage offers popup): start on the Offers tab.
export default function MenuClient({ initialItems, tableNumber, openOffers = false }: { initialItems: MenuItem[]; tableNumber: string | null; openOffers?: boolean }) {
  const { cart, addToCart, updateQuantity, clearCart, cartTotal, cartCount, isCartOpen, setIsCartOpen } = useCart();
  const hero = useSection("menu_hero").fields;
  const hasOffers = initialItems.some((item) => item.discount);
  const categories = hasOffers ? ["All", OFFERS_TAB, ...MENU_CATEGORIES] : ["All", ...MENU_CATEGORIES];
  const [activeCategory, setActiveCategory] = useState(openOffers && hasOffers ? OFFERS_TAB : "All");

  // Opened from an offer link (navbar "Offer", "View More Offers"): glide down past the hero to
  // the Offers tab and its dishes. Waits a moment: a new page starts at the top first (SmoothScroll)
  const categoriesRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!openOffers || !hasOffers) return;
    const t = window.setTimeout(() => {
      const nav = categoriesRef.current;
      if (nav) window.scrollTo({ top: nav.getBoundingClientRect().top + window.scrollY - 75, behavior: "smooth" });
    }, 350);
    return () => clearTimeout(t);
  }, [openOffers, hasOffers]);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'complete'>('idle');
  // When the page opened: the server refuses orders sent instantly (bots), see src/lib/rate-limit.ts
  const openedAt = useRef(0);
  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  const dbMenuItems = initialItems;

  const filteredItems = activeCategory === "All"
    ? dbMenuItems
    : activeCategory === OFFERS_TAB
      ? dbMenuItems.filter(item => item.discount)
      : dbMenuItems.filter(item => item.category === activeCategory);

  // Pages of dishes. For Google every dish stays in the page's HTML (the others are only hidden
  // from view), and the pages are buttons, not ?page= addresses: one /menu page holds the whole
  // menu, as the Menu schema in page.tsx does, with no thin or duplicate pages to index
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(filteredItems.length / MENU_PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const showCategory = (cat: string) => {
    setActiveCategory(cat);
    setPage(0);
  };
  const goToPage = (p: number) => {
    setPage(p);
    // the new page starts from the top of the menu page
    scrollPageTo(0);
  };

  const handleAddToCart = (item: MenuItem) => {
    addToCart(item);
    setShowSuccess(item.id);
    setTimeout(() => setShowSuccess(null), 2000);
  };

  // Who is ordering (required: shown to the staff on the order), and a table when there's no QR
  // code (empty = takeaway). Name and number are remembered on this device for the next order
  const [customer, setCustomer] = useState({ name: "", phone: "" });
  const [typedTable, setTypedTable] = useState("");
  const [orderError, setOrderError] = useState<string | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem("order-customer") || "null");
        if (saved && typeof saved.name === "string" && typeof saved.phone === "string") setCustomer({ name: saved.name, phone: saved.phone });
      } catch {}
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const handlePlaceOrder = () => {
    setOrderError(null);
    setIsConfirming(true);
  };

  const submitOrder = async () => {
    if (customer.name.trim().length < 2) return setOrderError("Please enter your name.");
    if (customer.phone.replace(/\D/g, "").length < 7) return setOrderError("Please enter your phone number.");
    setOrderError(null);
    setOrderStatus('submitting');

    // Sent through a server action: the database prices the items, so the
    // browser can't choose the total or insert into orders directly.
    let result: PlaceOrderResult;
    try {
      result = await placeOrder(tableNumber || typedTable.trim() || null, cart.map(c => ({ id: c.item.id, quantity: c.quantity })), { hp: "", ms: Date.now() - openedAt.current }, customer);
    } catch (e) {
      console.error("Unexpected error saving order:", e);
      result = { ok: false, error: "Could not send your order. Please try again or ask a waiter." };
    }

    if (!result.ok) {
      setOrderStatus('idle');
      setOrderError(result.error);
      return;
    }

    // Order sent: the form starts empty again (name, number, table) and the cart is emptied
    try {
      localStorage.removeItem("order-customer");
    } catch {}
    setOrderStatus('complete');
    setTimeout(() => {
      setCustomer({ name: "", phone: "" });
      setTypedTable("");
      clearCart();
      setIsConfirming(false);
      setOrderStatus('idle');
      setIsCartOpen(false);
    }, 2000);
  };

  return (
    <>
      <Navbar />
      {/* The profile flip book invitation, each time the menu opens (not when ordering from a table) */}
      <FlipBookPopup key={openOffers ? "offers" : "menu"} skip={!!tableNumber} /> {/* key: restarts when the link switches between the menu and its offers */}
      <main className="bg-white min-h-screen text-navy">

        {/* Hero Section */}
        <section className="relative pt-44 pb-24 px-8 md:px-20 bg-navy text-white overflow-hidden">
          <div className="absolute inset-0">
            <img src={hero.image} alt={hero.image_alt} className="w-full h-full object-cover" loading="eager" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/20 to-transparent"></div>
          <div className="absolute inset-0 bg-navy/20"></div>

          <div className="relative z-10 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="flex flex-wrap items-center gap-6 mb-8">
                <Link href="/" className="inline-flex items-center gap-2 text-ocean-light hover:text-white text-[10px] tracking-[3px] uppercase transition-colors">
                  <ArrowLeft size={14} /> {hero.back}
                </Link>
                {tableNumber && (
                  <div className="flex items-center gap-2 bg-ocean text-navy px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[2px] uppercase">
                    <Utensils size={12} /> Table {tableNumber}
                  </div>
                )}
              </div>
              <StyledHeading as="h1" choice={hero.title_style} className="font-playfair text-[clamp(40px,6vw,84px)] font-bold leading-none mb-6">
                {hero.title}
              </StyledHeading>
              <p className="text-[15px] text-white/60 max-w-xl leading-relaxed font-light">
                {tableNumber
                  ? hero.body_table
                  : hero.body}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Menu Navigation */}
        <nav ref={categoriesRef} aria-label="Menu categories" className="sticky top-[75px] z-30 bg-white/95 backdrop-blur-md border-b border-navy/10 px-8 md:px-20 py-6 overflow-x-auto">
          <div className="flex items-center gap-8 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => showCategory(cat)}
                className={`whitespace-nowrap text-[10px] tracking-[3px] uppercase transition-all relative ${
                  cat === OFFERS_TAB
                    ? `inline-flex items-center gap-1.5 text-offer ${activeCategory === cat ? "font-bold" : "hover:font-bold"}`
                    : activeCategory === cat ? "text-navy font-bold" : "text-navy/60 hover:text-navy"
                }`}
              >
                {cat === OFFERS_TAB && <Tag size={11} />}
                {cat}
                {activeCategory === cat && (
                  <motion.div layoutId="activeCat" className={`absolute -bottom-1 left-0 right-0 h-[2px] ${cat === OFFERS_TAB ? "bg-offer" : "bg-ocean"}`} />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Menu Grid */}
        <section className="px-8 md:px-20 py-20 min-h-[50vh]" aria-labelledby="menu-dishes-title">
          <h2 id="menu-dishes-title" className="sr-only">{activeCategory === "All" ? "All dishes" : activeCategory}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            <AnimatePresence mode="popLayout">
            {filteredItems.map((item, i) => {
              const onPage = Math.floor(i / MENU_PAGE_SIZE) === currentPage;
              return (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                // dishes of the other pages stay in the HTML for Google, hidden from view
                className={`group flex-col ${onPage ? "flex" : "hidden"}`}
              >
                <div className={`relative aspect-[4/3] overflow-hidden mb-6 rounded-sm shadow-sm ${item.discount ? "ring-2 ring-offer ring-offset-4 ring-offset-white" : ""}`}>
                  {/* The page's first row loads right away; the rest only when scrolled near (lazy:
                      a hidden page's pictures don't load until it is shown) */}
                  <img src={item.image} alt={item.name} loading={onPage && i % MENU_PAGE_SIZE < 3 ? "eager" : "lazy"} decoding="async" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {item.tag && (
                      <span className="bg-navy/90 backdrop-blur-md text-cream text-[8px] font-bold tracking-[3px] uppercase py-1.5 px-3 rounded-full">
                        {item.tag}
                      </span>
                    )}
                    {item.dietary?.map(d => (
                      <span key={d} className="bg-ocean/90 backdrop-blur-md text-navy text-[8px] font-bold tracking-[2px] uppercase py-1.5 px-3 rounded-full">
                        {d}
                      </span>
                    ))}
                  </div>
                  {item.discount ? (
                    <span className="absolute top-4 right-4 bg-offer text-white text-[11px] font-bold tracking-[1.5px] uppercase py-1.5 px-3 rounded-full shadow-lg">
                      {item.discount}% Off
                    </span>
                  ) : null}
                  <button
                    onClick={() => handleAddToCart(item)}
                    aria-label={`Add ${item.name} to order`}
                    className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-navy text-cream p-2.5 md:p-4 rounded-full shadow-2xl md:translate-y-4 md:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-ocean hover:text-navy opacity-100 translate-y-0"
                  >
                    {showSuccess === item.id ? <Check size={20} className="w-4 h-4 md:w-5 md:h-5" /> : <Plus size={20} className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                </div>

                <div className="flex justify-between items-start mb-3">
                  <StyledHeading as="h3" choice={hero.dish_style} className="font-playfair text-2xl font-bold text-navy leading-tight">
                    {item.name}
                  </StyledHeading>
                  {item.discount ? (
                    <span className="flex flex-col items-end shrink-0 pl-3">
                      <span className="font-jost text-[13px] text-navy/45 line-through">AED {item.price}</span>
                      <span className="font-jost text-lg font-semibold text-offer">AED {formatPrice(unitPrice(item))}</span>
                    </span>
                  ) : (
                    <span className="font-jost text-lg font-medium text-ocean">
                      AED {item.price}
                    </span>
                  )}
                </div>
                {item.offer_title && (
                  <p className="text-[9px] tracking-[2.5px] uppercase font-bold mb-3 flex items-center gap-1.5 text-offer">
                    <Tag size={11} /> {item.offer_title}
                  </p>
                )}
                <p className={`text-[13px] text-navy/70 leading-relaxed font-light ${item.ingredients?.length ? "mb-3" : "mb-6 flex-grow"}`}>
                  {item.description}
                </p>
                {item.ingredients?.length ? (
                  <p className="text-[11px] text-navy/50 leading-relaxed mb-6 flex-grow">
                    <span className="tracking-[2px] uppercase font-bold text-navy/60">Ingredients: </span>
                    {item.ingredients.join(", ")}
                  </p>
                ) : null}
                <div className="h-[1px] w-12 bg-ocean/30"></div>
              </motion.article>
              );
            })}
            </AnimatePresence>
          </div>

          {pageCount > 1 && (
            <nav aria-label="Menu pages" className="mt-16 flex flex-col items-center gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 0}
                  aria-label="Previous page"
                  className="w-10 h-10 rounded-full border border-navy/20 flex items-center justify-center text-navy hover:bg-navy hover:text-cream disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                {Array.from({ length: pageCount }, (_, p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => goToPage(p)}
                    aria-label={`Page ${p + 1}`}
                    aria-current={p === currentPage ? "page" : undefined}
                    className={`w-10 h-10 rounded-full text-[13px] font-bold transition-colors ${
                      p === currentPage ? "bg-navy text-cream" : "text-navy/60 hover:text-navy hover:bg-navy/5"
                    }`}
                  >
                    {p + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === pageCount - 1}
                  aria-label="Next page"
                  className="w-10 h-10 rounded-full border border-navy/20 flex items-center justify-center text-navy hover:bg-navy hover:text-cream disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <p className="text-[10px] tracking-[3px] uppercase text-navy/50">
                {currentPage * MENU_PAGE_SIZE + 1}–{Math.min((currentPage + 1) * MENU_PAGE_SIZE, filteredItems.length)} of {filteredItems.length} dishes
              </p>
            </nav>
          )}
        </section>

        {/* Cart Indicator (only if items exist) */}
        {cartCount > 0 && (
          <motion.button
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            onClick={() => setIsCartOpen(true)}
            className="fixed bottom-0 left-0 right-0 z-50 bg-navy text-cream py-6 px-8 flex items-center justify-between md:hidden"
          >
            <div className="flex items-center gap-4">
              <div className="relative">
                <ShoppingBag size={24} />
                <span className="absolute -top-2 -right-2 bg-ocean text-navy w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <span className="text-[11px] tracking-[2px] uppercase font-bold">View Order</span>
            </div>
            <span className="text-xl font-bold">AED {formatPrice(cartTotal)}</span>
          </motion.button>
        )}

        {/* Cart Sidebar */}
        <AnimatePresence>
          {isCartOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCartOpen(false)}
                className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-50"
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white text-navy z-50 shadow-2xl flex flex-col"
              >
                <div className="p-8 flex items-center justify-between border-b border-navy/10">
                  <div className="flex flex-col">
                    <h2 className="font-playfair text-3xl font-bold">{tableNumber ? "Dine-in Order" : "Order"}</h2>
                    {tableNumber && <span className="text-[9px] tracking-[2px] uppercase text-ocean font-bold mt-1">Table {tableNumber}</span>}
                    {!tableNumber && <span className="text-[9px] tracking-[2px] uppercase text-ocean font-bold mt-1 flex items-center gap-1"><Truck size={10} /> Express Delivery</span>}
                  </div>
                  <button onClick={() => setIsCartOpen(false)} className="text-navy/50 hover:text-navy transition-colors">
                    <X size={24} />
                  </button>
                </div>

                <div className="flex-grow overflow-y-auto p-8 flex flex-col gap-8">
                  {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <ShoppingBag size={48} className="text-navy/20 mb-6" />
                      <p className="text-navy/60 font-light italic">Your cart is empty.</p>
                    </div>
                  ) : (
                    cart.map(({ item, quantity }) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="w-20 h-20 shrink-0 rounded-sm overflow-hidden">
                          <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-playfair font-bold text-lg leading-tight">{item.name}</h4>
                            <span className={`font-medium ${item.discount ? "text-offer" : "text-ocean"}`}>AED {formatPrice(unitPrice(item) * quantity)}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-4">
                            <div className="flex items-center border border-navy/20 rounded-full px-2 py-1">
                              <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-navy/50 hover:text-navy"><Minus size={14} /></button>
                              <span className="w-8 text-center text-xs font-bold">{quantity}</span>
                              <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-navy/50 hover:text-navy"><Plus size={14} /></button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="p-8 bg-navy text-cream">
                    <div className="flex justify-between items-center mb-6">
                      <span className="text-[10px] tracking-[3px] uppercase text-white/40">Total Amount</span>
                      <span className="font-playfair text-3xl font-bold">AED {formatPrice(cartTotal)}</span>
                    </div>
                    <button
                      onClick={handlePlaceOrder}
                      className="w-full bg-ocean text-navy rounded-lg py-5 font-jost text-[10px] font-bold tracking-[3px] uppercase transition-all hover:bg-white"
                    >
                      {tableNumber ? "Send to Kitchen" : "Place Order Now"}
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Confirmation Modal */}
        <AnimatePresence>
          {isConfirming && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => orderStatus === 'idle' && setIsConfirming(false)}
                className="absolute inset-0 bg-ink/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="relative bg-white text-navy p-10 md:p-14 max-w-lg w-full rounded-sm shadow-2xl text-center"
              >
                {orderStatus === 'idle' ? (
                  <>
                    <div className="w-20 h-20 bg-ocean/20 text-ocean rounded-full flex items-center justify-center mx-auto mb-8">
                      <Utensils size={40} />
                    </div>
                    <h2 className="font-playfair text-3xl font-bold mb-4">Confirm Your Order</h2>
                    <p className="text-navy/70 font-light mb-6 leading-relaxed">
                      {tableNumber
                        ? `Your order will be sent directly to the kitchen for Table ${tableNumber}. Please confirm to proceed.`
                        : "Are you sure you want to place this order? This action cannot be undone."}
                    </p>

                    <div className="flex flex-col gap-3 mb-6 text-left">
                      <div>
                        <label htmlFor="o-name" className="block text-[9px] tracking-[2px] uppercase font-bold text-navy/70 mb-1.5">Your Name *</label>
                        <input id="o-name" type="text" autoComplete="name" maxLength={60} value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="Enter your name" className="w-full border border-navy/20 rounded-lg px-3.5 py-2.5 text-[16px] text-navy bg-white placeholder:text-navy/30 focus:border-navy focus:ring-2 focus:ring-ocean/40 outline-none" />
                      </div>
                      <div>
                        <label htmlFor="o-phone" className="block text-[9px] tracking-[2px] uppercase font-bold text-navy/70 mb-1.5">Phone Number *</label>
                        <input id="o-phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} value={customer.phone} onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))} placeholder="Enter your phone number" className="w-full border border-navy/20 rounded-lg px-3.5 py-2.5 text-[16px] text-navy bg-white placeholder:text-navy/30 focus:border-navy focus:ring-2 focus:ring-ocean/40 outline-none" />
                      </div>
                      {!tableNumber && (
                        <div>
                          <label htmlFor="o-table" className="block text-[9px] tracking-[2px] uppercase font-bold text-navy/70 mb-1.5">
                            Table Number
                          </label>
                          {/* The restaurant's tables (src/lib/bookings.ts); the kitchen sees e.g. "Table Outside 6" */}
                          <select id="o-table" value={typedTable} onChange={(e) => setTypedTable(e.target.value)} className="w-full border border-navy/20 rounded-lg px-3.5 py-2.5 text-[16px] text-navy bg-white focus:border-navy focus:ring-2 focus:ring-ocean/40 outline-none">
                            <option value="">Takeaway (no table)</option>
                            {TABLE_AREAS.map((a) => (
                              <optgroup key={a.area} label={a.label}>
                                {TABLES.filter((t) => t.area === a.area).map((t) => (
                                  <option key={t.id} value={tableLabel(t.id)}>{tableLabel(t.id)}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>
                      )}
                      {orderError && <p role="alert" className="text-[13px] text-offer font-semibold">{orderError}</p>}
                    </div>

                    <div className="flex flex-col gap-4">
                      <button
                        onClick={submitOrder}
                        className="w-full bg-navy text-white rounded-lg py-5 font-jost text-[10px] font-bold tracking-[3px] uppercase hover:bg-ocean hover:text-navy transition-all"
                      >
                        Yes, Confirm Order
                      </button>
                      <button
                        onClick={() => setIsConfirming(false)}
                        className="w-full border border-navy/20 rounded-lg py-5 font-jost text-[10px] font-bold tracking-[3px] uppercase text-navy/70 hover:text-navy hover:border-navy transition-all"
                      >
                        Go Back
                      </button>
                    </div>
                  </>
                ) : orderStatus === 'submitting' ? (
                  <div className="py-12">
                    <div className="w-16 h-16 border-4 border-ocean border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
                    <h3 className="text-[10px] tracking-[4px] uppercase font-bold text-navy">Sending to Kitchen...</h3>
                  </div>
                ) : (
                  <div className="py-12">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-20 h-20 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center mx-auto mb-8"
                    >
                      <Check size={40} />
                    </motion.div>
                    <h3 className="font-playfair text-3xl font-bold mb-2 text-green-600">Order Sent!</h3>
                    <p className="text-navy/70 font-light">Chef is preparing your meal.</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}

