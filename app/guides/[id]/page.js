"use client";

import Link from "next/link";
import { guideData } from "@/app/guides/guideData";

export default function GuideDetailPage({ params }) {
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
          <Link key={item.id} href={`/guides/${params.id}/${item.id}`} className="guide-item-card">
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
          </Link>
        ))}
      </div>

      <div className="guide-nav">
        <Link href="/guides" className="back-link">
          ← 가이드 목록으로
        </Link>
      </div>
    </main>
  );
}
