"use client";

import { useState, useEffect } from "react";

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

const labels = ["Premium Playlist A", "Premium Playlist B", "Premium Playlist C"];
const subs = ["신곡 집중 스밍 리스트", "인기곡 혼합 리스트", "전체 앨범 롱 스밍"];

export default function MelonPlaylist() {
  const [device, setDevice] = useState<DeviceType>("mobile");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 모달 오픈 시 스크롤 방지
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [isModalOpen]);

  const tabs: { id: DeviceType; label: string }[] = [
    { id: "mobile", label: "Mobile" },
    { id: "ipad", label: "iPad" },
    { id: "pc", label: "PC" },
    { id: "mac", label: "Mac" },
  ];

  return (
    <>
      {/* 1. 메인 화면의 진입 카드 */}
      <div className="melon-entry-card" onClick={() => setIsModalOpen(true)}>
        <div className="melon-brand-info">
          <div className="melon-logo-circle">
            <svg width="28" height="28" viewBox="0 0 100 100" fill="none">
              <path d="M50 22C34.5 22 22 34.5 22 50C22 65.5 34.5 78 50 78C65.5 78 78 65.5 78 50C78 34.5 65.5 22 50 22Z" fill="white"/>
              <path d="M68 38L62 38V62H56V44H54L48 62H42L36 44H34V62H28V38H34L45 56L56 38H62" fill="#00CD3C"/>
            </svg>
          </div>
          <div className="melon-entry-title">
            <h3>Melon 원클릭 플레이리스트</h3>
            <p>구성곡 확인 및 기기별 자동 장전</p>
          </div>
        </div>
        <div className="melon-entry-action">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* 2. 클릭 시 뜨는 팝업(모달) */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '20px', fontWeight: '800' }}>플레이리스트 상세</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <div className="modal-body">
              {/* [중요] 플레이리스트 구성 설명 이미지 영역 */}
              <div className="playlist-desc-image">
                {/* 여기에 실제 설명 이미지 경로를 넣으시면 됩니다. 현재는 플레이스홀더 */}
                <img 
                  src="/icons/hades_helper.png" 
                  alt="플레이리스트 구성 곡 설명" 
                  style={{ opacity: 0.5, padding: '40px' }} 
                />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyCenter: 'center', textAlign: 'center', padding: '20px' }}>
                   <p style={{ fontSize: '14px', color: '#888' }}>[여기에 플레이리스트 구성곡 설명 이미지를 넣으세요]</p>
                </div>
              </div>

              {/* 기기 선택 탭 */}
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

              {/* 원클릭 리스트 버튼들 */}
              <div className="track-list">
                {melonLinks[device].map((link, index) => (
                  <a 
                    key={index} 
                    href={link} 
                    className="track-item"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="track-info">
                      <h4>{labels[index]}</h4>
                      <p>{subs[index]}</p>
                    </div>
                    <div className="track-play-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M7 6v12l10-6z" />
                      </svg>
                    </div>
                  </a>
                ))}
              </div>

              <p style={{ marginTop: '24px', fontSize: '12px', color: '#555', textAlign: 'center' }}>
                ※ 멜론 앱이 설치되어 있어야 정상적으로 작동합니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
