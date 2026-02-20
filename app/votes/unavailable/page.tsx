import Link from "next/link";

const LABEL_TO_KEY: Record<string, string> = {
  "아이돌챔프": "idolchamp",
  "뮤빗": "mubeat",
  "유픽": "upick",
  "팬캐스트": "fancast",
  "팬플러스": "fanplus",
  "포도알": "podoal",
  "후즈팬": "whosfan",
  "덕애드": "duckad",
  "텐아시아": "10asia",
  "뮤니버스": "muniverse",
  "마이원픽": "my1pick",
  "엠넷플러스": "mnetplus",
  "팬앤스타": "fannstar",
  "하이어": "higher",
  "K탑스타": "ktopstar",
};

function platformKey(label: string) {
  return LABEL_TO_KEY[label] ?? label.toLowerCase();
}

type UnavailablePageProps = {
  searchParams?: {
    title?: string;
    platform?: string;
  };
};

export default function VoteUnavailablePage({ searchParams }: UnavailablePageProps) {
  const voteTitle = searchParams?.title?.trim() || "해당 투표";
  const platform = searchParams?.platform?.trim();
  const iconKey = platform ? platformKey(platform) : null;

  return (
    <main>
      <section className="section-block vu-page">
        <div className="vu-banner">
          <img className="vu-banner-bg" src="/icons/IMG_1897.png" alt="" aria-hidden />
          <div className="vu-banner-inner">
            <div className="vu-banner-text">
              <span className="vu-tag">안내</span>
              <h2 className="vu-title">앱 내부 링크 공유가<br />불가능한 투표예요</h2>
            </div>
            <img className="vu-mascot" src="/icons/hades_helper.png" alt="" />
          </div>
        </div>

        <div className="vu-detail">
          <div className="vu-vote-name">
            {iconKey && (
              <span className="vu-platform-icon">
                <img src={`/icons/${iconKey}.png`} alt="" />
              </span>
            )}
            <span>{voteTitle}{platform ? <span className="vu-platform"> · {platform}</span> : null}</span>
          </div>
          <p className="vu-desc">
            플랫폼 정책으로 인해 외부 URL로 직접 이동할 수 없어요.<br />
            해당 앱을 직접 열어 투표에 참여해 주세요.
          </p>
        </div>

        <Link href="/votes" className="vote-action-btn">
          투표 목록으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
