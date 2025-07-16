"use client";

import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { fetchAuth } from "@/lib/fetch-auth";
import { ThemeRow, type ServerTheme } from "./ThemeRow";
import { Loader2 } from "lucide-react";

interface UserThemesProps {
  onThemeClick?: (
    theme: ServerTheme,
    selectedImage?: ServerTheme["images"][0]
  ) => void;
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
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
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
        <p className="text-sm text-gray-400 mt-2">
          Start creating to see your themes here!
        </p>
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
