"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Global toast notification provider.
 *
 * Place this inside the root layout. Uses Sonner for lightweight,
 * beautiful toast notifications with dark-mode support out of the box.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "rgba(0,0,0,0.9)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(10px)",
        },
      }}
    />
  );
}
