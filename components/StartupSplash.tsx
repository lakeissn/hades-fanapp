"use client";

import { useEffect, useState } from "react";

export default function StartupSplash() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (!standalone) return;

    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 900);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999999,
      }}
    >
      <img
        src="/icons/splash_logo.png"
        alt=""
        style={{
          width: "clamp(240px, 72vw, 560px)",
          maxHeight: "44vh",
          height: "auto",
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
