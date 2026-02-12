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
    return raw ? JSON.parse(raw) : { master: false, liveBroadcast: true, newVote: true, newYoutube: true };
  } catch {
    return { master: false, liveBroadcast: true, newVote: true, newYoutube: true };
  }
}

async function sendNotification(title: string, body: string, url: string, tag: string) {
  if (Notification.permission !== "granted") return;

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    if (registration.active) {
      registration.active.postMessage({
        type: "SHOW_NOTIFICATION",
        title,
        body,
        url,
        tag,
      });
      return;
    }
  }

  // 서비스워커 실패 시 직접 알림
  new Notification(title, {
    body,
    icon: "/icons/hades_helper.png",
    tag,
  });
}

export default function NotificationPoller() {
  const prevLiveIds = useRef<Set<string>>(new Set());
  const prevVoteIds = useRef<Set<string>>(new Set());
  const prevYoutubeIds = useRef<Set<string>>(new Set());
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    // 서비스 워커 등록
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const poll = async () => {
      const settings = getNotifSettings();
      if (!settings.master || Notification.permission !== "granted") return;

      // 라이브 체크
      if (settings.liveBroadcast) {
        try {
          const res = await fetch("/api/members/status");
          const members = await res.json();
          const liveNow = new Set<string>();
          for (const m of members) {
            if (m.isLive) {
              liveNow.add(m.id);
              if (!isFirstRun.current && !prevLiveIds.current.has(m.id)) {
                sendNotification(
                  `${m.name} 방송 시작! 🔴`,
                  m.title || "지금 라이브 중이에요",
                  m.liveUrl || m.soopUrl,
                  `live-${m.id}`
                );
              }
            }
          }
          prevLiveIds.current = liveNow;
        } catch {}
      }

      // 투표 체크
      if (settings.newVote) {
        try {
          const res = await fetch("/api/votes");
          const votes = await res.json();
          const currentIds = new Set<string>(votes.map((v: any) => v.id));
          if (!isFirstRun.current) {
            for (const v of votes) {
              if (!prevVoteIds.current.has(v.id)) {
                sendNotification(
                  "새 투표가 등록되었어요! 🗳️",
                  v.title,
                  "/votes",
                  `vote-${v.id}`
                );
              }
            }
          }
          prevVoteIds.current = currentIds;
        } catch {}
      }

      // 유튜브 체크
      if (settings.newYoutube) {
        try {
          const res = await fetch("/api/youtube");
          const videos = await res.json();
          const currentIds = new Set<string>(videos.map((v: any) => v.id));
          if (!isFirstRun.current) {
            for (const v of videos) {
              if (!prevYoutubeIds.current.has(v.id)) {
                sendNotification(
                  "새 영상이 올라왔어요! ▶️",
                  v.title,
                  v.url,
                  `yt-${v.id}`
                );
              }
            }
          }
          prevYoutubeIds.current = currentIds;
        } catch {}
      }

      isFirstRun.current = false;
    };

    // 초기 실행
    poll();

    // 60초마다 폴링
    const interval = setInterval(poll, 60_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
