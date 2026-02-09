const guideDetails = {
  streaming: {
    title: "스트리밍 가이드",
    subtitle: "방송 준비부터 종료까지",
    steps: [
      "방송 장비 점검 및 인터넷 상태 확인",
      "오버레이/알림 설정 확인",
      "방송 시작 공지 작성",
      "라이브 시작 후 인사 및 일정 공유",
      "방송 종료 후 하이라이트 저장",
    ],
  },
  gifting: {
    title: "선물하기 가이드",
    subtitle: "후원과 굿즈 전달 방법",
    steps: [
      "후원 플랫폼 로그인",
      "선물 가능한 굿즈 선택",
      "메시지 카드 작성",
      "배송 주소 확인",
    ],
  },
  download: {
    title: "다운로드 가이드",
    subtitle: "클립과 자료 다운로드",
    steps: [
      "자료실 메뉴 이동",
      "카테고리별 파일 검색",
      "다운로드 버튼 클릭",
      "압축 파일 해제 및 확인",
    ],
  },
};

const cardStyle = {
  border: "1px solid #1e293b",
  borderRadius: "20px",
  backgroundColor: "#111827",
  padding: "20px",
};

export default function GuideDetailPage({ params }: { params: { id: string } }) {
  const guide = guideDetails[params.id as keyof typeof guideDetails] ?? {
    title: "가이드 준비 중",
    subtitle: "현재 준비 중인 카테고리입니다.",
    steps: ["조금만 기다려 주세요."],
  };

  return (
    <main style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <header>
        <p style={{ fontSize: "12px", color: "#94a3b8" }}>가이드 상세</p>
        <h2 style={{ fontSize: "24px", margin: "6px 0" }}>{guide.title}</h2>
        <p style={{ margin: 0, color: "#cbd5f5" }}>{guide.subtitle}</p>
      </header>
      <section style={cardStyle}>
        <h3 style={{ fontSize: "18px", marginTop: 0 }}>단계별 안내</h3>
        <ol style={{ marginTop: "16px", padding: 0, listStyle: "none", display: "grid", gap: "12px" }}>
          {guide.steps.map((step, index) => (
            <li
              key={`${step}-${index}`}
              style={{
                border: "1px solid #1f2937",
                borderRadius: "16px",
                padding: "16px",
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                backgroundColor: "#0b1120",
              }}
            >
              <span
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "999px",
                  backgroundColor: "rgba(244, 63, 94, 0.2)",
                  color: "#fecdd3",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                {index + 1}
              </span>
              <p style={{ margin: 0, fontSize: "14px", color: "#e2e8f0" }}>{step}</p>
            </li>
          ))}
        </ol>
      </section>
      <a href="/guides" style={{ fontSize: "14px", color: "#fecdd3", textDecoration: "none" }}>
        ← 가이드 목록으로
      </a>
    </main>
  );
}
