"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Plus, Image } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2 px-4"
            >
              {pathname === "/v2" ? (
                <Plus className="h-9 w-9 stroke-[3]" />
              ) : (
                <Plus className="h-9 w-9" />
              )}
            </Button>
          </Link>
          <Link href="/v2/gallery">
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 h-auto py-2 px-4"
            >
              {pathname === "/v2/gallery" ? (
                <Image className="h-9 w-9 stroke-[3]" />
              ) : (
                <Image className="h-9 w-9" />
              )}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex justify-center">
      <div className="flex space-x-1">
        <Link href="/v2">
          <Button variant={pathname === "/v2" ? "default" : "ghost"} size="sm">
            Create
          </Button>
        </Link>
        <Link href="/v2/gallery">
          <Button
            variant={pathname === "/v2/gallery" ? "default" : "ghost"}
            size="sm"
          >
            Gallery
          </Button>
        </Link>
      </div>
    </div>
  );
}
