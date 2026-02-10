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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const tabs: { id: DeviceType; label: string }[] = [
    { id: "mobile", label: "모바일" },
    { id: "ipad", label: "iPad" },
    { id: "pc", label: "PC" },
    { id: "mac", label: "Mac" },
  ];

  return (
    <section className="melon-deck glass">
      <div className="melon-head">
        <div className="melon-title-group">
          <span className="melon-icon">🍈</span>
          <div>
            <h3>멜론 원클릭</h3>
            <p>기기에 맞는 버튼을 눌러 바로 재생하세요</p>
          </div>
        </div>
      </div>

      <div className="melon-tabs-scroll">
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
      </div>

      <div className="melon-tracks">
        {melonLinks[device].map((link, index) => (
          <div key={index} className="melon-track">
            <a href={link} className="melon-play-btn">
              <span className="play-icon">▶</span>
              <span className="play-label">{labels[index]}</span>
              <span className="play-sub">바로 실행</span>
            </a>
            <button
              className="melon-copy-btn"
              onClick={() => handleCopy(link, index)}
              title="링크 복사"
            >
              {copiedIndex === index ? (
                <span className="check-icon">✓</span>
              ) : (
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              )}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
