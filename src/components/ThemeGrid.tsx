"use client";

import { ThemeModal } from "@/components/ThemeModal";
import { ThemeRow, type ServerTheme } from "@/components/ThemeRow";
import { fetchAuth } from "@/lib/fetch-auth";
import { useQuery } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { useState } from "react";

interface ThemeGridProps {
  selectedThemeId: string;
  customPrompt: string;
  onThemeSelect: (themeId: string) => void;
  onCustomPromptChange: (prompt: string) => void;
  uploadedImage?: string | null;
}

export function ThemeGrid({
  selectedThemeId,
  customPrompt,
  onThemeSelect,
  onCustomPromptChange,
  uploadedImage,
}: ThemeGridProps) {
  const [showCredenza, setShowCredenza] = useState(false);
  const [selectedTheme, setSelectedThemeForCredenza] = useState<{
    id: string;
    name: string;
    prompt: string;
    usageCount?: number;
    author?: ServerTheme["author"];
    selectedImage?: ServerTheme["images"][0];
    images?: ServerTheme["images"];
  } | null>(null);
  const [tempCustomPrompt, setTempCustomPrompt] = useState("");

  // Fetch themes from server using React Query
  const { data: serverThemes = [], isLoading } = useQuery<ServerTheme[]>({
    queryKey: ["themes"],
    queryFn: async () => {
      const response = await fetchAuth("/api/themes");
      if (!response.ok) {
        throw new Error("Failed to fetch themes");
      }
      const data = await response.json();
      return data.themes || [];
    },
  });

  const handleThemeClick = (
    theme: ServerTheme,
    selectedImage?: ServerTheme["images"][0]
  ) => {
    setSelectedThemeForCredenza({
      id: `theme-${theme.promptText}`,
      name: theme.author?.username || "Community",
      prompt: theme.promptText,
      usageCount: theme.usageCount,
      author: theme.author,
      selectedImage,
      images: theme.images,
    });
    setShowCredenza(true);
  };

  const handleCustomClick = () => {
    setSelectedThemeForCredenza({
      id: "custom",
      name: "Custom",
      prompt: customPrompt,
    });
    setTempCustomPrompt(customPrompt);
    setShowCredenza(true);
  };

  const handleProceed = () => {
    if (!uploadedImage) return; // Don't proceed if no image uploaded

    if (selectedTheme?.id === "custom") {
      onCustomPromptChange(tempCustomPrompt);
    } else if (selectedTheme) {
      onThemeSelect(selectedTheme.id);
    }
    setShowCredenza(false);
  };

  const handleCancel = () => {
    setShowCredenza(false);
    setSelectedThemeForCredenza(null);
  };

  return (
    <div className="w-full space-y-6">
      {/* Custom Option */}
      <div
        className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        onClick={handleCustomClick}
      >
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-md flex items-center justify-center">
            <Plus className="h-8 w-8 text-gray-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              Custom Theme
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Create your own unique style
            </p>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          </div>
        </div>
      )}

      {/* Server Theme Options */}
      {!isLoading &&
        serverThemes.map((theme, index) => (
          <ThemeRow
            key={`theme-${index}`}
            theme={theme}
            onThemeClick={handleThemeClick}
          />
        ))}

      {/* Theme Modal */}
      <ThemeModal
        open={showCredenza}
        onOpenChange={setShowCredenza}
        selectedTheme={selectedTheme}
        tempCustomPrompt={tempCustomPrompt}
        onTempCustomPromptChange={setTempCustomPrompt}
        onProceed={handleProceed}
        uploadedImage={uploadedImage}
      />
    </div>
  );
}
