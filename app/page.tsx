"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import LiveCard from "../components/LiveCard";
import MemberChip from "../components/MemberChip";
import MelonPlaylist from "../components/MelonPlaylist";

type MemberStatus = {
  id: string; name: string; soopUrl: string; avatarUrl: string;
  isLive: boolean; liveUrl: string | null; title: string | null;
  thumbUrl: string | null; tags: string[]; fetchedAt: string;
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
  { id: "cafe", label: "팬카페", href: "https://cafe.naver.com/moomoo", icon: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4h3.6l4.4 7V4h3v16h-3.6l-4.4-7v7h-3V4z" fill="currentColor"/></svg>) },
  { id: "youtube", label: "YouTube", href: "https://www.youtube.com/@HADES_offi", icon: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.7c-.2-.9-.9-1.6-1.8-1.8C18.2 5.5 12 5.5 12 5.5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 9.3 2 12 2 12s0 2.7.4 4.3c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.3.4-4.3s0-2.7-.4-4.3z" fill="currentColor"/><path d="M10 15.5V8.5L16 12l-6 3.5z" fill="var(--bg)"/></svg>) },
  { id: "instagram", label: "Instagram", href: "https://www.instagram.com/hades_offi/", icon: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zm5 5.3a3.7 3.7 0 100 7.4 3.7 3.7 0 000-7.4zm6.1-.8a1 1 0 100 2 1 1 0 000-2z" fill="currentColor"/></svg>) },
  { id: "x", label: "X", href: "https://x.com/hades_offi", icon: (<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h4.7l4.3 5.8L18.3 4H22l-6.3 7.7L22 20h-4.7l-4.6-6.1L6.2 20H2.5l6.7-8.1L4 4z" fill="currentColor"/></svg>) },
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

/* (FIX #4) PC 전용 라이브 그리드 스크롤 버튼 래퍼 */
function LiveGridWrapper({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowLeft(el.scrollLeft > 10);
    setShowRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", checkScroll); ro.disconnect(); };
  }, [checkScroll]);

  const scroll = useCallback((dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  }, []);

  return (
    <div className="live-grid-wrapper">
      {showLeft && (
        <button className="live-scroll-btn left" onClick={() => scroll("left")} aria-label="이전">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
      )}
      <div className="live-grid" ref={scrollRef}>
        {children}
      </div>
      {showRight && (
        <button className="live-scroll-btn right" onClick={() => scroll("right")} aria-label="다음">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
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
      <div className="section-head"><div><p className="section-tag">YOUTUBE</p><h2>최신 영상</h2></div></div>
      <div className="empty-state"><p>영상을 불러오는 중...</p></div>
    </section>
  );

  if (videos.length === 0) return null;

  return (
    <section className="section-block">
      <div className="section-head">
        <div><p className="section-tag">YOUTUBE</p><h2>최신 영상</h2></div>
      </div>
      <div className="youtube-grid">
        {videos.map(v => (
          <a key={v.id} className="youtube-card" href={v.url} target="_blank" rel="noreferrer">
            <div className="youtube-thumb">
              <img src={v.thumbnail} alt="" loading="lazy" />
              <span className={`youtube-badge ${v.type === "shorts" ? "shorts" : ""}`}>
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
    liveMembers: members.filter(m => m.isLive),
    offlineMembers: members.filter(m => !m.isLive),
  }), [members]);

  const votePreviewItems = useMemo(() => votes.filter(isVisibleVote).slice(0, 3), [votes]);

  return (
    <main>
      {/* LIVE */}
      <section className="section-block">
        <div className="section-head page-header">
          <div><p className="section-tag">LIVE NOW</p><h2>지금 방송 중인 멤버</h2></div>
        </div>
        {/* (FIX #4) PC 스크롤 버튼이 있는 래퍼 */}
        <LiveGridWrapper>
          {isLoading && <div className="empty-state"><p>라이브 상태를 불러오는 중...</p></div>}
          {!isLoading && liveMembers.length === 0 && <div className="empty-state"><p>현재 방송 중인 멤버가 없습니다.</p></div>}
          {liveMembers.map(m => (
            <LiveCard key={m.id} name={m.name} soopUrl={m.liveUrl ?? m.soopUrl} avatarUrl={m.avatarUrl}
              coverStyle={coverStyles[m.id] ?? { background: "#1f1f1f" }} title={m.title} thumbUrl={m.thumbUrl} tags={m.tags} />
          ))}
        </LiveGridWrapper>
      </section>

      {/* OFFLINE */}
      <section className="section-block">
        <div className="section-head"><div><p className="section-tag">OFFLINE</p><h2>잠시 쉬는 중</h2></div></div>
        <div className="chip-grid">
          {offlineMembers.map(m => <MemberChip key={m.id} name={m.name} avatarUrl={m.avatarUrl} />)}
        </div>
      </section>

      {/* YOUTUBE */}
      <YouTubeSection />

      {/* VOTES */}
      <Card>
        <div className="section-head"><h2>투표 목록</h2></div>
        <div className="card-body">
          {isVotesLoading ? <div className="empty-state"><p>투표 목록을 불러오는 중...</p></div>
          : votePreviewItems.length === 0 ? <div className="empty-state"><p>진행중인 투표가 없습니다.</p></div>
          : (
            <div className="vote-preview-list">
              {votePreviewItems.map(vote => {
                const status = resolveStatus(vote.opensAt, vote.closesAt);
                return (
                  <article key={vote.id} className="vote-preview-item">
                    <VotePreviewPlatforms vote={vote} />
                    <p className="vote-preview-title">{vote.title}</p>
                    <span className="vote-status" data-status={status}>{status === "upcoming" ? "예정" : "진행중"}</span>
                    <p className="vote-preview-deadline">{formatDeadline(vote.closesAt)}</p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        <div className="section-footer"><Button href="/votes">투표 전체 보기</Button></div>
      </Card>

      {/* MELON */}
      <MelonPlaylist />

      {/* OFFICIAL LINKS */}
      <section className="section-block">
        <div className="section-head"><div><p className="section-tag">OFFICIAL</p><h2>공식 링크</h2></div></div>
        <div className="link-grid">
          {officialLinks.map(link => (
            <a key={link.id} className={`link-card link-${link.id}`} href={link.href} target="_blank" rel="noreferrer">
              <span className="link-icon" aria-hidden>{link.icon}</span>
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
