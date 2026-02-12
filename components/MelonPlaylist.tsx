"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

type DeviceType = "mobile" | "ipad" | "pc" | "mac";

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
  const [device, setDevice] = useState<DeviceType>("mobile");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const tabs: { id: DeviceType; label: string }[] = [
    { id: "mobile", label: "모바일" },
    { id: "pc", label: "PC" },
    { id: "mac", label: "MAC" },
    { id: "ipad", label: "아이패드" },
  ];

  return (
    <>
      <section
        className="melon-trigger-card"
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
      >
        <div className="melon-trigger-left">
          <div className="melon-mini-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 18V5l12 7-12 6z" />
            </svg>
          </div>
          <div className="melon-trigger-info">
            <span className="melon-trigger-title">Melon One-Click</span>
            <span className="melon-trigger-sub">터치 한 번으로 스밍 시작</span>
          </div>
        </div>
        <div className="melon-trigger-action">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </section>

      {mounted && isOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                <span style={{ color: 'var(--chart-green)' }}>●</span> 원클릭 플레이리스트
              </span>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
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
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
