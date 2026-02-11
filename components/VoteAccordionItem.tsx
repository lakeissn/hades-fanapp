"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
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

/** ✅ 기간/리워드용: 컨테이너 폭에 맞춰 글자 자동 축소 */
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

  // ✅ 기간/리워드: 14px 기준, 최소 10px까지 축소
  const periodFit = useFitText(14, 10);
  const rewardFit = useFitText(14, 10);

  // --- ✅ 제목(헤더) 동적 폰트 축소 로직 (기존 유지) ---
  const [fontSize, setFontSize] = useState(16);
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const fitText = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textElement = textRef.current;

        const originalStyle = textElement.style.fontSize;
        textElement.style.fontSize = "16px";
        const textWidth = textElement.scrollWidth;
        textElement.style.fontSize = originalStyle;

        if (textWidth > containerWidth && containerWidth > 0) {
          const ratio = containerWidth / textWidth;
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
  // ------------------------------------------------

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
    if (!hasUrl) event.preventDefault();
  };

  return (
    <div className={`vote-item ${isOpen ? "is-open" : ""}`}>
      {/* 닫혀있을 때 헤더 영역 */}
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

        {/* 제목 동적 폰트 축소 */}
        <span className="vote-title" ref={containerRef}>
          <span className="vote-title-text" ref={textRef} style={{ fontSize: `${fontSize}px` }}>
            {vote.title}
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

      {/* 확장 패널 영역 */}
{isOpen && (
  <div className="vote-panel compact-panel">
    <div className="panel-actions">
      <div className="panel-platforms">
        <span className="panel-label">투표처</span>

        <div className="platform-grid-compact">
          {platforms.map((platform) => {
            const missing = missingIcons[platform];
            const label = PLATFORM_LABELS?.[platform] ?? platform;

            return (
              <span
                key={`${vote.id}-${platform}`}
                className="platform-pill"
                title={label}
              >
                <span className="compact-icon" aria-hidden>
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

                <span className="platform-name">{label}</span>
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
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          </div>

          <div className="panel-footer">
            <div className="panel-info">
              <span className="panel-label">기간</span>

              {/* ✅ 기간: ref + fontSize 연결 */}
              <span className="panel-value date-text-fit" ref={periodFit.containerRef}>
                <span
                  className="fit-text"
                  ref={periodFit.textRef}
                  style={{ fontSize: `${periodFit.fontSize}px` }}
                >
                  {periodText}
                </span>
              </span>
            </div>

            {vote.note && (
              <div className="panel-info note">
                <span className="panel-label text-accent">리워드</span>

                {/* ✅ 리워드: ref + fontSize 연결 */}
                <span className="panel-value note-text-fit" ref={rewardFit.containerRef}>
                  <span
                    className="fit-text"
                    ref={rewardFit.textRef}
                    style={{ fontSize: `${rewardFit.fontSize}px` }}
                  >
                    {vote.note}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
