"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { buildImageCandidates, guideData } from "@/app/guides/guideData";

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

function imageListByDevice(item, device) {
  if (!item.hasDeviceImages) return item.images;
  return device === "pc" ? item.pcImages ?? [] : item.mobileImages ?? [];
}

export default function GuideArticlePage({ params }) {
  const [device, setDevice] = useState("mobile");

  const category = guideData[params.id];
  const item = category?.items.find((x) => x.id === params.itemId);

  if (!category || !item) {
    return (
      <main className="guide-detail-page">
        <div className="section-head page-header">
          <div>
            <p className="section-tag">GUIDE</p>
            <h2>게시글을 찾을 수 없습니다</h2>
            <p className="header-desc">요청하신 가이드 항목이 존재하지 않습니다.</p>
          </div>
        </div>
        <div className="guide-nav" style={{ gap: 12 }}>
          <Link href="/guides" className="back-link">
            ← 가이드 목록으로
          </Link>
        </div>
      </main>
    );
  }

  const images = imageListByDevice(item, device);

  return (
    <main className="guide-detail-page">
      <div className="section-head page-header">
        <div>
          <p className="section-tag">GUIDE ARTICLE</p>
          <h2>{item.title}</h2>
          <p className="header-desc">{item.description}</p>
        </div>
      </div>

      <div className="guide-nav" style={{ gap: 12 }}>
        <Link href={`/guides/${params.id}`} className="back-link">
          ← {category.title}
        </Link>
        <Link href="/guides" className="back-link">
          가이드 목록
        </Link>
      </div>

      <section className="settings-card" style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span className="card-tag">{item.tag}</span>
        </div>

        {item.hasDeviceImages && (
          <div className="device-selector" style={{ marginBottom: 12 }}>
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
            <div key={`${device}-${src}-${i}`} className="guide-image-container" style={{ marginBottom: i < images.length - 1 ? 12 : 0 }}>
              <GuideImage src={src} alt={`${item.title} 가이드 이미지`} />
            </div>
          ))
        )}
      </section>
    </main>
  );
}
