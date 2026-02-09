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

export default function GuideDetailPage({ params }) {
  const guide = guideDetails[params.id] ?? {
    title: "가이드 준비 중",
    subtitle: "현재 준비 중인 카테고리입니다.",
    steps: ["조금만 기다려 주세요."],
  };

  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-400">가이드 상세</p>
        <h2 className="text-2xl font-semibold">{guide.title}</h2>
        <p className="mt-2 text-slate-300">{guide.subtitle}</p>
      </header>
      <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <h3 className="text-lg font-semibold">단계별 안내</h3>
        <ol className="mt-4 space-y-3">
          {guide.steps.map((step, index) => (
            <li
              key={step}
              className="flex gap-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/20 text-sm font-semibold text-rose-200">
                {index + 1}
              </span>
              <p className="text-sm text-slate-200">{step}</p>
            </li>
          ))}
        </ol>
      </section>
      <a
        href="/guides"
        className="inline-flex items-center gap-2 text-sm text-rose-200 hover:text-rose-100"
      >
        ← 가이드 목록으로
      </a>
    </main>
  );
}
