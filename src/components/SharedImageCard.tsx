"use client";

import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

interface SharedImageData {
  id: string;
  imageDataUrl: string | null;
  promptText: string | null;
  createdAt: string;
  quoteId: string;
  userPfpUrl: string | null;
}

interface SharedImageCardProps {
  image: SharedImageData;
  onDownload?: (imageDataUrl: string, imageId: string) => void;
}

export function SharedImageCard({ image, onDownload }: SharedImageCardProps) {
  const [showInputFirst, setShowInputFirst] = useState(false);

  const mainImageSrc = showInputFirst
    ? image.userPfpUrl || image.imageDataUrl || ""
    : image.imageDataUrl || image.userPfpUrl || "";
  const overlaySrc = showInputFirst
    ? image.imageDataUrl || ""
    : image.userPfpUrl || "";

  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (image.imageDataUrl && onDownload) {
      onDownload(image.imageDataUrl, image.id);
    }
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center space-y-6 max-w-lg">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Check out this AI-generated character!
        </h1>
        <p className="text-gray-600">
          Created with Stylize Me - Transform any image with AI
        </p>
      </div>

      <Card className="overflow-hidden flex flex-col w-full max-w-md">
        <CardContent className="p-0 aspect-square flex-grow relative group">
          {mainImageSrc ? (
            <>
              <img
                src={mainImageSrc}
                alt={image.promptText || "Generated Character"}
                className="w-full h-full object-cover"
              />
              {overlaySrc && (
                <img
                  src={overlaySrc}
                  alt="Input"
                  className="absolute top-2 right-2 w-16 h-16 object-cover border-2 border-background rounded-md cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowInputFirst((prev) => !prev);
                  }}
                />
              )}
              <div className="absolute bottom-2 left-2 right-2 flex justify-between gap-2 pointer-events-auto">
                {image.imageDataUrl && onDownload && (
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">Image not available</p>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="p-4 flex flex-col items-start border-t space-y-3">
          {image.promptText && (
            <div className="w-full">
              <p className="text-sm font-medium text-gray-700 mb-1">Prompt:</p>
              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                {image.promptText}
              </p>
            </div>
          )}
          
          {image.createdAt && (
            <p className="text-xs text-muted-foreground">
              Created {new Date(image.createdAt).toLocaleDateString()}
            </p>
          )}
          
          <Link 
            href={`/?imageId=${image.id}`}
            className="w-full"
          >
            <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
              Use This Prompt
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>

      <div className="text-center text-sm text-gray-500 max-w-md">
        <p>Want to create your own AI-generated characters?</p>
        <Link href="/" className="text-purple-600 hover:text-purple-700 font-medium">
          Try Stylize Me →
        </Link>
      </div>
    </div>
  );
}