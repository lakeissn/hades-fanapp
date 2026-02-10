"use client";

import type { KeyboardEvent } from "react";
import { VoteItem } from "./VotesAccordion";

const statusLabels: Record<string, string> = {
  open: "진행중",
  upcoming: "오픈 예정",
  closed: "마감됨",
};

function formatDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function resolveStatus(opensAt?: string, closesAt?: string) {
  const now = new Date();
  const openDate = opensAt ? new Date(opensAt) : null;
  const closeDate = closesAt ? new Date(closesAt) : null;

  if (openDate && now < openDate) return "upcoming";
  if (closeDate && now > closeDate) return "closed";
  return "open";
}

export default function VoteAccordionItem({
  vote,
  isOpen,
  onToggle,
}: {
  vote: VoteItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const status = resolveStatus(vote.opensAt, vote.closesAt);
  const label = statusLabels[status];
  const openDate = formatDate(vote.opensAt);
  const closeDate = formatDate(vote.closesAt);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <div className={`vote-item ${isOpen ? "is-open" : ""}`}>
      <div
        className="vote-row"
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
      >
        <span className="vote-icon" aria-hidden>
          <img src="/icons/idolchamp.png" alt="" />
        </span>
        <span className="vote-title">
          <span className="vote-title-text">{vote.title}</span>
          <span className="vote-status" data-status={status}>
            {label}
          </span>
        </span>
        {!isOpen && (
          <a
            className={`vote-link ${vote.link ? "" : "is-disabled"}`}
            href={vote.link ?? "#"}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => {
              event.stopPropagation();
              if (!vote.link) {
                event.preventDefault();
              }
            }}
          >
            바로 가기
          </a>
        )}
        <span className="vote-chevron" aria-hidden>
          <svg viewBox="0 0 24 24">
            <path
              d="M6 9l6 6 6-6"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      {isOpen && (
        <div className="vote-panel">
          <div className="vote-panel-head">
            <span className="vote-panel-icon" aria-hidden>
              <img src="/icons/idolchamp.png" alt="" />
            </span>
            {(openDate || closeDate) && (
              <span className="vote-dates">
                {openDate && <span>오픈 {openDate}</span>}
                {openDate && closeDate && <span className="vote-date-sep">·</span>}
                {closeDate && <span>마감 {closeDate}</span>}
              </span>
            )}
          </div>
          {vote.link && (
            <a
              className="vote-link-detail"
              href={vote.link}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
            >
              바로 가기
            </a>
          )}
        </div>
      )}
    </div>
  );
}
