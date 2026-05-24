"use client";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { 
  ShieldCheck, Truck, Sparkles, ChevronLeft, 
  ShoppingBag, Star, CheckCircle, AlertCircle, 
  Heart, Share2, ShoppingCart, ArrowRight
} from "lucide-react";
import { useKundliStore } from "@/lib/store";
import { useCartStore } from "@/lib/cartStore";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/apiConfig";

const categoryThemes = {
  Gemstone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  Perfume: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
  Poster: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
  Accessory: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
};

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useKundliStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const cartItems = useCartStore((state) => state.cartItems);
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // States
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [toast, setToast] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const fetchRelated = async (category, currentProductId) => {
    try {
      const res = await fetch(getApiUrl("/api/products"));
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "success" && data.data?.products) {
        // Filter by same category and exclude current product
        const filtered = data.data.products
          .filter((p) => p.category === category && (p._id || p.id) !== currentProductId)
          .slice(0, 4); // Limit to 4 items
        setRelatedProducts(filtered);
      }
    } catch (err) {
      console.error("Failed to load related products", err);
    }
  };

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch(getApiUrl(`/api/products/${id}`));
      if (!res.ok) {
        throw new Error("Failed to fetch product details. It might have been deleted or the ID is invalid.");
      }
      
      const data = await res.json();
      if (data.status === "success" && data.data?.product) {
        setProduct(data.data.product);
        // Reset quantity selection on product change
        setQuantity(1);
        // Load related items under same category
        fetchRelated(data.data.product.category, data.data.product._id || data.data.product.id);
      } else {
        throw new Error("Product data not found in response.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Error loading product. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProductDetails();
    }
  }, [id]);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleAddToCart = () => {
    if (!token) {
      showToast("Please sign in to add items to your cart.", "error");
      setTimeout(() => {
        navigate("/login", { state: { from: { pathname: `/store/product/${id}` } } });
      }, 1500);
      return;
    }
    
    if (!product) return;
    
    addToCart(product, quantity);
    setToast({
      message: `Added ${quantity} × "${product.name}" to cart!`,
      type: "success",
      action: {
        label: "Go to Cart 🛒",
        onClick: () => navigate("/Cart")
      }
    });
    setTimeout(() => setToast(null), 5000);
  };

  const handleBuyNow = () => {
    if (!token) {
      showToast("Please sign in to make a purchase.", "error");
      setTimeout(() => {
        navigate("/login", { state: { from: { pathname: `/store/product/${id}` } } });
      }, 1500);
      return;
    }
    
    if (!product) return;
    
    addToCart(product, quantity);
    navigate("/Cart");
  };

  const handleQuantityChange = (val) => {
    const stockLimit = product?.stock || 10;
    const nextVal = Math.max(1, Math.min(val, stockLimit));
    setQuantity(nextVal);
  };

  // Safe formatting helper
  const formatPrice = (price) => {
    return typeof price === "number" ? price.toLocaleString("en-IN") : "0";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500 mb-4" />
        <p className="text-gray-500 dark:text-neutral-400 font-medium tracking-wide">Fetching sacred specifications...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white dark:bg-neutral-950 py-16 px-4">
        <div className="max-w-md mx-auto text-center rounded-3xl border border-dashed border-gray-200 dark:border-neutral-800 p-12 bg-white/40 dark:bg-neutral-900/20 backdrop-blur-sm">
          <AlertCircle className="w-12 h-12 text-rose-500/80 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Failed to load product</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">
            {error || "We couldn't retrieve the details of this item. It may have been removed."}
          </p>
          <Button 
            onClick={() => navigate("/store")}
            className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs px-6 py-2.5 shadow-md"
          >
            Back to Spiritual Shop
          </Button>
        </div>
      </div>
    );
  }

  const outOfStock = product.stock === 0;
  const lowStock = product.stock > 0 && product.stock <= 5;
  const discountMrp = Math.round(product.price * 1.35); // Generate mock MRP for discount visualization

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-amber-50/10 dark:from-neutral-950 dark:to-neutral-900 text-neutral-800 dark:text-neutral-100 py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Toast Alert System */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 left-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-md border ${
              toast.type === "success"
                ? "bg-emerald-950/95 text-emerald-100 border-emerald-500/30"
                : "bg-red-950/95 text-red-100 border-red-500/30"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="w-4.5 h-4.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4.5 h-4.5 text-red-400" />
            )}
            <span className="text-xs font-semibold tracking-wide">{toast.message}</span>
            {toast.action && (
              <button 
                onClick={toast.action.onClick}
                className="ml-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:brightness-105 text-gray-950 text-[10px] font-bold px-3 py-1 rounded-lg shadow-sm cursor-pointer select-none transition"
              >
                {toast.action.label}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating View Cart & Checkout Panel */}
      {cartItemCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <Button
            onClick={() => navigate("/Cart")}
            className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-900 font-bold px-6 py-5 shadow-[0_12px_35px_rgba(245,158,11,0.45)] hover:shadow-[0_16px_40px_rgba(245,158,11,0.55)] hover:scale-105 transition-all duration-300 flex items-center gap-2 cursor-pointer border border-yellow-400/20"
          >
            <ShoppingBag className="w-4.5 h-4.5 text-gray-900" />
            <span>View Cart ({cartItemCount})</span>
            <ArrowRight className="w-4 h-4 text-gray-900" />
          </Button>
        </motion.div>
      )}

      <div className="max-w-7xl mx-auto">
        
        {/* Back navigation */}
        <Link 
          href="/store" 
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-amber-600 transition-colors mb-6 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Shop Catalog
        </Link>

        {/* Amazon-style main details grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start bg-white/70 dark:bg-neutral-900/40 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-gray-200/50 dark:border-neutral-800/40 shadow-xs mb-16">
          
          {/* Left Column: Premium Large Image Viewer (lg: col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 dark:bg-neutral-950 border border-gray-100 dark:border-neutral-800 shadow-md group">
              <Image
                src={product.thumbnail || "/placeholder-product.jpg"}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                priority
              />
              
              {/* Floating badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {outOfStock ? (
                  <span className="bg-rose-600 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full shadow-md">
                    Out of Stock
                  </span>
                ) : lowStock ? (
                  <span className="bg-orange-500 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full shadow-md animate-pulse">
                    Only {product.stock} Left!
                  </span>
                ) : (
                  <span className="bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded-full shadow-md">
                    Active Stock
                  </span>
                )}
              </div>

              {/* Utility floating buttons */}
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button 
                  onClick={() => {
                    setIsFavorite(!isFavorite);
                    showToast(isFavorite ? "Removed from Wishlist" : "Saved to your Celestial Wishlist! 🌟", "success");
                  }}
                  className={`p-2.5 rounded-full backdrop-blur-md shadow-md border transition-all ${
                    isFavorite 
                      ? "bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/40 dark:border-rose-900" 
                      : "bg-white/80 border-gray-250/50 text-gray-500 hover:text-rose-500 dark:bg-neutral-900/80 dark:border-neutral-800"
                  }`}
                  title="Save to wishlist"
                >
                  <Heart className="w-4 h-4 fill-current" style={{ fillOpacity: isFavorite ? 1 : 0 }} />
                </button>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    showToast("Shareable link copied to clipboard! 🔗", "success");
                  }}
                  className="p-2.5 rounded-full bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md shadow-md border border-gray-250/50 dark:border-neutral-800 text-gray-500 hover:text-amber-500 transition-all"
                  title="Copy link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Micro Trust Indicators under Image */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="bg-gray-50 dark:bg-neutral-900/40 rounded-xl p-2.5 border border-gray-150/40 dark:border-neutral-800/60 text-center">
                <ShieldCheck className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-800 dark:text-neutral-200 leading-tight">100% Certified</p>
                <p className="text-[8px] text-gray-400 mt-0.5">Authenticity Guaranteed</p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-900/40 rounded-xl p-2.5 border border-gray-150/40 dark:border-neutral-800/60 text-center">
                <Sparkles className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-800 dark:text-neutral-200 leading-tight">Vedic Energized</p>
                <p className="text-[8px] text-gray-400 mt-0.5">Activated via Mantras</p>
              </div>
              <div className="bg-gray-50 dark:bg-neutral-900/40 rounded-xl p-2.5 border border-gray-150/40 dark:border-neutral-800/60 text-center">
                <Truck className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                <p className="text-[10px] font-bold text-gray-800 dark:text-neutral-200 leading-tight">Free Insured Ship</p>
                <p className="text-[8px] text-gray-400 mt-0.5">Trackable Delivery</p>
              </div>
            </div>
          </div>

          {/* Middle Column: Amazon-style Product Info (lg: col-span-4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Category & Breadcrumbs */}
            <div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-neutral-500 mb-2">
                <span>Shop</span>
                <span>/</span>
                <span className="capitalize">{product.category}s</span>
              </div>
              
              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${
                categoryThemes[product.category] || "bg-gray-100 text-gray-700 border-gray-200"
              }`}>
                {product.category}
              </span>
            </div>

            {/* Product Title */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight font-poppins">
                {product.name}
              </h1>
              
              {/* Star Rating Mockup */}
              <div className="flex items-center gap-2 mt-3 text-sm">
                <div className="flex items-center text-amber-400">
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" />
                  <Star className="w-4 h-4 fill-current" style={{ clipPath: "polygon(0 0, 80% 0, 80% 100%, 0% 100%)" }} />
                </div>
                <span className="font-semibold text-amber-700 dark:text-amber-400">4.8</span>
                <span className="text-gray-300">|</span>
                <span className="text-sky-650 hover:underline cursor-pointer text-xs dark:text-sky-400">124 ratings & reviews</span>
              </div>
            </div>

            <hr className="border-gray-200/60 dark:border-neutral-800" />

            {/* Price Details */}
            <div className="space-y-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">
                  ₹{formatPrice(product.price)}
                </span>
                <span className="text-sm text-gray-400 line-through">
                  ₹{formatPrice(discountMrp)}
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded">
                  Save 35%
                </span>
              </div>
              <p className="text-[10px] text-gray-400 dark:text-neutral-500">Inclusive of all duties, taxes, and insured shipping fees.</p>
            </div>

            <hr className="border-gray-200/60 dark:border-neutral-800" />

            {/* About this item Bullet Points */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">About This Offering</h3>
              
              <ul className="space-y-2 text-xs leading-relaxed text-gray-650 dark:text-neutral-400 pl-4 list-disc">
                <li>
                  <strong className="text-gray-800 dark:text-neutral-200">High Energetic Vibration:</strong> Carefully handpicked by certified Vedic astrologers to match the exact spiritual wavelengths required for the {product.category} class.
                </li>
                <li>
                  <strong className="text-gray-800 dark:text-neutral-200">Purification & Rituals:</strong> Pre-energized with traditional chants, Ganges water purification, and planetary homam (havan) rituals corresponding to its cosmic ruler.
                </li>
                <li>
                  <strong className="text-gray-800 dark:text-neutral-200">Spiritual Benefits:</strong> Perfect for boosting concentration, manifesting positive celestial alignments, clearing domestic negative aura, and promoting physical-spiritual balance.
                </li>
                <li>
                  <strong className="text-gray-800 dark:text-neutral-200">Ethically Sourced:</strong> Direct from mines or natural source ecosystems. Includes official Kalyan authenticity tag and lab certification.
                </li>
              </ul>
            </div>

            <hr className="border-gray-200/60 dark:border-neutral-800" />

            {/* Details Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Product Specifications</h3>
              
              <div className="rounded-xl border border-gray-150/60 dark:border-neutral-800/80 overflow-hidden text-xs">
                <div className="grid grid-cols-2 border-b border-gray-150/60 dark:border-neutral-800/80">
                  <div className="bg-gray-50 dark:bg-neutral-900/40 p-2.5 font-semibold text-gray-500">Offering Type</div>
                  <div className="p-2.5 text-gray-800 dark:text-neutral-200">{product.category}</div>
                </div>
                <div className="grid grid-cols-2 border-b border-gray-150/60 dark:border-neutral-800/80">
                  <div className="bg-gray-50 dark:bg-neutral-900/40 p-2.5 font-semibold text-gray-500">Authentication</div>
                  <div className="p-2.5 text-gray-800 dark:text-neutral-200">Kalyan Certified A+</div>
                </div>
                <div className="grid grid-cols-2">
                  <div className="bg-gray-50 dark:bg-neutral-900/40 p-2.5 font-semibold text-gray-500">Shipping Security</div>
                  <div className="p-2.5 text-gray-800 dark:text-neutral-200">Tamper-Proof Insured Box</div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Amazon-style Buy Checkout Box (lg: col-span-3) */}
          <div className="lg:col-span-3 sticky top-24">
            
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/5 dark:bg-neutral-900/80 p-5 space-y-5 shadow-md">
              
              {/* Price display inside card */}
              <div>
                <span className="text-2xl font-black text-gray-900 dark:text-white">
                  ₹{formatPrice(product.price)}
                </span>
                
                {product.deliveryEstimate && (
                  <div className="mt-2 text-xs text-gray-650 dark:text-neutral-300 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Insured shipping standard</span>
                    </p>
                    <p className="font-semibold text-emerald-650 dark:text-emerald-400 pl-5">
                      Arriving within {product.deliveryEstimate}
                    </p>
                  </div>
                )}
              </div>

              <hr className="border-gray-200/60 dark:border-neutral-800" />

              {/* Stock Selector & Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span>Stock Status:</span>
                  {outOfStock ? (
                    <span className="text-rose-600 font-bold uppercase shrink-0">Sold Out</span>
                  ) : lowStock ? (
                    <span className="text-orange-500 font-bold shrink-0 animate-pulse">Only {product.stock} left!</span>
                  ) : (
                    <span className="text-emerald-600 font-bold shrink-0">In Stock</span>
                  )}
                </div>

                {/* Quantity input component */}
                {!outOfStock && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Select Quantity</label>
                    <div className="flex items-center justify-between border border-gray-250/60 dark:border-neutral-800 rounded-xl bg-white dark:bg-neutral-950 p-1 w-full max-w-[130px]">
                      <button
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 1}
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-gray-100 dark:hover:bg-neutral-800 transition disabled:opacity-30 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold w-6 text-center">{quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(quantity + 1)}
                        disabled={quantity >= (product.stock || 10)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-bold hover:bg-gray-100 dark:hover:bg-neutral-800 transition disabled:opacity-30 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Buy Actions */}
              <div className="space-y-2.5 pt-2">
                {outOfStock ? (
                  <Button
                    disabled
                    className="w-full h-11 bg-gray-200 dark:bg-neutral-800 text-gray-400 dark:text-neutral-600 rounded-xl text-xs font-bold cursor-not-allowed flex items-center justify-center"
                  >
                    Temporary Out of Stock
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={handleAddToCart}
                      className="w-full h-11 bg-white hover:bg-amber-500/5 text-amber-700 dark:text-amber-400 border border-amber-500/40 rounded-xl text-xs font-bold shadow-xs hover:shadow-md cursor-pointer transition flex items-center justify-center gap-2"
                    >
                      <ShoppingCart className="w-4.5 h-4.5" />
                      Add to Cart
                    </Button>
                    <Button
                      onClick={handleBuyNow}
                      className="w-full h-11 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-amber-950 hover:brightness-105 rounded-xl text-xs font-black shadow-md hover:shadow-lg cursor-pointer transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <ShoppingBag className="w-4.5 h-4.5 text-amber-950" />
                      Buy Now
                    </Button>
                  </>
                )}
              </div>

              {/* Small details */}
              <div className="text-[10px] text-gray-400 space-y-1 mt-1 pl-1">
                <p className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                  <span>Secure, encrypted checkout.</span>
                </p>
                <p className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                  <span>Discreet packaging for privacy.</span>
                </p>
              </div>

            </div>

            {/* Extra information banner */}
            <div className="mt-4 p-4 rounded-2xl border border-gray-150/40 dark:border-neutral-800/40 bg-white/50 text-xs text-gray-500 space-y-2">
              <p className="font-semibold text-gray-700 dark:text-neutral-300">Need astrological advice?</p>
              <p className="text-[11px] leading-relaxed">Not sure if this gemstone or accessory matches your Janam Kundli? Reach out to our astrologers for a full chart reading.</p>
              <Link href="/contact" className="text-amber-600 font-bold hover:underline">Get Advice ↗</Link>
            </div>

          </div>

        </div>

        {/* Dynamic Related Offerings Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Related Spiritual Offerings
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <div
                  key={p._id || p.id}
                  onClick={() => navigate(`/store/product/${p._id || p.id}`)}
                  className="group rounded-2xl border border-gray-200/50 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-4 hover:shadow-lg hover:border-amber-250 transition-all duration-350 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50 dark:bg-neutral-950 mb-3 border border-gray-100 dark:border-neutral-800">
                      <Image
                        src={p.thumbnail || "/placeholder-product.jpg"}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 250px"
                        className="object-cover group-hover:scale-103 transition-transform duration-350"
                      />
                    </div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white group-hover:text-amber-600 transition-colors line-clamp-1">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 h-7">{p.description}</p>
                  </div>
                  
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-neutral-800/60 flex items-center justify-between">
                    <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                      ₹{formatPrice(p.price)}
                    </span>
                    <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider bg-amber-50 dark:bg-neutral-950 px-2 py-0.5 rounded border border-amber-500/20">
                      View Details
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* SEO Schema Markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            name: product.name,
            image: [product.thumbnail || "/placeholder-product.jpg"],
            description: product.description,
            sku: product._id || product.id,
            offers: {
              "@type": "Offer",
              url: window.location.href,
              priceCurrency: "INR",
              price: product.price,
              itemCondition: "https://schema.org/NewCondition",
              availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock"
            }
          })
        }}
      />

    </main>
  );
}
