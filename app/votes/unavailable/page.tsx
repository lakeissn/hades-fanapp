import Link from "next/link";

type UnavailablePageProps = {
  searchParams?: {
    title?: string;
    platform?: string;
  };
};

export default function VoteUnavailablePage({ searchParams }: UnavailablePageProps) {
  const voteTitle = searchParams?.title?.trim() || "해당 투표";
  const platform = searchParams?.platform?.trim();

  return (
    <main>
      <section className="section-block vote-unavailable-page">
        <article className="vote-unavailable-card">
          <div className="vote-unavailable-top-glow" aria-hidden />
          <div className="vote-unavailable-badge">HADES VOTE NOTICE</div>
          <h1>
            <span>앗, 이 투표는</span>
            <span>앱 내부 링크 공유가 불가능해요</span>
          </h1>
          <p className="vote-unavailable-description">
            <strong>{voteTitle}</strong>
            {platform ? ` (${platform})` : ""} 는 플랫폼 정책으로 인해 외부 URL로 직접 이동할 수 없습니다.
            <br />
            앱에서 안내된 투표처를 직접 열어 참여해 주세요.
          </p>

          <div className="vote-unavailable-hero" role="img" aria-label="하데스 안내 일러스트">
            <img src="/icons/hades_helper.png" alt="하데스 마스코트" />
            <div className="vote-unavailable-hero-text">
              링크 공유가 막힌 앱이에요
              <small>검색 또는 앱 내부 이동으로 접속해 주세요</small>
            </div>
          </div>

          <div className="vote-unavailable-actions">
            <Link href="/votes" className="vote-unavailable-btn primary">
              투표 목록으로 돌아가기
            </Link>
            <Link href="/guides" className="vote-unavailable-btn">
              이용 가이드 보기
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
