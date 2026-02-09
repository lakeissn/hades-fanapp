import Badge from "../../components/Badge";
import Card from "../../components/Card";

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

export default function VotesPage() {
  return (
    <main>
      <div className="section-head">
        <div>
          <p className="section-tag">VOTES</p>
          <h2>투표 목록</h2>
        </div>
        <Badge tone="accent">샘플 데이터</Badge>
      </div>
      <Card>
        <div className="poll-grid">
          {pollSamples.map((poll) => (
            <article key={poll.id} className="poll-card">
              <h3>{poll.title}</h3>
              <ul>
                {poll.options.map((option) => (
                  <li key={option}>
                    <span>{option}</span>
                    <span className="muted">투표수</span>
                  </li>
                ))}
              </ul>
              <p className="muted">누적 {poll.votes}표</p>
            </article>
          ))}
        </div>
      </Card>
    </main>
  );
}
