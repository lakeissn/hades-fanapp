"use client";

import { useState } from "react";

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

const labels = ["원클릭 1", "원클릭 2", "원클릭 3"];

export default function MelonPlaylist() {
  const [device, setDevice] = useState<DeviceType>("mobile");
  const [isOpen, setIsOpen] = useState(false);

  const tabs: { id: DeviceType; label: string }[] = [
    { id: "mobile", label: "모바일" },
    { id: "ipad", label: "iPad" },
    { id: "pc", label: "PC" },
    { id: "mac", label: "Mac" },
  ];

  return (
    <section className={`melon-deck-premium ${isOpen ? "open" : "closed"}`}>
      <div 
        className="melon-header" 
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
      >
        <div className="melon-brand">
          <svg className="melon-logo" viewBox="0 0 100 100" fill="none">
             <circle cx="50" cy="50" r="50" fill="#00CD3C"/>
             <path d="M50 22C34.5 22 22 34.5 22 50C22 65.5 34.5 78 50 78C65.5 78 78 65.5 78 50C78 34.5 65.5 22 50 22ZM50 72C37.8 72 28 62.2 28 50C28 37.8 37.8 28 50 28C62.2 28 72 37.8 72 50C72 62.2 62.2 72 50 72Z" fill="white" fillOpacity="0.2"/>
             <path d="M68 38L62 38V62H56V44H54L48 62H42L36 44H34V62H28V38H34L45 56L56 38H62" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
          </svg>
          <span className="melon-title">Melon 원클릭 플레이리스트</span>
        </div>
        <div className="melon-toggle">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6" style={{ transform: isOpen ? "rotate(180deg)" : "none", transformOrigin: "center", transition: "0.3s" }} />
          </svg>
        </div>
      </div>

      {isOpen && (
        <div className="melon-body">
          <div className="melon-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`melon-tab ${device === tab.id ? "active" : ""}`}
                onClick={() => setDevice(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="melon-tracks">
            {melonLinks[device].map((link, index) => (
              <a key={index} href={link} className="melon-play-btn">
                <div className="play-info">
                  <span className="play-label">{labels[index]}</span>
                  <span className="play-sub">리스트 자동 장전</span>
                </div>
                <div className="play-action">
                   <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
