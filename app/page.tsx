"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import LiveCard from "../components/LiveCard";
import MemberChip from "../components/MemberChip";
import MelonPlaylist from "../components/MelonPlaylist";
import { parseKstDate } from "@/lib/parseKstDate";

type MemberStatus = {
  id: string; name: string; soopUrl: string; avatarUrl: string;
  isLive: boolean; liveUrl: string | null; title: string | null;
  thumbUrl: string | null; liveStartedAt: string | null; tags: string[]; fetchedAt: string;
};

type VoteItem = {
  id: string; title: string; platform: string; platformLabel: string;
  platforms?: string[]; platformLabels?: string[];
  url: string | null; opensAt?: string; closesAt?: string; note?: string;
};

type YouTubeVideo = {
  id: string; title: string; thumbnail: string; url: string;
  type: "video" | "shorts";
};

const coverStyles: Record<string, React.CSSProperties> = {
  whatcherry4: { background: "linear-gradient(135deg, #2a2a2a, #3a3a3a)" },
  singgyul: { background: "linear-gradient(135deg, #222, #333)" },
  ldrboo: { background: "linear-gradient(135deg, #1e1e1e, #2e2e2e)" },
  chaenna02: { background: "linear-gradient(135deg, #1a1a1a, #2a2a2a)" },
  kymakyma: { background: "linear-gradient(135deg, #1c1c1c, #2c2c2c)" },
  khm11903: { background: "linear-gradient(135deg, #202020, #303030)" },
};

const officialLinks = [
  { id: "cafe", label: "네이버 팬카페", href: "https://cafe.naver.com/moomoo", iconSrc: "/icons/cafe.png" },
  { id: "youtube", label: "YouTube", href: "https://www.youtube.com/@HADES_offi", iconSrc: "https://cdn.simpleicons.org/youtube/FF0000" },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/hades_offi/", iconSrc: "https://static.xx.fbcdn.net/assets/?set=help_center_about_page_illustrations&name=desktop-instagram-gradient-logo&density=1" },
  { id: "x", label: "X", href: "https://x.com/hades_offi", iconSrc: "https://cdn.simpleicons.org/x/000000", iconSrcDark: "https://upload.wikimedia.org/wikipedia/commons/5/57/X_logo_2023_%28white%29.png" },
];

function resolveStatus(opensAt?: string, closesAt?: string) {
  const now = Date.now();
  const o = parseKstDate(opensAt)?.getTime() ?? null;
  const c = parseKstDate(closesAt)?.getTime() ?? null;
  if (o && o > now) return "upcoming";
  if (c && c <= now) return "closed";
  return "open";
}

function isVisibleVote(vote: VoteItem) { return resolveStatus(vote.opensAt, vote.closesAt) !== "closed"; }

function formatDeadline(closesAt?: string) {
  if (!closesAt) return "상시 진행";
  const d = parseKstDate(closesAt);
  if (!d) return "마감 정보 없음";
  const ms = d.getTime() - Date.now();
  if (ms > 0) {
    const h = Math.floor(ms / 3600000);
    return h < 24 ? `${Math.max(h, 1)}시간 후 마감` : `${Math.floor(h / 24)}일 후 마감`;
  }
  return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
}

function VotePreviewPlatforms({ vote }: { vote: VoteItem }) {
  const [missingMap, setMissingMap] = useState<Record<string, boolean>>({});
  const platforms = (vote.platforms?.length ? vote.platforms : (vote.platform || "").replace(/[|,/]/g, " ").replace(/\s+/g, " ").trim().split(" ")).map(i => i.trim().toLowerCase()).filter(Boolean).slice(0, 5);
  return (
    <span className="vote-preview-icons" aria-hidden>
      {platforms.map(p => (
        <span key={`${vote.id}-${p}`} className="vote-preview-icon">
          {!missingMap[p] && <img src={`/icons/${p}.png`} alt="" onError={() => setMissingMap(prev => ({ ...prev, [p]: true }))} />}
          {missingMap[p] && <span className="vote-icon-fallback vote-icon-neutral" aria-hidden><span /></span>}
        </span>
      ))}
    </span>
  );
}

