"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect, ReactNode } from "react";
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
  toggleEnabled?: boolean;
  fallbackComponent?: ReactNode;
  hoverOverlay?: ReactNode;
}

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const getCornerPosition = (
  corner: Corner,
  containerSize: { width: number; height: number }
) => {
  const overlaySize = containerSize.width / 3;
  const margin = 8; // 0.5rem

  switch (corner) {
    case "top-left":
      return { left: margin, top: margin };
    case "top-right":
      return { left: containerSize.width - overlaySize - margin, top: margin };
    case "bottom-left":
      return { left: margin, top: containerSize.height - overlaySize - margin };
    case "bottom-right":
      return {
        left: containerSize.width - overlaySize - margin,
        top: containerSize.height - overlaySize - margin,
      };
  }
};

export function SwitchableImage({
  image,
  toggleEnabled = false,
  fallbackComponent,
  hoverOverlay,
}: SimpleCreationItemProps) {
  const [showInputFirst, setShowInputFirst] = useState(false);
  const [corner, setCorner] = useState<Corner>("top-right");
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLImageElement>(null);
  const hasDraggedRef = useRef(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (containerRef.current) {
      const updateSize = () => {
        if (containerRef.current) {
          setContainerSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight,
          });
          // Mark as initialized after first size update
          if (!hasInitialized) {
            setHasInitialized(true);
          }
        }
      };

      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }
  }, [hasInitialized]);

  const primarySrc = showInputFirst ? image.userPfpUrl : image.imageDataUrl;
  const secondarySrc = showInputFirst ? image.imageDataUrl : image.userPfpUrl;

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!toggleEnabled) return;

    e.preventDefault();
    e.stopPropagation();

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    hasDraggedRef.current = false;
    setDragStart({ x: clientX, y: clientY });
    setDragPosition({ x: 0, y: 0 }); // Start with no transform offset
  };

  const handleDragMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current || !overlayRef.current) return;

    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    const deltaX = clientX - dragStart.x;
    const deltaY = clientY - dragStart.y;

    // Consider it a drag if moved more than 5 pixels
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasDraggedRef.current = true;
    }

    // Get current corner position and container size
    const containerRect = containerRef.current.getBoundingClientRect();
    const overlaySize = containerRect.width / 3;
    const cornerPos = getCornerPosition(corner, {
      width: containerRect.width,
      height: containerRect.height,
    });

    // Calculate new position
    const newX = cornerPos.left + deltaX;
    const newY = cornerPos.top + deltaY;

    // Apply constraints
    const maxX = containerRect.width - overlaySize;
    const maxY = containerRect.height - overlaySize;

    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));

    // Set the constrained delta
    setDragPosition({
      x: constrainedX - cornerPos.left,
      y: constrainedY - cornerPos.top,
    });
  };

  const handleDragEnd = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current || !overlayRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const overlayRect = overlayRef.current.getBoundingClientRect();

    // Calculate center position of overlay
    const overlayCenterX =
      overlayRect.left + overlayRect.width / 2 - containerRect.left;
    const overlayCenterY =
      overlayRect.top + overlayRect.height / 2 - containerRect.top;

    // Determine closest corner
    const isLeft = overlayCenterX < containerRect.width / 2;
    const isTop = overlayCenterY < containerRect.height / 2;

    const newCorner: Corner = `${isTop ? "top" : "bottom"}-${
      isLeft ? "left" : "right"
    }` as Corner;

    // Get the new corner position
    const newPosition = getCornerPosition(newCorner, {
      width: containerRect.width,
      height: containerRect.height,
    });

    // Current actual position (where the overlay is now)
    const currentLeft = overlayRect.left - containerRect.left;
    const currentTop = overlayRect.top - containerRect.top;

    // Calculate the offset to maintain current visual position
    const offsetX = currentLeft - newPosition.left;
    const offsetY = currentTop - newPosition.top;

    // Set the transform to maintain visual position when corner changes
    setDragPosition({ x: offsetX, y: offsetY });

    // Change corner
    setCorner(newCorner);

    // After a frame, animate back to corner position
    requestAnimationFrame(() => {
      setDragPosition({ x: 0, y: 0 });
    });

    setIsDragging(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only toggle if it wasn't a drag
    if (!hasDraggedRef.current) {
      setShowInputFirst((prev) => !prev);
    }
  };

  useEffect(() => {
    if (isDragging) {
      const handleMove = (e: MouseEvent | TouchEvent) => handleDragMove(e);
      const handleEnd = (e: MouseEvent | TouchEvent) => handleDragEnd(e);

      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);

      return () => {
        document.removeEventListener("mousemove", handleMove);
        document.removeEventListener("mouseup", handleEnd);
        document.removeEventListener("touchmove", handleMove);
        document.removeEventListener("touchend", handleEnd);
      };
    }
  }, [isDragging, dragStart]);

  const cornerPosition =
    containerSize.width > 0
      ? getCornerPosition(corner, containerSize)
      : { left: 8, top: 8 };
  const overlayStyle = {
    position: "absolute" as const,
    left: `${cornerPosition.left}px`,
    top: `${cornerPosition.top}px`,
    transform: `translate(${dragPosition.x}px, ${dragPosition.y}px)`,
    transition: isDragging || !hasInitialized ? "none" : "all 0.3s ease",
    cursor: toggleEnabled ? "move" : "default",
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <Card
      className={`flex flex-col rounded-t-lg overflow-hidden ${
        toggleEnabled
          ? "cursor-default"
          : "cursor-pointer hover:opacity-90 transition-opacity"
      }`}
    >
      <CardContent
        className="p-0 aspect-square flex-grow relative group overflow-hidden"
        ref={containerRef}
      >
        {/* Primary image */}
        {primarySrc ? (
          <img
            src={primarySrc}
            alt={image.promptText || "Generated image"}
            className="w-full h-full object-cover"
          />
        ) : fallbackComponent ? (
          fallbackComponent
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <p className="text-muted-foreground">Image not available</p>
          </div>
        )}

        {/* Secondary image overlay - draggable when toggleEnabled */}
        {toggleEnabled && containerSize.width > 0 && (
          <div
            ref={overlayRef}
            className="absolute w-1/3 h-1/3 border-2 border-background rounded-md select-none overflow-hidden"
            style={overlayStyle}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            onClick={handleOverlayClick}
          >
            {secondarySrc ? (
              <img
                src={secondarySrc}
                alt="Input"
                className="w-full h-full object-cover"
                draggable={false}
              />
            ) : fallbackComponent ? (
              <div className="w-full h-full scale-[0.33] origin-top-left">
                {fallbackComponent}
              </div>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <p className="text-muted-foreground text-xs">No image</p>
              </div>
            )}
          </div>
        )}

        {/* Secondary image overlay - static when not toggleEnabled */}
        {!toggleEnabled && (
          <div className="absolute top-2 right-2 w-1/3 h-1/3 border-2 border-background rounded-md overflow-hidden">
            {secondarySrc ? (
              <img
                src={secondarySrc}
                alt="Input"
                className="w-full h-full object-cover"
              />
            ) : fallbackComponent ? (
              <div className="w-full h-full scale-[0.33] origin-top-left">
                {fallbackComponent}
              </div>
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <p className="text-muted-foreground text-xs">No image</p>
              </div>
            )}
          </div>
        )}

        {/* Hover overlay with eye icon */}
        {!toggleEnabled && hoverOverlay ? hoverOverlay : <></>}

        {/* Reference count badge */}
        {image.referenceCount && image.referenceCount > 0 && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
            <Star className="h-3 w-3" />
            <span>{image.referenceCount}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
