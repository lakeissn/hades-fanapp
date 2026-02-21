"use client";

import { useState, useEffect, useMemo } from "react";
import { Music, ChevronDown } from "lucide-react";

type Song = { title: string; duration: string };

type Album = {
  title: string;
  artist: string;
  releaseDate: string;
  songs: Song[];
};

const SPLINE_URL = "";

const ALBUMS: Album[] = [
  {
    title: "MEGA PIECE HARMONY",
    artist: "tripleS",
    releaseDate: "2025-01-10T18:00:00+09:00",
    songs: [
      { title: "MEGA PIECE HARMONY", duration: "3:24" },
      { title: "Flower Garden", duration: "3:12" },
    ],
  },
  {
    title: "두번째 지구",
    artist: "tripleS",
    releaseDate: "2024-11-15T18:00:00+09:00",
    songs: [
      { title: "Girls Never Die", duration: "3:18" },
      { title: "Some Nights", duration: "3:35" },
    ],
  },
];

function parseDuration(dur: string) {
  const [m, s] = dur.split(":").map(Number);
  return m * 60 + s;
}

function getPlaylistSec(songs: Song[]) {
  return songs.reduce((acc, s) => acc + parseDuration(s.duration), 0);
}

function useRealtimeCount(start: Date, cycleSec: number) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (cycleSec <= 0) return;
    const calc = () => {
      const elapsed = Math.max(0, Date.now() - start.getTime());
      return Math.floor(elapsed / (cycleSec * 1000));
    };
    setCount(calc());
    const id = setInterval(() => setCount(calc()), 1000);
    return () => clearInterval(id);
  }, [start, cycleSec]);

  return count;
}

function FlipDigits({ value }: { value: number }) {
  const digits =
    value.toString().length < 4
      ? value.toString().padStart(4, "0").split("")
      : value.toString().split("");

  return (
    <div className="sc-flip-row">
      <span className="sc-flip-prefix">현재</span>
      {digits.map((d, i) => (
        <span key={i} className="sc-flip-box">
          {d}
        </span>
      ))}
      <span className="sc-flip-suffix">회</span>
    </div>
  );
}

function formatKST(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}:${min} KST 기준`;
}

function DateSelect({
  value,
  options,
  suffix,
  onChange,
}: {
  value: number;
  options: number[];
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="sc-date-field">
      <select
        className="sc-date-select"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span className="sc-date-suffix">{suffix}</span>
      <ChevronDown size={14} className="sc-date-chevron" />
    </label>
  );
}

const YEARS = Array.from({ length: 5 }, (_, i) => 2024 + i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function StreamingCalcPage() {
  const [albumIdx, setAlbumIdx] = useState(0);
  const album = ALBUMS[albumIdx];
  const releaseDate = useMemo(
    () => new Date(album.releaseDate),
    [album.releaseDate]
  );
  const playlistSec = useMemo(
    () => getPlaylistSec(album.songs),
    [album.songs]
  );

  const [customYear, setCustomYear] = useState(2026);
  const [customMonth, setCustomMonth] = useState(1);
  const [customDay, setCustomDay] = useState(1);
  const [customHour, setCustomHour] = useState(0);

  const customDate = useMemo(
    () => new Date(customYear, customMonth - 1, customDay, customHour),
    [customYear, customMonth, customDay, customHour]
  );

  const releaseCount = useRealtimeCount(releaseDate, playlistSec);
  const customCount = useRealtimeCount(customDate, playlistSec);

  const [nowStr, setNowStr] = useState("");
  useEffect(() => {
    const update = () => setNowStr(formatKST(new Date()));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  const releaseDateStr = useMemo(() => {
    const d = releaseDate;
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:00 (KST)`;
  }, [releaseDate]);

  return (
    <main>
      <section className="section-block sc-page">
        <div className="sc-split">
          <div className="sc-left">
            {SPLINE_URL ? (
              <iframe
                src={SPLINE_URL}
                className="sc-spline-iframe"
                title="LDPlayer 3D"
              />
            ) : (
              <div className="sc-left-visual">
                <div className="sc-left-orb sc-orb-1" />
                <div className="sc-left-orb sc-orb-2" />
                <div className="sc-left-orb sc-orb-3" />
                <div className="sc-left-content">
                  <div className="sc-left-icon">
                    <Music size={44} strokeWidth={1.5} />
                  </div>
                  <h1 className="sc-left-title">
                    스밍
                    <br />
                    계산기
                  </h1>
                  <p className="sc-left-sub">
                    LDPlayer 스트리밍 횟수를
                    <br />
                    실시간으로 계산합니다
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="sc-right">
            <div className="sc-album-tabs">
              {ALBUMS.map((a, i) => (
                <button
                  key={a.title}
                  className={`sc-album-tab${i === albumIdx ? " active" : ""}`}
                  onClick={() => setAlbumIdx(i)}
                >
                  {a.title}
                </button>
              ))}
            </div>

            <div className="sc-info-block">
              <h2 className="sc-info-title">{album.title}</h2>
              <p className="sc-info-artist">{album.artist}</p>
              <p className="sc-info-release">발매일 {releaseDateStr}</p>
              <p className="sc-info-note">* 공개된 권장 스트리밍 리스트 기준</p>
            </div>

            <div className="sc-dark-card">
              <p className="sc-dark-heading">
                🚀 발매일부터 멈추지 않았다면?
              </p>
              <FlipDigits value={releaseCount} />
              <p className="sc-dark-timestamp">{nowStr}</p>
            </div>

            <div className="sc-dark-card">
              <p className="sc-dark-heading">
                🚀 스밍을 늦게 시작했다면?
              </p>
              <div className="sc-date-picker-row">
                <DateSelect
                  value={customYear}
                  options={YEARS}
                  suffix="년"
                  onChange={setCustomYear}
                />
                <DateSelect
                  value={customMonth}
                  options={MONTHS}
                  suffix="월"
                  onChange={setCustomMonth}
                />
                <DateSelect
                  value={customDay}
                  options={DAYS}
                  suffix="일"
                  onChange={setCustomDay}
                />
                <DateSelect
                  value={customHour}
                  options={HOURS}
                  suffix="시"
                  onChange={setCustomHour}
                />
              </div>
              <hr className="sc-dark-divider" />
              <FlipDigits value={customCount} />
              <p className="sc-dark-timestamp">{nowStr}</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
