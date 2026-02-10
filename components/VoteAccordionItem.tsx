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

  // 기존 platformLabels 로직은 유지하되, 새 디자인에서는 아이콘 위주로 보여줍니다.
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
      {/* 닫혀있을 때 보이는 헤더 (기존 디자인 유지) */}
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

      {/* 확장되었을 때 보이는 패널 (공간 절약형 Compact HUD 디자인 적용) */}
      {isOpen && (
        <div className="vote-panel compact-panel">
          {/* 섹션 1: 플랫폼 목록과 투표 버튼을 가로로 배치 */}
          <div className="panel-actions">
            <div className="panel-platforms">
              <span className="panel-label">투표처</span>
              <div className="platform-grid-compact">
                {platforms.map((platform) => {
                   const missing = missingIcons[platform];
                   return (
                    <span key={`${vote.id}-${platform}`} className="compact-icon" title={platform}>
                        {!missing && (
                        <img
                            src={`/icons/${platform}.png`}
                            alt={platform}
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
              </div>
            </div>
            
            <a
              className={`vote-action-btn ${hasUrl ? "" : "is-disabled"}`}
              href={vote.url ?? "#"}
              target="_blank"
              rel="noreferrer"
              onClick={stopRowToggle}
            >
              투표하러 가기
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          {/* 섹션 2: 기간 및 리워드 정보를 하단에 작게 배치 */}
          <div className="panel-footer">
            <div className="panel-info">
              <span className="panel-label">기간</span>
              <span className="panel-value">{periodText}</span>
            </div>
            {vote.note && (
              <div className="panel-info note">
                <span className="panel-label text-accent">리워드</span>
                <span className="panel-value">{vote.note}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
