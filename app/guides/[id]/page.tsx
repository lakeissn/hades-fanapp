"use client";

import Link from "next/link";
import { useState } from "react";

type DeviceType = "pc" | "mobile";

type GuideItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tag: string;
  // 디바이스별 이미지가 필요한 가이드인지 여부
  hasDeviceImages: boolean;
  // 기본 이미지 (디바이스 구분 없는 경우)
  images: string[];
  // 디바이스별 이미지 (PC/모바일)
  pcImages?: string[];
  mobileImages?: string[];
};

type GuideCategory = {
  title: string;
  subtitle: string;
  items: GuideItem[];
};

const guideData: Record<string, GuideCategory> = {
  streaming: {
    title: "스트리밍 가이드",
    subtitle: "멜론/유튜브 스밍 설정법",
    items: [
      {
        id: "melon-setup",
        title: "멜론 스밍 설정",
        description: "멜론에서 음원 스트리밍 반영을 위한 필수 설정",
        icon: "🎵",
        tag: "MELON",
        hasDeviceImages: true,
        images: [],
        pcImages: ["/guides/streaming_guide_pc.jpg"],
        mobileImages: ["/guides/streaming_guide_m.jpg"],
      },
      {
        id: "youtube-setup",
        title: "유튜브 스밍 설정",
        description: "유튜브 뮤직비디오 조회수 반영 방법",
        icon: "▶️",
        tag: "YOUTUBE",
        hasDeviceImages: false,
        images: ["/guides/youtube_guide.jpg"],
      },
      {
        id: "streaming-tips",
        title: "스밍 꿀팁",
        description: "효율적인 스트리밍을 위한 팁 모음",
        icon: "💡",
        tag: "TIP",
        hasDeviceImages: false,
        images: ["/guides/sound_assi.jpg"],
      },
    ],
  },
  gift: {
    title: "선물하기 가이드",
    subtitle: "멜론 음원 선물하기 방법",
    items: [
      {
        id: "melon-gift",
        title: "멜론 음원 선물하기 방법",
        description: "멜론에서 음원 선물하는 방법",
        icon: "🎁",
        tag: "Present",
        hasDeviceImages: true,
        images: [],
        pcImages: ["/guides/present_pc.jpg"],
        mobileImages: ["/guides/present_mobile.jpg"],
      },
    ],
  },
  download: {
    title: "다운로드 가이드",
    subtitle: "멜론 음원 다운로드",
    items: [
      {
        id: "melon-download",
        title: "멜론 음원 다운로드 방법",
        description: "멜론 음원 다운로드 방법",
        icon: "🎬",
        tag: "CLIP",
        hasDeviceImages: true,
        images: [],
        pcImages: ["/guides/download_pc.jpg.png"],
        mobileImages: ["/guides/download_mobile.jpg"],
      },
    ],
  },
  vote: {
    title: "투표 가이드",
    subtitle: "투표 플랫폼별 투표 방법",
    items: [
      {
        id: "vote-idolchamp",
        title: "음악방송 집계 반영비",
        description: "음악방송 집계 반영비",
        icon: "🏆",
        tag: "IDOLCHAMP",
        hasDeviceImages: false,
        images: ["/guides/programv_guide_2.jpg"],
      },
      {
        id: "vote-mubeat",
        title: "음악방송 앱별 투표 가이드",
        description: "음악방송 앱별 투표하는 방법",
        icon: "🎤",
        tag: "MUBEAT",
        hasDeviceImages: false,
        images: ["/guides/programv_guide.jpg"],
      },
      {
        id: "vote-fancast",
        title: "뮤빗 투표 가이드",
        description: "뮤빗에서 투표하는 방법",
        icon: "📣",
        tag: "FANCAST",
        hasDeviceImages: false,
        images: ["/guides/mubeat_guide.jpg"],
      },
    ],
  },
};

function ImageViewer({
  item,
  onClose,
}: {
  item: GuideItem;
  onClose: () => void;
}) {
  const [device, setDevice] = useState<DeviceType>("mobile");
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  const images = item.hasDeviceImages
    ? device === "pc"
      ? item.pcImages ?? []
      : item.mobileImages ?? []
    : item.images;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{item.title}</span>
          <button className="modal-close" onClick={onClose}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M18 6L6 18M6 6l12 12"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="modal-scroll-area">
          {/* PC / 모바일 선택 - 디바이스별 이미지가 있는 경우만 */}
          {item.hasDeviceImages && (
            <div className="device-selector">
              <button
                className={device === "mobile" ? "active" : ""}
                onClick={() => setDevice("mobile")}
              >
                📱 모바일
              </button>
              <button
                className={device === "pc" ? "active" : ""}
                onClick={() => setDevice("pc")}
              >
                💻 PC
              </button>
            </div>
          )}

          {images.length === 0 ? (
            <div className="guide-image-container">
              <div className="guide-image-placeholder">
                <div style={{ fontSize: 32 }}>🖼️</div>
                <p>이미지가 아직 등록되지 않았습니다.</p>
              </div>
            </div>
          ) : (
            images.map((src, i) => (
              <div
                key={`${device}-${i}`}
                className="guide-image-container"
                style={{ marginBottom: i < images.length - 1 ? 10 : 0 }}
              >
                {imgErrors[`${device}-${src}`] ? (
                  <div className="guide-image-placeholder">
                    <div style={{ fontSize: 32 }}>🖼️</div>
                    <p>이미지가 아직 등록되지 않았습니다.</p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--muted)",
                        marginTop: 4,
                      }}
                    >
                      {src}
                    </p>
                  </div>
                ) : (
                  <img
                    src={src}
                    alt={`${item.title} 가이드 이미지`}
                    onError={() =>
                      setImgErrors((prev) => ({
                        ...prev,
                        [`${device}-${src}`]: true,
                      }))
                    }
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuideDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [viewingItem, setViewingItem] = useState<GuideItem | null>(null);

  const category = guideData[params.id];

  if (!category) {
    return (
      <main className="guide-detail-page">
        <div className="section-head page-header">
          <div>
            <p className="section-tag">GUIDE</p>
            <h2>가이드 준비 중</h2>
            <p className="header-desc">현재 준비 중인 카테고리입니다.</p>
          </div>
        </div>
        <div className="guide-nav">
          <Link href="/guides" className="back-link">
            ← 가이드 목록으로
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="guide-detail-page">
      <div className="section-head page-header">
        <div>
          <p className="section-tag">GUIDE</p>
          <h2>{category.title}</h2>
          <p className="header-desc">{category.subtitle}</p>
        </div>
      </div>

      <div className="guide-items-grid">
        {category.items.map((item) => (
          <div
            key={item.id}
            className="guide-item-card"
            onClick={() => setViewingItem(item)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") setViewingItem(item);
            }}
          >
            <div className="card-icon-box">
              <span className="card-icon">{item.icon}</span>
            </div>
            <div className="card-content">
              <span className="card-tag">{item.tag}</span>
              <span className="card-title">{item.title}</span>
              <span className="card-desc">{item.description}</span>
            </div>
            <div className="card-arrow">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M9 6l6 6-6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      <div className="guide-nav">
        <Link href="/guides" className="back-link">
          ← 가이드 목록으로
        </Link>
      </div>

      {viewingItem && (
        <ImageViewer item={viewingItem} onClose={() => setViewingItem(null)} />
      )}
    </main>
  );
}
