"use client";

import { useEffect, useMemo, useState } from "react";
// 경로를 ../ (한 단계 위) 로 정확히 수정했습니다.
import Button from "../components/Button";
import Card from "../components/Card";
import LiveCard from "../components/LiveCard";
import MemberChip from "../components/MemberChip";
import Badge from "../components/Badge";

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

type VoteItem = {
  id: string;
  title: string;
  platform: string;
  platformLabel: string;
  url: string | null;
  opensAt?: string;
  closesAt?: string;
  note?: string;
};

// ... (중략: 기존 스타일 및 데이터 로직 동일)

export default function HomePage() {
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [isVotesLoading, setIsVotesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchMembers = async () => {
      try {
        const response = await fetch("/api/members/status");
        const data = await response.json();
        if (isMounted) setMembers(data);
      } catch {
        if (isMounted) setMembers([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    fetchMembers();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const fetchVotes = async () => {
      try {
        const response = await fetch("/api/votes");
        const data = await response.json();
        if (isMounted) setVotes(data);
      } catch {
        if (isMounted) setVotes([]);
      } finally {
        if (isMounted) setIsVotesLoading(false);
      }
    };
    fetchVotes();
    return () => { isMounted = false; };
  }, []);

  const { liveMembers, offlineMembers } = useMemo(() => {
    const live = members.filter((m) => m.isLive);
    const offline = members.filter((m) => !m.isLive);
    return { liveMembers: live, offlineMembers: offline };
  }, [members]);

  return (
    <main>
      <section className="section-block">
        <div className="section-head">
          <p className="section-tag">LIVE NOW</p>
          <h2>지금 방송 중인 멤버</h2>
        </div>
        <div className="live-grid">
          {isLoading ? (
            <div className="empty-state">로딩 중...</div>
          ) : liveMembers.length === 0 ? (
            <div className="empty-state">방송 없음</div>
          ) : (
            liveMembers.map((m) => (
              <LiveCard key={m.id} name={m.name} soopUrl={m.liveUrl || m.soopUrl} avatarUrl={m.avatarUrl} title={m.title} thumbUrl={m.thumbUrl} />
            ))
          )}
        </div>
      </section>

      <Card>
        <div className="section-head">
          <Badge>HOT</Badge>
          <h2>투표 목록</h2>
        </div>
        <div className="card-body">
          {/* 투표 관련 렌더링 로직 */}
        </div>
      </Card>
    </main>
  );
}
