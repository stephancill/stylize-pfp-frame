import { themes, type Theme } from "./themes";

export interface PromptInfo {
  label: string;
  prompt: string;
  isCustom: boolean;
}

// Helper function to find matching theme
export const findMatchingTheme = (prompt: string): Theme | null => {
  return themes.find((theme) => theme.prompt.trim() === prompt.trim()) || null;
};

// Function to get prompt information (label and whether it's custom)
export const getPromptInfo = (prompt: string): PromptInfo => {
  const matchingTheme = findMatchingTheme(prompt);
  
  if (matchingTheme) {
    return {
      label: matchingTheme.name,
      prompt: prompt,
      isCustom: false,
    };
  }
  
  return {
    label: "Custom Prompt",
    prompt: prompt,
    isCustom: true,
  };
};

// Function to truncate prompt text for display
export const truncatePrompt = (
  prompt: string,
  maxLength: number = 100,
  showFull: boolean = false
): string => {
  if (showFull || prompt.length <= maxLength) {
    return prompt;
  }
  
  // If prompt has newlines, show only the first line when truncated
  if (prompt.indexOf("\n") !== -1) {
    return prompt.split("\n")[0];
  }
  
  // Otherwise truncate at maxLength
  return prompt.length > maxLength 
    ? prompt.substring(0, maxLength) + "..."
    : prompt;
};