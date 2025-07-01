import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface ShareCardProps {
  id: string;
  imageDataUrl: string;
  promptText: string | null;
  userPfpUrl: string | null;
  createdAt: string;
}

export function ShareCard({
  id,
  imageDataUrl,
  promptText,
  userPfpUrl,
  createdAt,
}: ShareCardProps) {
  const [showInputFirst, setShowInputFirst] = useState(false);
  const router = useRouter();

  const mainImageSrc = showInputFirst
    ? userPfpUrl || imageDataUrl || ""
    : imageDataUrl || userPfpUrl || "";
  const overlaySrc = showInputFirst
    ? imageDataUrl || ""
    : userPfpUrl || "";

  const handleUsePrompt = () => {
    // Redirect to home page with prompt in URL params
    const params = new URLSearchParams();
    if (promptText) {
      params.set('prompt', promptText);
    }
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="flex flex-col items-center space-y-6 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Shared Creation</h1>
        <p className="text-muted-foreground">
          Check out this AI-generated character!
        </p>
      </div>

      <Card className="overflow-hidden flex flex-col w-full">
        <CardContent className="p-0 aspect-square flex-grow relative group">
          {mainImageSrc ? (
            <div>
              <img
                src={mainImageSrc}
                alt={promptText || "Generated Character"}
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
            </div>
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <p className="text-muted-foreground">Image not available</p>
            </div>
          )}
        </CardContent>
        
        {(promptText || createdAt) && (
          <CardFooter className="p-4 flex flex-col items-start border-t space-y-2">
            {promptText && (
              <p className="text-sm text-foreground font-medium">
                Style: {promptText}
              </p>
            )}
            {createdAt && (
              <p className="text-xs text-muted-foreground">
                Created {new Date(createdAt).toLocaleDateString()}
              </p>
            )}
          </CardFooter>
        )}
      </Card>

      <Button 
        onClick={handleUsePrompt}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 text-lg"
        size="lg"
      >
        Use This Prompt
      </Button>

      <p className="text-sm text-muted-foreground text-center">
        Click "Use This Prompt" to create your own version with this style
      </p>
    </div>
  );
}