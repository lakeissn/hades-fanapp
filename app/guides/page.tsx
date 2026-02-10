"use client";

import Link from "next/link";
import Card from "@/components/Card";

// 가이드 카테고리 데이터 복구
const guideCategories = [
  {
    id: "streaming",
    title: "스트리밍 가이드",
    description: "음원 차트 반영을 위한 멜론/유튜브 필수 설정법",
    icon: "🎧",
    items: 3,
  },
  {
    id: "gift",
    title: "선물하기 가이드",
    description: "마음을 전하는 후원 방법과 굿즈 전달 가이드",
    icon: "🎁",
    items: 4,
  },
  {
    id: "download",
    title: "다운로드 가이드",
    description: "방송 클립, 고화질 자료를 소장하는 방법",
    icon: "💾",
    items: 3,
  },
];

export default function GuidesPage() {
  return (
    <main className="guides-page">
      {/* 헤더 섹션 */}
      <header className="guides-hero section-head">
        <div>
          <p className="section-tag">GUIDES</p>
          <h2>가이드 목록</h2>
          <p className="guides-hero-sub">팬 활동에 필요한 모든 정보를 모았습니다.</p>
        </div>
      </header>

      {/* 카테고리 카드 그리드 (원래 UI 복원) */}
      <div className="guides-grid">
        {guideCategories.map((category) => (
          <Link 
            key={category.id} 
            href={`/guides/${category.id}`}
            className="guide-card-link"
          >
            <article className="guide-card">
              <div className="guide-card-head">
                <span className="guide-card-icon">{category.icon}</span>
                <span className="guide-card-date">{category.items}개 항목</span>
              </div>
              
              <div className="guide-card-body" style={{ marginTop: '12px' }}>
                <h3>{category.title}</h3>
                <p style={{ marginTop: '6px' }}>{category.description}</p>
              </div>

              <div className="guide-card-footer section-footer">
                <span className="guide-card-cta">가이드 보기 →</span>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </main>
  );
}
