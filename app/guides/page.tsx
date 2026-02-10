const guideCategories = [
  {
    id: "streaming",
    title: "스트리밍",
    description: "입장 · 응원 · 채팅까지 방송 참여 루트를 빠르게 확인해요.",
    updatedAt: "업데이트 02.10",
    icon: "🎙️",
  },
  {
    id: "download",
    title: "다운로드",
    description: "공식 소스/클립 저장 흐름을 단계별로 정리했어요.",
    updatedAt: "업데이트 02.08",
    icon: "⬇️",
  },
  {
    id: "gift",
    title: "선물하기",
    description: "후원 및 선물 전달 전 꼭 확인할 체크리스트를 모았어요.",
    updatedAt: "업데이트 02.05",
    icon: "🎁",
  },
];

export default function GuidesPage() {
  return (
    <main className="guides-page">
      <header className="guides-hero">
        <p className="section-tag">GUIDES</p>
        <h2>가이드</h2>
        <p className="guides-hero-sub">처음 온 팬도 바로 따라갈 수 있는 핵심 가이드 모음.</p>
      </header>

      <section className="guides-grid" aria-label="가이드 카테고리 목록">
        {guideCategories.map((category) => (
          <a key={category.id} href={`/guides/${category.id}`} className="guide-card">
            <div className="guide-card-head">
              <span className="guide-card-icon" aria-hidden>
                {category.icon}
              </span>
              <span className="guide-card-date">{category.updatedAt}</span>
            </div>
            <h3>{category.title}</h3>
            <p>{category.description}</p>
            <span className="guide-card-cta">자세히 보기</span>
          </a>
        ))}
      </section>
    </main>
  );
}
