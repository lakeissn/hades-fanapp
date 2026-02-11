"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "../components/Button";
import Card from "../components/Card";
import LiveCard from "../components/LiveCard";
import MemberChip from "../components/MemberChip";
import MelonPlaylist from "../components/MelonPlaylist";

const guideCategories = [
  { id: "streaming", label: "스트리밍 가이드", href: "/guides/streaming" },
  { id: "gift", label: "선물하기", href: "/guides/gift" },
  { id: "download", label: "다운로드", href: "/guides/download" },
];

type MemberStatus = {
  id: string;
  name: string;
  soopUrl: string;
  avatarUrl: string;
  isLive: boolean;
  liveUrl: string | null;
  title: string | null;
  thumbUrl: string | null;
  tags: string[];
  fetchedAt: string;
};

type VoteItem = {
  id: string;
  title: string;
  platform: string;
  platformLabel: string;
  platforms?: string[];
  platformLabels?: string[];
  url: string | null;
  opensAt?: string;
  closesAt?: string;
  note?: string;
};

const coverStyles: Record<string, React.CSSProperties> = {
  whatcherry4: { background: "linear-gradient(135deg, #3a1c71, #d76d77)" },
  singgyul: { background: "linear-gradient(135deg, #1d4350, #a43931)" },
  ldrboo: { background: "linear-gradient(135deg, #42275a, #734b6d)" },
  chaenna02: { background: "linear-gradient(135deg, #16222a, #3a6073)" },
  kymakyma: { background: "linear-gradient(135deg, #141e30, #243b55)" },
  khm11903: { background: "linear-gradient(135deg, #2c3e50, #4ca1af)" },
};

