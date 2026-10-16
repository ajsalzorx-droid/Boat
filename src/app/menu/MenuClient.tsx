"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingBag, Plus, Minus, X, Check, Utensils, Truck } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { MenuItem } from "@/data/menu";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useSection } from "@/context/ContentContext";
import { placeOrder, type PlaceOrderResult } from "./actions";

const categories = [
  "All",
  "Appetizers",
  "Soups & Salads",
  "Main Courses",
  "Signature Dishes",
  "Sharing Platters",
  "Market Fresh",
  "Desserts",
  "Beverages",
];

// Dishes come from the server (page.tsx), so they are in the HTML Google reads.
// tableNumber = ?table= from the QR code on the restaurant table.
export default function MenuClient({ initialItems, tableNumber }: { initialItems: MenuItem[]; tableNumber: string | null }) {
  const { cart, addToCart, updateQuantity, cartTotal, cartCount, isCartOpen, setIsCartOpen } = useCart();
  const hero = useSection("menu_hero").fields;
  const [activeCategory, setActiveCategory] = useState("All");
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'submitting' | 'complete'>('idle');
  
  const dbMenuItems = initialItems;

  const filteredItems = activeCategory === "All" 
    ? dbMenuItems 
    : dbMenuItems.filter(item => item.category === activeCategory);

  const handleAddToCart = (item: MenuItem) => {
    addToCart(item);
    setShowSuccess(item.id);
    setTimeout(() => setShowSuccess(null), 2000);
  };

  const handlePlaceOrder = () => {
    setIsConfirming(true);
  };

  const submitOrder = async () => {
    setOrderStatus('submitting');
    
    // Sent through a server action: the database prices the items, so the
    // browser can't choose the total or insert into orders directly.
    let result: PlaceOrderResult;
    try {
      result = await placeOrder(tableNumber, cart.map(c => ({ id: c.item.id, quantity: c.quantity })));
    } catch (e) {
      console.error("Unexpected error saving order:", e);
      result = { ok: false, error: "Could not send your order. Please try again or ask a waiter." };
    }

    if (!result.ok) {
      setOrderStatus('idle');
      alert(result.error);
      return;
    }

    setOrderStatus('complete');
    // Clear cart after order is complete would be good, but let's keep it simple for now as per current logic
    setTimeout(() => {
      setIsConfirming(false);
      setOrderStatus('idle');
      setIsCartOpen(false);
    }, 2000);
  };

  return (
    <>
      <Navbar />
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
              <h1 className="font-playfair text-[clamp(40px,6vw,84px)] font-bold leading-none mb-6">
                {hero.title}
              </h1>
              <p className="text-[15px] text-white/60 max-w-xl leading-relaxed font-light">
                {tableNumber 
                  ? hero.body_table
                  : hero.body}
              </p>
            </motion.div>
          </div>
        </section>

        {/* Menu Navigation */}
        <nav aria-label="Menu categories" className="sticky top-[75px] z-30 bg-white/95 backdrop-blur-md border-b border-navy/10 px-8 md:px-20 py-6 overflow-x-auto">
          <div className="flex items-center gap-8 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap text-[10px] tracking-[3px] uppercase transition-all relative ${
                  activeCategory === cat ? "text-navy font-bold" : "text-navy/60 hover:text-navy"
                }`}
              >
                {cat}
                {activeCategory === cat && (
                  <motion.div layoutId="activeCat" className="absolute -bottom-1 left-0 right-0 h-[2px] bg-ocean" />
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
            {filteredItems.map((item) => (
              <motion.article
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="group flex flex-col"
              >
                <div className="relative aspect-[4/3] overflow-hidden mb-6 rounded-sm shadow-sm">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
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
                  <button 
                    onClick={() => handleAddToCart(item)}
                    aria-label={`Add ${item.name} to order`}
                    className="absolute bottom-3 right-3 md:bottom-4 md:right-4 bg-navy text-cream p-2.5 md:p-4 rounded-full shadow-2xl md:translate-y-4 md:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hover:bg-ocean hover:text-navy opacity-100 translate-y-0"
                  >
                    {showSuccess === item.id ? <Check size={20} className="w-4 h-4 md:w-5 md:h-5" /> : <Plus size={20} className="w-4 h-4 md:w-5 md:h-5" />}
                  </button>
                </div>
              
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-playfair text-2xl font-bold text-navy leading-tight">
                    {item.name}
                  </h3>
                  <span className="font-jost text-lg font-medium text-ocean">
                    AED {item.price}
                  </span>
                </div>
                <p className="text-[13px] text-navy/70 leading-relaxed font-light mb-6 flex-grow">
                  {item.description}
                </p>
                <div className="h-[1px] w-12 bg-ocean/30"></div>
              </motion.article>
            ))}
            </AnimatePresence>
          </div>
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
            <span className="text-xl font-bold">AED {cartTotal}</span>
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
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-playfair font-bold text-lg leading-tight">{item.name}</h4>
                            <span className="text-ocean font-medium">AED {parseInt(item.price) * quantity}</span>
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
                      <span className="font-playfair text-3xl font-bold">AED {cartTotal}</span>
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
                    <p className="text-navy/70 font-light mb-8 leading-relaxed">
                      {tableNumber 
                        ? `Your order will be sent directly to the kitchen for Table ${tableNumber}. Please confirm to proceed.`
                        : "Are you sure you want to place this order? This action cannot be undone."}
                    </p>
                  
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

