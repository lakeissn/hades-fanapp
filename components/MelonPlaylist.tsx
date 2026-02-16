"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Grainient from "./Grainient";

type DeviceType = "mobile" | "ipad" | "pc" | "mac";

const CLOSE_THRESHOLD_PX = 100;
const SNAP_BACK_MS = 250;
const CLOSE_ANIM_MS = 320;

const melonLinks = {
  mobile: [
    "melonapp://play?menuid=0&ctype=1&cid=600855294,600779781,600740747,600406668,600406667,600406669",
    "melonapp://play?menuid=0&ctype=1&cid=600855294,600779781,38608201,31873020,38698213,37820769",
    "melonapp://play?menuid=0&ctype=1&cid=600855294,600779781,38608202,37170371,36463922,39185493",
  ],
  ipad: [
    "melonipad://play/?ctype=1&menuid=0&cid=600855294,600779781,600740747,600406668,600406667,600406669",
    "melonipad://play/?ctype=1&menuid=0&cid=600855294,600779781,38608201,31873020,38698213,37820769",
    "melonipad://play/?ctype=1&menuid=0&cid=600855294,600779781,38608202,37170371,36463922,39185493",
  ],
  pc: [
    "melonapp://play?cType=1&cList=600855294,600779781,600740747,600406668,600406667,600406669",
    "melonapp://play?cType=1&cList=600855294,600779781,38608201,31873020,38698213,37820769",
    "melonapp://play?cType=1&cList=600855294,600779781,38608202,37170371,36463922,39185493",
  ],
  mac: [
    "melonplayer://play?menuid=0&cflag=1&cid=600855294,600779781,600740747,600406668,600406667,600406669",
    "melonplayer://play?menuid=0&cflag=1&cid=600855294,600779781,38608201,31873020,38698213,37820769",
    "melonplayer://play?menuid=0&cflag=1&cid=600855294,600779781,38608202,37170371,36463922,39185493",
  ],
};

export default function MelonPlaylist() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [device, setDevice] = useState<DeviceType>("mobile");
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const [animDone, setAnimDone] = useState(false);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const getCloseThreshold = useCallback(() => {
    if (typeof window === "undefined") return CLOSE_THRESHOLD_PX;
    return Math.max(CLOSE_THRESHOLD_PX, window.innerHeight * 0.15);
  }, []);

  const startClose = useCallback(() => {
    setDragY(0);
    setIsClosing(true);
    setAnimDone(false);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, CLOSE_ANIM_MS);
  }, []);

  const handleDragStart = useCallback((clientY: number) => {
    isDragging.current = true;
    dragStartY.current = clientY;
  }, []);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging.current) return;
    const delta = clientY - dragStartY.current;
    if (delta > 0) setDragY(delta);
  }, []);

  const handleDragEnd = useCallback((clientY: number) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = clientY - dragStartY.current;
    const threshold = getCloseThreshold();
    if (delta >= threshold) {
      startClose();
    } else {
      setIsSnapping(true);
      setDragY(0);
      setTimeout(() => setIsSnapping(false), SNAP_BACK_MS);
    }
  }, [startClose, getCloseThreshold]);

  useEffect(() => {
    const check = () => setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const mo = new MutationObserver(check);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    setMounted(true);
    if (isOpen || isClosing) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, isClosing]);

  const tabs: { id: DeviceType; label: string }[] = [
    { id: "mobile", label: "모바일" },
    { id: "pc", label: "PC" },
    { id: "mac", label: "MAC" },
    { id: "ipad", label: "아이패드" },
  ];

  return (
    <>
      <section
        className="melon-card"
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
      >
        <div className="melon-card-bg">
          <Grainient
            color1={isDark ? "#222228" : "#F5F3F8"}
            color2={isDark ? "#2a2a32" : "#E8E4EF"}
            color3={isDark ? "#32323c" : "#DDD8E8"}
            timeSpeed={0.28}
            colorBalance={0}
            warpStrength={0.6}
            warpFrequency={4}
            warpSpeed={2}
            warpAmplitude={60}
            blendAngle={0}
            blendSoftness={0.12}
            rotationAmount={200}
            noiseScale={1.5}
            grainAmount={0.02}
            grainScale={1.5}
            grainAnimated={false}
            contrast={1.05}
            gamma={1}
            saturation={0.9}
            centerX={0}
            centerY={0}
            zoom={0.92}
          />
        </div>
        <div className="melon-card-body">
          <p className="melon-card-title">
            <span className="melon-card-logo-wrap">
              <img className="melon-card-logo" src="/icons/melon.png" alt="" width={22} height={22} />
            </span>
            원클릭 플레이리스트
          </p>
        </div>
        <div className="melon-card-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
        </div>
      </section>

      {mounted && (isOpen || isClosing) && createPortal(
        <div
          className={`bottomsheet-overlay ${isClosing ? "bottomsheet-overlay-closing" : ""}`}
          onClick={startClose}
        >
          <div
            ref={contentRef}
            className={`bottomsheet-content ${isClosing ? "bottomsheet-closing" : ""} ${isSnapping ? "bottomsheet-snapping" : ""} ${animDone ? "bottomsheet-anim-done" : ""}`}
            onClick={(e) => e.stopPropagation()}
            style={!isClosing && dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined}
            onAnimationEnd={() => setAnimDone(true)}
            onPointerDown={(e) => {
              const target = e.target as HTMLElement;
              if (target.closest(".bottomsheet-drag-area") || target.closest(".bottomsheet-handle")) {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                handleDragStart(e.clientY);
              }
            }}
            onPointerMove={(e) => {
              if (e.pointerType === "touch" || e.buttons === 1) handleDragMove(e.clientY);
            }}
            onPointerUp={(e) => {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              handleDragEnd(e.clientY);
            }}
            onPointerCancel={(e) => {
              (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              isDragging.current = false;
              setDragY(0);
            }}
          >
            <div className="bottomsheet-drag-area bottomsheet-handle" aria-hidden />
            <div className="bottomsheet-drag-area modal-header">
              <span className="modal-title">
                <img src="/icons/melon.png" alt="" className="modal-title-icon bottomsheet-title-icon" />
                멜론 원클릭 플레이리스트
              </span>
            </div>

            <div className="modal-scroll-area">
              <div className="device-tabs-scroll">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`device-tab-item ${device === tab.id ? "active" : ""}`}
                    onClick={() => setDevice(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="link-button-grid">
                {melonLinks[device].map((link, index) => (
                  <a key={index} href={link} className="one-click-btn">
                    <div className="btn-label">
                      <span className="btn-number">{index + 1}</span>
                      <span>원클릭 리스트 {index + 1}</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ))}
              </div>

              <div className="playlist-image-area">
                <img src="/icons/planetb_playlist_b.png" alt="플레이리스트 구성" />
              </div>
            </div>

            <div className="bottomsheet-footer">
              <button type="button" className="bottomsheet-close-btn" onClick={startClose}>
                닫기
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
