"use client";
import React, { useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Plus, Search, ShoppingBag, X, ChevronRight, Sparkles, 
  Clock, Grid, Filter, ArrowRight, Lock, UploadCloud, 
  HelpCircle, CheckCircle, AlertCircle
} from "lucide-react";
import { useKundliStore } from "@/lib/store";
import { useCartStore } from "@/lib/cartStore";
import { Button } from "@/components/ui/button";
import { getApiUrl } from "@/lib/apiConfig";

const CATEGORIES = [
  { id: "all", name: "All Products" },
  { id: "Gemstone", name: "Gemstones" },
  { id: "Perfume", name: "Perfumes" },
  { id: "Poster", name: "Posters" },
  { id: "Accessory", name: "Accessories" }
];

export default function StorePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchCategory = searchParams?.get("category");

  const { currentUser, token } = useKundliStore();
  const addToCart = useCartStore((state) => state.addToCart);
  const cartItems = useCartStore((state) => state.cartItems);
  const cartItemCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // States
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState(null);
  
  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Gemstone",
    price: "",
    stock: "",
    deliveryEstimate: "3-5 business days"
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  // Sync category filter from URL search parameter
  useEffect(() => {
    if (searchCategory) {
      const match = CATEGORIES.find(
        (c) => c.id.toLowerCase() === searchCategory.toLowerCase()
      );
      if (match) {
        setActiveCategory(match.id);
      }
    } else {
      setActiveCategory("all");
    }
  }, [searchCategory]);

  // Fetch products on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl("/api/products"));
      const data = await res.json();
      if (data.status === "success") {
        setProducts(data.data.products);
      } else {
        showToast("Failed to fetch products", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error loading products. Is the server running?", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Filter products locally
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      activeCategory === "all" || p.category === activeCategory;
    const matchesSearch =
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    // Explicit required validations: Photo, Name, Price (as requested)
    if (!thumbnailFile) {
      showToast("Product thumbnail image (photo) is required!", "error");
      return;
    }
    if (!formData.name || !formData.name.trim()) {
      showToast("Product name is required!", "error");
      return;
    }
    if (!formData.price || Number(formData.price) <= 0) {
      showToast("Product price is required and must be greater than ₹0!", "error");
      return;
    }
    if (!formData.description || !formData.description.trim()) {
      showToast("Product description is required!", "error");
      return;
    }
    if (!formData.stock || Number(formData.stock) < 0) {
      showToast("Stock quantity is required and cannot be negative!", "error");
      return;
    }

    try {
      setIsUploading(true);
      const payload = new FormData();
      payload.append("name", formData.name);
      payload.append("description", formData.description);
      payload.append("category", formData.category);
      payload.append("price", formData.price);
      payload.append("stock", formData.stock);
      payload.append("deliveryEstimate", formData.deliveryEstimate);
      payload.append("thumbnail", thumbnailFile);

      const res = await fetch(getApiUrl("/api/products"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      });

      const data = await res.json();
      if (res.ok && data.status === "success") {
        showToast(`Successfully added ${formData.name}!`);
        setIsDrawerOpen(false);
        // Reset form
        setFormData({
          name: "",
          description: "",
          category: "Gemstone",
          price: "",
          stock: "",
          deliveryEstimate: "3-5 business days"
        });
        setThumbnailFile(null);
        setThumbnailPreview(null);
        // Refresh products list
        fetchProducts();
      } else {
        showToast(data.message || "Failed to upload product", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Connection failure during product creation", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const openDrawerWithCategory = (categoryName) => {
    // Map visual category ID to exact mongoose schema enum value
    const targetCategory = categoryName === "all" ? "Gemstone" : categoryName;
    setFormData((prev) => ({
      ...prev,
      category: targetCategory
    }));
    setIsDrawerOpen(true);
  };

  const handleAddToCart = (product) => {
    if (!token) {
      showToast("Please sign in to add items to your cart.", "error");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
      return;
    }
    addToCart(product, 1);
    setToast({
      message: `Added ${product.name} to cart!`,
      type: "success",
      action: {
        label: "Go to Cart 🛒",
        onClick: () => router.push("/Cart")
      }
    });
    setTimeout(() => setToast(null), 5000);
  };

  const handleBuyNow = (product) => {
    if (!token) {
      showToast("Please sign in to purchase items from the store.", "error");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
      return;
    }
    addToCart(product, 1);
    router.push("/Cart");
  };

  const categoryThemes = {
    Gemstone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
    Perfume: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
    Poster: "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400",
    Accessory: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-amber-50/20 dark:from-neutral-950 dark:to-neutral-900 text-neutral-800 dark:text-neutral-100 py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative celestial background */}
      <div className="absolute top-0 right-0 -w-96 h-96 bg-amber-200/10 dark:bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-orange-200/10 dark:bg-orange-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />

      {/* Container */}
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Celestial Header Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold mb-4 tracking-wider uppercase"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Kalyan Spiritual Shop
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 bg-clip-text bg-gradient-to-r from-gray-950 via-amber-800 to-orange-950 dark:from-white dark:via-amber-200 dark:to-orange-100"
          >
            Sacred Cosmic Offerings
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-base text-gray-600 dark:text-neutral-400 leading-relaxed"
          >
            Authentic, certified gemstones, hand-blended Vedic zodiac perfumes, custom planetary charts, and high-vibration pooja accessories to elevate your energetic home.
          </motion.p>
        </div>

        {/* Toolbar: Category filter + Search input */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-200/60 dark:border-neutral-800 pb-6 mb-8">
          
          {/* Tab bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto py-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`relative px-4 py-2 text-xs sm:text-sm font-medium rounded-full cursor-pointer transition-all duration-300 ${
                    active 
                      ? "text-amber-900 dark:text-neutral-900" 
                      : "text-gray-600 hover:text-gray-900 dark:text-neutral-400 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-neutral-800/40"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="store-active-pill"
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 shadow-sm"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className="relative z-10">{cat.name}</span>
                </button>
              );
            })}
          </div>

          {/* Search and Upload triggers */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative flex-1 md:w-72">
              <input
                type="text"
                placeholder="Search cosmic items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")} 
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Admin Upload Trigger - Secluded buttons for each section */}
            {currentUser?.role === "admin" && (
              <div className="flex flex-wrap items-center gap-2">
                {activeCategory === "all" ? (
                  <>
                    <Button
                      onClick={() => openDrawerWithCategory("Gemstone")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 rounded-xl text-xs py-1.5 h-9 px-3.5 font-semibold transition-all hover:scale-105 shadow-md cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add Gemstone
                    </Button>
                    <Button
                      onClick={() => openDrawerWithCategory("Perfume")}
                      className="bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 rounded-xl text-xs py-1.5 h-9 px-3.5 font-semibold transition-all hover:scale-105 shadow-md cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add Perfume
                    </Button>
                    <Button
                      onClick={() => openDrawerWithCategory("Poster")}
                      className="bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1.5 rounded-xl text-xs py-1.5 h-9 px-3.5 font-semibold transition-all hover:scale-105 shadow-md cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add Poster
                    </Button>
                    <Button
                      onClick={() => openDrawerWithCategory("Accessory")}
                      className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 rounded-xl text-xs py-1.5 h-9 px-3.5 font-semibold transition-all hover:scale-105 shadow-md cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add Accessory
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => openDrawerWithCategory(activeCategory)}
                    className={`${
                      activeCategory === "Gemstone"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : activeCategory === "Perfume"
                        ? "bg-rose-600 hover:bg-rose-700"
                        : activeCategory === "Poster"
                        ? "bg-violet-600 hover:bg-violet-700"
                        : "bg-amber-600 hover:bg-amber-700"
                    } text-white flex items-center gap-1.5 rounded-xl text-xs py-1.5 h-9 px-4 font-semibold transition-all hover:scale-105 shadow-md cursor-pointer`}
                  >
                    <Plus className="h-4 w-4" />
                    Add {activeCategory}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Catalog Section */}
        {loading ? (
          /* Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-96 rounded-2xl border border-gray-200/50 dark:border-neutral-800/40 bg-white dark:bg-neutral-900/40 p-4 space-y-4">
                <div className="h-48 w-full bg-gray-200 dark:bg-neutral-800 rounded-xl animate-pulse" />
                <div className="h-4 w-1/3 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-6 w-3/4 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-gray-200 dark:bg-neutral-800 rounded animate-pulse" />
                <div className="h-10 w-full bg-gray-200 dark:bg-neutral-800 rounded-xl animate-pulse pt-2" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          /* Products Grid */
          <motion.div 
            layout 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {filteredProducts.map((p) => {
                const outOfStock = p.stock === 0;
                const lowStock = p.stock > 0 && p.stock <= 5;
                
                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    key={p._id || p.id}
                    className="group relative rounded-2xl border border-gray-200/60 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-4 hover:shadow-[0_12px_30px_rgba(251,191,36,0.15)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.4)] transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      {/* Product Image Panel */}
                      <Link href={`/store/product/${p._id || p.id}`} className="block">
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-50 dark:bg-neutral-950 mb-4 border border-gray-100 dark:border-neutral-800/80 cursor-pointer">
                          <Image
                            src={p.thumbnail || "/placeholder-product.jpg"}
                            alt={p.name}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          
                          {/* Stock Badges */}
                          {outOfStock ? (
                            <span className="absolute top-3 left-3 bg-red-600 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full shadow-sm">
                              Out of Stock
                            </span>
                          ) : lowStock ? (
                            <span className="absolute top-3 left-3 bg-orange-500 text-white text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                              Only {p.stock} left
                            </span>
                          ) : null}

                          {/* Quick category label */}
                          <span className={`absolute bottom-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-lg border backdrop-blur-sm shadow-sm ${
                            categoryThemes[p.category] || "bg-gray-100 text-gray-700 border-gray-200"
                          }`}>
                            {p.category}
                          </span>
                        </div>
                      </Link>

                      {/* Product Meta */}
                      <Link href={`/store/product/${p._id || p.id}`} className="block hover:underline">
                        <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-1 group-hover:text-amber-600 transition-colors cursor-pointer">
                          {p.name}
                        </h3>
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-neutral-400 mt-1 line-clamp-2 h-8">
                        {p.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-neutral-800/60">
                      {/* Price / Shipping info */}
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          ₹{p.price.toLocaleString("en-IN")}
                        </span>
                        {p.deliveryEstimate && (
                          <span className="text-[10px] text-gray-400 dark:text-neutral-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {p.deliveryEstimate}
                          </span>
                        )}
                      </div>

                      {/* Add to Cart / Buy Now CTA */}
                      {outOfStock ? (
                        <Button
                          disabled
                          className="w-full rounded-xl text-xs font-semibold py-2.5 h-10 bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-neutral-800 dark:text-neutral-600 flex items-center justify-center"
                        >
                          Out of Stock
                        </Button>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <Button
                            onClick={() => handleAddToCart(p)}
                            variant="outline"
                            className="flex-1 rounded-xl text-[11px] font-semibold h-10 border-amber-500/20 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 dark:hover:bg-amber-500/5 cursor-pointer flex items-center justify-center"
                          >
                            Add to Cart
                          </Button>
                          <Button
                            onClick={() => handleBuyNow(p)}
                            className="flex-1 rounded-xl text-[11px] font-bold h-10 bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 hover:brightness-105 hover:shadow-md cursor-pointer flex items-center justify-center transition-all duration-200"
                          >
                            Buy Now
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* Empty Search Fallback */
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center rounded-3xl border border-dashed border-gray-200 dark:border-neutral-800 p-12 bg-white/40 dark:bg-neutral-900/20 backdrop-blur-sm"
          >
            <AlertCircle className="w-12 h-12 text-amber-500/60 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No cosmic offerings found</h3>
            <p className="text-sm text-gray-500 dark:text-neutral-400 max-w-md mx-auto mb-4">
              We couldn't find any products in category "{activeCategory}" matching your search keywords. Try adjusting your query.
            </p>
            <Button 
              onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
              className="bg-amber-600 text-white rounded-xl text-xs px-4"
            >
              Reset Filters
            </Button>
          </motion.div>
        )}

      </div>

      {/* Admin Slide-Over Product Upload Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 cursor-pointer"
            />

            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[480px] bg-white dark:bg-neutral-900 border-l border-gray-200 dark:border-neutral-800 shadow-2xl z-50 overflow-y-auto"
            >
              <div className="p-6 h-full flex flex-col justify-between">
                
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-neutral-800 pb-4 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add {formData.category}</h2>
                        <p className="text-xs text-gray-500 dark:text-neutral-400">Launch a new spiritual {formData.category.toLowerCase()} to the shop.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-1.5 rounded-lg border border-gray-100 hover:bg-gray-50 dark:border-neutral-800 dark:hover:bg-neutral-800 transition"
                    >
                      <X className="h-4.5 w-4.5 text-gray-500" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleAddProduct} className="space-y-4">
                    {/* Product Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-neutral-300">
                        Product Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g. Suryavanshi Elixir"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                    </div>

                    {/* Category Selector - Disabled to ensure seclusion */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-neutral-300">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="category"
                        disabled
                        value={formData.category}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-250 dark:border-neutral-800 bg-gray-100 text-gray-500 dark:bg-neutral-800 dark:text-neutral-400 cursor-not-allowed focus:outline-none transition font-semibold"
                      >
                        <option value="Gemstone">Gemstones</option>
                        <option value="Perfume">Perfumes</option>
                        <option value="Poster">Posters</option>
                        <option value="Accessory">Accessories</option>
                      </select>
                      <p className="text-[10px] text-amber-600 dark:text-amber-500 font-medium italic">
                        This drawer is secluded specifically for {formData.category} uploads.
                      </p>
                    </div>

                    {/* Price and Stock Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-neutral-300">
                          Price (₹) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="price"
                          required
                          min="1"
                          value={formData.price}
                          onChange={handleInputChange}
                          placeholder="e.g. 1499"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-700 dark:text-neutral-300">
                          Stock Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="stock"
                          required
                          min="0"
                          value={formData.stock}
                          onChange={handleInputChange}
                          placeholder="e.g. 25"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                        />
                      </div>
                    </div>

                    {/* Delivery Estimate */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-neutral-300">
                        Delivery Estimate
                      </label>
                      <input
                        type="text"
                        name="deliveryEstimate"
                        value={formData.deliveryEstimate}
                        onChange={handleInputChange}
                        placeholder="e.g. 3-5 business days"
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-neutral-300">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        name="description"
                        required
                        rows="3"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="A detailed description about the energetic properties or history of the item."
                        className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-950/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition resize-none"
                      />
                    </div>

                    {/* Image Upload Panel */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700 dark:text-neutral-300">
                        Thumbnail Image <span className="text-red-500">*</span>
                      </label>
                      
                      {thumbnailPreview ? (
                        <div className="relative h-40 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-800">
                          <Image
                            src={thumbnailPreview}
                            alt="Preview"
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => { setThumbnailFile(null); setThumbnailPreview(null); }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/85"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-800 hover:border-amber-500/40 dark:hover:border-amber-500/30 rounded-xl p-6 bg-gray-50/30 dark:bg-neutral-950/20 cursor-pointer group transition">
                          <UploadCloud className="w-10 h-10 text-gray-400 group-hover:text-amber-500 transition" />
                          <span className="text-xs font-semibold text-gray-600 dark:text-neutral-400 mt-2">
                            Click to upload product image
                          </span>
                          <span className="text-[10px] text-gray-400 mt-1">PNG, JPG, or WEBP up to 5MB</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </form>
                </div>

                {/* Footer Buttons */}
                <div className="flex gap-3 border-t border-gray-100 dark:border-neutral-800 pt-4 mt-6">
                  <Button
                    type="button"
                    onClick={() => setIsDrawerOpen(false)}
                    variant="outline"
                    className="flex-1 rounded-xl h-11 text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddProduct}
                    disabled={isUploading}
                    className="flex-1 rounded-xl h-11 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2"
                  >
                    {isUploading ? (
                      <>
                        <span className="w-4.5 h-4.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Save Offering
                      </>
                    )}
                  </Button>
                </div>

              </div>
            </motion.div>
          </>
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
            onClick={() => router.push("/Cart")}
            className="rounded-full bg-gradient-to-r from-yellow-500 to-amber-600 text-gray-900 font-bold px-6 py-5 shadow-[0_12px_35px_rgba(245,158,11,0.45)] hover:shadow-[0_16px_40px_rgba(245,158,11,0.55)] hover:scale-105 transition-all duration-300 flex items-center gap-2 cursor-pointer border border-yellow-400/20"
          >
            <ShoppingBag className="w-4.5 h-4.5 text-gray-900" />
            <span>View Cart ({cartItemCount})</span>
            <ArrowRight className="w-4 h-4 text-gray-900" />
          </Button>
        </motion.div>
      )}

    </main>
  );
}
