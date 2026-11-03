"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Reports to the boot loader that the app is usable once React has hydrated a
 * route. The landing page is excluded: the lattice hero owns that signal and
 * fires window.repuhReady() only after its first frame is painted, so the
 * loader never claims the app is ready before the hero actually shows.
 */
export function BootSignal() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/") return;
    if (typeof window.repuhReady === "function") window.repuhReady();
  }, [pathname]);

  return null;
}
