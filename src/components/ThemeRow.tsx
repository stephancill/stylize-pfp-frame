"use client";

import { Users, Star } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface StandardizedUser {
  username: string;
  avatar: string | null;
  source: "farcaster" | "ens" | "basename";
}

export interface ServerTheme {
  promptText: string;
  usageCount: number;
  author: {
    id: string;
    username?: string;
    avatar?: string | null;
    source?: "farcaster" | "ens" | "basename";
  } | null;
  images: Array<{
    id: string;
    referenceCount: number;
    creator: {
      id: string;
      username?: string;
      avatar?: string | null;
      source?: "farcaster" | "ens" | "basename";
    };
    urls: {
      input: string | null;
      output: string | null;
    };
  }>;
}

interface ThemeRowProps {
  theme: ServerTheme;
  onThemeClick: (
    theme: ServerTheme,
    selectedImage?: ServerTheme["images"][0]
  ) => void;
}

export function ThemeRow({ theme, onThemeClick }: ThemeRowProps) {
  return (
    <Card
      className="cursor-pointer transition-colors"
      onClick={() => onThemeClick(theme)}
    >
      <div className="p-4 space-y-3">
        {/* Image row */}
        <div className="grid grid-cols-3 gap-2">
          {theme.images.slice(0, 3).map((image, imgIndex) => (
            <div
              key={image.id}
              className="relative group cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onThemeClick(theme, image);
              }}
            >
              <div className="aspect-square rounded-md overflow-hidden bg-gray-200 dark:bg-gray-700">
                {image.urls.output ? (
                  <img
                    src={image.urls.output}
                    alt={`Theme variation ${imgIndex + 1}`}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-xs text-gray-400">No preview</span>
                  </div>
                )}
              </div>
              {/* Reference count badge */}
              {image.referenceCount > 0 && (
                <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  <span>{image.referenceCount}</span>
                </div>
              )}
            </div>
          ))}

          {/* Fill empty slots */}
          {theme.images.length < 3 &&
            Array(3 - theme.images.length)
              .fill(null)
              .map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="aspect-square rounded-md bg-gray-200 dark:bg-gray-700 flex items-center justify-center"
                >
                  <span className="text-xs text-gray-400">No preview</span>
                </div>
              ))}
        </div>

        {/* Prompt description */}
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {theme.promptText}
        </p>

        {/* Author info with profile image */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
            {theme.author?.avatar && (
              <img
                src={theme.author.avatar}
                alt={theme.author.username || "User"}
                className="w-3 h-3 rounded-full"
              />
            )}
            <span>@{theme.author?.username || "community"}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800">
            <Users className="h-3 w-3" />
            <span>{theme.usageCount}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
