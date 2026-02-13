"use client";

import { useEffect, useState } from "react";

const OVERLAY_SHOWN_KEY = "hades_startup_overlay_shown";
const VISIBLE_MS = 500;
const FADE_MS = 350;

export default function StartupOverlay() {
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (typeof window === "undefined") return;

    const alreadyShown = window.sessionStorage.getItem(OVERLAY_SHOWN_KEY) === "1";
    if (alreadyShown) {
      setVisible(false);
      return;
    }

    window.sessionStorage.setItem(OVERLAY_SHOWN_KEY, "1");
    setVisible(true);

    const fadeTimer = window.setTimeout(() => {
      setFading(true);
    }, VISIBLE_MS);

    const unmountTimer = window.setTimeout(() => {
      setVisible(false);
    }, VISIBLE_MS + FADE_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(unmountTimer);
    };
  }, []);

  if (!hydrated || !visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000000",
        pointerEvents: "none",
        opacity: fading ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      <img
        src="/icons/splash_logo.png"
        alt=""
        style={{
          width: "clamp(240px, 70vw, 520px)",
          height: "auto",
          maxHeight: "44vh",
          objectFit: "contain",
          display: "block",
          border: "none",
          boxShadow: "none",
          background: "transparent",
          padding: 0,
        }}
      />
    </div>
  );
}
