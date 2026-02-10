"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

type DeviceType = "mobile" | "ipad" | "pc" | "mac";

const melonLinks = {
  mobile: "melonapp://play?menuid=0&ctype=1&cid=600855294,600779781,600740747,600406668,600406667,600406669",
  ipad: "melonipad://play/?ctype=1&menuid=0&cid=600855294,600779781,600740747,600406668,600406667,600406669",
  pc: "melonapp://play?cType=1&cList=600855294,600779781,600740747,600406668,600406667,600406669",
  mac: "melonplayer://play?menuid=0&cflag=1&cid=600855294,600779781,600740747,600406668,600406667,600406669",
};

// 팝업 내부 비주얼 (수정 금지)
function PlaylistVisual() {
  return (
    <div className="playlist-visual">
      <div className="album-art-placeholder">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
        </svg>
      </div>
      <div className="playlist-info">
        <h3>HADES 총공 빌런</h3>
        <p>Premium One-Click</p>
      </div>
      <div className="track-list-preview">
        {["Intro: Hades", "Main Title Track", "Sub Unit Song", "Fan Song (Special)"].map((track, i) => (
          <div key={i} className="track-item">
            <span className="track-num">{i + 1}</span>
            <span className="track-name">{track}</span>
            <span className="track-artist">Hades</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MelonPlaylist() {
  const [isOpen, setIsOpen] = useState(false);
  const [device, setDevice] = useState<DeviceType>("mobile");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden"; // 스크롤 잠금
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const tabs: { id: DeviceType; label: string }[] = [
    { id: "mobile", label: "Mobile" },
    { id: "ipad", label: "iPad" },
    { id: "pc", label: "PC" },
    { id: "mac", label: "Mac" },
  ];

  return (
    <>
      {/* ✨ 1. 메인 화면 트리거 (디자인 전면 수정됨) */}
      <section 
        className="melon-trigger-card" 
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="멜론 원클릭 플레이리스트 열기"
      >
        <div className="melon-trigger-left">
          {/* 아이콘: 작고 심플하게 */}
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

        {/* 액션 아이콘 */}
        <div className="melon-trigger-action">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
             <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </section>

      {/* 🔒 2. 팝업 모달 (기존 코드 100% 유지) */}
      {mounted && isOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">
                <span style={{ color: '#00cd3c' }}>●</span> 원클릭 플레이리스트
              </span>
              <button className="modal-close" onClick={() => setIsOpen(false)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <PlaylistVisual />

            <div className="modal-actions">
              <div className="device-tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={`device-tab ${device === tab.id ? "active" : ""}`}
                    onClick={() => setDevice(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              
              <a 
                href={melonLinks[device]} 
                className="play-button-large"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Melon으로 재생하기
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
