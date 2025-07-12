"use client";

import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaContent,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaDescription,
  CredenzaFooter,
  CredenzaClose,
  CredenzaBody,
} from "@/components/ui/credenza";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import themes, { type Theme } from "@/lib/themes";

interface ThemeSelectorProps {
  selectedThemeId: string;
  customPrompt: string;
  onThemeSelect: (themeId: string) => void;
  onCustomPromptChange: (prompt: string) => void;
  getSelectedPrompt: () => string;
}

export function ThemeSelector({
  selectedThemeId,
  customPrompt,
  onThemeSelect,
  onCustomPromptChange,
}: ThemeSelectorProps) {
  const [showCustomPromptDialog, setShowCustomPromptDialog] = useState(false);
  const [tempCustomPrompt, setTempCustomPrompt] = useState(customPrompt);

  const handleSaveCustomPrompt = () => {
    onCustomPromptChange(tempCustomPrompt);
    setShowCustomPromptDialog(false);
  };

  const handleCancelCustomPrompt = () => {
    setTempCustomPrompt(customPrompt);
    setShowCustomPromptDialog(false);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Select Theme or Enter Custom Prompt:
      </label>

      <div className="flex flex-wrap gap-2 mb-4">
        {themes.map((theme) => (
          <Button
            key={theme.id}
            variant={selectedThemeId === theme.id ? "default" : "outline"}
            onClick={() => onThemeSelect(theme.id)}
            className="flex-1"
          >
            {theme.name}
          </Button>
        ))}
      </div>

      <Button
        variant="outline"
        onClick={() => {
          setTempCustomPrompt(customPrompt);
          setShowCustomPromptDialog(true);
        }}
        className="w-full mb-4"
      >
        Enter Custom Prompt
      </Button>

      {customPrompt && (
        <div className="p-2 mb-4 border border-blue-300 rounded-md bg-blue-50 text-blue-700 text-sm">
          <p className="font-semibold">Using Custom Prompt:</p>
          <p className="truncate">{customPrompt}</p>
        </div>
      )}

      {/* Custom Prompt Dialog */}
      <Credenza
        open={showCustomPromptDialog}
        onOpenChange={setShowCustomPromptDialog}
      >
        <CredenzaContent className="sm:max-w-md">
          <CredenzaHeader>
            <CredenzaTitle>Enter Custom Prompt</CredenzaTitle>
            <CredenzaDescription>
              Type your desired prompt below. This will override the selected
              theme.
            </CredenzaDescription>
          </CredenzaHeader>
          <CredenzaBody>
            <Textarea
              id="customPromptInput"
              value={tempCustomPrompt}
              onChange={(e) => setTempCustomPrompt(e.target.value)}
              placeholder="e.g., A cat wearing a wizard hat"
              className="w-full"
              rows={4}
            />
          </CredenzaBody>
          <CredenzaFooter className="sm:justify-end">
            <Button type="button" onClick={handleSaveCustomPrompt}>
              Save Prompt
            </Button>
            <CredenzaClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelCustomPrompt}
              >
                Cancel
              </Button>
            </CredenzaClose>
          </CredenzaFooter>
        </CredenzaContent>
      </Credenza>
    </div>
  );
}

export { themes };
export type { Theme };
