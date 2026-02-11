"use client";

import { useEffect, useState } from "react";

type ChartEntry = {
  rank: number;
  title: string;
  artist: string;
  albumArt: string;
  albumName: string;
  rankChange: "up" | "down" | "same" | "new";
  changeAmount: number;
};

type ChartType = "TOP100" | "HOT100" | "REALTIME";

const CHART_LABELS: Record<ChartType, string> = {
  TOP100: "TOP 100",
  HOT100: "HOT 100",
  REALTIME: "실시간",
};

export default function ChartPage() {
  const [chartData, setChartData] = useState<ChartEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartType>("TOP100");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchChart = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/chart?type=${chartType}&artist=하데스`);
        if (!response.ok) throw new Error("차트 데이터를 불러오지 못했습니다.");
        const data = await response.json();
        if (isMounted) {
          setChartData(data.entries ?? []);
          setUpdatedAt(data.updatedAt ?? null);
        }
      } catch (err) {
        if (isMounted) {
          setError("차트 데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
          setChartData([]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchChart();
    return () => { isMounted = false; };
  }, [chartType]);

  return (
    <main className="chart-page">
      <section className="section-block">
        <div className="section-head page-header">
          <div>
            <p className="section-tag">CHART</p>
            <h2>멜론 차트 순위</h2>
            <div className="chart-header-info">
              <span className="chart-platform-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 18V5l12 7-12 6z" />
                </svg>
                Melon
              </span>
              {updatedAt && (
                <span className="chart-updated">
                  업데이트: {new Date(updatedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="chart-type-tabs">
          {(Object.keys(CHART_LABELS) as ChartType[]).map((type) => (
            <button
              key={type}
              className={`chart-type-tab ${chartType === type ? "active" : ""}`}
              onClick={() => setChartType(type)}
            >
              {CHART_LABELS[type]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="empty-state">
            <p>차트 데이터를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="chart-empty">
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>📊</div>
            <p>{error}</p>
            <p style={{ fontSize: "13px", marginTop: "8px", color: "var(--muted)" }}>
              차트 API가 설정되지 않았거나, 서버에서 멜론 차트를 가져올 수 없습니다.
            </p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="chart-empty">
            <div style={{ fontSize: "36px", marginBottom: "8px" }}>🔍</div>
            <p>현재 차트에서 하데스의 곡을 찾을 수 없습니다.</p>
            <p style={{ fontSize: "13px", marginTop: "8px", color: "var(--muted)" }}>
              차트 진입 시 자동으로 표시됩니다.
            </p>
          </div>
        ) : (
          <div className="chart-list">
            {chartData.map((entry) => (
              <article key={`${entry.rank}-${entry.title}`} className="chart-entry">
                <span className={`chart-rank ${entry.rank <= 3 ? "top3" : ""}`}>
                  {entry.rank}
                </span>
                <div className="chart-album-art">
                  {entry.albumArt ? (
                    <img src={entry.albumArt} alt="" />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>
                      🎵
                    </div>
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
