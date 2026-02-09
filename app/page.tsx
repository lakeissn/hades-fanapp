"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "../components/Badge";
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
          <Badge tone="primary">자동 감지</Badge>
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
              soopUrl={member.soopUrl}
              avatarUrl={member.avatarUrl}
              coverStyle={coverStyles[member.id] ?? { background: "#1f1f2f" }}
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
          <Badge tone="muted">자동 감지</Badge>
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
          <Badge tone="accent">샘플 데이터</Badge>
        </div>
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

      <Card>
        <div className="section-head">
          <h2>가이드 카테고리</h2>
          <span className="muted">팬들이 좋아하는 시작 포인트</span>
        </div>
        <div className="chip-row">
          {guideCategories.map((category) => (
            <Button key={category.id} href={category.href}>
              {category.label}
            </Button>
          ))}
        </div>
      </Card>
    </main>
  );
}
