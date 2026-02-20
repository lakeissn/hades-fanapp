"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function createSongSlug(title: string): string {
  return title
    .trim()
    .replace(/[^\w\u3131-\uD79D\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 80) || "song";
}

function normalizeSlug(s: string): string {
  try {
    return decodeURIComponent(s).trim().toLowerCase();
  } catch {
    return s.trim().toLowerCase();
  }
}

function slugsMatch(entryTitle: string, urlSlug: string): boolean {
  const fromTitle = createSongSlug(entryTitle);
  const normalized = normalizeSlug(urlSlug);
  if (fromTitle === normalized) return true;
  const key = (s: string) => s.replace(/-/g, "").replace(/\s/g, "");
  if (key(fromTitle) === key(normalized)) return true;
  return false;
}

type ChartEntry = {
  rank: number;
  title: string;
  artist: string;
  albumArt: string;
  albumName: string;
};

/** Mock 곡 상세 데이터 */
const MOCK_SONG_DETAIL = {
  title: "404 (New Era)",
  artist: "KiiiKiii (키키)",
  albumArt: "/icons/할로윈_띵귤1_final.png",
  detailUrl: "https://www.melon.com/song/detail.htm?songId=1",
  album: "Delulu Pack",
  releaseDate: "2026.01.26 18:00:00",
  length: "3:00",
  lyrics: ["Omega Sapien"],
  composition: ["Hayden Chapman", "Greg Bonnick", "Ellen Berg", "Moa 'Cazzi Opeia' Carlebecker"],
  arrangement: ["LDN NOISE"],
  genres: ["Dance", "댄스", "아이돌 여자", "아이돌", "아이돌 댄스", "댄스 20"],
  chartRecords: [
    { chart: "TOP100", rank: 6, spark: [25, 18, 22, 12, 8, 6, 6, 8, 10, 8, 7, 6] },
    { chart: "HOT100", rank: 2, spark: [45, 28, 12, 5, 3, 2, 2, 4, 6, 5, 4, 2] },
    { chart: "실시간", rank: 2, spark: [50, 35, 18, 8, 4, 2, 2, 5, 7, 6, 5, 2] },
  ],
};

/** Mock 이전 순위 히스토리: date -> hour -> rank (1-100) */
function getMockRankHistory(): Record<string, Record<number, number>> {
  const data: Record<string, Record<number, number>> = {};
  const startDate = new Date("2026-01-28");
  for (let d = 0; d < 21; d++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + d);
    const key = date.toISOString().slice(0, 10).replace(/-/g, "");
    data[key] = {};
    for (let h = 0; h < 24; h++) {
      const dayProgress = d + h / 24;
      if (dayProgress < 0.1) data[key][h] = h === 23 ? 100 : 0;
      else if (dayProgress < 2) data[key][h] = Math.max(1, 100 - Math.floor(dayProgress * 35));
      else if (dayProgress < 5) data[key][h] = Math.max(1, 35 - Math.floor((dayProgress - 2) * 10));
      else if (dayProgress < 9) data[key][h] = Math.max(1, 5 - Math.floor((dayProgress - 5) * 1));
      else data[key][h] = 1;
    }
  }
  return data;
}

const MOCK_RANK_HISTORY = getMockRankHistory();

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 48;
  const w = 100;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => {
    const y = 6 + ((v - min) / range) * (h - 12);
    return [i * step, y];
  });
  const linePoints = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const areaPoints = `0,${h} ${linePoints} ${w},${h}`;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" fill="none" className="chart-sparkline">
      <polygon points={areaPoints} fill="rgba(20,184,166,0.32)" />
      <polyline
        points={linePoints}
        stroke="#14b8a6"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function getRankColor(rank: number): string {
  if (rank === 0) return "transparent";
  if (rank === 1) return "#facc15";
  if (rank <= 9) return "#f97316";
  if (rank <= 30) return "#a3e635";
  if (rank <= 60) return "#22d3ee";
  if (rank <= 90) return "#3b82f6";
  return "#1e293b";
}

