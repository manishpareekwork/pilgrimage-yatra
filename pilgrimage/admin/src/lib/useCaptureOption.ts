"use client";

import { useEffect, useState } from "react";

const isMobileUserAgent = (ua: string) =>
  /Android|iPhone|iPad|iPod|Mobile/i.test(ua);

export const useCaptureOption = () => {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia?.("(pointer: coarse)");
    const update = () => {
      const ua = navigator.userAgent || "";
      const coarse = media?.matches ?? false;
      const touch = navigator.maxTouchPoints > 1;
      setAvailable(coarse || touch || isMobileUserAgent(ua));
    };

    update();
    if (media?.addEventListener) {
      media.addEventListener("change", update);
      return () => media.removeEventListener("change", update);
    }
    if (media?.addListener) {
      media.addListener(update);
      return () => media.removeListener(update);
    }
  }, []);

  return available;
};
