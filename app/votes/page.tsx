"use client";

import { useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import VotesAccordion, { VoteItem } from "@/components/VotesAccordion";

type Vote = VoteItem;

function isActiveVote(vote: Vote) {
  if (!vote.closesAt) {
    return true;
  }
  const closesAt = new Date(vote.closesAt);
  if (Number.isNaN(closesAt.getTime())) {
    return true;
  }
  return closesAt.getTime() > Date.now();
}

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

  const visibleVotes = useMemo(() => votes.filter(isActiveVote), [votes]);

  return (
    <main>
      <section className="section-block">
        <div className="section-head page-header">
          <div>
            <p className="section-tag">VOTES</p>
            <h2>투표 목록</h2>
          </div>
        </div>
        <Card>
          {isLoading ? (
            <div className="empty-state">
              <p>투표 목록을 불러오는 중...</p>
            </div>
          ) : visibleVotes.length === 0 ? (
            <div className="empty-state">
              <p>현재 진행 중인 투표가 없습니다.</p>
            </div>
          ) : (
            <VotesAccordion votes={visibleVotes} />
          )}
        </Card>
      </section>
    </main>
  );
}
