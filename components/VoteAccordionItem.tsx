"use client";

import { useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
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
  const [isIconMissing, setIsIconMissing] = useState(false);
  const status = resolveStatus(vote.opensAt, vote.closesAt);
  const label = statusLabels[status];
  const openDate = formatDate(vote.opensAt);
  const closeDate = formatDate(vote.closesAt);
  const hasUrl = Boolean(vote.url);

  const periodText = openDate || closeDate
    ? [openDate ? `오픈 ${openDate}` : null, closeDate ? `마감 ${closeDate}` : null]
        .filter(Boolean)
        .join(" · ")
    : "기간 정보 없음";

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  const stopRowToggle = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    if (!hasUrl) {
      event.preventDefault();
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
          {!isIconMissing && (
            <img
              src={`/icons/${vote.platform}.png`}
              alt=""
              onError={() => setIsIconMissing(true)}
            />
          )}
          {isIconMissing && <span className="vote-icon-fallback">V</span>}
        </span>
        <span className="vote-title">
          <span className="vote-title-text">{vote.title}</span>
          <span className="vote-status" data-status={status}>
            {label}
          </span>
        </span>
        {!isOpen && (
          <a
            className={`vote-link ${hasUrl ? "" : "is-disabled"}`}
            href={vote.url ?? "#"}
            target="_blank"
            rel="noreferrer"
            onClick={stopRowToggle}
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
          <div className="vote-panel-top">
            <span className="vote-platform-label">{vote.platformLabel}</span>
            <span className="vote-status" data-status={status}>
              {label}
            </span>
          </div>

          <p className="vote-dates">{periodText}</p>

          {vote.note && (
            <div className="vote-note-box">
              <div className="vote-note-head">
                <span className="vote-note-icon" aria-hidden>
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M12 3l2.2 4.5 5 .7-3.6 3.5.8 5-4.4-2.3-4.4 2.3.8-5L4.8 8.2l5-.7L12 3z"
                      fill="currentColor"
                    />
                  </svg>
                </span>
                <span>리워드</span>
              </div>
              <p className="vote-note-text">{vote.note}</p>
            </div>
          )}

          <a
            className={`vote-link-detail ${hasUrl ? "" : "is-disabled"}`}
            href={vote.url ?? "#"}
            target="_blank"
            rel="noreferrer"
            onClick={stopRowToggle}
          >
            바로 가기
          </a>
        </div>
      )}
    </div>
  );
}
