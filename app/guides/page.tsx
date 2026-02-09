const guideCategories = [
  {
    id: "streaming",
    title: "스트리밍",
    description: "방송 시작부터 장비 체크까지 단계별 안내",
    items: 5,
  },
  {
    id: "gifting",
    title: "선물하기",
    description: "후원/구독/굿즈 전달 방법",
    items: 3,
  },
  {
    id: "download",
    title: "다운로드",
    description: "방송 클립과 자료실 받기",
    items: 4,
  },
];

const cardStyle = {
  border: "1px solid #1e293b",
  borderRadius: "20px",
  backgroundColor: "#111827",
  padding: "20px",
};

export default function GuidesPage() {
  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <header>
        <p style={{ fontSize: "12px", color: "#94a3b8" }}>가이드</p>
        <h2 style={{ fontSize: "24px", margin: "6px 0" }}>카테고리 목록</h2>
      </header>
      <div
        style={{
          display: "grid",
          gap: "16px",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        }}
      >
        {guideCategories.map((category) => (
          <a
            key={category.id}
            href={`/guides/${category.id}`}
            style={{
              ...cardStyle,
              textDecoration: "none",
              color: "inherit",
              transition: "transform 0.2s ease",
            }}
          >
            <h3 style={{ fontSize: "18px", marginTop: 0 }}>{category.title}</h3>
            <p style={{ marginTop: "8px", fontSize: "14px", color: "#cbd5f5" }}>
              {category.description}
            </p>
            <p style={{ marginTop: "16px", fontSize: "12px", color: "#64748b" }}>
              {category.items}개 단계
            </p>
          </a>
        ))}
      </div>
    </main>
  );
}
