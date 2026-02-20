"use client";

import { useEffect, useState } from "react";
import VoteAccordionItem from "./VoteAccordionItem";

export type VoteItem = {
  id: string;
  title: string;
  platform: string;
  platformLabel: string;
  url: string | null;
  opensAt?: string;
  closesAt?: string;
  note?: string;
};

type VotesAccordionProps = {
  votes: VoteItem[];
  openVoteId?: string | null;
};

export default function VotesAccordion({ votes, openVoteId = null }: VotesAccordionProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!openVoteId) return;
    const idx = votes.findIndex((vote) => vote.id === openVoteId);
    if (idx !== -1) setOpenIdx(idx);
  }, [openVoteId, votes]);

  return (
    <div className="votes-accordion">
      {votes.map((vote, idx) => (
        <VoteAccordionItem
          key={`${vote.id}-${idx}`}
          vote={vote}
          isOpen={openIdx === idx}
          onToggle={() => setOpenIdx(openIdx === idx ? null : idx)}
        />
      ))}
    </div>
  );
}
