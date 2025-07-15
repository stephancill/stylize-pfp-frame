"use client";

import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function GalleryPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-16 px-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-8">
          Gallery
        </h1>
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>Please sign in to view the gallery</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-8">
        Gallery
      </h1>
      <div className="text-center text-gray-600 dark:text-gray-400">
        <p>Browse all frames in the gallery</p>
      </div>
    </div>
  );
}