export default function SongDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;
  const [realSong, setRealSong] = useState<ChartEntry | null>(null);

  useEffect(() => {
    let mounted = true;
    const types = ["HOT100_100", "HOT100_30", "REALTIME", "DAILY", "WEEKLY"];
    const tryFetch = async () => {
      for (const type of types) {
        try {
          const res = await fetch(`/api/chart?type=${type}&artist=HADES`);
          const data = await res.json();
          const entries: ChartEntry[] = data.entries ?? [];
          const found = entries.find((e) => slugsMatch(e.title, slug));
          if (found && mounted) {
            setRealSong(found);
            return;
          }
        } catch {
          // continue to next type
        }
      }
      for (const type of types) {
        try {
          const res = await fetch(`/api/chart?type=${type}`);
          const data = await res.json();
          const entries: ChartEntry[] = data.entries ?? [];
          const found = entries.find((e) => slugsMatch(e.title, slug));
          if (found && mounted) {
            setRealSong(found);
            return;
          }
        } catch {
          // continue to next type
        }
      }
    };
    tryFetch();
    return () => { mounted = false; };
  }, [slug]);

  const song = {
    ...MOCK_SONG_DETAIL,
    title: realSong?.title ?? MOCK_SONG_DETAIL.title,
    artist: realSong?.artist ?? MOCK_SONG_DETAIL.artist,
    albumArt: realSong?.albumArt || MOCK_SONG_DETAIL.albumArt,
    album: realSong?.albumName ?? MOCK_SONG_DETAIL.album,
  };
  const rankHistory = MOCK_RANK_HISTORY;
  const dates = Object.keys(rankHistory).sort();
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <main className="song-detail-page">
      <Link href="/chart" className="song-detail-back">
        ← 차트로 돌아가기
      </Link>
      <div className="song-detail-dev-notice">
        현재 개발중인 서비스입니다.
      </div>

      {/* 임시: 콘텐츠 숨김 */}
      <div className="song-detail-content-hidden" aria-hidden>
      {/* 곡 상세 정보 - 이미지 카드 */}
      <section className="song-detail-hero">
        <div
          className="song-detail-hero-bg"
          style={{ backgroundImage: `url(${song.albumArt})` }}
          aria-hidden
        />
        <div className="song-detail-hero-overlay" aria-hidden />
        <div className="song-detail-hero-content">
          <div className="song-detail-hero-art">
            <img src={song.albumArt} alt="" />
          </div>
          <div className="song-detail-meta">
            <h1 className="song-detail-title">{song.title}</h1>
            <p className="song-detail-artist">{song.artist}</p>
            <dl className="song-detail-dl">
              <div><dt>앨범</dt><dd>{song.album}</dd></div>
              <div><dt>발매일</dt><dd>{song.releaseDate}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {/* 멜론 차트 최고 성적 */}
      <section className="song-chart-section">
        <div className="song-chart-header">
          <div className="song-chart-header-left">
            <h2 className="song-chart-title">{song.title}의 멜론 차트 최고 성적</h2>
          </div>
        </div>
        <div className="song-chart-cards-row">
          {song.chartRecords.map((rec) => (
            <div key={rec.chart} className="song-chart-card">
              <div className="song-chart-card-text">
                <span className="song-chart-card-name">{rec.chart}</span>
                <span className="song-chart-card-rank">{rec.rank}위</span>
              </div>
              <div className="song-chart-card-graph">
                <Sparkline data={rec.spark} />
              </div>
              <div className="song-chart-card-gradient" aria-hidden />
            </div>
          ))}
        </div>
        <div className="song-chart-graphs-hidden">
          {song.chartRecords.map((rec) => (
            <div key={rec.chart} className="song-chart-graph-item">
              <span className="song-chart-graph-label">{rec.chart}</span>
              <Sparkline data={rec.spark} />
            </div>
          ))}
        </div>
      </section>

      {/* 이전 순위 기록 (히트맵) */}
      <section className="song-detail-section">
        <h2 className="song-detail-section-title">이전 순위 기록</h2>
        <div className="song-rank-heatmap-wrap">
          <div className="song-rank-heatmap">
            <div className="song-rank-heatmap-header">
              <span className="song-rank-heatmap-corner">날짜/시</span>
              {hours.map((h) => (
                <span key={h} className="song-rank-heatmap-hour">{h}</span>
              ))}
            </div>
            {dates.map((dateStr) => {
              const y = parseInt(dateStr.slice(0, 4), 10);
              const m = parseInt(dateStr.slice(4, 6), 10) - 1;
              const d = parseInt(dateStr.slice(6, 8), 10);
              const day = new Date(y, m, d).getDay();
              const dateColor = day === 0 ? "#ef4444" : day === 6 ? "#3b82f6" : undefined;
              return (
              <div key={dateStr} className="song-rank-heatmap-row">
                <span
                  className="song-rank-heatmap-date"
                  style={dateColor ? { color: dateColor } : undefined}
                >
                  {dateStr.slice(0, 4)}.{dateStr.slice(4, 6)}.{dateStr.slice(6, 8)}
                </span>
                {hours.map((h) => {
                  const rank = rankHistory[dateStr]?.[h] ?? 0;
                  const color = getRankColor(rank);
                  const isLight = rank <= 9;
                  const isEmpty = rank === 0;
                  return (
                    <span
                      key={h}
                      className={`song-rank-heatmap-cell${isEmpty ? " song-rank-heatmap-cell-empty" : ""}`}
                      style={!isEmpty ? {
                        background: color,
                        color: isLight ? "#1a1a1a" : "#fff",
                      } : undefined}
                      title={`${dateStr} ${h}시: ${rank || "-"}위`}
                    >
                      {rank > 0 ? rank : ""}
                    </span>
                  );
                })}
              </div>
            );
            })}
          </div>
        </div>
      </section>
      </div>
    </main>
  );
}
