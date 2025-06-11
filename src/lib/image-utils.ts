export interface ResizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

/**
 * Resizes an image file while maintaining aspect ratio
 * @param file - The image file to resize
 * @param options - Resize options including maxWidth, maxHeight, and quality
 * @returns Promise that resolves to a data URL of the resized image
 */
export function resizeImage(
  file: File,
  options: ResizeOptions = {}
): Promise<string> {
  const { maxWidth = 1024, maxHeight = 1024, quality = 0.9 } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    if (!ctx) {
      reject(new Error("Failed to get canvas context"));
      return;
    }

    img.onload = () => {
      // Clean up object URL
      URL.revokeObjectURL(img.src);

      // Calculate new dimensions while maintaining aspect ratio
      const { width: newWidth, height: newHeight } = calculateResizeDimensions(
        img.width,
        img.height,
        maxWidth,
        maxHeight
      );

      // Set canvas dimensions
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Draw and resize the image
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Convert to data URL
      const dataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrl);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    // Create object URL for the image
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
  });
}

/**
 * Calculates new dimensions for resizing while maintaining aspect ratio
 * @param originalWidth - Original image width
 * @param originalHeight - Original image height
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @returns Object with new width and height
 */
export function calculateResizeDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  // If image is already smaller than max dimensions, return original
  if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
    return { width: originalWidth, height: originalHeight };
  }

  // Calculate aspect ratio
  const aspectRatio = originalWidth / originalHeight;

  let newWidth = maxWidth;
  let newHeight = maxWidth / aspectRatio;

  // If height exceeds max height, scale by height instead
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = maxHeight * aspectRatio;
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  };
}

/**
 * Checks if an image needs resizing based on its dimensions
 * @param file - The image file to check
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @returns Promise that resolves to boolean indicating if resize is needed
 */
export function checkIfResizeNeeded(
  file: File,
  maxWidth: number = 512,
  maxHeight: number = 512
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      const needsResize = img.width > maxWidth || img.height > maxHeight;
      URL.revokeObjectURL(img.src);
      resolve(needsResize);
    };

    img.onerror = () => {
      reject(new Error("Failed to load image for size check"));
    };

    img.src = URL.createObjectURL(file);
  });
}