/* 데스크톱: 마우스 드래그, 모바일: 네이티브 터치 스크롤 */
function LiveGridDrag({ children }: { children: React.ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollButtons = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollPrev(el.scrollLeft > 4);
    setCanScrollNext(el.scrollLeft < maxScrollLeft - 4);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = viewportRef.current;
    if (!el) return;

    const handleScroll = () => updateScrollButtons();
    el.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", updateScrollButtons);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [children, updateScrollButtons]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = viewportRef.current;
    if (!el) return;
    dragging.current = true;
    didDrag.current = false;
    startX.current = e.clientX;
    startScrollLeft.current = el.scrollLeft;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || e.buttons !== 1) return;
    const el = viewportRef.current;
    if (!el) return;
    const dx = startX.current - e.clientX;
    if (Math.abs(dx) > 3) didDrag.current = true;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollLeft = Math.max(0, Math.min(maxScroll, startScrollLeft.current + dx));
  }, []);

  const handleMouseEnd = useCallback(() => {
    dragging.current = false;
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (didDrag.current) e.preventDefault();
  }, []);

  const scrollByCard = useCallback((dir: "prev" | "next") => {
    const el = viewportRef.current;
    if (!el) return;
    
    const gridEl = el.querySelector<HTMLElement>(":scope > .live-grid");
    const firstCard = gridEl?.querySelector<HTMLElement>(":scope > *") ?? null;
    const gap = gridEl ? Number.parseFloat(getComputedStyle(gridEl).columnGap || "0") || 0 : 0;
    const fallbackAmount = Math.max(280, Math.round(el.clientWidth * 0.8));
    const cardStep = firstCard ? Math.round(firstCard.getBoundingClientRect().width + gap) : fallbackAmount;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const target = dir === "next"
      ? Math.min(maxScroll, el.scrollLeft + cardStep)
      : Math.max(0, el.scrollLeft - cardStep);

    el.scrollTo({ left: target, behavior: "smooth" });

    // Safari PWA 환경에서 smooth scroll 종료 후 상태 갱신이 늦는 경우를 대비해 재확인
    requestAnimationFrame(updateScrollButtons);
    window.setTimeout(updateScrollButtons, 240);
  }, [updateScrollButtons]);

  return (
  <div className="live-grid-shell">
      <button
        type="button"
        className={`live-grid-nav live-grid-nav-prev${canScrollPrev ? "" : " is-hidden"}`}
        onClick={() => scrollByCard("prev")}
        disabled={!canScrollPrev}
        aria-label="이전 라이브 카드 보기"
      >
        ‹
      </button>

      <div
        ref={viewportRef}
        className="live-grid-viewport"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseEnd}
        onMouseLeave={handleMouseEnd}
        onClickCapture={handleClick}
      >
        <div className="live-grid">{children}</div>
      </div>

      <button
        type="button"
        className={`live-grid-nav live-grid-nav-next${canScrollNext ? "" : " is-hidden"}`}
        onClick={() => scrollByCard("next")}
        disabled={!canScrollNext}
        aria-label="다음 라이브 카드 보기"
      >
        ›
      </button>
    </div>
  );
}

