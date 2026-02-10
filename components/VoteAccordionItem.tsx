"use client";

import { useMemo, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { VoteItem } from "./VotesAccordion";

const statusLabels: Record<string, string> = {
  open: "진행중",
  upcoming: "오픈 예정",
  closed: "마감됨",
};

function parseKstDate(value?: string) {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const normalized = raw.replace(/\./g, "-").replace(/\//g, "-").replace(/\s+/g, " ").trim();
  const withSeconds = /\d{2}:\d{2}:\d{2}$/.test(normalized)
    ? normalized
    : /\d{2}:\d{2}$/.test(normalized)
      ? `${normalized}:00`
      : `${normalized} 00:00:00`;

  const parsed = new Date(`${withSeconds.replace(" ", "T")}+09:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isInProgressKeyword(value?: string) {
  return Boolean(value && value.replace(/\s+/g, "") === "진행중");
}

function formatShortDate(value?: string) {
  const date = parseKstDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function formatLongDate(value?: string) {
  const date = parseKstDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function resolveStatus(opensAt?: string, closesAt?: string) {
  const now = Date.now();
  const openDate = isInProgressKeyword(opensAt) ? null : parseKstDate(opensAt);
  const closeDate = parseKstDate(closesAt);

  if (openDate && now < openDate.getTime()) return "upcoming";
  if (closeDate && now > closeDate.getTime()) return "closed";
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
  const [missingIcons, setMissingIcons] = useState<Record<string, boolean>>({});
  const status = resolveStatus(vote.opensAt, vote.closesAt);
  const label = statusLabels[status];
  const hasUrl = Boolean(vote.url);

  const platforms = useMemo(() => {
    const rawPlatforms = (vote as VoteItem & { platforms?: string[] }).platforms;
    const values = (rawPlatforms?.length
      ? rawPlatforms
      : (vote.platform || "")
          .replace(/[|,/]/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .split(" "))
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(values)).slice(0, 20);
  }, [vote.platform, vote]);

  const platformLabels = useMemo(() => {
    const rawLabels = (vote as VoteItem & { platformLabels?: string[] }).platformLabels;
    if (rawLabels?.length) {
      return rawLabels;
    }

    const first = vote.platformLabel || "기타";
    return platforms.map((_, index) => (index === 0 ? first : "기타"));
  }, [platforms, vote.platformLabel, vote]);

  const openDate = formatShortDate(vote.opensAt);
  const closeDate = formatShortDate(vote.closesAt);
  const closeDateLong = formatLongDate(vote.closesAt);
  const isOpenKeyword = isInProgressKeyword(vote.opensAt);

  const periodText = isOpenKeyword
    ? `진행 중 ~ ${closeDateLong ?? "마감 정보 없음"}`
    : openDate || closeDate
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
        <span className="vote-icons" aria-hidden>
          {platforms.slice(0, 3).map((platform) => {
            const missing = missingIcons[platform];
            return (
              <span key={platform} className="vote-icon">
                {!missing && (
                  <img
                    src={`/icons/${platform}.png`}
                    alt=""
                    onError={() =>
                      setMissingIcons((prev) => ({
                        ...prev,
                        [platform]: true,
                      }))
                    }
                  />
                )}
                {missing && (
                  <span className="vote-icon-fallback vote-icon-neutral" aria-hidden>
                    <span />
                  </span>
                )}
              </span>
            );
          })}
          {platforms.length > 3 && <span className="vote-more">+{platforms.length - 3}</span>}
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
            바로가기
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
            <span className="vote-status" data-status={status}>
              {label}
            </span>
          </div>

          <div className="vote-platform-list">
            {platforms.map((platform, index) => {
              const missing = missingIcons[platform];
              return (
                <span key={`${vote.id}-${platform}`} className="vote-platform-item">
                  <span className="vote-icon" aria-hidden>
                    {!missing && (
                      <img
                        src={`/icons/${platform}.png`}
                        alt=""
                        onError={() =>
                          setMissingIcons((prev) => ({
                            ...prev,
                            [platform]: true,
                          }))
                        }
                      />
                    )}
                    {missing && (
                      <span className="vote-icon-fallback vote-icon-neutral" aria-hidden>
                        <span />
                      </span>
                    )}
                  </span>
                  <span>{platformLabels[index] ?? "기타"}</span>
                </span>
              );
            })}
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
            바로가기
          </a>
        </div>
      )}
    </div>
  );
}
