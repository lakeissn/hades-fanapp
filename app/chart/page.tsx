"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";

function createSongSlug(title: string): string {
  return title
    .trim()
    .replace(/[^\w\u3131-\uD79D\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 80) || "song";
}

type ChartEntry = {
  rank: number;
  title: string;
  artist: string;
  albumArt: string;
  albumName: string;
  rankChange: "up" | "down" | "same" | "new";
  changeAmount: number;
  likes?: number;
};

type ChartType = "REALTIME" | "HOT100_100" | "HOT100_30" | "DAILY" | "WEEKLY" | "MONTHLY";

const CHART_TABS: { id: ChartType; label: string }[] = [
  { id: "REALTIME", label: "TOP 100" },
  { id: "HOT100_100", label: "HOT 100일" },
  { id: "HOT100_30", label: "HOT 30일" },
  { id: "DAILY", label: "일간" },
  { id: "WEEKLY", label: "주간" },
  { id: "MONTHLY", label: "월간" },
];

function formatChartDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function RankBadge({ entry }: { entry: ChartEntry }) {
  if (entry.rankChange === "new") return <span className="cv2-badge new">N</span>;
  if (entry.rankChange === "up") return <span className="cv2-badge up">▲ {entry.changeAmount}</span>;
  if (entry.rankChange === "down") return <span className="cv2-badge down">▼ {entry.changeAmount}</span>;
  return <span className="cv2-badge same">-</span>;
}

export default function ChartPage() {
  const [activeTab, setActiveTab] = useState<ChartType>("REALTIME");
  const [entries, setEntries] = useState<ChartEntry[]>([]);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/chart?type=${activeTab}&artist=HADES`)
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setEntries(d.entries ?? []);
        setUpdatedAt(d.updatedAt ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mounted) return;
        setError("데이터를 불러올 수 없습니다.");
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [activeTab]);

  const handleTabClick = (id: ChartType) => {
    setActiveTab(id);
  };

  return (
    <main>
      <section className="section-block">
        <div className="section-head page-header">
          <div>
            <h2>차트</h2>
          </div>
        </div>

        <div className="cv2-header">
          <img src="/icons/melon.png" alt="" className="cv2-melon-icon" />
          <span className="cv2-source">Melon</span>
          {updatedAt && (
            <span className="cv2-updated">{formatChartDate(updatedAt)} 기준</span>
          )}
        </div>

        <div className="cv2-tabs-scroll" ref={tabsRef}>
          <div className="cv2-tabs">
            {CHART_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`cv2-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => handleTabClick(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="cv2-list">
          {loading ? (
            <div className="cv2-empty">
              <p>불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="cv2-empty">
              <p>{error}</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="cv2-empty">
              <p>차트에 진입한 곡이 없습니다.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <Link
                key={`${entry.rank}-${entry.title}`}
                href={`/chart/song/${createSongSlug(entry.title)}`}
                className="cv2-item"
              >
                <span
                  className={`cv2-rank ${entry.rank <= 3 ? "top" : ""}`}
                >
                  {entry.rank}
                </span>
                <div className="cv2-art">
                  {entry.albumArt ? (
                    <img src={entry.albumArt} alt="" loading="lazy" />
                  ) : (
                    <span className="cv2-art-fallback">♪</span>
                  )}
                </div>
                <div className="cv2-info">
                  <span className="cv2-title">{entry.title}</span>
                  <span className="cv2-artist">{entry.artist}</span>
                </div>
                <RankBadge entry={entry} />
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
