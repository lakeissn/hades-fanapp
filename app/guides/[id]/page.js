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
        pcImages: ["/guides/images/streaming-melon-setup-pc.png"],
        mobileImages: ["/guides/images/streaming-melon-setup-mobile.png"],
      },
      {
        id: "youtube-setup",
        title: "유튜브 스밍 설정",
        description: "유튜브 뮤직비디오 조회수 반영 방법",
        icon: "▶️",
        tag: "YOUTUBE",
        hasDeviceImages: false,
        images: ["/guides/images/streaming-youtube-setup.png"],
      },
      {
        id: "streaming-tips",
        title: "스밍 꿀팁",
        description: "효율적인 스트리밍을 위한 팁 모음",
        icon: "💡",
        tag: "TIP",
        hasDeviceImages: false,
        images: ["/guides/images/streaming-tips.png"],
      },
    ],
  },
  gift: {
    title: "선물하기 가이드",
    subtitle: "후원과 굿즈 전달 방법",
    items: [
      {
        id: "soop-gift",
        title: "숲 후원 방법",
        description: "숲(SOOP)에서 후원하는 방법 안내",
        icon: "🎁",
        tag: "SOOP",
        hasDeviceImages: true,
        images: [],
        pcImages: ["/guides/images/gift-soop-pc.png"],
        mobileImages: ["/guides/images/gift-soop-mobile.png"],
      },
      {
        id: "goods-delivery",
        title: "굿즈 전달 방법",
        description: "팬 굿즈를 안전하게 전달하는 방법",
        icon: "📦",
        tag: "GOODS",
        hasDeviceImages: false,
        images: ["/guides/images/gift-goods.png"],
      },
      {
        id: "subscribe",
        title: "구독/멤버십 방법",
        description: "유료 멤버십 가입 및 구독 방법",
        icon: "⭐",
        tag: "SUBSCRIBE",
        hasDeviceImages: false,
        images: ["/guides/images/gift-subscribe.png"],
      },
      {
        id: "gift-tips",
        title: "후원 꿀팁",
        description: "효율적인 후원을 위한 팁",
        icon: "💡",
        tag: "TIP",
        hasDeviceImages: false,
        images: ["/guides/images/gift-tips.png"],
      },
    ],
  },
  download: {
    title: "다운로드 가이드",
    subtitle: "클립과 자료 다운로드",
    items: [
      {
        id: "clip-download",
        title: "방송 클립 다운로드",
        description: "방송 다시보기 클립을 저장하는 방법",
        icon: "🎬",
        tag: "CLIP",
        hasDeviceImages: true,
        images: [],
        pcImages: ["/guides/images/download-clip-pc.png"],
        mobileImages: ["/guides/images/download-clip-mobile.png"],
      },
      {
        id: "photo-download",
        title: "고화질 사진 다운로드",
        description: "공식 사진/이미지를 고화질로 받기",
        icon: "📸",
        tag: "PHOTO",
        hasDeviceImages: false,
        images: ["/guides/images/download-photo.png"],
      },
      {
        id: "music-download",
        title: "음원 다운로드",
        description: "멜론 등에서 음원을 다운로드하는 방법",
        icon: "🎶",
        tag: "MUSIC",
        hasDeviceImages: false,
        images: ["/guides/images/download-music.png"],
      },
    ],
  },
  vote: {
    title: "투표 가이드",
    subtitle: "투표 플랫폼별 투표 방법",
    items: [
      {
        id: "vote-idolchamp",
        title: "아이돌챔프 투표",
        description: "아이돌챔프에서 투표하는 방법",
        icon: "🏆",
        tag: "IDOLCHAMP",
        hasDeviceImages: false,
        images: ["/guides/images/vote-idolchamp.png"],
      },
      {
        id: "vote-mubeat",
        title: "뮤빗 투표",
        description: "뮤빗에서 투표하는 방법",
        icon: "🎤",
        tag: "MUBEAT",
        hasDeviceImages: false,
        images: ["/guides/images/vote-mubeat.png"],
      },
      {
        id: "vote-fancast",
        title: "팬캐스트 투표",
        description: "팬캐스트에서 투표하는 방법",
        icon: "📣",
        tag: "FANCAST",
        hasDeviceImages: false,
        images: ["/guides/images/vote-fancast.png"],
      },
      {
        id: "vote-general",
        title: "투표 일반 가이드",
        description: "투표 플랫폼 공통 팁과 주의사항",
        icon: "💡",
        tag: "TIP",
        hasDeviceImages: false,
        images: ["/guides/images/vote-general.png"],
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
