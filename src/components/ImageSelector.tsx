"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import { useImageSelection } from "@/providers/ImageSelectionProvider";

const getInitials = (
  displayName: string | undefined,
  username: string | undefined
) => {
  const nameToUse = displayName || username;
  if (!nameToUse) return "??";
  const names = nameToUse.split(" ");
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return nameToUse.substring(0, 2).toUpperCase();
};

interface ImageSelectorProps {
  displayName?: string;
  username?: string;
}

export function ImageSelector({ displayName, username }: ImageSelectorProps) {
  const {
    selectedImage,
    uploadedImage,
    profileImage,
    fileInputRef,
    uploadImage,
    clearUploadedImage,
    setUseUploadedImage,
    useUploadedImage,
  } = useImageSelection();

  const handleClearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearUploadedImage();
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const hasProfileImage = !!profileImage;
  const showBothOptions = hasProfileImage;

  return (
    <div className="w-full">
      <div
        className={`grid ${
          showBothOptions ? "grid-cols-2" : "grid-cols-1"
        } gap-4 mb-4`}
      >
        {/* Profile Picture Option - only show if user has profile image */}
        {hasProfileImage && (
          <div className="flex flex-col items-center">
            <Card
              className={`cursor-pointer transition-all hover:bg-gray-25 mb-2 w-24 h-24 ${
                !useUploadedImage ? "ring-2 ring-blue-500 ring-offset-2" : ""
              }`}
              onClick={() => setUseUploadedImage(false)}
            >
              <CardContent className="p-4 flex items-center justify-center h-full">
                <div className="w-16 h-16 rounded-md overflow-hidden">
                  <Avatar className="w-full h-full">
                    <AvatarImage src={profileImage} alt="Profile" />
                    <AvatarFallback>
                      {getInitials(displayName, username)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </CardContent>
            </Card>
            <p className="text-sm font-medium text-center">Profile</p>
          </div>
        )}

        {/* Upload Option */}
        <div className="flex flex-col items-center">
          <Card
            className={`cursor-pointer transition-all hover:bg-gray-25 mb-2 w-24 h-24 ${
              useUploadedImage ? "ring-2 ring-blue-500 ring-offset-2" : ""
            }`}
            onClick={triggerFileInput}
          >
            <CardContent className="p-4 flex items-center justify-center h-full">
              {uploadedImage ? (
                <div className="relative inline-block">
                  <img
                    src={uploadedImage}
                    alt="Uploaded"
                    className="w-16 h-16 rounded-md object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                    onClick={handleClearImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-md flex items-center justify-center border-2 border-dashed border-gray-300">
                  <Upload className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </CardContent>
          </Card>
          <p className="text-sm font-medium text-center">Upload</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={uploadImage}
        className="hidden"
      />
    </div>
  );
}
