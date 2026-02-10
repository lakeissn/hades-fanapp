"use client";

import { useState } from "react";
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
};

export default function VotesAccordion({ votes }: VotesAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

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
