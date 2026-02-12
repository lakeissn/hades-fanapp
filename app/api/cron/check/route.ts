/**
 * app/api/cron/check/route.ts
 * GET /api/cron/check
 *
 * 10분마다 GitHub Actions에서 호출
 * 1) 보안 체크 (CRON_SECRET)
 * 2) app_state 로드
 * 3) 외부 데이터 Fetch (live/vote/youtube)
 * 4) 신규 판정 (Storm Prevention + Bootstrap Seed)
 * 5) 타겟 토큰 조회 & FCM 발송 (priority/urgency 보강)
 * 6) app_state 업데이트 (성공 시에만)
 *
 * [v2] 변경 사항:
 *  - FCM 메시지 옵션 보강 (android.priority, webpush urgency, apns priority)
 *  - Bootstrap seed: lastNotified* 가 없으면 알림 SKIP, 상태만 seed
 *  - 토글 OFF 사용자 이중 방어 (서버측 prefs 재검증)
 *  - payload에 sentAt 추가 (stale event guard)
 *  - 로그 강화
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { messaging } from "@/firebase/admin";

// ─── 타입 ───
type AppStateValue = {
  lastNotifiedLiveId?: string;
  lastNotifiedVoteId?: string;
  lastNotifiedYoutubeId?: string;
  lastNotifiedAt?: string;
};

type MemberStatus = {
  id: string;
  name: string;
  isLive: boolean;
  liveUrl: string | null;
  title: string | null;
};

type VoteItem = {
  id: string;
  title: string;
  url: string;
};

type YouTubeVideo = {
  id: string;
  title: string;
  url: string;
  type: string;
};

type NotifyResult = {
  type: string;
  sent: number;
  failed: number;
  invalidTokens: string[];
};

// ─── app_state 헬퍼 ───
async function loadAppState(key: string): Promise<AppStateValue> {
  const { data } = await supabaseAdmin
    .from("app_state")
    .select("value")
    .eq("key", key)
    .single();
  return (data?.value as AppStateValue) ?? {};
}

async function updateAppState(key: string, value: AppStateValue) {
  await supabaseAdmin.from("app_state").upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );
}

// ─── 대상 토큰 조회 (이중 방어: DB 필터 + 서버측 prefs 재검증) ───
async function getTargetTokens(
  prefKey: "liveEnabled" | "voteEnabled" | "youtubeEnabled"
): Promise<string[]> {
  // 1단계: DB에서 enabled=true AND prefs 조건으로 필터
  const { data, error } = await supabaseAdmin
    .from("push_tokens")
    .select("token, prefs")
    .eq("enabled", true);

  if (error) {
    console.error(`[cron] Token 조회 실패 (${prefKey}):`, error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 2단계: 서버측 안전망 - prefs를 다시 한번 명시적으로 검증
  const validTokens = data
    .filter((row: any) => {
      const prefs = row.prefs;
      if (!prefs) return false;

      // pushEnabled가 false이면 절대 발송 금지
      if (prefs.pushEnabled === false || prefs.pushEnabled === "false") return false;

      // 개별 타입 설정 확인
      const typeValue = prefs[prefKey];
      if (typeValue === false || typeValue === "false") return false;

      // pushEnabled와 해당 타입 모두 true여야 통과
      return (
        (prefs.pushEnabled === true || prefs.pushEnabled === "true") &&
        (typeValue === true || typeValue === "true")
      );
    })
    .map((row: any) => row.token as string);

  return validTokens;
}

// ─── FCM 발송 (500개 배치, 플랫폼별 우선순위 보강) ───
async function sendFCMMessages(
  tokens: string[],
  payload: { title: string; body: string; url: string; tag: string }
): Promise<NotifyResult> {
  const result: NotifyResult = {
    type: payload.tag,
    sent: 0,
    failed: 0,
    invalidTokens: [],
  };

  if (tokens.length === 0) return result;

  const sentAt = new Date().toISOString();
  const TTL_SECONDS = 600; // 10분 TTL

  // data-only 메시지 → SW의 push 이벤트에서 showNotification 호출
  // + 플랫폼별 우선순위/TTL/collapse 보강
  const message = {
    data: {
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: payload.tag,
      icon: "/icons/hades_helper.png",
      sentAt, // stale event guard용 서버 시간
    },
    // Android: 즉시 배달을 위한 high priority + TTL + collapse
    android: {
      priority: "high" as const,
      ttl: TTL_SECONDS * 1000, // ms 단위
      collapseKey: payload.tag,
    },
    // Web Push (PWA/Chrome 등): urgency high + TTL
    webpush: {
      headers: {
        Urgency: "high",
        TTL: String(TTL_SECONDS),
      },
      fcmOptions: {
        link: payload.url,
      },
    },
    // APNs (iOS): priority 10 (즉시) + content-available
    apns: {
      headers: {
        "apns-priority": "10",
        "apns-expiration": String(
          Math.floor(Date.now() / 1000) + TTL_SECONDS
        ),
        "apns-collapse-id": payload.tag,
      },
      payload: {
        aps: {
          "content-available": 1,
        },
      },
    },
  };

  // 500개씩 배치 전송
  const BATCH_SIZE = 500;
  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    const batch = tokens.slice(i, i + BATCH_SIZE);

    try {
      const response = await messaging.sendEachForMulticast({
        tokens: batch,
        ...message,
      });

      result.sent += response.successCount;
      result.failed += response.failureCount;

      // Invalid/Expired 토큰 수집
      response.responses.forEach((resp, idx) => {
        if (resp.error) {
          const code = resp.error.code;
          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-argument"
          ) {
            result.invalidTokens.push(batch[idx]);
          }
        }
      });
    } catch (err) {
      console.error("[cron] FCM batch 발송 실패:", err);
      result.failed += batch.length;
    }
  }

  // Invalid 토큰 DB 정리
  if (result.invalidTokens.length > 0) {
    await supabaseAdmin
      .from("push_tokens")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .in("token", result.invalidTokens);
    console.log(
      `[cron] ${result.invalidTokens.length}개 Invalid 토큰 비활성화`
    );
  }

  return result;
}

// ─── 데이터 Fetch 함수들 ───
async function fetchLiveData(
  baseUrl: string
): Promise<MemberStatus[] | null> {
  try {
    const res = await fetch(`${baseUrl}/api/members/status`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data;
  } catch (err) {
    console.error("[cron] Live fetch 실패:", err);
    return null;
  }
}

async function fetchVoteData(baseUrl: string): Promise<VoteItem[] | null> {
  try {
    const res = await fetch(`${baseUrl}/api/votes`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null; // 빈 데이터 = skip
    return data;
  } catch (err) {
    console.error("[cron] Vote fetch 실패:", err);
    return null;
  }
}

async function fetchYoutubeData(
  baseUrl: string
): Promise<YouTubeVideo[] | null> {
  try {
    const res = await fetch(`${baseUrl}/api/youtube`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null; // 빈 데이터 = skip
    return data;
  } catch (err) {
    console.error("[cron] YouTube fetch 실패:", err);
    return null;
  }
}

// ─── Bootstrap Seed 판정 헬퍼 ───
function isBootstrap(
  stateField: string | undefined | null
): boolean {
  return !stateField || stateField.trim() === "";
}

// ─── 메인 핸들러 ───
export async function GET(req: Request) {
  // 1) 보안 체크
  const secret = process.env.CRON_SECRET || "";
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ") || auth.slice(7) !== secret) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  const results: NotifyResult[] = [];
  const log: string[] = [];

  try {
    // 2) baseUrl 구성 (자기 자신의 API 호출용)
    const host = req.headers.get("host") || "localhost:3000";
    const proto = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${proto}://${host}`;

    // 3) app_state 로드
    const [liveState, voteState, youtubeState] = await Promise.all([
      loadAppState("live"),
      loadAppState("vote"),
      loadAppState("youtube"),
    ]);

    // 4) 외부 데이터 병렬 Fetch
    const [liveData, voteData, youtubeData] = await Promise.all([
      fetchLiveData(baseUrl),
      fetchVoteData(baseUrl),
      fetchYoutubeData(baseUrl),
    ]);

    // ════════════════════════════════════════
    // 5-A) LIVE 체크
    // ════════════════════════════════════════
    if (liveData === null) {
      log.push("live: SKIP (fetch 실패/빈 데이터)");
    } else {
      const liveMembers = liveData.filter((m) => m.isLive);
      const currentLiveId =
        liveMembers.length > 0
          ? liveMembers
              .map((m) => m.id)
              .sort()
              .join(",")
          : "";
      const prevLiveId = liveState.lastNotifiedLiveId;

      // Bootstrap seed 체크: lastNotifiedLiveId가 없으면 첫 동기화
      if (isBootstrap(prevLiveId)) {
        log.push(
          `live: BOOTSTRAP SEED (상태 초기화, 알림 SKIP) → id=${currentLiveId || "(없음)"}`
        );
        await updateAppState("live", {
          lastNotifiedLiveId: currentLiveId,
          lastNotifiedAt: new Date().toISOString(),
        });
      } else if (currentLiveId === prevLiveId || liveMembers.length === 0) {
        log.push(
          `live: 변경 없음 (prev=${prevLiveId}, cur=${currentLiveId})`
        );
      } else {
        // 이전에 없던 새 라이브 멤버 찾기
        const prevSet = new Set((prevLiveId || "").split(",").filter(Boolean));
        const newLive = liveMembers.filter((m) => !prevSet.has(m.id));

        if (newLive.length > 0) {
          const target = newLive[0];
          const tokens = await getTargetTokens("liveEnabled");
          log.push(
            `live: 신규 ${newLive.length}명 (prefs 검증 후 대상: ${tokens.length}명) → ${target.name} [priority=high, urgency=high]`
          );

          if (tokens.length > 0) {
            const res = await sendFCMMessages(tokens, {
              title: `${target.name} 방송 시작! 🔴`,
              body: target.title || "지금 라이브 중이에요",
              url: target.liveUrl || "/",
              tag: `live-${target.id}`,
            });
            results.push(res);
          }
        } else {
          log.push("live: 멤버 조합 변경 (새 라이브 없음)");
        }

        // 성공 시 상태 업데이트
        await updateAppState("live", {
          lastNotifiedLiveId: currentLiveId,
          lastNotifiedAt: new Date().toISOString(),
        });
      }
    }

    // ════════════════════════════════════════
    // 5-B) VOTE 체크
    // ════════════════════════════════════════
    if (voteData === null) {
      log.push("vote: SKIP (fetch 실패/빈 데이터)");
    } else {
      const latestVote = voteData[0]; // 최신 1건
      const prevVoteId = voteState.lastNotifiedVoteId;

      // Bootstrap seed 체크
      if (isBootstrap(prevVoteId)) {
        log.push(
          `vote: BOOTSTRAP SEED (상태 초기화, 알림 SKIP) → id=${latestVote.id}`
        );
        await updateAppState("vote", {
          lastNotifiedVoteId: latestVote.id,
          lastNotifiedAt: new Date().toISOString(),
        });
      } else if (latestVote.id === prevVoteId) {
        log.push(`vote: 변경 없음 (id=${prevVoteId})`);
      } else {
        const tokens = await getTargetTokens("voteEnabled");
        log.push(
          `vote: 신규 (${latestVote.id}) prefs 검증 후 대상: ${tokens.length}명 [priority=high, urgency=high]`
        );

        if (tokens.length > 0) {
          const res = await sendFCMMessages(tokens, {
            title: "새 투표가 등록되었어요! 🗳️",
            body: latestVote.title,
            url: latestVote.url || "/votes",
            tag: `vote-${latestVote.id}`,
          });
          results.push(res);
        }

        await updateAppState("vote", {
          lastNotifiedVoteId: latestVote.id,
          lastNotifiedAt: new Date().toISOString(),
        });
      }
    }

    // ════════════════════════════════════════
    // 5-C) YOUTUBE 체크
    // ════════════════════════════════════════
    if (youtubeData === null) {
      log.push("youtube: SKIP (fetch 실패/빈 데이터)");
    } else {
      const latestVideo = youtubeData[0]; // 최신 1건
      const prevYoutubeId = youtubeState.lastNotifiedYoutubeId;

      // Bootstrap seed 체크
      if (isBootstrap(prevYoutubeId)) {
        log.push(
          `youtube: BOOTSTRAP SEED (상태 초기화, 알림 SKIP) → id=${latestVideo.id}`
        );
        await updateAppState("youtube", {
          lastNotifiedYoutubeId: latestVideo.id,
          lastNotifiedAt: new Date().toISOString(),
        });
      } else if (latestVideo.id === prevYoutubeId) {
        log.push(`youtube: 변경 없음 (id=${prevYoutubeId})`);
      } else {
        const tokens = await getTargetTokens("youtubeEnabled");
        log.push(
          `youtube: 신규 (${latestVideo.id}) prefs 검증 후 대상: ${tokens.length}명 [priority=high, urgency=high]`
        );

        if (tokens.length > 0) {
          const res = await sendFCMMessages(tokens, {
            title: `새 ${latestVideo.type === "shorts" ? "Shorts" : "영상"}이 올라왔어요! ▶️`,
            body: latestVideo.title,
            url: latestVideo.url || "/",
            tag: `yt-${latestVideo.id}`,
          });
          results.push(res);
        }

        await updateAppState("youtube", {
          lastNotifiedYoutubeId: latestVideo.id,
          lastNotifiedAt: new Date().toISOString(),
        });
      }
    }

    // 6) 응답
    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      log,
      results,
    });
  } catch (err: any) {
    console.error("[cron] Unhandled error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: err.message || "Internal error",
        log,
        results,
      },
      { status: 500 }
    );
  }
}
