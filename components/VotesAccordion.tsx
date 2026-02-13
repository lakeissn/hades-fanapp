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
  const [openId, setOpenId] = useState<string | null>(openVoteId);

  useEffect(() => {
    if (!openVoteId) return;
    const exists = votes.some((vote) => vote.id === openVoteId);
    if (exists) {
      setOpenId(openVoteId);
    }
  }, [openVoteId, votes]);

  return (
    <div className="votes-accordion">
      {votes.map((vote) => (
        <VoteAccordionItem
          key={vote.id}
          vote={vote}
          isOpen={openId === vote.id}
          onToggle={() => setOpenId(openId === vote.id ? null : vote.id)}
        />
      ))}
    </div>
  );
}
