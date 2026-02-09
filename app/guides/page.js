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

export default function GuidesPage() {
  return (
    <main className="space-y-6">
      <header>
        <p className="text-sm text-slate-400">가이드</p>
        <h2 className="text-2xl font-semibold">카테고리 목록</h2>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        {guideCategories.map((category) => (
          <a
            key={category.id}
            href={`/guides/${category.id}`}
            className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 transition hover:-translate-y-1 hover:border-rose-400/70"
          >
            <h3 className="text-lg font-semibold">{category.title}</h3>
            <p className="mt-2 text-sm text-slate-300">
              {category.description}
            </p>
            <p className="mt-4 text-xs text-slate-500">{category.items}개 단계</p>
          </a>
        ))}
      </div>
    </main>
  );
}
