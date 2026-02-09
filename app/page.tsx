const broadcastStatus = {
  isLive: true,
  title: "하데스 라이브",
  description: "오늘은 스토리 모드 2챕터 도전!",
  viewers: 1284,
};

const pollSamples = [
  {
    id: "poll-1",
    title: "새 투표: 오늘 방송 BGM은?",
    options: ["원곡", "팬메이드", "시크릿"],
    votes: 284,
  },
  {
    id: "poll-2",
    title: "새 투표: 다음 컨텐츠 선택",
    options: ["챌린지", "에피소드", "팬아트 리뷰"],
    votes: 402,
  },
];

const guideCategories = [
  { id: "streaming", label: "스트리밍 가이드", href: "/guides/streaming" },
  { id: "gifting", label: "선물하기", href: "/guides/gifting" },
  { id: "download", label: "다운로드", href: "/guides/download" },
];

const cardStyle = {
  border: "1px solid #1e293b",
  borderRadius: "20px",
  backgroundColor: "#111827",
  padding: "20px",
};

export default function HomePage() {
  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <section style={cardStyle}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "16px",
          }}
        >
          <div>
            <p style={{ fontSize: "12px", color: "#94a3b8" }}>방송 상태</p>
            <h2 style={{ fontSize: "24px", margin: "6px 0" }}>
              {broadcastStatus.isLive ? "ON AIR" : "OFFLINE"}
            </h2>
            <p style={{ margin: "6px 0", color: "#e2e8f0" }}>{broadcastStatus.title}</p>
            <p style={{ fontSize: "14px", color: "#94a3b8" }}>
              {broadcastStatus.description}
            </p>
          </div>
          <div
            style={{
              borderRadius: "16px",
              border: "1px solid #f43f5e",
              padding: "12px 16px",
              color: "#fecdd3",
              backgroundColor: "rgba(244, 63, 94, 0.1)",
            }}
          >
            <p style={{ fontSize: "11px", letterSpacing: "0.2em" }}>현재 시청자</p>
            <p style={{ fontSize: "24px", margin: "4px 0 0" }}>{broadcastStatus.viewers}</p>
          </div>
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "20px", margin: 0 }}>새 투표</h3>
          <span
            style={{
              fontSize: "12px",
              backgroundColor: "#1f2937",
              color: "#cbd5f5",
              borderRadius: "999px",
              padding: "4px 12px",
            }}
          >
            샘플 데이터
          </span>
        </div>
        <div
          style={{
            marginTop: "16px",
            display: "grid",
            gap: "16px",
          }}
        >
          {pollSamples.map((poll) => (
            <article key={poll.id} style={{ border: "1px solid #1f2937", borderRadius: "16px", padding: "16px" }}>
              <h4 style={{ fontSize: "18px", margin: "0 0 8px" }}>{poll.title}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "8px" }}>
                {poll.options.map((option) => (
                  <li
                    key={option}
                    style={{
                      border: "1px solid #1f2937",
                      borderRadius: "12px",
                      padding: "8px 12px",
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#cbd5f5",
                      fontSize: "14px",
                    }}
                  >
                    <span>{option}</span>
                    <span style={{ color: "#64748b", fontSize: "12px" }}>투표수</span>
                  </li>
                ))}
              </ul>
              <p style={{ marginTop: "10px", fontSize: "12px", color: "#64748b" }}>
                누적 {poll.votes}표
              </p>
            </article>
          ))}
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={{ fontSize: "20px", marginTop: 0 }}>가이드 카테고리</h3>
        <div style={{ marginTop: "12px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {guideCategories.map((category) => (
            <a
              key={category.id}
              href={category.href}
              style={{
                padding: "8px 16px",
                borderRadius: "999px",
                border: "1px solid #334155",
                color: "#e2e8f0",
                textDecoration: "none",
                fontSize: "14px",
              }}
            >
              {category.label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
