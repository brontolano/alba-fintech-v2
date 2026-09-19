"use client";

import { useEffect } from "react";

export default function AppViewportGuard() {
  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const isZoomShortcut =
        (event.ctrlKey || event.metaKey) &&
        ["+", "=", "-", "0", "Dead", "NumpadAdd", "NumpadSubtract"].includes(
          event.key,
        );

      const isZoomCode =
        (event.ctrlKey || event.metaKey) &&
        ["NumpadAdd", "NumpadSubtract", "Digit0"].includes(event.code);

      if (isZoomShortcut || isZoomCode) {
        event.preventDefault();
      }
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };

    const handleTouchMove = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }

      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("touchmove", handleTouchMove);
    };
  }, []);

  return null;
}
