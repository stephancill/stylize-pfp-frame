"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useState, useRef, useEffect } from "react";
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

export function SimpleCreationItem({
  image,
  onClick,
  toggleEnabled = false,
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

  const mainImageSrc = showInputFirst
    ? image.userPfpUrl || image.imageDataUrl || ""
    : image.imageDataUrl || image.userPfpUrl || "";
  const overlaySrc = showInputFirst
    ? image.imageDataUrl || ""
    : image.userPfpUrl || "";

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

  const handleOverlayTouchEnd = (e: React.TouchEvent) => {
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
      onClick={toggleEnabled ? undefined : onClick}
    >
      <CardContent
        className="p-0 aspect-square flex-grow relative group overflow-hidden"
        ref={containerRef}
      >
        {mainImageSrc ? (
          <>
            <img
              src={mainImageSrc}
              alt={image.promptText || "Generated image"}
              className="w-full h-full object-cover"
            />
            {overlaySrc && toggleEnabled && containerSize.width > 0 && (
              <img
                ref={overlayRef}
                src={overlaySrc}
                alt="Input"
                className="absolute w-1/3 h-1/3 object-cover border-2 border-background rounded-md select-none"
                style={overlayStyle}
                onMouseDown={handleDragStart}
                onTouchStart={handleDragStart}
                onTouchEnd={handleOverlayTouchEnd}
                onClick={handleOverlayClick}
                draggable={false}
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
