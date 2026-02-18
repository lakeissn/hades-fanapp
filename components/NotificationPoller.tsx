"use client";

import { useEffect, useRef } from "react";

type NotificationSettings = {
  master: boolean;
  liveBroadcast: boolean;
  newVote: boolean;
  newYoutube: boolean;
};

function getNotifSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem("hades_notif_settings");
    return raw ? JSON.parse(raw) : { master: false, liveBroadcast: false, newVote: false, newYoutube: false };
  } catch {
    return { master: false, liveBroadcast: false, newVote: false, newYoutube: false };
  }
}

function getPushGrantedAt(): number {
  try {
    const raw = localStorage.getItem("hades_push_granted_at");
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

/* ── 투표 ID를 localStorage에 영속 저장 ── */
function getKnownVoteIds(): Set<string> {
  try {
    const raw = localStorage.getItem("hades_known_vote_ids");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function setKnownVoteIds(ids: Set<string>) {
  try {
    localStorage.setItem("hades_known_vote_ids", JSON.stringify(Array.from(ids)));
  } catch {}
}

/* ── 유튜브 ID를 localStorage에 영속 저장 ── */
function getKnownYoutubeIds(): Set<string> {
  try {
    const raw = localStorage.getItem("hades_known_yt_ids");
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function setKnownYoutubeIds(ids: Set<string>) {
  try {
    localStorage.setItem("hades_known_yt_ids", JSON.stringify(Array.from(ids)));
  } catch {}
}

async function sendNotification(title: string, body: string, url: string, tag: string) {
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration.active) {
        registration.active.postMessage({ type: "SHOW_NOTIFICATION", title, body, url, tag });
        return;
      }
    } catch {}
  }

  new Notification(title, { body, icon: "/icons/hades_helper.png", tag });
}

export default function NotificationPoller() {
  const prevLiveIds = useRef<Set<string>>(new Set());
  const isFirstRun = useRef(true);
  const canNotifyLiveRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const poll = async () => {
      const settings = getNotifSettings();
      const canNotify = settings.master && Notification.permission === "granted";
      if (!canNotify) {
        canNotifyLiveRef.current = false;
        return;
      }

      const liveEnabledNow = settings.liveBroadcast;
      const becameLiveEnabled = liveEnabledNow && !canNotifyLiveRef.current;
      canNotifyLiveRef.current = liveEnabledNow;

      /* ── 라이브 체크 (기존 in-memory 방식 유지) ── */
      if (liveEnabledNow) {
        try {
          const res = await fetch("/api/members/status");
          const members = await res.json();
          const liveNow = new Set<string>();

          if (Array.isArray(members)) {
            for (const m of members) {
              if (m.isLive) {
                liveNow.add(m.id);
                if (!isFirstRun.current && !becameLiveEnabled && !prevLiveIds.current.has(m.id)) {
                  sendNotification(
                    `${m.name} 방송 시작! 🔴`,
                    m.title || "지금 라이브 중이에요",
                    m.liveUrl || m.soopUrl,
                    `live-${m.id}`
                  );
                }
              }
            }
          }

          prevLiveIds.current = liveNow;
        } catch {}
      } else {
        prevLiveIds.current = new Set();
      }

      /* ── 투표 체크 (localStorage 영속 + 장애 복구 안전) ── */
      if (settings.newVote) {
        try {
          const res = await fetch("/api/votes");
          const votes = await res.json();

          // ★ 핵심: API가 빈 배열/에러 반환 시 → known IDs를 절대 초기화하지 않음
          //   → 구글 시트 장애 복구 시 과거 투표가 '새 투표'로 인식되는 것을 방지
          if (!Array.isArray(votes) || votes.length === 0) {
            // 장애 상황일 수 있으므로 저장된 ID 유지, 아무것도 하지 않음
          } else {
            const currentIds = new Set<string>(votes.map((v: any) => v.id));
            const knownIds = getKnownVoteIds();

            // knownIds가 비어있으면 = 첫 실행이거나 localStorage 초기화됨
            // → 알림 보내지 않고 현재 목록만 저장
            if (knownIds.size > 0 && !isFirstRun.current) {
              // 새로 등록된 투표만 필터
              const newVotes = votes.filter((v: any) => !knownIds.has(v.id));

              // ★ 핵심: 가장 최근 1건만 알림 (폭주 방지)
              if (newVotes.length > 0) {
                const latest = newVotes[0];
                sendNotification(
                  "새 투표가 등록되었어요! 🗳️",
                  latest.title,
                  "/votes",
                  `vote-${latest.id}`
                );
              }
            }

            // 현재 목록으로 known IDs 갱신
            setKnownVoteIds(currentIds);
          }
        } catch {}
      }

      /* ── 유튜브 체크 (localStorage 영속) ── */
      if (settings.newYoutube) {
        try {
          const res = await fetch("/api/youtube");
          const videos = await res.json();

          if (Array.isArray(videos) && videos.length > 0) {
            const currentIds = new Set<string>(videos.map((v: any) => v.id));
            const knownIds = getKnownYoutubeIds();

            if (knownIds.size > 0 && !isFirstRun.current) {
              for (const v of videos) {
                if (!knownIds.has(v.id)) {
                  sendNotification(
                    "새 영상이 올라왔어요! ▶️",
                    v.title,
                    v.url,
                    `yt-${v.id}`
                  );
                  break; // 최대 1건
                }
              }
            }

            setKnownYoutubeIds(currentIds);
          }
        } catch {}
      }

      isFirstRun.current = false;
    };

    poll();
    const interval = setInterval(poll, 60_000);

    const repoll = () => {
      if (getPushGrantedAt() > 0) {
        poll();
      }
    };
    window.addEventListener("hades_prefs_changed", repoll);
    window.addEventListener("focus", repoll);

    return () => {
      clearInterval(interval);
      window.removeEventListener("hades_prefs_changed", repoll);
      window.removeEventListener("focus", repoll);
    };
  }, []);

  return null;
}
