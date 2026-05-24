"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKundliStore } from "@/lib/store";
import { getApiUrl } from "@/lib/apiConfig";
import { PaperHeroSection } from "@/components/research/paper/PaperHeroSection";
import { ResearchPaperGrid } from "@/components/research/paper/ResearchPaperGrid";
import { Plus, X, Upload, BookOpen, ShieldAlert } from "lucide-react";

export default function ResearchPapersPage() {
    const { currentUser, token, isAuthenticated } = useKundliStore();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTopic, setSelectedTopic] = useState();
    
    // Papers and UI state
    const [papers, setPapers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [uploadLoading, setUploadLoading] = useState(false);

    // Form inputs state
    const [title, setTitle] = useState("");
    const [author, setAuthor] = useState("");
    const [date, setDate] = useState("");
    const [category, setCategory] = useState("Research");
    const [tags, setTags] = useState("");
    const [description, setDescription] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);

    // Toast alert states
    const [toastMessage, setToastMessage] = useState(null);
    const [toastType, setToastType] = useState("success");

    const showToast = (message, type = "success") => {
        setToastMessage(message);
        setToastType(type);
        setTimeout(() => setToastMessage(null), 4000);
    };

    const fetchPapers = async () => {
        try {
            const response = await fetch(getApiUrl("/api/papers"));
            if (!response.ok) {
                throw new Error("Failed to fetch research papers");
            }
            const data = await response.json();
            if (data.status === "success" && data.data?.papers) {
                setPapers(data.data.papers);
            }
        } catch (error) {
            console.warn("Could not fetch papers from API, using premium static fallback:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPapers();
    }, []);

    const handleSearchChange = (query) => {
        setSearchQuery(query);
        if (query) {
            setSelectedTopic(undefined); // Clear topic filter when searching
        }
    };

    const handleTopicSelect = (topic) => {
        setSelectedTopic(topic);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            if (file.type !== "application/pdf") {
                showToast("Only PDF files are allowed", "error");
                e.target.value = null;
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleFormSubmit = async (e) => {
        e.preventDefault();

        if (!title.trim() || !author.trim() || !description.trim() || !selectedFile) {
            showToast("Please fill in all required fields and select a PDF file.", "error");
            return;
        }

        setUploadLoading(true);

        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("author", author.trim());
        formData.append("date", date.trim() || undefined);
        formData.append("category", category);
        formData.append("tags", tags.trim());
        formData.append("description", description.trim());
        formData.append("file", selectedFile);

        try {
            const response = await fetch(getApiUrl("/api/papers"), {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (!response.ok || data.status === "fail") {
                throw new Error(data.message || "Failed to upload paper");
            }

            showToast("Research paper uploaded successfully! 📚✨");
            setIsDrawerOpen(false);
            
            // Reset form fields
            setTitle("");
            setAuthor("");
            setDate("");
            setCategory("Research");
            setTags("");
            setDescription("");
            setSelectedFile(null);
            
            // Refresh papers grid
            fetchPapers();
        } catch (error) {
            showToast(error.message || "Error uploading paper. Try again.", "error");
        } finally {
            setUploadLoading(false);
        }
    };

    const isAdmin = isAuthenticated && currentUser?.role === "admin";

    return (
        <main className="min-h-screen bg-white relative">
            {/* Toast Alerts System */}
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

            {/* Hero Section */}
            <PaperHeroSection 
                onSearchChange={handleSearchChange} 
                onTopicSelect={handleTopicSelect} 
                selectedTopic={selectedTopic}
            />

            {/* Admin Actions Bar */}
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between border-b border-gray-100 pb-6">
                {/* Greeting / Role badge */}
                <div className="flex items-center gap-3">
                    {isAuthenticated && currentUser ? (
                        <div className="flex items-center gap-2.5 bg-neutral-950 text-white px-4 py-2 rounded-2xl border border-neutral-800 shadow-md">
                            <span className="text-xs font-semibold tracking-wide flex items-center gap-1.5 font-poppins">
                                {isAdmin ? (
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
                            <span>🌌 Explore sacred research from Vedic scholars</span>
                        </div>
                    )}
                </div>

                {/* Admin Only Upload Button */}
                {isAdmin && (
                    <button
                        onClick={() => {
                            setTitle("");
                            setAuthor("");
                            setDate("");
                            setCategory("Research");
                            setTags("");
                            setDescription("");
                            setSelectedFile(null);
                            setIsDrawerOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-full shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-350 cursor-pointer font-poppins"
                    >
                        <Plus className="h-4.5 w-4.5" /> Upload Research Paper
                    </button>
                )}
            </div>

            {/* Papers Grid */}
            {loading && papers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <p className="text-gray-500 font-mono text-sm tracking-wider">Fetching Scholarly Papers...</p>
                </div>
            ) : (
                <ResearchPaperGrid 
                    searchQuery={searchQuery} 
                    selectedTopic={selectedTopic}
                    papers={papers}
                    onDeleteSuccess={fetchPapers}
                    showToast={showToast}
                />
            )}

            {/* Upload Paper Slide-over Drawer */}
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
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/10">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 font-poppins flex items-center gap-2">
                                        <BookOpen className="h-5 w-5 text-blue-600" /> Upload Research Paper
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5 font-poppins">
                                        Publish verified astrological research, journals, and Vastu papers.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsDrawerOpen(false)}
                                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-all cursor-pointer"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Form Body */}
                            <form onSubmit={handleFormSubmit} className="flex-grow p-6 flex flex-col gap-5 overflow-y-auto font-poppins">
                                {/* Title */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Paper Title <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Nakshatras & Psychological Tendencies"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm font-poppins"
                                    />
                                </div>

                                {/* Author */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Author Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={author}
                                        onChange={(e) => setAuthor(e.target.value)}
                                        placeholder="e.g. Dr. A.K. Sharma"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm font-poppins"
                                    />
                                </div>

                                {/* Publish Date */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Publish Date / Period <span className="text-gray-400 font-normal">(Optional)</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={date}
                                        onChange={(e) => setDate(e.target.value)}
                                        placeholder="e.g. Aug 2024"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm font-poppins"
                                    />
                                </div>

                                {/* Category */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Category <span className="text-rose-500">*</span>
                                    </label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm bg-white font-poppins cursor-pointer"
                                    >
                                        <option value="Research">Research Paper</option>
                                        <option value="Assessment">Assessment</option>
                                        <option value="Notes">Study Notes</option>
                                    </select>
                                </div>

                                {/* Tags */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Tags / Keywords (Comma separated)
                                    </label>
                                    <input
                                        type="text"
                                        value={tags}
                                        onChange={(e) => setTags(e.target.value)}
                                        placeholder="e.g. Jupiter, Nakshatras, Psychology"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm font-poppins"
                                    />
                                </div>

                                {/* Description */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Short Description <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Summarize the core findings and methodology..."
                                        required
                                        rows={4}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 text-sm resize-none font-poppins"
                                    />
                                </div>

                                {/* File Attachment (PDF Only) */}
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Attach PDF File <span className="text-rose-500">*</span>
                                    </label>
                                    
                                    <div className="relative group border-2 border-dashed border-gray-200 rounded-2xl p-6 hover:border-blue-500 hover:bg-blue-50/10 transition-all duration-200 flex flex-col items-center justify-center cursor-pointer text-center">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            required
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        
                                        <Upload className={`h-8 w-8 mb-2 transition-colors ${selectedFile ? "text-emerald-500" : "text-gray-400 group-hover:text-blue-500"}`} />
                                        
                                        {selectedFile ? (
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800 leading-snug">
                                                    {selectedFile.name}
                                                </p>
                                                <p className="text-xs text-emerald-600 font-semibold mt-1">
                                                    PDF Selected ✓ ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                                                </p>
                                            </div>
                                        ) : (
                                            <div>
                                                <p className="text-sm font-semibold text-gray-700 leading-snug">
                                                    Select research PDF file
                                                </p>
                                                <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                                                    PDF only, max size 10MB
                                                </p>
                                            </div>
                                        )}
                                    </div>
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
                                        disabled={uploadLoading || !title.trim() || !author.trim() || !description.trim() || !selectedFile}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer text-center flex items-center justify-center gap-1.5"
                                    >
                                        {uploadLoading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white"></div>
                                                Uploading...
                                            </>
                                        ) : (
                                            "Upload Paper"
                                        )}
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
