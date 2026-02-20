"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { parseKstDate } from "@/lib/parseKstDate";
import { VoteItem } from "./VotesAccordion";

const PLATFORM_LABELS: Record<string, string> = {
  idolchamp: "아이돌챔프",
  mubeat: "뮤빗",
  upick: "유픽",
  fancast: "팬캐스트",
  fanplus: "팬플러스",
  podoal: "포도알",
  whosfan: "후즈팬",
  duckad: "덕애드",
  "10asia": "텐아시아",
  muniverse: "뮤니버스",
  my1pick: "마이원픽",
  mnetplus: "엠넷플러스",
  fannstar: "팬앤스타",
  higher: "하이어",
  ktopstar: "K탑스타",
};

function isInProgressKeyword(value?: string) {
  return Boolean(value && value.replace(/\s+/g, "") === "진행중");
}

function formatShortDate(value?: string) {
  const date = parseKstDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    hour12: false, timeZone: "Asia/Seoul",
  }).format(date);
}

function formatLongDate(value?: string) {
  const date = parseKstDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "numeric", day: "numeric", weekday: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
    timeZone: "Asia/Seoul",
  }).format(date);
}

function useFitText(basePx: number = 14, minPx: number = 10) {
  const [fontSize, setFontSize] = useState(basePx);
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fit = () => {
      const c = containerRef.current;
      const t = textRef.current;
      if (!c || !t) return;
      const containerWidth = c.offsetWidth;
      if (!containerWidth) return;
      const prev = t.style.fontSize;
      t.style.fontSize = `${basePx}px`;
      const textWidth = t.scrollWidth;
      t.style.fontSize = prev;
      if (textWidth > containerWidth) {
        const ratio = containerWidth / textWidth;
        const next = Math.max(minPx, Math.floor(basePx * ratio * 10) / 10);
        setFontSize(next);
      } else {
        setFontSize(basePx);
      }
    };
    fit();
    const ro = new ResizeObserver(fit);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [basePx, minPx]);

  return { fontSize, containerRef, textRef };
}

