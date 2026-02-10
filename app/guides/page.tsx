"use client";

import Link from "next/link";

// 가이드 아이템 타입 정의
type GuideItem = {
  title: string;
  desc: string;
  icon: string;
  tag?: string;
};

type GuideDetail = {
  title: string;
  subtitle: string;
  items: GuideItem[];
};

const guideDetails: Record<string, GuideDetail> = {
  streaming: {
    title: "스트리밍 가이드",
    subtitle: "음원 차트 반영을 위한 필수 플랫폼별 가이드",
    items: [
      {
        title: "멜론 스트리밍 가이드 (PC)",
        desc: "PC 플레이어 설정 · 음소거 확인 · 리스트 관리",
        icon: "🖥️",
        tag: "Melon",
      },
      {
        title: "멜론 스트리밍 가이드 (Mobile)",
        desc: "모바일 앱 설정 · 재생목록 순서 · 수면 스밍 팁",
        icon: "📱",
        tag: "Melon",
      },
      {
        title: "유튜브 스트리밍 가이드 (PC+Mobile)",
        desc: "프리미엄 여부 · 자동재생/루프 설정 · 화질 체크",
        icon: "▶️",
        tag: "YouTube",
      },
    ],
  },
  gift: {
    title: "선물하기 가이드",
    subtitle: "마음을 전하는 가장 확실한 방법",
    items: [
      { title: "후원 플랫폼 로그인", desc: "공식 후원 사이트 계정 연동 및 충전", icon: "🔐" },
      { title: "굿즈/선물 선택", desc: "멤버별 선호 선물 및 전달 가능 품목 확인", icon: "🎁" },
      { title: "메시지 카드 작성", desc: "전달될 메시지 작성 규칙 및 에티켓", icon: "✉️" },
      { title: "배송 주소 확인", desc: "사서함 주소 및 안심 번호 기입 방법", icon: "📦" },
    ],
  },
  download: {
    title: "다운로드 가이드",
    subtitle: "소중한 자료를 영구 소장하는 법",
    items: [
      { title: "자료실 메뉴 이용", desc: "공식 카페 및 앱 내 자료실 접근 방법", icon: "📂" },
      { title: "고화질 원본 저장", desc: "이미지/영상 손실 없는 원본 저장 팁", icon: "💾" },
      { title: "압축 파일 해제", desc: "대용량 파일 분할 압축 해제 가이드", icon: "🤐" },
    ],
  },
};

export default function GuideDetailPage({ params }: { params: { id: string } }) {
  // 데이터가 없을 경우를 대비한 폴백(Fallback) 데이터
  const guide = guideDetails[params.id] ?? {
    title: "가이드 준비 중",
    subtitle: "현재 준비 중인 카테고리입니다.",
    items: [],
  };

  return (
    <main className="guide-detail-page">
      {/* 헤더 섹션 */}
      <header className="section-head page-header">
        <div>
          <p className="section-tag">GUIDE DETAIL</p>
          <h2>{guide.title}</h2>
          <p className="header-desc">{guide.subtitle}</p>
        </div>
      </header>

      {/* 가이드 카드 그리드 */}
      <section className="guide-items-grid">
        {guide.items.map((item, index) => (
          <article key={index} className="guide-item-card">
            <div className="card-icon-box">
              <span className="card-icon">{item.icon}</span>
            </div>
            <div className="card-content">
              {item.tag && <span className="card-tag">{item.tag}</span>}
              <h3 className="card-title">{item.title}</h3>
              <p className="card-desc">{item.desc}</p>
            </div>
            <div className="card-arrow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </article>
        ))}
      </section>

      {/* 하단 네비게이션 */}
      <div className="guide-nav">
        <Link href="/guides" className="back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          가이드 목록으로
        </Link>
      </div>
    </main>
  );
}
