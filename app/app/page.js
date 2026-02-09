const broadcastStatus = {
  isLive: true,
  title: "하데스 라이브",
  description: "오늘은 스토리 모드 2챕터 도전!",
  viewers: 1284,
};

const pollSamples = [
  {
    id: "poll-1",
    title: "오늘 방송 BGM은?",
    options: ["원곡", "팬메이드", "시크릿"],
    votes: 284,
  },
  {
    id: "poll-2",
    title: "다음 컨텐츠 선택",
    options: ["챌린지", "에피소드", "팬아트 리뷰"],
    votes: 402,
  },
];

const guideCategories = [
  { id: "streaming", label: "스트리밍 가이드", href: "/guides/streaming" },
  { id: "gifting", label: "선물하기", href: "/guides/gifting" },
  { id: "download", label: "다운로드", href: "/guides/download" },
];

export default function HomePage() {
  return (
    <main className="space-y-8">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">방송 상태</p>
            <h2 className="text-2xl font-semibold">
              {broadcastStatus.isLive ? "ON AIR" : "OFFLINE"}
            </h2>
            <p className="mt-2 text-slate-300">{broadcastStatus.title}</p>
            <p className="text-sm text-slate-400">
              {broadcastStatus.description}
            </p>
          </div>
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-rose-200">
            <p className="text-xs uppercase tracking-[0.2em]">현재 시청자</p>
            <p className="text-2xl font-semibold">{broadcastStatus.viewers}</p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">투표 목록</h3>
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            샘플 데이터
          </span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {pollSamples.map((poll) => (
            <article
              key={poll.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <h4 className="text-lg font-semibold">{poll.title}</h4>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {poll.options.map((option) => (
                  <li
                    key={option}
                    className="flex items-center justify-between rounded-xl border border-slate-800 px-3 py-2"
                  >
                    <span>{option}</span>
                    <span className="text-xs text-slate-500">투표수</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">누적 {poll.votes}표</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <h3 className="text-xl font-semibold">가이드 카테고리</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          {guideCategories.map((category) => (
            <a
              key={category.id}
              href={category.href}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-rose-400 hover:text-rose-200"
            >
              {category.label}
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
