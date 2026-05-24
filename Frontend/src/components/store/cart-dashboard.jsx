"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  ArrowRight, Sparkles, AlertCircle, CheckCircle, 
  Loader2, ShieldCheck, Terminal, X, MapPin 
} from "lucide-react";
import { useRouter } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CartLineItem } from "@/components/cards/cart-line-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCartStore } from "@/lib/cartStore";
import { useKundliStore } from "@/lib/store";
import { getApiUrl } from "@/lib/apiConfig";

export function CartDashboard() {
  const router = useRouter();
  
  // Zustand state
  const items = useCartStore((state) => state.cartItems);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeFromCart = useCartStore((state) => state.removeFromCart);
  const clearCart = useCartStore((state) => state.clearCart);

  // Auth state
  const { token, isAuthenticated, currentUser } = useKundliStore();

  // Component states
  const [isBooting, setIsBooting] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [simulationData, setSimulationData] = useState(null);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [toast, setToast] = useState(null);
  const [address, setAddress] = useState({
    fullName: currentUser?.name || "",
    street: "",
    city: "",
    state: "",
    postalCode: "",
    phone: currentUser?.phone || "",
  });

  // Sync if currentUser loads later
  useEffect(() => {
    if (currentUser) {
      const timer = setTimeout(() => {
        setAddress((prev) => ({
          ...prev,
          fullName: prev.fullName || currentUser.name || "",
          phone: prev.phone || currentUser.phone || "",
        }));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  useEffect(() => {
    const timeout = setTimeout(() => setIsBooting(false), 420);
    return () => clearTimeout(timeout);
  }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = items.length === 0 || subtotal > 499 ? 0 : 40; // Indian standards
    const grand = subtotal + shipping;
    return { subtotal, shipping, grand };
  }, [items]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async () => {
    if (!isAuthenticated) {
      showToast("Please sign in to proceed with checkout.", "error");
      return;
    }
    if (items.length === 0) {
      showToast("Your cart is empty.", "error");
      return;
    }

    // Address verification prior to checkout
    if (
      !address.fullName.trim() ||
      !address.street.trim() ||
      !address.city.trim() ||
      !address.state.trim() ||
      !address.postalCode.trim() ||
      !address.phone.trim()
    ) {
      showToast("Please complete your shipping address details first.", "error");
      const addrForm = document.getElementById("shipping-address-form");
      if (addrForm) {
        addrForm.scrollIntoView({ behavior: "smooth" });
      }
      return;
    }

    try {
      setIsCheckingOut(true);
      const payloadItems = items.map((item) => ({
        product: item.id,
        quantity: item.quantity,
      }));

      const response = await fetch(getApiUrl("/api/orders/checkout"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          items: payloadItems,
          shippingAddress: address
        }),
      });

      const resData = await response.json();
      if (!response.ok || resData.status !== "success") {
        showToast(resData.message || "Failed to initialize checkout.", "error");
        return;
      }

      const { order, razorpayOrderId, amount, currency, keyId, isSimulation } = resData.data;

      if (isSimulation) {
        setSimulationData({
          orderId: razorpayOrderId,
          amount: amount / 100,
          originalOrder: order,
        });
        showToast("Simulation initialized. Use the developer panel to verify.", "success");
      } else {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          showToast("Razorpay SDK failed to load. Are you offline?", "error");
          return;
        }

        const options = {
          key: keyId,
          amount,
          currency,
          name: "Kalyan Spiritual Shop",
          description: "Secured Celestial Transaction",
          order_id: razorpayOrderId,
          handler: async function (verifyResponse) {
            try {
              setIsVerifying(true);
              const verifyRes = await fetch(getApiUrl("/api/orders/verify"), {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  razorpay_order_id: verifyResponse.razorpay_order_id,
                  razorpay_payment_id: verifyResponse.razorpay_payment_id,
                  razorpay_signature: verifyResponse.razorpay_signature,
                }),
              });

              const verifyData = await verifyRes.json();
              if (verifyRes.ok && verifyData.status === "success") {
                showToast("Transaction verified! Enjoy your blessings.", "success");
                setOrderSuccess({
                  razorpayOrderId: verifyResponse.razorpay_order_id,
                  razorpayPaymentId: verifyResponse.razorpay_payment_id,
                  totalAmount: amount / 100,
                });
                clearCart();
              } else {
                showToast(verifyData.message || "Verification failed.", "error");
              }
            } catch (err) {
              console.error(err);
              showToast("Server error during validation.", "error");
            } finally {
              setIsVerifying(false);
            }
          },
          prefill: {
            name: currentUser?.name || "",
            email: currentUser?.email || "",
          },
          theme: {
            color: "#D97706",
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      console.error(err);
      showToast("Checkout error. Is the API server offline?", "error");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleSimulateSuccess = async () => {
    if (!simulationData) return;
    try {
      setIsVerifying(true);
      const paymentId = `pay_sim_${Math.random().toString(36).substring(2, 10)}`;
      const signature = `sig_sim_${Math.random().toString(36).substring(2, 10)}`;

      const verifyRes = await fetch(getApiUrl("/api/orders/verify"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_order_id: simulationData.orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
        }),
      });

      const verifyData = await verifyRes.json();
      if (verifyRes.ok && verifyData.status === "success") {
        showToast("Simulated payment successfully verified!", "success");
        setOrderSuccess({
          razorpayOrderId: simulationData.orderId,
          razorpayPaymentId: paymentId,
          totalAmount: simulationData.amount,
        });
        clearCart();
        setSimulationData(null);
      } else {
        showToast(verifyData.message || "Verification failed in simulation.", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error processing verification.", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateFailure = async () => {
    if (!simulationData) return;
    try {
      setIsVerifying(true);
      await fetch(getApiUrl("/api/orders/verify"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          razorpay_order_id: simulationData.orderId,
          razorpay_payment_id: "",
          razorpay_signature: "",
        }),
      });

      showToast("Simulated payment failure recorded in database.", "error");
      setSimulationData(null);
    } catch (err) {
      console.error(err);
      showToast("Error processing failure verification.", "error");
    } finally {
      setIsVerifying(false);
    }
  };

  // Render Order Confirmed State
  if (orderSuccess) {
    return (
      <DashboardShell title="Order Placed" description="Review your cosmic alignment order summary.">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl mx-auto rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-emerald-50/20 to-white dark:from-emerald-950/20 dark:to-neutral-900 p-8 shadow-2xl backdrop-blur-xl text-center space-y-6 relative overflow-hidden"
        >
          <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-emerald-400/10 dark:bg-emerald-500/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-amber-400/10 dark:bg-amber-500/5 blur-3xl pointer-events-none" />
          
          <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
            <ShieldCheck className="h-10 w-10 animate-bounce" />
          </div>
          
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
              Payment Verified
            </p>
            <h2 className="font-mono text-3xl text-gray-900 dark:text-white">
              Order Confirmed!
            </h2>
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              Your celestial offering has been recorded. Our spiritual guardians are carefully choosing and packaging your item with custom protections and prayers.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-100 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/50 p-4 space-y-3 text-left text-sm font-mono text-gray-700 dark:text-neutral-300">
            <div className="flex justify-between border-b border-gray-100 dark:border-neutral-800 pb-2">
              <span>Order Reference:</span>
              <span className="font-semibold text-gray-900 dark:text-white select-all text-xs">
                {orderSuccess.razorpayOrderId}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-100 dark:border-neutral-800 pb-2">
              <span>Payment ID:</span>
              <span className="font-semibold text-gray-900 dark:text-white text-xs select-all">
                {orderSuccess.razorpayPaymentId}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span>Total Paid:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ₹{orderSuccess.totalAmount.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => router.push("/store")}
              className="flex-1 rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-900 font-semibold shadow-md hover:brightness-105"
            >
              Continue Shopping
            </Button>
            <Button 
              variant="outline"
              onClick={() => setOrderSuccess(null)}
              className="flex-1 rounded-full border-gray-200 dark:border-neutral-800 text-gray-700 dark:text-neutral-300"
            >
              Go to Dashboard
            </Button>
          </div>
        </motion.div>
      </DashboardShell>
    );
  }

  const summaryPanel = (
    <motion.div 
      initial={{ opacity: 0, y: 14 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} 
      className="
        relative overflow-hidden
        rounded-3xl border border-yellow-200/80
        bg-gradient-to-br from-amber-50 via-white to-yellow-100
        p-6 shadow-[0_22px_70px_rgba(250,204,21,0.35)]
        backdrop-blur-xl space-y-4
      "
    >
      <motion.div aria-hidden initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-yellow-300/30 blur-3xl"/>

      <div className="relative flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-600">
          Order Summary
        </p>
        <Sparkles className="h-4 w-4 text-yellow-500"/>
      </div>

      <div className="relative space-y-3 text-sm text-gray-700">
        <div className="flex justify-between">
          <span>
            Subtotal <span className="text-[10px] text-gray-400 font-normal">(GST inclusive)</span>
          </span>
          <span className="font-mono text-gray-900">
            ₹{totals.subtotal.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Shipping</span>
          <span className="font-mono text-gray-900">
            {totals.shipping > 0 ? `₹${totals.shipping.toFixed(2)}` : "FREE"}
          </span>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-yellow-100 pt-4">
        <div>
          <span className="text-sm font-semibold text-gray-700 block">Total</span>
          <span className="text-[10px] text-gray-400 font-normal block -mt-1">(GST inclusive)</span>
        </div>
        <span className="font-mono text-2xl text-gray-900">
          ₹{totals.grand.toFixed(2)}
        </span>
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
        <Button 
          onClick={handleCheckout}
          disabled={isCheckingOut || items.length === 0}
          className="
            mt-4 w-full rounded-full
            bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600
            text-gray-900 text-sm font-semibold
            shadow-[0_14px_40px_rgba(250,204,21,0.55)]
            hover:brightness-105 hover:shadow-[0_18px_50px_rgba(245,158,11,0.7)]
            transition-all duration-300
            flex items-center justify-center gap-2
          "
        >
          {isCheckingOut ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Initializing secure checkout...
            </>
          ) : (
            <>
              Proceed to Checkout
              <ArrowRight className="ml-2 h-4 w-4"/>
            </>
          )}
        </Button>
      </motion.div>
    </motion.div>
  );

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(2)].map((_, i) => (
        <Skeleton key={i} className="h-36 w-full rounded-3xl"/>
      ))}
    </div>
  );

  return (
    <DashboardShell 
      title="My Cart" 
      description="Review and complete your order." 
      rightPanel={summaryPanel} 
      actions={
        <div className="
          hidden lg:flex items-center
          rounded-full border border-yellow-200/80 bg-white/90 px-4 py-2 
          text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-700
          shadow-sm
        "
        >
          Items · {items.length.toString().padStart(2, "0")}
        </div>
      }
    >
      <AnimatePresence mode="popLayout">
        {isBooting ? (
          renderSkeleton()
        ) : items.length > 0 ? (
          <motion.div 
            layout 
            className="space-y-4" 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {items.map((item) => (
              <CartLineItem 
                key={item.id} 
                {...item} 
                onQuantityChange={updateQuantity} 
                onRemove={removeFromCart}
              />
            ))}

            {/* Elegant Shipping Address Form */}
            <motion.div
              id="shipping-address-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6 rounded-3xl border border-yellow-200 bg-white/70 dark:bg-neutral-900/50 p-6 shadow-md backdrop-blur-sm space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-gray-150/60 dark:border-neutral-800 pb-3">
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                  <MapPin className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Delivery Address</h3>
                  <p className="text-[10px] text-gray-400">Provide shipping details for your Vedic energized items.</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400 block">Recipient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={address.fullName}
                    onChange={(e) => setAddress({ ...address, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition font-medium"
                  />
                </div>
                
                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400 block">Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. +91 98765 43210"
                    value={address.phone}
                    onChange={(e) => setAddress({ ...address, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition font-medium"
                  />
                </div>
              </div>

              {/* Street Address */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400 block">Street Address / Landmark *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 102, Shanti Kunj, Sector-15, near Ram Mandir"
                  value={address.street}
                  onChange={(e) => setAddress({ ...address, street: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition font-medium"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* City */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400 block">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Haridwar"
                    value={address.city}
                    onChange={(e) => setAddress({ ...address, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition font-medium"
                  />
                </div>

                {/* State */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400 block">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Uttarakhand"
                    value={address.state}
                    onChange={(e) => setAddress({ ...address, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition font-medium"
                  />
                </div>

                {/* PIN Code */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-neutral-400 block">PIN / Postal Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 249401"
                    value={address.postalCode}
                    onChange={(e) => setAddress({ ...address, postalCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 transition font-medium"
                  />
                </div>
              </div>

              {/* Complete Order & Pay Button */}
              <div className="pt-4 border-t border-gray-150/40 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-left w-full sm:w-auto">
                  <p className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase tracking-widest font-bold">Total Amount Due (GST inclusive)</p>
                  <p className="text-lg font-black text-amber-600 dark:text-amber-500 font-mono">₹{totals.grand.toFixed(2)}</p>
                </div>
                <Button
                  onClick={handleCheckout}
                  disabled={isCheckingOut || items.length === 0}
                  className="w-full sm:w-auto px-8 rounded-full bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-600 text-gray-900 text-xs font-bold shadow-[0_8px_25px_rgba(245,158,11,0.3)] hover:brightness-105 transition flex items-center justify-center gap-2 cursor-pointer h-11"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="h-4.5 w-4.5 animate-spin" />
                      Opening secure gateway...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4.5 w-4.5 text-gray-900" />
                      Complete Order & Pay via Razorpay
                      <ArrowRight className="ml-1 h-4 w-4 text-gray-900"/>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 16 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="
              rounded-3xl border border-dashed border-yellow-200
              bg-gradient-to-br from-amber-50 via-white to-yellow-50
              p-10 text-center shadow-sm
            "
          >
            <p className="font-mono text-lg text-gray-900">Your cart is empty</p>
            <p className="mt-2 text-sm text-gray-600">
              Add products to continue shopping.
            </p>
            <Button 
              onClick={() => router.push("/store")}
              className="mt-4 rounded-full bg-gray-900 text-white hover:bg-gray-800"
            >
              Browse Store
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Developer simulation modal overlay */}
      <AnimatePresence>
        {simulationData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-900 text-neutral-200 p-6 shadow-2xl space-y-6"
            >
              <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white font-mono tracking-tight">
                      Developer Sandbox Simulation
                    </h3>
                    <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold">
                      Razorpay Simulation Mode
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSimulationData(null)}
                  className="text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3 text-sm leading-relaxed">
                <p className="text-neutral-300">
                  The backend has detected placeholder Razorpay credentials. In order to allow verification and complete the flow, you can simulate a transaction response below.
                </p>
                
                <div className="rounded-xl bg-neutral-900 p-4 border border-neutral-800/80 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-neutral-400">
                    <span>Simulated Order ID:</span>
                    <span className="text-amber-400 select-all font-semibold">{simulationData.orderId}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Grand Total:</span>
                    <span className="text-emerald-400 font-semibold">₹{simulationData.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-400">
                    <span>Status:</span>
                    <span className="text-yellow-400 animate-pulse font-semibold">Awaiting Verification</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button
                  onClick={handleSimulateSuccess}
                  disabled={isVerifying}
                  className="w-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 text-gray-900 font-semibold flex items-center justify-center gap-2 shadow-[0_12px_30px_rgba(16,185,129,0.3)] hover:brightness-105 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying simulated payment...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Simulate Payment Success (Deducts Stock)
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSimulateFailure}
                  disabled={isVerifying}
                  variant="ghost"
                  className="w-full rounded-full border border-red-500/20 text-red-400 hover:bg-red-500/10 font-medium cursor-pointer"
                >
                  Simulate Payment Failure
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Elegant Toast Notifications System */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-md border ${
              toast.type === "success"
                ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/30"
                : toast.type === "error"
                ? "bg-red-950/90 text-red-200 border-red-500/30"
                : "bg-neutral-900/90 text-white border-neutral-700/30"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4.5 h-4.5 text-red-400" />
            )}
            <span className="text-xs font-semibold tracking-wide">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
