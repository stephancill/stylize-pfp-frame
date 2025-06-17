"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface Theme {
  id: string;
  name: string;
  prompt: string;
}

const themes: Theme[] = [
  {
    id: "studioGhibli",
    name: "Studio Ghibli",
    prompt: `Reimagine the provided image in the iconic Studio Ghibli style.`,
  },
  {
    id: "higherBuddy",
    name: "Higher Buddy",
    prompt: `come up with an animal or creature (not too obscure) that is representative of the character or vibe of the image.

then generate a profile picture of the animal. include as many defining characteristics as possible. if the character is wearing clothes, try to match it as closely as possible - otherwise give the character a minimalist outfit.

image characteristics: high grain effect, 90s disposable camera style with chromatic aberration, slight yellow tint, and hyper-realistic photography with detailed elements, captured in harsh flash photography style, vintage paparazzi feel. preserve the prominent colors in the original image`,
  },
  {
    id: "cinematicFantasy",
    name: "Cinematic Fantasy",
    prompt: `Transform the provided profile picture into a mythical or fantasy version.

Key elements for the transformation:
1. Subject Adaptation: Reimagine the animal/creature in the image as a mythical or fantasy version.
2. Attire/Features: Adorn the subject with fantasy-themed attire or features (e.g., mystical armor, glowing runes, ethereal wings) suitable for its form.
3. Atmosphere: Create a dramatic and cinematic atmosphere with dynamic lighting (e.g., god rays, magical glows, contrasting shadows) and a rich, detailed background suggesting an epic fantasy world.
4. Artistic Style: The final image should look like a piece of high-detail digital fantasy art, emphasizing realism within the fantasy context.

Ensure the result is a captivating, profile picture-worthy artwork.`,
  },
];

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
  getSelectedPrompt,
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
      <Dialog
        open={showCustomPromptDialog}
        onOpenChange={setShowCustomPromptDialog}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enter Custom Prompt</DialogTitle>
            <DialogDescription>
              Type your desired prompt below. This will override the selected
              theme.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              id="customPromptInput"
              value={tempCustomPrompt}
              onChange={(e) => setTempCustomPrompt(e.target.value)}
              placeholder="e.g., A cat wearing a wizard hat"
              className="w-full"
            />
          </div>
          <DialogFooter className="sm:justify-end">
            <Button type="button" onClick={handleSaveCustomPrompt}>
              Save Prompt
            </Button>
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelCustomPrompt}
              >
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { themes };
export type { Theme };
