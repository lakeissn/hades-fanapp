"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const GUIDE_IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_GUIDE_IMAGE_BASE_URL?.trim().replace(/\/$/, "") ?? "";

const guideData = {
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
        pcImages: ["/guides/images/streaming_guide_pc.jpg"],
        mobileImages: ["/guides/images/streaming_guide_m.jpg"],
      },
      {
        id: "youtube-setup",
        title: "유튜브 스밍 설정",
        description: "유튜브 뮤직비디오 조회수 반영 방법",
        icon: "▶️",
        tag: "YOUTUBE",
        hasDeviceImages: false,
        images: ["/guides/images/youtube_guide.jpg"],
      },
      {
        id: "streaming-tips",
        title: "스밍 꿀팁",
        description: "효율적인 스트리밍을 위한 팁 모음",
        icon: "💡",
        tag: "TIP",
        hasDeviceImages: false,
        images: ["/guides/images/sound_assi.jpg"],
      },
    ],
  gift: {
    title: "선물하기 가이드",
    subtitle: "멜론 음원 선물하기 방법",
    items: [
      {
        id: "melon-gift",
        title: "멜론 선물하기 가이드",
        description: "멜론 음원 선물하는 방법",
        icon: "🎁",
        tag: "present",
        hasDeviceImages: true,
        images: [],
        pcImages: ["/guides/images/present_pc.jpg"],
        mobileImages: ["/guides/images/present_mobile.jpg"],
      },
    ],
  },
  download: {
    title: "다운로드 가이드",
    subtitle: "멜론 음원 다운로드 방법",
    items: [
      {
        id: "melon-download",
        title: "멜론 음원 다운로드",
        description: "멜론 음원 다운로드하는 방법",
        icon: "🎬",
        tag: "down",
        hasDeviceImages: true,
        images: [],
        pcImages: ["/guides/images/download_pc.jpg"],
        mobileImages: ["/guides/images/download_mobile.jpg"],
      },
    ],
  },
  vote: {
    title: "투표 가이드",
    subtitle: "투표 플랫폼별 투표 방법",
    items: [
      {
        id: "percent-musicpro",
        title: "음악방송 집계 반영비",
        description: "음악방송 집계 반영비",
        icon: "🏆",
        tag: "musicpro",
        hasDeviceImages: false,
        images: ["/guides/images/programv_guide_2.jpg"],
      },
      {
        id: "vote-muiscpro",
        title: "음악방송 투표 가이드",
        description: "음악방송에서 투표하는 방법",
        icon: "🎤",
        tag: "musicpro",
        hasDeviceImages: false,
        images: ["/guides/images/programv_guide.jpg"],
      },
      {
        id: "vote-mubeat",
        title: "뮤빗 투표 가이드",
        description: "뮤빗에서 투표하는 방법",
        icon: "📣",
        tag: "FANCAST",
        hasDeviceImages: false,
        images: ["/guides/images/mubeat_guide.jpg"],
      },
    ],
  },
};

function normalizeGithubBlobUrl(url) {
  const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (!m) return url;
  const [, owner, repo, branch, filePath] = m;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

function buildImageCandidates(src) {
  const next = new Set();
  const normalized = normalizeGithubBlobUrl(src);

  next.add(src);
  next.add(normalized);

  if (GUIDE_IMAGE_BASE_URL && src.startsWith("/")) {
    next.add(`${GUIDE_IMAGE_BASE_URL}${src}`);
  }

  if (src.startsWith("/guides/images/")) {
    const noExt = src.replace(/\.[a-zA-Z0-9]+$/, "");
    [".png", ".jpg", ".jpeg", ".webp"].forEach((ext) => {
      next.add(`${noExt}${ext}`);
      if (GUIDE_IMAGE_BASE_URL) {
        next.add(`${GUIDE_IMAGE_BASE_URL}${noExt}${ext}`);
      }
    });
  }

  return Array.from(next)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => encodeURI(item));
}

function GuideImage({ src, alt }) {
  const candidates = useMemo(() => buildImageCandidates(src), [src]);
  const [index, setIndex] = useState(0);

  if (index >= candidates.length) {
    return (
      <div className="guide-image-placeholder">
        <div style={{ fontSize: 32 }}>🖼️</div>
        <p>이미지를 불러오지 못했습니다.</p>
        <p style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{src}</p>
      </div>
    );
  }

  return <img src={candidates[index]} alt={alt} onError={() => setIndex((prev) => prev + 1)} />;
}

function ImageViewer({ item, onClose }) {
  const [device, setDevice] = useState("mobile");

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
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="modal-scroll-area">
          {item.hasDeviceImages && (
            <div className="device-selector">
              <button className={device === "mobile" ? "active" : ""} onClick={() => setDevice("mobile")}>
                📱 모바일
              </button>
              <button className={device === "pc" ? "active" : ""} onClick={() => setDevice("pc")}>
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
              <div key={`${device}-${src}-${i}`} className="guide-image-container" style={{ marginBottom: i < images.length - 1 ? 10 : 0 }}>
                <GuideImage src={src} alt={`${item.title} 가이드 이미지`} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuideDetailPage({ params }) {
  const [viewingItem, setViewingItem] = useState(null);
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
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

      {viewingItem && <ImageViewer item={viewingItem} onClose={() => setViewingItem(null)} />}
    </main>
  );
}
