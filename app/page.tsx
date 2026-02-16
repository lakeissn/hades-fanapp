"use client";

import { Children, useEffect, useMemo, useState, useRef, useCallback } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import LiveCard from "../components/LiveCard";
import MemberChip from "../components/MemberChip";
import MelonPlaylist from "../components/MelonPlaylist";

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

function parseKstDate(value?: string) {
  if (!value) return null;
  const raw = value.trim();
  if (!raw || raw.replace(/\s+/g, "") === "진행중") return null;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;
  const norm = raw.replace(/\./g, "-").replace(/\//g, "-").replace(/\s+/g, " ").trim();
  const ws = /\d{2}:\d{2}:\d{2}$/.test(norm) ? norm : /\d{2}:\d{2}$/.test(norm) ? `${norm}:00` : `${norm} 00:00:00`;
  const p = new Date(`${ws.replace(" ", "T")}+09:00`);
  return Number.isNaN(p.getTime()) ? null : p;
}

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

/* 라이브 캐러셀 */
const AUTOPLAY_MS = 5000;

function LiveCarousel({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = Children.toArray(children);
  const total = items.length;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    if (total <= 1) return;
    resetTimer();
    timerRef.current = setTimeout(() => {
      setCurrent(prev => (prev + 1) % total);
      setIsTransitioning(true);
    }, AUTOPLAY_MS);
  }, [total, resetTimer]);

  useEffect(() => {
    startTimer();
    return resetTimer;
  }, [current, startTimer, resetTimer]);

  const goTo = useCallback((i: number) => {
    setCurrent(((i % total) + total) % total);
    setIsTransitioning(true);
  }, [total]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsTransitioning(false);
    setDragOffset(0);
    resetTimer();
  }, [resetTimer]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const delta = e.touches[0].clientX - touchStartX.current;
    if ((current === 0 && delta > 0) || (current === total - 1 && delta < 0)) {
      setDragOffset(delta * 0.3);
    } else {
      setDragOffset(delta);
    }
  }, [current, total]);

  const handleTouchEnd = useCallback(() => {
    setIsTransitioning(true);
    if (Math.abs(dragOffset) > 50) {
      if (dragOffset < 0 && current < total - 1) setCurrent(current + 1);
      else if (dragOffset > 0 && current > 0) setCurrent(current - 1);
    }
    setDragOffset(0);
  }, [dragOffset, current, total]);

  if (total === 0) return null;

  return (
    <div className="live-carousel">
      <div
        className="live-carousel-viewport"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="live-carousel-track"
          style={{
            transform: `translateX(calc(-${current * 100}% + ${dragOffset}px))`,
            transition: isTransitioning ? 'transform 0.4s cubic-bezier(0.16,1,0.3,1)' : 'none',
          }}
        >
          {items.map((child, i) => (
            <div key={i} className="live-carousel-slide">{child}</div>
          ))}
        </div>
      </div>
      {total > 1 && (
        <>
          <button className="live-carousel-btn left" onClick={() => goTo(current - 1)} aria-label="이전">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
          <button className="live-carousel-btn right" onClick={() => goTo(current + 1)} aria-label="다음">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>
          </button>
          <div className="live-carousel-dots">
            {items.map((_, i) => (
              <button key={i} className={`live-carousel-dot${i === current ? ' active' : ''}`} onClick={() => goTo(i)} aria-label={`슬라이드 ${i + 1}`} />
            ))}
          </div>
        </>
      )}
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
              <img src={v.thumbnail} alt="" loading="lazy" />
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
          <LiveCarousel>
            {liveMembers.map(m => (
              <LiveCard key={m.id} name={m.name} soopUrl={m.liveUrl ?? m.soopUrl} avatarUrl={m.avatarUrl}
                coverStyle={coverStyles[m.id] ?? { background: "#1f1f1f" }} title={m.title} thumbUrl={m.thumbUrl} tags={m.tags} />
            ))}
          </LiveCarousel>
        )}
      </section>

      {/* OFFLINE */}
      <section className="section-block">
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
      <section className="vote-card">
        <div className="vote-card-header">
          <img className="vote-card-header-bg" src="/icons/할로윈_띵귤1_final.png" alt="" />
          <div className="vote-card-header-content">
            <div className="vote-card-header-top">
              <p className="vote-card-date">{new Date().toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit", weekday: "long" })} 기준</p>
              <a href="/votes" className="vote-card-more">전체보기 &rsaquo;</a>
            </div>
            <h2 className="vote-card-title">투표 목록</h2>
          </div>
        </div>
        <div className="vote-card-body">
          {isVotesLoading ? (
            <div className="vote-todo-list">
              {[0, 1, 2].map(i => (
                <div key={i} className="vote-todo-item skeleton-vote-item">
                  <span className="skeleton skeleton-vote-num" />
                  <span className="skeleton skeleton-vote-icon" />
                  <span className="skeleton skeleton-text" style={{ flex: 1 }} />
                  <span className="skeleton skeleton-vote-deadline" />
                </div>
              ))}
            </div>
          )
          : votePreviewItems.length === 0 ? <div className="empty-state"><p>진행중인 투표가 없습니다.</p></div>
          : (
            <div className="vote-todo-list">
              {votePreviewItems.map((vote, idx) => (
                <a key={vote.id} href={vote.url || "/votes"} target={vote.url ? "_blank" : undefined} rel={vote.url ? "noreferrer" : undefined} className="vote-todo-item">
                  <span className="vote-todo-num">{idx + 1}</span>
                  <VotePreviewPlatforms vote={vote} />
                  <span className="vote-todo-title">{vote.title}</span>
                  <span className="vote-todo-deadline">{formatDeadline(vote.closesAt)}</span>
                  <span className="vote-todo-chevron" aria-hidden>
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
