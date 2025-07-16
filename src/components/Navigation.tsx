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
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-around items-center py-4">
          <Link href="/v2">
            <Plus
              className={clsx(
                "h-6 w-6 text-muted-foreground",
                pathname === "/v2" && "text-black dark:text-white"
              )}
            />
          </Link>
          <Link href="/v2/gallery">
            <Image
              className={clsx(
                "h-6 w-6 text-muted-foreground",
                pathname === "/v2/gallery" && "text-black dark:text-white"
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
        <Link href="/v2">
          <div
            className={clsx(
              "flex items-center space-x-2 text-muted-foreground hover:text-black hover:dark:text-white transition-colors",
              pathname === "/v2" && "text-black dark:text-white"
            )}
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm">Create</span>
          </div>
        </Link>
        <Link href="/v2/gallery">
          <div
            className={clsx(
              "flex items-center space-x-2 text-muted-foreground hover:text-black hover:dark:text-white transition-colors",
              pathname === "/v2/gallery" && "text-black dark:text-white"
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