function YouTubeSection() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/youtube")
      .then(r => r.json())
      .then(data => { if (mounted) setVideos(data); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  if (loading) return (
    <section className="section-block">
      <div className="section-head"><div><p className="section-tag"></p><h2>유튜브 최신 영상</h2></div></div>
      <div className="youtube-grid">
        {[0, 1].map(i => (
          <div key={i} className="youtube-card" style={{ pointerEvents: "none" }}>
            <div className="skeleton skeleton-youtube" />
            <div className="youtube-info" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div className="skeleton skeleton-text w80" />
              <div className="skeleton skeleton-text w40" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  if (videos.length === 0) return null;

  return (
    <section className="section-block">
      <div className="section-head">
        <div><p className="section-tag"></p><h2>유튜브 최신 영상</h2></div>
      </div>
      <div className="youtube-grid">
        {videos.map(v => (
          <a key={v.id} className="youtube-card" href={v.url} target="_blank" rel="noreferrer">
            <div className="youtube-thumb">
              <img src={v.thumbnail} alt="" loading="lazy" onError={e => { const t = e.currentTarget; if (t.src.includes("maxresdefault")) t.src = `https://i.ytimg.com/vi/${v.id}/sddefault.jpg`; }} />
              <span className={`youtube-type-badge ${v.type === "shorts" ? "shorts" : "video"}`}>
                {v.type === "shorts" ? "Shorts" : "Video"}
              </span>
            </div>
            <div className="youtube-info">
              <h4>{v.title}</h4>
              <p className="youtube-meta">HADES</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [isVotesLoading, setIsVotesLoading] = useState(true);

  useEffect(() => {
    let m = true;
    const f = async () => {
      try { const r = await fetch("/api/members/status"); const d = await r.json(); if (m) setMembers(d); }
      catch { if (m) setMembers([]); }
      finally { if (m) setIsLoading(false); }
    };
    f();
    const i = setInterval(f, 30_000);
    return () => { m = false; clearInterval(i); };
  }, []);

  useEffect(() => {
    let m = true;
    fetch("/api/votes").then(r => r.json()).then(d => { if (m) setVotes(d); }).catch(() => { if (m) setVotes([]); }).finally(() => { if (m) setIsVotesLoading(false); });
    return () => { m = false; };
  }, []);

  const { liveMembers, offlineMembers } = useMemo(() => ({
    liveMembers: members
      .filter(m => m.isLive)
      .sort((a, b) => {
        const aTime = a.liveStartedAt ? new Date(a.liveStartedAt).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b.liveStartedAt ? new Date(b.liveStartedAt).getTime() : Number.POSITIVE_INFINITY;
        return bTime - aTime;
      }),
    offlineMembers: members.filter(m => !m.isLive),
  }), [members]);

  const votePreviewItems = useMemo(() => votes.filter(isVisibleVote).slice(0, 3), [votes]);

  return (
    <main>
      {/* LIVE */}
      <section className="section-block">
        <div className="section-head page-header">
          <div><p className="section-tag"></p><h2>지금 방송 중인 멤버</h2></div>
        </div>
        {isLoading ? (
          <div className="skeleton-live">
            <div className="skeleton skeleton-live-cover" />
          </div>
        ) : liveMembers.length === 0 ? (
          <div className="empty-state"><p>현재 방송 중인 멤버가 없습니다.</p></div>
        ) : (
          <LiveGridDrag>
            {liveMembers.map(m => (
              <LiveCard key={m.id} name={m.name} soopUrl={m.liveUrl ?? m.soopUrl} avatarUrl={m.avatarUrl}
                coverStyle={coverStyles[m.id] ?? { background: "#1f1f1f" }} title={m.title} thumbUrl={m.thumbUrl} tags={m.tags} />
            ))}
          </LiveGridDrag>
        )}
      </section>

      {/* OFFLINE */}
      <section className="section-block section-offline">
        <div className="section-head"><div><p className="section-tag"></p><h2>잠시 쉬는 중</h2></div></div>
        {isLoading ? (
          <div className="chip-grid">
            {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton skeleton-chip" />)}
          </div>
        ) : (
          <div className="chip-grid">
            {offlineMembers.map(m => <MemberChip key={m.id} name={m.name} avatarUrl={m.avatarUrl} />)}
          </div>
        )}
      </section>

      {/* YOUTUBE */}
      <YouTubeSection />

      {/* VOTES */}
      <section className="vote-showcase">
        <img className="vote-showcase-bg" src="/icons/jump.png" alt="" />
        <div className="vote-showcase-head">
          <div>
            <p className="vote-showcase-date">{new Date().toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", weekday: "long" })} 기준</p>
            <h2 className="vote-showcase-title">투표 목록</h2>
          </div>
          <a href="/votes" className="vote-showcase-more">전체보기</a>
        </div>
        <p className="vote-showcase-desc">진행 중인 모든 투표는 ‘전체보기’를 눌러 확인해 주세요.</p>
        <div className="vote-showcase-body">
          {isVotesLoading ? (
            <div className="vote-showcase-list">
              {[0, 1, 2].map(i => (
                <div key={i} className="vote-showcase-item skeleton-vote-item">
                  <span className="skeleton skeleton-vote-rank" />
                  <span className="skeleton skeleton-vote-icon" />
                  <span className="skeleton skeleton-text" style={{ flex: 1 }} />
                  <span className="skeleton skeleton-vote-deadline" />
                </div>
              ))}
            </div>
          )
          : votePreviewItems.length === 0 ? <div className="empty-state"><p>진행중인 투표가 없습니다.</p></div>
          : (
            <div className="vote-showcase-list">
              {votePreviewItems.map((vote, idx) => (
                <a key={vote.id} href={vote.url || "/votes"} target={vote.url ? "_blank" : undefined} rel={vote.url ? "noreferrer" : undefined} className="vote-showcase-item">
                  <span className="vote-showcase-rank">{idx + 1}</span>
                  <div className="vote-showcase-main">
                    <div className="vote-showcase-title-row">
                      <VotePreviewPlatforms vote={vote} />
                      <span className="vote-showcase-label">{vote.title}</span>
                    </div>
                  </div>
                  <span className="vote-showcase-deadline">{formatDeadline(vote.closesAt)}</span>
                  <span className="vote-showcase-chevron" aria-hidden>
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* MELON */}
      <MelonPlaylist />

      {/* OFFICIAL LINKS */}
      <section className="section-block">
        <div className="section-head"><div><p className="section-tag"></p><h2>공식 링크</h2></div></div>
        <div className="link-grid">
          {officialLinks.map(link => (
            <a key={link.id} className={`link-card link-${link.id}`} href={link.href} target="_blank" rel="noreferrer">
              <div className="link-icon-wrap">
                <span className="link-icon" aria-hidden>
                  <img className={link.iconSrcDark ? "link-icon-light" : ""} src={link.iconSrc} alt="" width={16} height={16} />
                  {link.iconSrcDark && <img className="link-icon-dark" src={link.iconSrcDark} alt="" width={16} height={16} />}
                </span>
              </div>
              <span className="link-label">{link.label}</span>
              <span className="link-chevron" aria-hidden>
                <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
