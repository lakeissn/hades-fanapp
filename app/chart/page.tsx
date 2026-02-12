"use client";

import { useEffect, useState } from "react";

type ChartEntry = {
  rank: number; title: string; artist: string;
  albumArt: string; albumName: string;
  rankChange: "up" | "down" | "same" | "new"; changeAmount: number;
};

type ChartType = "REALTIME" | "HOT100_30" | "HOT100_100" | "DAILY" | "WEEKLY" | "MONTHLY";

const CHART_TABS: { id: ChartType; label: string }[] = [
  { id: "REALTIME", label: "실시간" },
  { id: "HOT100_30", label: "HOT100(30일)" },
  { id: "HOT100_100", label: "HOT100(100일)" },
  { id: "DAILY", label: "일간" },
  { id: "WEEKLY", label: "주간" },
  { id: "MONTHLY", label: "월간" },
];

export default function ChartPage() {
  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartType>("REALTIME");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchChart = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/chart?type=${chartType}&artist=HADES`);
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        if (mounted) {
          setChartData(data.entries ?? []);
          setUpdatedAt(data.updatedAt ?? null);
        }
      } catch {
        if (mounted) { setError("차트 데이터를 불러오는 데 실패했습니다."); setChartData([]); }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchChart();
    return () => { mounted = false; };
  }, [chartType]);

  return (
    <main className="chart-page">
      <section className="section-block">
        <div className="section-head page-header">
          <div>
            <p className="section-tag">CHART</p>
            <h2>멜론 차트</h2>
            <div className="chart-header-info">
              <span className="chart-platform-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 18V5l12 7-12 6z"/></svg>
                Melon
              </span>
              {updatedAt && (
                <span className="chart-updated">
                  {new Date(updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 차트 타입 탭 */}
        <div className="chart-type-tabs">
          {CHART_TABS.map(tab => (
            <button
              key={tab.id}
              className={`chart-type-tab ${chartType === tab.id ? "active" : ""}`}
              onClick={() => setChartType(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 콘텐츠 */}
        {isLoading ? (
          <div className="empty-state"><p>차트 데이터를 불러오는 중...</p></div>
        ) : error ? (
          <div className="chart-empty">
            <div style={{ fontSize: 32, marginBottom: 6 }}>📊</div>
            <p>{error}</p>
            <p style={{ fontSize: 12, marginTop: 6, color: "var(--muted)" }}>
              서버에서 멜론 차트를 가져올 수 없습니다.
            </p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="chart-empty">
            <div style={{ fontSize: 32, marginBottom: 6 }}>🔍</div>
            <p>현재 차트에서 하데스의 곡을 찾을 수 없습니다.</p>
            <p style={{ fontSize: 12, marginTop: 6, color: "var(--muted)" }}>차트 진입 시 자동으로 표시됩니다.</p>
          </div>
        ) : (
          <div className="chart-list">
            {chartData.map(entry => (
              <article key={`${entry.rank}-${entry.title}`} className="chart-entry">
                <span className={`chart-rank ${entry.rank <= 3 ? "top3" : ""}`}>{entry.rank}</span>
                <div className="chart-album-art">
                  {entry.albumArt ? <img src={entry.albumArt} alt="" /> : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎵</div>
                  )}
                </div>
                <div className="chart-song-info">
                  <span className="chart-song-title">{entry.title}</span>
                  <span className="chart-song-artist">{entry.artist}</span>
                </div>
                <span className={`chart-rank-change ${entry.rankChange}`}>
                  {entry.rankChange === "up" && `▲ ${entry.changeAmount}`}
                  {entry.rankChange === "down" && `▼ ${entry.changeAmount}`}
                  {entry.rankChange === "same" && "−"}
                  {entry.rankChange === "new" && "NEW"}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
