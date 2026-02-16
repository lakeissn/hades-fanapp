"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { buildImageCandidates, guideData, type DeviceType, type GuideItem } from "@/app/guides/guideData";

function GuideImage({ src, alt }: { src: string; alt: string }) {
  const candidates = useMemo(() => buildImageCandidates(src), [src]);
  const [index, setIndex] = useState(0);

  if (index >= candidates.length) {
    return (
      <div className="guide-image-placeholder">
        <span className="guide-image-placeholder-icon">🖼️</span>
        <p>이미지를 불러오지 못했습니다.</p>
      </div>
    );
  }

  return (
    <img
      src={candidates[index]}
      alt={alt}
      onError={() => setIndex((prev) => prev + 1)}
      className="guide-image"
    />
  );
}

function imageListByDevice(item: GuideItem, device: DeviceType) {
  if (!item.hasDeviceImages) return item.images;
  return device === "pc" ? item.pcImages ?? [] : item.mobileImages ?? [];
}

export default function GuideArticlePage({
  params,
}: {
  params: { id: string; itemId: string };
}) {
  const [device, setDevice] = useState<DeviceType>("mobile");

  const category = guideData[params.id];
  const item = category?.items.find((x) => x.id === params.itemId);

  if (!category || !item) {
    return (
      <main className="guide-article-page">
        <nav className="guide-breadcrumb" aria-label="경로">
          <Link href="/guides">가이드</Link>
          <span className="guide-breadcrumb-sep">/</span>
          <span>알 수 없음</span>
        </nav>
        <div className="section-head page-header">
          <div>
            <h1>게시글을 찾을 수 없습니다</h1>
            <p className="header-desc">요청하신 가이드 항목이 존재하지 않습니다.</p>
          </div>
        </div>
        <div className="guide-nav">
          <Link href="/guides" className="back-link">← 가이드 목록</Link>
        </div>
      </main>
    );
  }

  const images = imageListByDevice(item, device);

  return (
    <main className="guide-article-page">
      <nav className="guide-breadcrumb" aria-label="경로">
        <Link href="/guides">가이드</Link>
        <span className="guide-breadcrumb-sep">/</span>
        <Link href={`/guides/${params.id}`}>{category.title}</Link>
        <span className="guide-breadcrumb-sep">/</span>
        <span>{item.title}</span>
      </nav>

      <header className="guide-article-top">
        <div className="guide-article-title-area">
          <h2>{item.title}</h2>
          <p className="header-desc">{item.description}</p>
        </div>
        {item.hasDeviceImages && (
          <div className="guide-device-toggle">
            <button
              type="button"
              className={device === "mobile" ? "active" : ""}
              onClick={() => setDevice("mobile")}
            >
              <Smartphone size={15} /> 모바일
            </button>
            <button
              type="button"
              className={device === "pc" ? "active" : ""}
              onClick={() => setDevice("pc")}
            >
              <Monitor size={15} /> PC
            </button>
          </div>
        )}
      </header>

      <section className="guide-article-body">
        {images.length === 0 ? (
          <div className="guide-image-container">
            <div className="guide-image-placeholder">
              <span className="guide-image-placeholder-icon">🖼️</span>
              <p>이미지가 아직 등록되지 않았습니다.</p>
            </div>
          </div>
        ) : (
          <ul className="guide-image-list" role="list">
            {images.map((src, i) => (
              <li key={`${device}-${src}-${i}`}>
                <div className="guide-image-container">
                  <GuideImage src={src} alt={`${item.title} ${i + 1}`} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="guide-nav guide-nav-footer">
        <Link href={`/guides/${params.id}`} className="back-link">← {category.title}</Link>
        <Link href="/guides" className="back-link">가이드 목록</Link>
      </div>
    </main>
  );
}
