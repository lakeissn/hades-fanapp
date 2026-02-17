"use client";

import Link from "next/link";
import { guideData } from "@/app/guides/guideData";

export default function GuideDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const category = guideData[params.id];

  if (!category) {
    return (
      <main className="guide-detail-page">
        <div className="guide-breadcrumb">
          <Link href="/guides">가이드</Link>
          <span className="guide-breadcrumb-sep">/</span>
          <span>준비 중</span>
        </div>
        <div className="section-head page-header">
          <div>
            <h1>가이드 준비 중</h1>
            <p className="header-desc">현재 준비 중인 카테고리입니다.</p>
          </div>
        </div>
        <div className="guide-nav">
          <Link href="/guides" className="back-link">← 가이드 목록</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="guide-detail-page">
      <nav className="guide-breadcrumb" aria-label="경로">
        <Link href="/guides">가이드</Link>
        <span className="guide-breadcrumb-sep">/</span>
        <span>{category.title}</span>
      </nav>

      <header className="guide-detail-header">
        <span className="guide-detail-icon" aria-hidden>
          {category.iconImage ? <img src={category.iconImage} alt="" width={category.iconSize ? Math.round(category.iconSize * 0.83) : 40} height={category.iconSize ? Math.round(category.iconSize * 0.83) : 40} style={{ objectFit: "contain" }} /> : category.icon}
        </span>
        <div>
          <h1>{category.title}</h1>
          <p className="header-desc">{category.subtitle}</p>
        </div>
      </header>

      <ul className="guide-items-list" role="list">
        {category.items.map((item, idx) => (
          <li key={item.id}>
            <Link href={`/guides/${params.id}/${item.id}`} className="guide-item-card">
              <span className="guide-item-num">{idx + 1}</span>
              <div className="guide-item-content">
                <h2 className="guide-item-title">{item.title}</h2>
                <p className="guide-item-desc">{item.description}</p>
              </div>
              <span className="guide-item-arrow" aria-hidden>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="guide-nav">
        <Link href="/guides" className="back-link">← 가이드 목록</Link>
      </div>
    </main>
  );
}
