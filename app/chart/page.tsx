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

type ChartEntry = {
  rank: number; title: string; artist: string;
  albumArt: string; albumName: string;
  rankChange: "up" | "down" | "same" | "new"; changeAmount: number;
  likes?: number;
};

type ChartType = "REALTIME" | "HOT100_100" | "HOT100_30" | "DAILY" | "WEEKLY" | "MONTHLY";

type ChartSection = {
  id: ChartType;
  label: string;
};

const CHART_SECTIONS: ChartSection[] = [
  { id: "REALTIME", label: "멜론 TOP100" },
  { id: "HOT100_100", label: "멜론 HOT100 (100일)" },
  { id: "HOT100_30", label: "멜론 HOT100 (30일)" },
  { id: "DAILY", label: "멜론 일간" },
  { id: "WEEKLY", label: "멜론 주간" },
  { id: "MONTHLY", label: "멜론 월간" },
  { id: "REALTIME", label: "멜론 실시간" },
];

type SectionData = {
  entries: ChartEntry[];
  updatedAt: string | null;
  loading: boolean;
  error: string | null;
};

function formatChartDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function RankChange({ entry }: { entry: ChartEntry }) {
  if (entry.rankChange === "up") return <span className="chart-change up">↑{entry.changeAmount}</span>;
  if (entry.rankChange === "down") return <span className="chart-change down">↓{entry.changeAmount}</span>;
  if (entry.rankChange === "new") return <span className="chart-change new">NEW</span>;
  return <span className="chart-change same">-</span>;
}

function ChartSectionView({ section }: { section: ChartSection }) {
  const [data, setData] = useState<SectionData>({ entries: [], updatedAt: null, loading: true, error: null });

  useEffect(() => {
    let mounted = true;
    fetch(`/api/chart?type=${section.id}&artist=HADES`)
      .then(r => r.json())
      .then(d => { if (mounted) setData({ entries: d.entries ?? [], updatedAt: d.updatedAt ?? null, loading: false, error: null }); })
      .catch(() => { if (mounted) setData(prev => ({ ...prev, loading: false, error: "데이터를 불러올 수 없습니다." })); });
    return () => { mounted = false; };
  }, [section.id]);

  return (
    <div className="chart-section">
      <div className="chart-section-header">
        <div className="chart-section-title">
          <img src="/icons/melon.png" alt="" className="chart-melon-icon" />
          <h3>{section.label}</h3>
        </div>
        {data.updatedAt && <span className="chart-section-date">{formatChartDate(data.updatedAt)}</span>}
      </div>

      <div className="chart-table">
        <div className="chart-table-head">
          <span className="chart-col-rank">순위</span>
          <span className="chart-col-title">제목</span>
          <span className="chart-col-change">등락</span>
        </div>

        {data.loading ? (
          <div className="chart-empty-inline"><p>불러오는 중...</p></div>
        ) : data.error ? (
          <div className="chart-empty-inline"><p>{data.error}</p></div>
        ) : data.entries.length === 0 ? (
          <div className="chart-empty-inline"><p>차트 정보가 없습니다.</p></div>
        ) : (
          <div className="chart-table-body">
            {data.entries.map(entry => (
              <Link
                key={`${entry.rank}-${entry.title}`}
                href={`/chart/song/${createSongSlug(entry.title)}`}
                className="chart-row chart-row-link"
              >
                <div className="chart-col-rank">
                  <span className={`chart-rank-num ${entry.rank <= 3 ? "top" : ""}`}>{entry.rank}</span>
                </div>
                <div className="chart-col-title">
                  <div className="chart-album-art">
                    {entry.albumArt ? <img src={entry.albumArt} alt="" loading="lazy" /> : (
                      <span className="chart-art-fallback">♪</span>
                    )}
                  </div>
                  <div className="chart-song-info">
                    <span className="chart-song-name">{entry.title}</span>
                    <span className="chart-song-artist">{entry.artist}</span>
                  </div>
                </div>
                <div className="chart-col-change">
                  <RankChange entry={entry} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChartPage() {
  return (
    <main>
      <section className="section-block">
        <div className="section-head page-header">
          <div><h2>멜론 차트</h2></div>
        </div>
        <div className="chart-sections">
          {CHART_SECTIONS.map(section => (
            <ChartSectionView key={section.label} section={section} />
          ))}
        </div>
      </section>
    </main>
  );
}
