"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import LiveCard from "../components/LiveCard";
import MemberChip from "../components/MemberChip";

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
  { id: "gift", label: "선물하기", href: "/guides/gift" },
  { id: "download", label: "다운로드", href: "/guides/download" },
];

type MemberStatus = {
  id: string;
  name: string;
  soopUrl: string;
  avatarUrl: string;
  isLive: boolean;
  liveUrl: string | null;
  title: string | null;
  thumbUrl: string | null;
  fetchedAt: string;
};

const coverStyles: Record<string, React.CSSProperties> = {
  whatcherry4: { background: "linear-gradient(135deg, #3a1c71, #d76d77)" },
  singgyul: { background: "linear-gradient(135deg, #1d4350, #a43931)" },
  ldrboo: { background: "linear-gradient(135deg, #42275a, #734b6d)" },
  chaenna02: { background: "linear-gradient(135deg, #16222a, #3a6073)" },
  kymakyma: { background: "linear-gradient(135deg, #141e30, #243b55)" },
  khm11903: { background: "linear-gradient(135deg, #2c3e50, #4ca1af)" },
};

const memberTags: Record<string, string[]> = {
  whatcherry4: ["한국어", "버추얼", "노래", "하데스"],
  singgyul: ["게임", "소통", "편안함", "클립"],
  ldrboo: ["보이는라디오", "토크", "밤"],
  chaenna02: ["버추얼", "힐링", "잡담"],
  kymakyma: ["ASMR", "음악", "감성"],
  khm11903: ["리액션", "예능", "챌린지"],
};

const officialLinks = [
  {
    id: "cafe",
    label: "팬카페",
    href: "https://cafe.naver.com/moomoo",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 4h9.2c4.5 0 6.8 2.2 6.8 6.5 0 4.7-2.3 7.1-6.8 7.1H9.6v-3.2h3.8c2.3 0 3.4-1.1 3.4-3.8 0-2.4-1.1-3.5-3.4-3.5H7v10.5H4V4z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "youtube",
    label: "유튜브",
    href: "https://www.youtube.com/@HADES_offi",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M21.6 7.7c-.2-.9-.9-1.6-1.8-1.8C18.2 5.5 12 5.5 12 5.5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 9.3 2 12 2 12s0 2.7.4 4.3c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.3.4-4.3s0-2.7-.4-4.3z"
          fill="currentColor"
        />
        <path d="M10 15.5V8.5L16 12l-6 3.5z" fill="#0b0b14" />
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "인스타그램",
    href: "https://www.instagram.com/hades_offi/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4zm6.1-.8a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "x",
    label: "X",
    href: "https://x.com/hades_offi",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 4h4.7l4.3 5.8L18.3 4H22l-6.3 7.7L22 20h-4.7l-4.6-6.1L6.2 20H2.5l6.7-8.1L4 4z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

export default function HomePage() {
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchMembers = async () => {
      try {
        const response = await fetch("/api/members/status");
        const data = (await response.json()) as MemberStatus[];
        if (isMounted) {
          setMembers(data);
        }
      } catch {
        if (isMounted) {
          setMembers([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMembers();
    const interval = setInterval(fetchMembers, 30_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const { liveMembers, offlineMembers } = useMemo(() => {
    const live = members.filter((member) => member.isLive);
    const offline = members.filter((member) => !member.isLive);
    return { liveMembers: live, offlineMembers: offline };
  }, [members]);

  return (
    <main>
      <section className="section-block">
        <div className="section-head">
          <div>
            <p className="section-tag">LIVE NOW</p>
            <h2>지금 방송 중인 멤버</h2>
          </div>
        </div>
        <div className="live-grid">
          {isLoading && (
            <div className="empty-state">
              <p>라이브 상태를 불러오는 중...</p>
            </div>
          )}
          {!isLoading && liveMembers.length === 0 && (
            <div className="empty-state">
              <p>현재 방송 중인 멤버가 없습니다.</p>
            </div>
          )}
          {liveMembers.map((member) => (
            <LiveCard
              key={member.id}
              name={member.name}
              soopUrl={member.liveUrl ?? member.soopUrl}
              avatarUrl={member.avatarUrl}
              coverStyle={coverStyles[member.id] ?? { background: "#1f1f2f" }}
              title={member.title}
              thumbUrl={member.thumbUrl}
              tags={memberTags[member.id] ?? ["라이브"]}
            />
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div>
            <p className="section-tag">OFFLINE</p>
            <h2>잠시 쉬는 중</h2>
          </div>
        </div>
        <div className="chip-grid">
          {offlineMembers.map((member) => (
            <MemberChip key={member.id} name={member.name} avatarUrl={member.avatarUrl} />
          ))}
        </div>
      </section>

      <Card>
        <div className="section-head">
          <h2>투표 목록</h2>
        </div>
        <div className="card-body">
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
        </div>
        <div className="section-footer">
          <Button href="/votes">투표 전체 보기</Button>
        </div>
      </Card>

      <Card>
        <div className="section-head">
          <h2>가이드 카테고리</h2>
          <span className="muted">팬들이 좋아하는 시작 포인트</span>
        </div>
        <div className="card-body">
          <div className="chip-row">
            {guideCategories.map((category) => (
              <Button key={category.id} href={category.href}>
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <section className="section-block">
        <div className="section-head">
          <div>
            <p className="section-tag">OFFICIAL</p>
            <h2>공식 링크</h2>
          </div>
        </div>
        <div className="link-grid">
          {officialLinks.map((link) => (
            <a
              key={link.id}
              className="link-card"
              href={link.href}
              target="_blank"
              rel="noreferrer"
            >
              <span className="link-icon" aria-hidden>
                {link.icon}
              </span>
              <span className="link-label">{link.label}</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
