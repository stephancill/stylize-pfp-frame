"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { Star, Eye } from "lucide-react";

export interface CompletedImage {
  id: string;
  imageDataUrl: string | null;
  promptText: string | null;
  createdAt: string;
  quoteId: string;
  userPfpUrl: string | null;
  referenceCount?: number;
}

interface SimpleCreationItemProps {
  image: CompletedImage;
  onClick: () => void;
  toggleEnabled?: boolean;
}

export function SimpleCreationItem({
  image,
  onClick,
  toggleEnabled = false,
}: SimpleCreationItemProps) {
  const [showInputFirst, setShowInputFirst] = useState(false);

  const mainImageSrc = showInputFirst
    ? image.userPfpUrl || image.imageDataUrl || ""
    : image.imageDataUrl || image.userPfpUrl || "";
  const overlaySrc = showInputFirst
    ? image.imageDataUrl || ""
    : image.userPfpUrl || "";

  return (
    <Card
      className={`flex flex-col rounded-t-lg overflow-hidden ${
        toggleEnabled
          ? "cursor-default"
          : "cursor-pointer hover:opacity-90 transition-opacity"
      }`}
      onClick={toggleEnabled ? undefined : onClick}
    >
      <CardContent className="p-0 aspect-square flex-grow relative group overflow-hidden">
        {mainImageSrc ? (
          <>
            <img
              src={mainImageSrc}
              alt={image.promptText || "Generated image"}
              className="w-full h-full object-cover"
            />
            {overlaySrc && toggleEnabled && (
              <img
                src={overlaySrc}
                alt="Input"
                className="absolute top-2 right-2 w-1/3 h-1/3 object-cover border-2 border-background rounded-md cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowInputFirst((prev) => !prev);
                }}
              />
            )}
            {overlaySrc && !toggleEnabled && (
              <img
                src={overlaySrc}
                alt="Input"
                className="absolute top-2 right-2 w-1/3 h-1/3 object-cover border-2 border-background rounded-md"
              />
            )}
            {/* Hover overlay with eye icon */}
            {!toggleEnabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <Eye className="h-8 w-8 text-white" />
              </div>
            )}
            {/* Reference count badge */}
            {image.referenceCount && image.referenceCount > 0 && (
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                <Star className="h-3 w-3" />
                <span>{image.referenceCount}</span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <p className="text-muted-foreground">Image not available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
