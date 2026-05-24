"use client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useKundliStore } from "@/lib/store";
import { getApiUrl } from "@/lib/apiConfig";
import BlogHero from "@/components/research/blogs/BlogHero";
import ResearchTopics from "@/components/research/paper/researchtopics";
import BlogGrid from "@/components/research/blogs/BlogGrid";

// Sample fallback blog data - used if DB is empty or API is offline
const sampleBlogs = [
    {
        id: "1",
        title: "Stree Dosh",
        image: "/Blogs/blogimg/StreeDosh.webp",
        imageAlt: "Stree Dosh",
        date: new Date("2025-08-03"),
        excerpt: "Discover the revolutionary ways Stree Dosh is transforming traditional astrological practices and predictions.",
        author: "Soham Vashist",
        category: "Stree Dosh",
        href: "/research/blogs/BlogPage",
    },
    {
        id: "2",
        title: "Pitra Dosh",
        image: "/Blogs/blogimg/PitraDosh.webp",
        imageAlt: "Pitra Dosh",
        date: new Date("2025-08-03"),
        excerpt: "Learn how Pitra Dosh can be used to improve the accuracy of predictions.",
        author: "Soham Vashist",
        category: "Pitra Dosh",
        href: "/research/blogs/BlogPage",
    },
    {
        id: "3",
        title: "Mangal Badh",
        image: "/Blogs/blogimg/MangalBadh.webp",
        imageAlt: "Mangal Badh",
        date: new Date("2025-08-03"),
        excerpt: "Learn how Mangal Badh can be used to improve the accuracy of predictions.",
        author: "Soham Vashist",
        category: "Mangal Badh",
        href: "/research/blogs/BlogPage",
    },
];

