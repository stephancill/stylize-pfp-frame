"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import sdk from "@farcaster/frame-sdk";

interface FramePromptDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FramePromptDialog({ isOpen, onClose }: FramePromptDialogProps) {
  const handleAddFrame = () => {
    sdk.actions.addFrame();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Get Notified via Farcaster Frame</DialogTitle>
          <DialogDescription>
            Add our Farcaster frame to your feed to get notified when your
            character is ready!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-start mt-4">
          <Button type="button" onClick={handleAddFrame}>
            Add Frame to Farcaster
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Dismiss
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
