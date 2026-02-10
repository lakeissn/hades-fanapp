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

// 💡 팁: 실제 이미지가 준비되면 이 컴포넌트 대신 <img src="..." />를 사용하세요.
// 현재는 CSS로 "비슷한 느낌"의 트랙리스트를 구현했습니다.
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
      {/* 1. 메인 화면에 보이는 카드 (트리거) */}
      <section 
        className="melon-deck-premium" 
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
      >
        <div className="melon-header">
          <div className="melon-brand">
            <svg className="melon-logo" viewBox="0 0 100 100" fill="none">
               <circle cx="50" cy="50" r="50" fill="#00CD3C"/>
               <path d="M50 22C34.5 22 22 34.5 22 50C22 65.5 34.5 78 50 78C65.5 78 78 65.5 78 50C78 34.5 65.5 22 50 22ZM50 72C37.8 72 28 62.2 28 50C28 37.8 37.8 28 50 28C62.2 28 72 37.8 72 50C72 62.2 62.2 72 50 72Z" fill="white" fillOpacity="0.2"/>
               <path d="M68 38L62 38V62H56V44H54L48 62H42L36 44H34V62H28V38H34L45 56L56 38H62" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
            <span className="melon-title">Melon 원클릭 플레이리스트</span>
          </div>
          <div className="melon-toggle">
            <span style={{ fontSize: '13px', color: '#00cd3c', fontWeight: 600 }}>OPEN</span>
          </div>
        </div>
      </section>

      {/* 2. 팝업 모달 (Portal 사용) */}
      {mounted && isOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
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

            {/* 비주얼 영역 (이미지 대신 CSS 디자인) */}
            <PlaylistVisual />

            {/* 액션 영역 */}
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