export default function BlogsPage() {
    const navigate = useNavigate();
    const { currentUser, token, isAuthenticated } = useKundliStore();

    const [selectedTopic, setSelectedTopic] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [blogs, setBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    // Slide drawers state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isAdminDrawerOpen, setIsAdminDrawerOpen] = useState(false);
    const [editingBlog, setEditingBlog] = useState(null);

    // Blog form inputs state
    const [formTitle, setFormTitle] = useState("");
    const [formTags, setFormTags] = useState("");
    const [formImage, setFormImage] = useState("");
    const [formContent, setFormContent] = useState("");

    // Admin creation form inputs state
    const [adminName, setAdminName] = useState("");
    const [adminEmail, setAdminEmail] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [adminPhone, setAdminPhone] = useState("");
    const [adminPlaceOfBirth, setAdminPlaceOfBirth] = useState("");
    const [adminTimeOfBirth, setAdminTimeOfBirth] = useState("");
    const [adminBio, setAdminBio] = useState("");
    const [adminLoading, setAdminLoading] = useState(false);

    // Toast alert states
    const [toastMessage, setToastMessage] = useState(null);
    const [toastType, setToastType] = useState("success");

    const showToast = (message, type = "success") => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 4000);
    };

    // Live word count calculation
    const formWordCount = formContent.trim().split(/\s+/).filter(Boolean).length;

    const fetchBlogs = async () => {
        try {
            const response = await fetch(getApiUrl("/api/blogs"));
            if (!response.ok) {
                throw new Error("Failed to fetch blogs");
            }
            const data = await response.json();
            if (data.status === "success" && data.data?.blogs && data.data.blogs.length > 0) {
                setBlogs(data.data.blogs);
            } else {
                setBlogs(sampleBlogs);
            }
        } catch (error) {
            console.warn("Could not connect to backend blogs API, using premium fallback data:", error);
            setBlogs(sampleBlogs);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBlogs();
    }, []);

    useEffect(() => {
        const queryParams = new URLSearchParams(window.location.search);
        if (queryParams.get("addAdmin") === "true") {
            setAdminName("");
            setAdminEmail("");
            setAdminPassword("");
            setAdminPhone("");
            setAdminPlaceOfBirth("");
            setAdminTimeOfBirth("");
            setAdminBio("");
            setIsAdminDrawerOpen(true);
            navigate(window.location.pathname, { replace: true });
        }
    }, [navigate]);

    const handleTopicClick = (topic) => {
        const nextTopic = selectedTopic === topic ? "" : topic;
        setSelectedTopic(nextTopic);
        setSearchQuery(nextTopic);
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        
        if (formWordCount > 1000) {
            showToast("Word count exceeds the 1000-word limit", "error");
            return;
        }

        const tagsArray = formTags.split(",").map(t => t.trim()).filter(Boolean);

        const payload = {
            title: formTitle,
            tags: tagsArray,
            content: formContent,
            image: formImage.trim() || undefined
        };

        const headers = {
            "Content-Type": "application/json"
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            let response;
            if (editingBlog) {
                const id = editingBlog._id || editingBlog.id;
                response = await fetch(getApiUrl(`/api/blogs/${id}`), {
                    method: "PATCH",
                    headers,
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetch(getApiUrl("/api/blogs"), {
                    method: "POST",
                    headers,
                    body: JSON.stringify(payload)
                });
            }

            const data = await response.json();

            if (!response.ok || data.status === "fail") {
                throw new Error(data.message || "Failed to save blog");
            }

            showToast(editingBlog ? "Blog updated successfully! ✨" : "Blog published successfully! 🪐");
            setIsDrawerOpen(false);
            fetchBlogs();
        } catch (error) {
            showToast(error.message || "Error saving blog. Try again.", "error");
        }
    };

    const handleEdit = (blog) => {
        setEditingBlog(blog);
        setFormTitle(blog.title || "");
        setFormTags(blog.tags?.join(", ") || blog.category || "");
        setFormImage(blog.image && blog.image !== "/placeholder.png" ? blog.image : "");
        setFormContent(blog.content || "");
        setIsDrawerOpen(true);
    };

    const handleDelete = async (blog) => {
        const id = blog._id || blog.id;
        if (!id || id === "1" || id === "2" || id === "3") {
            // Static seed fallback item
            showToast("Static fallback blogs cannot be deleted.", "error");
            return;
        }
        
        const headers = {};
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(getApiUrl(`/api/blogs/${id}`), {
                method: "DELETE",
                headers
            });

            if (response.status === 403) {
                showToast("Access Denied: You do not have permission to delete this blog!", "error");
                return;
            }

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || "Failed to delete blog");
            }

            showToast("Blog deleted successfully! 🗑️");
            fetchBlogs();
        } catch (error) {
            showToast(error.message || "Error deleting blog.", "error");
        }
    };

    const handleAddAdminSubmit = async (e) => {
        e.preventDefault();
        if (!adminName || !adminEmail || !adminPassword) {
            showToast("Please fill in name, email, and password.", "error");
            return;
        }

        // Verify time format if provided
        if (adminTimeOfBirth && !/^([01]\d|2[0-3]):([0-5]\d)$/.test(adminTimeOfBirth)) {
            showToast("Please provide a valid birth time in 24h format (HH:MM)", "error");
            return;
        }

        setAdminLoading(true);
        try {
            const payload = {
                name: adminName,
                email: adminEmail,
                password: adminPassword,
                phone: adminPhone || undefined,
                placeOfBirth: adminPlaceOfBirth || undefined,
                timeOfBirth: adminTimeOfBirth || undefined,
                bio: adminBio || undefined,
            };

            const response = await fetch(getApiUrl("/api/auth/add-admin"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok || data.status === "fail") {
                throw new Error(data.message || "Failed to register admin");
            }

            showToast("Admin registered successfully! ✨");
            setIsAdminDrawerOpen(false);
            
            // Clear fields
            setAdminName("");
            setAdminEmail("");
            setAdminPassword("");
            setAdminPhone("");
            setAdminPlaceOfBirth("");
            setAdminTimeOfBirth("");
            setAdminBio("");
        } catch (error) {
            showToast(error.message || "Error registering admin.", "error");
        } finally {
            setAdminLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-white relative">
            {/* Toast System */}
            <AnimatePresence>
                {toastMessage && (
                    <motion.div
                        initial={{ opacity: 0, x: -100, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -100, scale: 0.9 }}
                        transition={{ type: "spring", damping: 20, stiffness: 120 }}
                        className="fixed bottom-8 left-8 z-50 pointer-events-none max-w-sm"
                    >
                        <div className={`px-5 py-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] text-sm font-semibold backdrop-blur-md flex items-center gap-3 border ${
                            toastType === "success"
                                ? "bg-emerald-950/95 text-emerald-100 border-emerald-500/30"
                                : "bg-rose-950/95 text-rose-100 border-rose-500/30"
                        }`}>
                            <span className={`flex items-center justify-center w-6 h-6 rounded-full shrink-0 text-xs shadow-sm ${
                                toastType === "success" 
                                    ? "bg-emerald-500 text-white" 
                                    : "bg-rose-500 text-white"
                            }`}>
                                {toastType === "success" ? "✓" : "⚠️"}
                            </span>
                            <span className="font-poppins leading-tight">{toastMessage}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <BlogHero />
            
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
                <ResearchTopics onTopicClick={handleTopicClick} selectedTopic={selectedTopic}/>
            </div>

            {/* Premium Cosmic Search Bar */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-6 mt-2">
                <div className="relative max-w-lg mx-auto">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-amber-600/70">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            if (!e.target.value) {
                                setSelectedTopic("");
                            }
                        }}
                        placeholder="Search astrological blogs by title, keywords, or tags..."
                        className="w-full pl-11 pr-10 py-3 border border-neutral-250 rounded-full focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all duration-300 text-sm shadow-sm hover:shadow-md bg-white placeholder-gray-400 text-gray-900"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => {
                                setSearchQuery("");
                                setSelectedTopic("");
                            }}
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-amber-600 transition-colors duration-200 cursor-pointer"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* User Session Bar & Write/Admin Buttons */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-gray-100 pb-6">
                {/* Auth / Greeting message */}
                <div className="flex items-center gap-3">
                    {isAuthenticated && currentUser ? (
                        <div className="flex items-center gap-2.5 bg-neutral-950 text-white px-4 py-2 rounded-2xl border border-neutral-800 shadow-md">
                            <span className="text-xs font-semibold tracking-wide flex items-center gap-1.5 font-poppins">
                                {currentUser.role === "admin" ? (
                                    <>
                                        <span className="text-amber-400">Admin:</span> {currentUser.name}
                                    </>
                                ) : (
                                    <>
                                        <span className="text-sky-400">User:</span> {currentUser.name}
                                    </>
                                )}
                            </span>
                        </div>
                    ) : (
                        <div className="text-gray-500 text-xs font-semibold tracking-wide flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-4 py-2 rounded-2xl shadow-xs font-poppins">
                            <span>🌌 Sign in to contribute astrological wisdom</span>
                        </div>
                    )}
                </div>

                {/* Write Blog Trigger */}
                {isAuthenticated ? (
                    <button
                        onClick={() => {
                            setEditingBlog(null);
                            setFormTitle("");
                            setFormTags("");
                            setFormImage("");
                            setFormContent("");
                            setIsDrawerOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-850 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 cursor-pointer font-poppins"
                    >
                        ✍️ Share Astro Wisdom
                    </button>
                ) : (
                    <button
                        onClick={() => navigate("/login", { state: { from: { pathname: "/research/blogs" } } })}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 border border-amber-400/20 text-neutral-950 text-sm font-bold rounded-full shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 cursor-pointer font-poppins"
                    >
                        🔑 Sign In to Share Wisdom
                    </button>
                )}
            </div>
            
            {loading ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500 mb-4"></div>
                    <p className="text-gray-500 font-mono text-sm tracking-wider">Loading Astrological Wisdom...</p>
                </div>
            ) : (
                <BlogGrid
                    blogs={blogs}
                    selectedTopic={selectedTopic}
                    searchQuery={searchQuery}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            )}

            {/* Slide-over Drawer Form */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsDrawerOpen(false)}
                            className="fixed inset-0 bg-black z-40 backdrop-blur-xs"
                        />
                        
                        {/* Drawer */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto flex flex-col border-l border-gray-100"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-indigo-50/10">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">
                                        {editingBlog ? "Edit Astro Wisdom ✍️" : "Share Astro Wisdom 🪐"}
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Publish astrological guidance, remedies, and transits.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsDrawerOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Form Body */}
                            <form onSubmit={handleFormSubmit} className="flex-grow p-6 flex flex-col gap-5 overflow-y-auto">
                                {/* Title */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Blog Title <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        placeholder="e.g. Pitra Dosh Remedies & Rituals"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 text-sm"
                                    />
                                </div>

                                {/* Author (Read Only) */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Author Name
                                    </label>
                                    <input
                                        type="text"
                                        value={currentUser ? currentUser.name : "Anonymous"}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-150 rounded-xl bg-gray-50 text-gray-500 font-semibold cursor-not-allowed text-sm"
                                    />
                                </div>

                                {/* Tags */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Tags / Keywords (Comma separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={formTags}
                                        onChange={(e) => setFormTags(e.target.value)}
                                        placeholder="e.g. Pitra Dosh, Ancestors, Remedial"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 text-sm"
                                    />
                                </div>

                                {/* Optional Image URL */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Optional Cover Image URL
                                        </label>
                                        <span className="text-[9px] text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded-full">
                                            Leave empty for Astral fallback cover
                                        </span>
                                    </div>
                                    <input
                                        type="url"
                                        value={formImage}
                                        onChange={(e) => setFormImage(e.target.value)}
                                        placeholder="https://example.com/cover.jpg"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all duration-200 text-sm"
                                    />
                                    {formImage && (
                                        <div className="relative mt-2 aspect-video rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                                            <img
                                                src={formImage}
                                                alt="Live Cover Preview"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    e.target.style.display = "none";
                                                }}
                                            />
                                            <span className="absolute bottom-2 right-2 text-[9px] bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-xs font-semibold">
                                                Cover Preview
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex flex-col gap-1.5 flex-grow">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                            Blog Content <span className="text-rose-500">*</span>
                                        </label>
                                        <span className={`text-[10px] font-bold ${
                                            formWordCount > 1000 ? "text-rose-500 animate-pulse" : "text-gray-400"
                                        }`}>
                                            {formWordCount} / 1000 words
                                        </span>
                                    </div>
                                    <textarea
                                        value={formContent}
                                        onChange={(e) => setFormContent(e.target.value)}
                                        placeholder="Write your astrological post content here..."
                                        required
                                        rows={10}
                                        className={`w-full flex-grow px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 text-sm resize-none ${
                                            formWordCount > 1000
                                                ? "border-rose-300 focus:ring-rose-500/20 focus:border-rose-500"
                                                : "border-gray-200 focus:ring-sky-500/20 focus:border-sky-500"
                                        }`}
                                    />
                                    {formWordCount > 1000 && (
                                        <p className="text-xs text-rose-500 font-semibold mt-1">
                                            ⚠️ Word limit exceeded! Please shorten your post to under 1000 words to publish.
                                        </p>
                                    )}
                                </div>

                                {/* Footer Submit Buttons */}
                                <div className="mt-auto pt-6 border-t border-gray-100 flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsDrawerOpen(false)}
                                        className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-semibold transition-all duration-200 cursor-pointer text-center"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={formWordCount > 1000 || !formTitle.trim() || !formContent.trim()}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-center"
                                    >
                                        {editingBlog ? "Save Changes" : "Publish Blog"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Slide-over Drawer for Add Admin */}
            <AnimatePresence>
                {isAdminDrawerOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.4 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsAdminDrawerOpen(false)}
                            className="fixed inset-0 bg-black z-40 backdrop-blur-xs"
                        />
                        
                        {/* Drawer */}
                        <motion.div
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed top-0 right-0 h-full w-full max-w-lg bg-neutral-950 text-white shadow-2xl z-50 overflow-y-auto flex flex-col border-l border-neutral-800"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-neutral-800 flex items-center justify-between bg-gradient-to-r from-amber-500/10 to-transparent">
                                <div>
                                    <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300 font-poppins">
                                        Register New Administrator
                                    </h3>
                                    <p className="text-xs text-neutral-400 mt-0.5 font-poppins">
                                        Grant administrative access to sacred systems.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsAdminDrawerOpen(false)}
                                    className="p-2 text-neutral-400 hover:text-neutral-200 rounded-full hover:bg-neutral-900 transition-all cursor-pointer font-poppins"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Form Body */}
                            <form onSubmit={handleAddAdminSubmit} className="flex-grow p-6 flex flex-col gap-4 overflow-y-auto font-poppins">
                                {/* Name */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                        Full Name <span className="text-amber-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={adminName}
                                        onChange={(e) => setAdminName(e.target.value)}
                                        placeholder="e.g. Acharya Shridhar"
                                        required
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm font-poppins"
                                    />
                                </div>

                                {/* Email */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                        Email Address <span className="text-amber-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        placeholder="e.g. admin@kalyan.org"
                                        required
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm font-poppins"
                                    />
                                </div>

                                {/* Password */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                        Password <span className="text-amber-500">* (min 8 chars)</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        minLength={8}
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm font-poppins"
                                    />
                                </div>

                                {/* Phone */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                        Phone Number <span className="text-neutral-500">(Optional)</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={adminPhone}
                                        onChange={(e) => setAdminPhone(e.target.value)}
                                        placeholder="e.g. +91 98765 43210"
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm font-poppins"
                                    />
                                </div>

                                {/* Place of Birth */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                        Place of Birth <span className="text-neutral-500">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={adminPlaceOfBirth}
                                        onChange={(e) => setAdminPlaceOfBirth(e.target.value)}
                                        placeholder="e.g. Varanasi, India"
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm font-poppins"
                                    />
                                </div>

                                {/* Time of Birth */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                        Time of Birth <span className="text-neutral-500">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={adminTimeOfBirth}
                                        onChange={(e) => {
                                            let value = e.target.value.replace(/[^0-9]/g, "");
                                            if (value.length > 4) value = value.slice(0, 4);
                                            if (value.length > 2) {
                                                value = `${value.slice(0, 2)}:${value.slice(2)}`;
                                            }
                                            setAdminTimeOfBirth(value);
                                        }}
                                        placeholder="e.g. 05:45 (24h)"
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm font-poppins"
                                    />
                                </div>

                                {/* Bio */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                                        Bio / Astrological Specialty <span className="text-neutral-500">(Optional)</span>
                                    </label>
                                    <textarea
                                        value={adminBio}
                                        onChange={(e) => setAdminBio(e.target.value)}
                                        placeholder="e.g. Expert in Vedic transits and planetary alignments."
                                        rows={3}
                                        className="w-full px-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-sm resize-none font-poppins"
                                    />
                                </div>

                                {/* Footer Submit Buttons */}
                                <div className="mt-auto pt-6 border-t border-neutral-800 flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdminDrawerOpen(false)}
                                        className="flex-1 px-4 py-2.5 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 text-sm font-semibold transition-all duration-200 cursor-pointer text-center font-poppins"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={adminLoading || !adminName.trim() || !adminEmail.trim() || adminPassword.length < 8}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-neutral-950 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-center font-poppins"
                                    >
                                        {adminLoading ? "Registering..." : "Create Admin"}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </main>
    );
}