const officialLinks = [
  {
    id: "cafe",
    label: "팬카페",
    href: "https://cafe.naver.com/moomoo",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M6.5 4h3.6l4.4 7V4h3v16h-3.6l-4.4-7v7h-3V4z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/@HADES_offi",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M21.6 7.7c-.2-.9-.9-1.6-1.8-1.8C18.2 5.5 12 5.5 12 5.5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 9.3 2 12 2 12s0 2.7.4 4.3c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.3.4-4.3s0-2.7-.4-4.3z"
          fill="currentColor"
        />
        <path d="M10 15.5V8.5L16 12l-6 3.5z" fill="#0b0b14" />
      </svg>
    ),
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/hades_offi/",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zm5 5.3a3.7 3.7 0 1 0 0 7.4 3.7 3.7 0 0 0 0-7.4zm6.1-.8a1 1 0 1 0 0 2 1 1 0 0 0 0-2z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "x",
    label: "X",
    href: "https://x.com/hades_offi",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M4 4h4.7l4.3 5.8L18.3 4H22l-6.3 7.7L22 20h-4.7l-4.6-6.1L6.2 20H2.5l6.7-8.1L4 4z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

function parseKstDate(value?: string) {
  if (!value) return null;
  const raw = value.trim();
  if (!raw || raw.replace(/\s+/g, "") === "진행중") return null;

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

function resolveStatus(opensAt?: string, closesAt?: string) {
  const now = Date.now();
  const openTime = parseKstDate(opensAt)?.getTime() ?? null;
  const closeTime = parseKstDate(closesAt)?.getTime() ?? null;

  if (openTime && openTime > now) return "upcoming";
  if (closeTime && closeTime <= now) return "closed";
  return "open";
}

function isVisibleVote(vote: VoteItem) {
  return resolveStatus(vote.opensAt, vote.closesAt) !== "closed";
}

function formatDeadline(closesAt?: string) {
  if (!closesAt) return "상시 진행";
  const closeDate = parseKstDate(closesAt);
  if (!closeDate) return "마감 정보 없음";

  const remainingMs = closeDate.getTime() - Date.now();
  if (remainingMs > 0) {
    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    if (hours < 24) return `${Math.max(hours, 1)}시간 후 마감`;
    return `${Math.floor(hours / 24)}일 후 마감`;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(closeDate);
}

function VotePreviewPlatforms({ vote }: { vote: VoteItem }) {
  const [missingMap, setMissingMap] = useState<Record<string, boolean>>({});
  const platforms = (
    vote.platforms?.length
      ? vote.platforms
      : (vote.platform || "").replace(/[|,/]/g, " ").replace(/\s+/g, " ").trim().split(" ")
  )
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);

  return (
    <span className="vote-preview-icons" aria-hidden>
      {platforms.map((platform) => (
        <span key={`${vote.id}-${platform}`} className="vote-preview-icon">
          {!missingMap[platform] && (
            <img
              src={`/icons/${platform}.png`}
              alt=""
              onError={() => setMissingMap((prev) => ({ ...prev, [platform]: true }))}
            />
          )}
          {missingMap[platform] && (
            <span className="vote-icon-fallback vote-icon-neutral" aria-hidden>
              <span />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

export default function HomePage() {
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [votes, setVotes] = useState<VoteItem[]>([]);
  const [isVotesLoading, setIsVotesLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchMembers = async () => {
      try {
        const response = await fetch("/api/members/status");
        const data = (await response.json()) as MemberStatus[];
        if (isMounted) setMembers(data);
      } catch {
        if (isMounted) setMembers([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchMembers();
    const interval = setInterval(fetchMembers, 30_000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchVotes = async () => {
      try {
        const response = await fetch("/api/votes");
        const data = (await response.json()) as VoteItem[];
        if (isMounted) setVotes(data);
      } catch {
        if (isMounted) setVotes([]);
      } finally {
        if (isMounted) setIsVotesLoading(false);
      }
    };

    fetchVotes();
    return () => {
      isMounted = false;
    };
  }, []);

  const { liveMembers, offlineMembers } = useMemo(() => {
    const live = members.filter((member) => member.isLive);
    const offline = members.filter((member) => !member.isLive);
    return { liveMembers: live, offlineMembers: offline };
  }, [members]);

  const votePreviewItems = useMemo(() => votes.filter(isVisibleVote).slice(0, 3), [votes]);

  return (
    <main>
      <section className="section-block">
        <div className="section-head page-header">
          <div>
            <p className="section-tag">LIVE NOW</p>
            <h2>지금 방송 중인 멤버</h2>
          </div>
        </div>
        <div className="live-grid">
          {isLoading && (
            <div className="empty-state">
              <p>라이브 상태를 불러오는 중...</p>
            </div>
          )}
          {!isLoading && liveMembers.length === 0 && (
            <div className="empty-state">
              <p>현재 방송 중인 멤버가 없습니다.</p>
            </div>
          )}
          {liveMembers.map((member) => (
            <LiveCard
              key={member.id}
              name={member.name}
              soopUrl={member.liveUrl ?? member.soopUrl}
              avatarUrl={member.avatarUrl}
              coverStyle={coverStyles[member.id] ?? { background: "#1f1f2f" }}
              title={member.title}
              thumbUrl={member.thumbUrl}
              tags={member.tags.length}
            />
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div>
            <p className="section-tag">OFFLINE</p>
            <h2>잠시 쉬는 중</h2>
          </div>
        </div>
        <div className="chip-grid">
          {offlineMembers.map((member) => (
            <MemberChip key={member.id} name={member.name} avatarUrl={member.avatarUrl} />
          ))}
        </div>
      </section>

      <Card>
        <div className="section-head">
          <h2>투표 목록</h2>
        </div>
        <div className="card-body">
          {isVotesLoading ? (
            <div className="empty-state">
              <p>투표 목록을 불러오는 중...</p>
            </div>
          ) : votePreviewItems.length === 0 ? (
            <div className="empty-state">
              <p>진행중인 투표가 없습니다.</p>
            </div>
          ) : (
            <div className="vote-preview-list">
              {votePreviewItems.map((vote) => {
                const status = resolveStatus(vote.opensAt, vote.closesAt);
                return (
                  <article key={vote.id} className="vote-preview-item">
                    <VotePreviewPlatforms vote={vote} />
                    <p className="vote-preview-title">{vote.title}</p>
                    <span className="vote-status" data-status={status}>
                      {status === "upcoming" ? "예정" : "진행중"}
                    </span>
                    <p className="vote-preview-deadline">{formatDeadline(vote.closesAt)}</p>
                  </article>
                );
              })}
            </div>
          )}
        </div>
        <div className="section-footer">
          <Button href="/votes">투표 전체 보기</Button>
        </div>
      </Card>

      {/* ✅ Melon One-Click Section (투표 목록 아래로 이동) */}
      <MelonPlaylist />

      <Card>
        <div className="section-head">
          <h2>가이드 카테고리</h2>
        </div>
        <div className="card-body">
          <div className="chip-row">
            {guideCategories.map((category) => (
              <Button key={category.id} href={category.href}>
                {category.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <section className="section-block">
        <div className="section-head">
          <div>
            <p className="section-tag">OFFICIAL</p>
            <h2>공식 링크</h2>
          </div>
        </div>
        <div className="link-grid">
          {officialLinks.map((link) => (
            <a
              key={link.id}
              className={`link-card link-${link.id}`}
              href={link.href}
              target="_blank"
              rel="noreferrer"
            >
              <span className="link-icon" aria-hidden>
                {link.icon}
              </span>
              <span className="link-label">{link.label}</span>
              <span className="link-chevron" aria-hidden>
                <svg viewBox="0 0 24 24">
                  <path
                    d="M9 6l6 6-6 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
