"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { VoteItem } from "./VotesAccordion";

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
  const hasUrl = Boolean(vote.url);

  // --- 동적 폰트 축소 로직 ---
  const [fontSize, setFontSize] = useState(16);
  const titleRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fitText = () => {
      if (containerRef.current && titleRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // 너비 측정을 위해 폰트 크기 초기화
        titleRef.current.style.fontSize = '16px';
        const textWidth = titleRef.current.scrollWidth;

        if (textWidth > containerWidth && containerWidth > 0) {
          const ratio = containerWidth / textWidth;
          // 최소 10px까지만 줄어들도록 설정
          const newSize = Math.max(10, Math.floor(16 * ratio * 10) / 10);
          setFontSize(newSize);
        } else {
          setFontSize(16);
        }
      }
    };

    fitText();
    const observer = new ResizeObserver(fitText);
    if (containerRef.current) observer.observe(containerRef.current);
    
    return () => observer.disconnect();
  }, [vote.title]);
  // -------------------------

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

  const closeDateLong = formatLongDate(vote.closesAt);
  const openDate = formatShortDate(vote.opensAt);
  const closeDate = formatShortDate(vote.closesAt);
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
        
        {/* 측정용 컨테이너 추가 */}
        <span className="vote-title" ref={containerRef}>
          <span 
            className="vote-title-text" 
            ref={titleRef}
            style={{ fontSize: `${fontSize}px` }}
          >
            {vote.title}
          </span>
          {/* 진행중 상태 표시 뱃지 렌더링 제거 완료 */}
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
        <div className="vote-panel compact-panel">
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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          <div className="panel-footer">
            <div className="panel-info">
              <span className="panel-label">기간</span>
              <span className="panel-value date-text">{periodText}</span>
            </div>
            {vote.note && (
              <div className="panel-info note">
                <span className="panel-label text-accent">리워드</span>
                <span className="panel-value note-text">{vote.note}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
