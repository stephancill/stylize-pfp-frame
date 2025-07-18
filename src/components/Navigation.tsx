"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { Plus, Image } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function Navigation() {
  const isMobile = useIsMobile();
  const pathname = usePathname();

  // Wait for mobile detection to complete before rendering
  if (isMobile === undefined) {
    return null;
  }

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-4">
        <div className="flex justify-around items-center py-4">
          <Link href="/">
            <Plus
              className={clsx(
                "h-6 w-6 text-muted-foreground",
                pathname === "/" && "!text-foreground"
              )}
            />
          </Link>
          <Link href="/gallery">
            <Image
              className={clsx(
                "h-6 w-6 text-muted-foreground",
                pathname === "/gallery" && "!text-foreground"
              )}
            />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex justify-center">
      <div className="flex space-x-16">
        <Link href="/">
          <div
            className={clsx(
              "flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors",
              pathname === "/" && "!text-foreground"
            )}
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm">Create</span>
          </div>
        </Link>
        <Link href="/gallery">
          <div
            className={clsx(
              "flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors",
              pathname === "/gallery" && "!text-foreground"
            )}
          >
            <Image className="h-6 w-6" />
            <span className="text-sm">Gallery</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
