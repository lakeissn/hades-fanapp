"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

// 1. 기기 타입 정의
type DeviceType = "mobile" | "ipad" | "pc" | "mac";

// 2. 링크 데이터 (요청하신 URL 그대로 적용)
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

  // 탭 목록 정의
  const tabs: { id: DeviceType; label: string }[] = [
    { id: "mobile", label: "모바일(안드/아이폰)" },
    { id: "ipad", label: "아이패드" },
    { id: "pc", label: "PC" },
    { id: "mac", label: "MAC" },
  ];

  return (
    <>
      {/* ✨ 1. 메인 화면 트리거 (절대 건드리지 않음 / 이전 코드 유지) */}
      <section 
        className="melon-trigger-card" 
        onClick={() => setIsOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="멜론 원클릭 플레이리스트 열기"
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
             <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </section>

      {/* 🔒 2. 팝업 모달 (새로운 디자인 적용) */}
      {mounted && isOpen && createPortal(
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            {/* A. 모달 헤더 */}
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

            <div className="modal-actions">
              {/* B. 기기 선택 탭 (가로 스크롤 가능) */}
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
              
              {/* C. 3단 링크 버튼 */}
              <div className="link-button-grid">
                {melonLinks[device].map((link, index) => (
                  <a 
                    key={index}
                    href={link}
                    className="one-click-btn"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="btn-label">
                      <span className="btn-number">{index + 1}</span>
                      <span>원클릭 리스트 {index + 1}</span>
                    </div>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                ))}
              </div>

              {/* D. 하단 이미지 영역 (여기에 업로드하신 이미지가 들어갑니다) */}
              <div className="playlist-image-area">
                {/* ⚠️ 중요: 실제 사용하실 이미지 파일명으로 src를 변경해주세요! */}
                {/* 예: src="/images/playlist_guide.jpg" */}
                <img 
                  src="/icons/playlist_placeholder.png" 
                  alt="플레이리스트 곡 구성" 
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  onError={(e) => {
                    // 이미지가 없을 때를 대비한 Fallback (삭제 가능)
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                {/* 이미지가 없을 경우를 대비한 텍스트 (이미지 연결 후 삭제하세요) */}
                <div style={{ padding: '20px', textAlign: 'center', color: '#666', fontSize: '12px' }}>
                  <p>👇 여기에 곡 구성 이미지가 들어갑니다</p>
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
