"use client";

import Link from "next/link";

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
    description: "멜론 음원 선물하기 방법",
    icon: "🎁",
    items: 4,
  },
  {
    id: "download",
    title: "다운로드 가이드",
    description: "멜론 개별곡/FLAC 다운로드 방법",
    icon: "💾",
    items: 3,
  },
  {
    id: "vote",
    title: "투표 가이드",
    description: "각 투표 플랫폼별 투표 방법과 팁을 알아보세요",
    icon: "🗳️",
    items: 4,
  },
];

export default function GuidesPage() {
  return (
    <main>
      <section className="section-block">
        <div className="section-head page-header">
          <div>
            <p className="section-tag">GUIDES</p>
            <h2>가이드 목록</h2>
          </div>
        </div>

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
      </section>
    </main>
  );
}
