"use client";

import {
  Credenza,
  CredenzaContent,
  CredenzaDescription,
  CredenzaHeader,
  CredenzaTitle,
  CredenzaTrigger,
} from "@/components/ui/credenza";
import { Button } from "@/components/ui/button";
import { Info, Palette, Share2, Crown } from "lucide-react";

export function InfoModal() {
  return (
    <Credenza>
      <CredenzaTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Info className="h-4 w-4" />
        </Button>
      </CredenzaTrigger>
      <CredenzaContent className="max-w-2xl">
        <CredenzaHeader>
          <CredenzaTitle>How it works</CredenzaTitle>
          <CredenzaDescription>
            Learn about creating images, earning referrals, and collecting
            royalties
          </CredenzaDescription>
        </CredenzaHeader>

        <div className="space-y-6 py-4 px-4 sm:px-0">
          {/* Create Images Section */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Palette className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Create images
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Create images using existing themes or your own custom prompts.
                Upload any image and transform it with AI-powered styling.
              </p>
            </div>
          </div>

          {/* Referrals Section */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <Share2 className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Referral fees for sharing
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Earn 10% referral fees for users that use images shared by you.
                Share your creations and earn passive income.
              </p>
            </div>
          </div>

          {/* Royalties Section */}
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Royalties on viral themes
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Earn 10% royalties when others use your image prompts. Create
                viral themes and earn ongoing revenue.
              </p>
            </div>
          </div>
        </div>
      </CredenzaContent>
    </Credenza>
  );
}
