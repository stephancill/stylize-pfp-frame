"use client";

import sdk from "@farcaster/frame-sdk";
import { useEffect } from "react";

export function MiniAppReady() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return null;
}
