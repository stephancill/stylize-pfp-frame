"use client";

import { useState } from "react";

interface PromptDisplayProps {
  promptText: string;
  className?: string;
  maxLength?: number;
}

export function PromptDisplay({
  promptText,
  className = "",
  maxLength = 100,
}: PromptDisplayProps) {
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  if (!promptText) {
    return null;
  }

  const shouldShowToggle = promptText.length > maxLength;

  return (
    <div className={className}>
      <p
        className={`text-sm text-muted-foreground whitespace-pre-wrap ${
          shouldShowToggle && !showFullPrompt ? "line-clamp-2" : ""
        } ${shouldShowToggle ? "cursor-pointer" : ""}`}
        onClick={() => {
          if (shouldShowToggle) {
            setShowFullPrompt(!showFullPrompt);
          }
        }}
      >
        {promptText}
      </p>
      {shouldShowToggle && (
        <button
          type="button"
          onClick={() => setShowFullPrompt(!showFullPrompt)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showFullPrompt ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}
