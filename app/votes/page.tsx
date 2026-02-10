"use client";

import { useEffect, useState } from "react";
import Badge from "../../components/Badge";
import Card from "../../components/Card";
import VotesAccordion, { VoteItem } from "../../components/VotesAccordion";

type Vote = VoteItem;

export default function VotesPage() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchVotes = async () => {
      try {
        const response = await fetch("/api/votes");
        const data = (await response.json()) as Vote[];
        if (isMounted) {
          setVotes(data);
        }
      } catch {
        if (isMounted) {
          setVotes([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchVotes();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main>
      <div className="section-head">
        <div>
          <p className="section-tag">VOTES</p>
          <h2>투표 목록</h2>
        </div>
        <Badge tone="accent">실시간</Badge>
      </div>
      <Card>
        {isLoading ? (
          <div className="empty-state">
            <p>투표 목록을 불러오는 중...</p>
          </div>
        ) : votes.length === 0 ? (
          <div className="empty-state">
            <p>현재 진행 중인 투표가 없습니다.</p>
          </div>
        ) : (
          <VotesAccordion votes={votes} />
        )}
      </Card>
    </main>
  );
}
