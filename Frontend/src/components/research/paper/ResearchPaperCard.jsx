"use client";
import React from "react";
import { motion } from "framer-motion";
import { Calendar, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useKundliStore } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { getApiUrl } from "@/lib/apiConfig";

export const ResearchPaperCard = ({ _id, title, author, date, description, link = "#", fileUrl, createdAt, onDeleteSuccess, showToast }) => {
    const { currentUser, token, isAuthenticated } = useKundliStore();
    const navigate = useNavigate();
    const pdfUrl = fileUrl || link;
    const isAdmin = isAuthenticated && currentUser?.role === "admin";
    const [deleting, setDeleting] = React.useState(false);

    const displayDate = date && date.trim() 
        ? date 
        : (createdAt && !isNaN(new Date(createdAt).getTime())
            ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
            : new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }));

    const handleCardClick = (e) => {
        if (!isAuthenticated) {
            e?.preventDefault();
            e?.stopPropagation();
            navigate("/login", { state: { from: { pathname: "/research/research-papers" } } });
            return;
        }
        if (pdfUrl && pdfUrl !== "#") {
            window.open(pdfUrl, "_blank", "noopener,noreferrer");
        }
    };

    const handleDelete = async (e) => {
        e.stopPropagation(); // Prevent card click behavior

        const confirmDelete = window.confirm("Are you sure you want to delete this research paper? This action cannot be undone.");
        if (!confirmDelete) return;

        setDeleting(true);
        try {
            const response = await fetch(getApiUrl(`/api/papers/${_id}`), {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || "Failed to delete paper");
            }

            if (showToast) {
                showToast("Research paper deleted successfully! 🗑️");
            }
            if (onDeleteSuccess) {
                onDeleteSuccess();
            }
        } catch (error) {
            if (showToast) {
                showToast(error.message || "Error deleting paper.", "error");
            } else {
                alert(error.message || "Error deleting paper.");
            }
        } finally {
            setDeleting(false);
        }
    };

    return (<motion.div whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 200, damping: 15 }} onClick={handleCardClick} className="group relative flex flex-col justify-between rounded-2xl bg-white/70 p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] backdrop-blur-md border border-gray-100 hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] transition-all duration-300 cursor-pointer">
      <div>
        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>

        {/* Meta Info */}
        <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
          {author && (<div className="flex items-center gap-1">
            <User className="h-4 w-4"/>
            <span>{author}</span>
          </div>)}
          {displayDate && (<div className="flex items-center gap-1">
            <Calendar className="h-4 w-4"/>
            <span>{displayDate}</span>
          </div>)}
        </div>

        {/* Description */}
        <p className="mt-4 text-gray-600 text-sm leading-relaxed line-clamp-3">
          {description}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex items-center justify-between gap-3">
        <Button asChild onClick={(e) => {
            e.stopPropagation();
            if (!isAuthenticated) {
                e.preventDefault();
                navigate("/login", { state: { from: { pathname: "/research/research-papers" } } });
            }
        }} className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium px-5 py-2 rounded-xl shadow-md transition-all duration-200 cursor-pointer flex-1 text-center">
          <a href={isAuthenticated ? pdfUrl : "#"} target={isAuthenticated ? "_blank" : "_self"} rel="noopener noreferrer">
            Read Paper →
          </a>
        </Button>

        {isAdmin && _id && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition-all duration-200 border border-rose-200 cursor-pointer disabled:opacity-50 shrink-0"
            title="Delete Paper"
          >
            {deleting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-rose-600"></div>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Decorative Gradient */}
      <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-blue-100/30 via-purple-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </motion.div>);
};