function isValidExternalUrl(value?: string | null) {
  if (!value) return false;

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isUnshareableAppText(value?: string | null) {
  if (!value) return false;
  const normalized = value.replace(/\s+/g, "");
  return /링크공유가?불가능/.test(normalized);
}

export default function VoteAccordionItem({
  vote, isOpen, onToggle,
}: { vote: VoteItem; isOpen: boolean; onToggle: () => void; }) {
  const [missingIcons, setMissingIcons] = useState<Record<string, boolean>>({});
  const linkMeta = useMemo(() => {
    if (isValidExternalUrl(vote.url)) {
      return {
        hasUrl: true,
        href: vote.url as string,
        target: "_blank",
        rel: "noreferrer",
      };
    }
    const params = new URLSearchParams({
      title: vote.title,
      platform: vote.platformLabel || vote.platform,
    });

    if (isUnshareableAppText(vote.url)) {
      params.set("reason", "unshareable");
    } else if (vote.url?.trim()) {
      params.set("reason", "invalid-url");
    } else {
      params.set("reason", "missing-url");
    }

    return {
      hasUrl: true,
      href: `/votes/unavailable?${params.toString()}`,
    };
  }, [vote.platform, vote.platformLabel, vote.title, vote.url]);

  const periodFit = useFitText(13, 9);

  const [fontSize, setFontSize] = useState(14);
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 641px)");
    const base = mq.matches ? 15 : 14;
    const fitText = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textElement = textRef.current;
        const originalStyle = textElement.style.fontSize;
        textElement.style.fontSize = `${base}px`;
        const textWidth = textElement.scrollWidth;
        textElement.style.fontSize = originalStyle;
        if (textWidth > containerWidth && containerWidth > 0) {
          const ratio = containerWidth / textWidth;
          const newSize = Math.max(9, Math.floor(base * ratio * 10) / 10);
          setFontSize(newSize);
        } else {
          setFontSize(base);
        }
      }
    };
    fitText();
    const observer = new ResizeObserver(fitText);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [vote.title]);

  const platforms = useMemo(() => {
    const rawPlatforms = (vote as VoteItem & { platforms?: string[] }).platforms;
    const values = (rawPlatforms?.length
      ? rawPlatforms
      : (vote.platform || "").replace(/[|,/]/g, " ").replace(/\s+/g, " ").trim().split(" "))
      .map((item) => item.trim().toLowerCase()).filter(Boolean);
    return Array.from(new Set(values)).slice(0, 20);
  }, [vote.platform, vote]);

  const openDate = formatShortDate(vote.opensAt);
  const closeDate = formatShortDate(vote.closesAt);
  const closeDateLong = formatLongDate(vote.closesAt);
  const isOpenKeyword = isInProgressKeyword(vote.opensAt);

  const periodText = isOpenKeyword
    ? `진행 중 ~ ${closeDateLong ?? "마감 정보 없음"}`
    : openDate || closeDate
      ? [openDate ? `오픈 ${openDate}` : null, closeDate ? `마감 ${closeDate}` : null].filter(Boolean).join(" · ")
      : "기간 정보 없음";

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onToggle(); }
  };

  const stopRowToggle = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    if (!linkMeta.hasUrl) event.preventDefault();
  };

  return (
    <div className={`vote-item ${isOpen ? "is-open" : ""}`}>
      <div className="vote-row" role="button" tabIndex={0} aria-expanded={isOpen} onClick={onToggle} onKeyDown={handleKeyDown}>
        <span className="vote-icons" aria-hidden>
          {platforms.slice(0, 3).map((platform) => {
            const missing = missingIcons[platform];
            return (
              <span key={platform} className="vote-icon">
                {!missing && (
                  <img src={`/icons/${platform}.png`} alt=""
                    onError={() => setMissingIcons((prev) => ({ ...prev, [platform]: true }))} />
                )}
                {missing && (
                  <span className="vote-icon-fallback vote-icon-neutral" aria-hidden><span /></span>
                )}
              </span>
            );
          })}
          {platforms.length > 3 && <span className="vote-more">+{platforms.length - 3}</span>}
        </span>

        <span className="vote-title" ref={containerRef}>
          <span className="vote-title-text" ref={textRef} style={{ fontSize: `${fontSize}px` }}>
            {vote.title}
          </span>
        </span>

        {!isOpen && (
          <a
            className={`vote-link ${linkMeta.hasUrl ? "" : "is-disabled"}`}
            href={linkMeta.href}
            target={linkMeta.target}
            rel={linkMeta.rel}
            onClick={stopRowToggle}
          >
            바로가기
          </a>
        )}
        <span className="vote-chevron" aria-hidden>
          <svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </div>

      {isOpen && (
        <div className="vote-panel compact-panel">
          {/* 플랫폼 */}
          <div className="panel-section">
            <span className="panel-label">투표처</span>
            <div className="platform-grid-compact">
              {platforms.map((platform) => {
                const missing = missingIcons[platform];
                const label = PLATFORM_LABELS?.[platform] ?? platform;
                return (
                  <span key={`${vote.id}-${platform}`} className="platform-pill" title={label}>
                    <span className="compact-icon" aria-hidden>
                      {!missing && (
                        <img src={`/icons/${platform}.png`} alt=""
                          onError={() => setMissingIcons((prev) => ({ ...prev, [platform]: true }))} />
                      )}
                      {missing && (
                        <span className="vote-icon-fallback vote-icon-neutral" aria-hidden><span /></span>
                      )}
                    </span>
                    <span className="platform-name">{label}</span>
                  </span>
                );
              })}
            </div>
          </div>

          {/* 기간 / 리워드 */}
          <div className="panel-section panel-meta">
            <div className="panel-meta-row">
              <span className="panel-meta-label">기간</span>
              <span className="panel-meta-value" ref={periodFit.containerRef}>
                <span className="fit-text" ref={periodFit.textRef} style={{ fontSize: `${periodFit.fontSize}px` }}>
                  {periodText}
                </span>
              </span>
            </div>
            {vote.note && (
              <div className="panel-meta-row">
                <span className="panel-meta-label accent">리워드</span>
                <span className="panel-meta-value">
                  <span className="fit-text" style={{ fontSize: "13px" }}>{vote.note}</span>
                </span>
              </div>
            )}
          </div>

          {/* CTA */}
          <a
            className={`vote-action-btn ${linkMeta.hasUrl ? "" : "is-disabled"}`}
            href={linkMeta.href}
            target={linkMeta.target}
            rel={linkMeta.rel}
            onClick={stopRowToggle}
          >
            투표하러 가기
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 17L17 7M17 7H8M17 7v9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      )}
    </div>
  );
}
