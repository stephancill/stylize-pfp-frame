"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X } from "lucide-react";
import { useRef } from "react";

interface ImageSelectorProps {
  profileImageUrl?: string;
  displayName?: string;
  username?: string;
  uploadedImage: string | null;
  useUploadedImage: boolean;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUseUploadedImageChange: (useUploaded: boolean) => void;
  onClearUploadedImage: () => void;
  onError: (message: string) => void;
}

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

export function ImageSelector({
  profileImageUrl,
  displayName,
  username,
  uploadedImage,
  useUploadedImage,
  onImageUpload,
  onUseUploadedImageChange,
  onClearUploadedImage,
  onError,
}: ImageSelectorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError("Image file size must be less than 5MB");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      onError("Please select a valid image file");
      return;
    }

    onImageUpload(event);
  };

  const handleClearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClearUploadedImage();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const hasProfileImage = !!profileImageUrl;
  const showBothOptions = hasProfileImage;

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        {showBothOptions
          ? "Choose Image to Stylize:"
          : "Upload Image to Stylize:"}
      </label>

      <div
        className={`grid ${
          showBothOptions ? "grid-cols-2" : "grid-cols-1"
        } gap-4 mb-4`}
      >
        {/* Profile Picture Option - only show if user has profile image */}
        {hasProfileImage && (
          <Card
            className={`cursor-pointer transition-all ${
              !useUploadedImage
                ? "ring-2 ring-purple-500 bg-purple-50"
                : "hover:bg-gray-50"
            }`}
            onClick={() => onUseUploadedImageChange(false)}
          >
            <CardContent className="p-4 text-center">
              <Avatar className="w-16 h-16 mx-auto mb-2">
                <AvatarImage src={profileImageUrl} alt="Profile" />
                <AvatarFallback>
                  {getInitials(displayName, username)}
                </AvatarFallback>
              </Avatar>
              <p className="text-sm font-medium">Use Profile Picture</p>
            </CardContent>
          </Card>
        )}

        {/* Upload Option */}
        <Card
          className={`cursor-pointer transition-all ${
            useUploadedImage || !hasProfileImage
              ? "ring-2 ring-purple-500 bg-purple-50"
              : "hover:bg-gray-50"
          } ${!showBothOptions ? "col-span-1" : ""}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <CardContent
            className={`p-${showBothOptions ? "4" : "6"} text-center`}
          >
            {uploadedImage ? (
              <div className="relative inline-block">
                <img
                  src={uploadedImage}
                  alt="Uploaded"
                  className={`${
                    showBothOptions ? "w-16 h-16 mb-2" : "w-20 h-20 mb-3"
                  } mx-auto rounded-full object-cover`}
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
              <div
                className={`${
                  showBothOptions ? "w-16 h-16 mb-2" : "w-20 h-20 mb-3"
                } mx-auto bg-gray-200 rounded-full flex items-center justify-center`}
              >
                <Upload
                  className={`${
                    showBothOptions ? "h-6 w-6" : "h-8 w-8"
                  } text-gray-400`}
                />
              </div>
            )}
            <p
              className={`${
                showBothOptions ? "text-sm" : "text-lg"
              } font-medium`}
            >
              {uploadedImage
                ? "Change Image"
                : showBothOptions
                ? "Upload Image"
                : "Upload Your Image"}
            </p>
            {!showBothOptions && (
              <p className="text-sm text-gray-500 mt-1">
                Click to select an image to stylize
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Status Messages */}
      {useUploadedImage && uploadedImage && (
        <div className="p-3 mb-4 border border-green-300 rounded-md bg-green-50 text-green-700 text-sm">
          <p className="font-semibold">Using Uploaded Image</p>
          <p>Your custom image will be used for stylization</p>
        </div>
      )}

      {!useUploadedImage && hasProfileImage && (
        <div className="p-3 mb-4 border border-blue-300 rounded-md bg-blue-50 text-blue-700 text-sm">
          <p className="font-semibold">Using Profile Picture</p>
          <p>Your profile picture will be used for stylization</p>
        </div>
      )}

      {uploadedImage && !showBothOptions && (
        <div className="p-3 mt-4 border border-green-300 rounded-md bg-green-50 text-green-700 text-sm">
          <p className="font-semibold">Image Ready</p>
          <p>Your uploaded image will be used for stylization</p>
        </div>
      )}
    </div>
  );
}
