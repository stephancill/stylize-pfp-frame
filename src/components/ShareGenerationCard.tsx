'use client';

import React, { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ShareImage {
  id: string;
  imageDataUrl: string | null;
  userPfpUrl: string | null;
  promptText: string | null;
  createdAt?: string | Date;
}

export default function ShareGenerationCard({
  image,
}: {
  image: ShareImage;
}) {
  const [showInputFirst, setShowInputFirst] = useState(false);

  if (!image.imageDataUrl) {
    return null;
  }

  const mainImageSrc = showInputFirst
    ? image.userPfpUrl || image.imageDataUrl
    : image.imageDataUrl;

  const overlaySrc = showInputFirst ? image.imageDataUrl : image.userPfpUrl;

  return (
    <Card className="w-full max-w-md overflow-hidden flex flex-col">
      <CardContent className="p-0 relative aspect-square flex-grow group">
        <img
          src={mainImageSrc}
          alt="Generated"
          className="w-full h-full object-cover"
        />
        {overlaySrc && (
          <img
            src={overlaySrc}
            alt="Input"
            className="absolute top-2 right-2 w-16 h-16 object-cover border-2 border-background rounded-md cursor-pointer"
            onClick={() => setShowInputFirst((prev) => !prev)}
          />
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-4 items-start border-t p-4">
        {image.promptText && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {image.promptText}
          </p>
        )}
        <Link href={`/?imageId=${image.id}`} className="w-full">
          <Button className="w-full" variant="default">
            Use this prompt
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}