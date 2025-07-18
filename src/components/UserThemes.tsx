"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { fetchAuth } from "@/lib/fetch-auth";
import { ThemeRow, type ServerTheme } from "./ThemeRow";
import { Skeleton } from "@/components/ui/skeleton";

interface UserThemesProps {
  onThemeClick?: (
    theme: ServerTheme,
    selectedImage?: ServerTheme["images"][0]
  ) => void;
}

// Skeleton component for theme rows
function ThemeRowSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Image row skeleton */}
      <div className="grid grid-cols-3 gap-2">
        {Array(3)
          .fill(null)
          .map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
      </div>

      {/* Prompt description skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Author info skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  );
}

export function UserThemes({ onThemeClick }: UserThemesProps) {
  const { isAuthenticated, userId } = useAuth();

  const {
    data: userThemes = [],
    isLoading,
    error,
  } = useQuery<ServerTheme[]>({
    queryKey: ["userThemes", userId],
    queryFn: async () => {
      const response = await fetchAuth(`/api/themes?userId=${userId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch user themes");
      }
      const data = await response.json();
      return data.themes || [];
    },
    enabled: isAuthenticated && !!userId,
  });

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto md:mx-0 space-y-4">
        {Array(3)
          .fill(null)
          .map((_, i) => (
            <ThemeRowSkeleton key={i} />
          ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">Failed to load themes</p>
      </div>
    );
  }

  if (userThemes.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">You haven't created any themes yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto md:mx-0 space-y-4">
      {userThemes.map((theme, index) => (
        <ThemeRow
          key={`user-theme-${index}`}
          theme={theme}
          onThemeClick={onThemeClick || (() => {})}
        />
      ))}
    </div>
  );
}
