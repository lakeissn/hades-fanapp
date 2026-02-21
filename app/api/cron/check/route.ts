/**
 * app/api/cron/check/route.ts
 * GET /api/cron/check
 *
 * 1분마다 Cloudflare에서 호출
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
import type { MulticastMessage } from "firebase-admin/messaging";

// ─── 타입 ───
type AppStateValue = {
  lastNotifiedLiveId?: string;
  // vote는 단일 ID가 아닌 누적 ID 집합(콤마 구분)으로 관리하여
  // 시트 정렬 순서 변경/다건 추가에도 누락을 방지한다.
  lastNotifiedVoteId?: string;
  lastNotifiedYoutubeId?: string;
  lastNotifiedAt?: string;
  lastLiveNotifyByMember?: Record<string, string>;
  voteFirstSeenAtById?: Record<string, string>;
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
  legacyId?: string;
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

type PushTarget = {
  token: string;
  platform: "ios" | "android" | "web" | string;
};

const LIVE_DUPLICATE_GUARD_MINUTES = Number(
  process.env.LIVE_DUPLICATE_GUARD_MINUTES ?? "90"
);
const LIVE_DUPLICATE_GUARD_MS = LIVE_DUPLICATE_GUARD_MINUTES * 60 * 1000;

const VOTE_NOTIFY_STABLE_MINUTES = Number(
  process.env.VOTE_NOTIFY_STABLE_MINUTES ?? "1"
);
const VOTE_NOTIFY_STABLE_MS = VOTE_NOTIFY_STABLE_MINUTES * 60 * 1000;

const ANDROID_COLLAPSE_KEY_MAX_LENGTH = 64;

function sanitizeCollapseKeyPart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

function buildAndroidCollapseKey(tag: string, useCollapse: boolean, sentAt: string) {
  const safeTag = sanitizeCollapseKeyPart(tag || "hades");
  if (useCollapse) {
    return safeTag.slice(0, ANDROID_COLLAPSE_KEY_MAX_LENGTH) || "hades";
  }

  // collapse 비활성화 시에도 Android에서 implicit collapse가 일어나지 않도록
  // 메시지마다 고유하면서 길이 제한(64자) 이내인 key를 만든다.
  const uniqueSeed = `${safeTag}-${sentAt.replace(/[^0-9]/g, "")}`;
  return uniqueSeed.slice(0, ANDROID_COLLAPSE_KEY_MAX_LENGTH) || `${safeTag.slice(0, 40)}-${Date.now()}`;
}

function isRecentlyNotified(memberId: string, map: Record<string, string> | undefined) {
  if (!map?.[memberId]) return false;
  const prev = new Date(map[memberId]).getTime();
  if (Number.isNaN(prev)) return false;
  return Date.now() - prev < LIVE_DUPLICATE_GUARD_MS;
}

function withLiveNotifyStamp(
  previous: AppStateValue,
  memberId: string,
  stampedAt: string
): Record<string, string> {
  return {
    ...(previous.lastLiveNotifyByMember ?? {}),
    [memberId]: stampedAt,
  };
}

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
): Promise<PushTarget[]> {
  // 1단계: DB에서 enabled=true AND prefs 조건으로 필터
  const { data, error } = await supabaseAdmin
    .from("push_tokens")
    .select("token, platform, prefs")
    .eq("enabled", true);

  if (error) {
    console.error(`[cron] Token 조회 실패 (${prefKey}):`, error);
    return [];
  }

  if (!data || data.length === 0) return [];

  // 2단계: 서버측 안전망 - prefs를 다시 한번 명시적으로 검증
  const validTargets = data
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
    .map((row: any) => ({
      token: row.token as string,
      platform: (row.platform as string) || "web",
    }));

  // Android 먼저 발송해서 체감 지연을 줄임
  validTargets.sort((a, b) => {
    const aRank = a.platform === "android" ? 0 : 1;
    const bRank = b.platform === "android" ? 0 : 1;
    return aRank - bRank;
  });

  return validTargets;
}

// ─── FCM 발송 (500개 배치, 플랫폼별 우선순위 보강) ───
async function sendFCMMessages(
  targets: PushTarget[],
  payload: { title: string; body: string; url: string; tag: string },
  options?: { collapse?: boolean }
): Promise<NotifyResult> {
  const result: NotifyResult = {
    type: payload.tag,
    sent: 0,
    failed: 0,
    invalidTokens: [],
  };

  if (targets.length === 0) return result;

  const sentAt = new Date().toISOString();
  const useCollapse = options?.collapse ?? true;
  const androidCollapseKey = buildAndroidCollapseKey(payload.tag, useCollapse, sentAt);
  // Android Doze / 네트워크 변동 구간에서도 누락을 줄이기 위해 TTL을 충분히 확보
  // (환경변수로 조절 가능, 기본 24시간)
  const TTL_SECONDS = Number(process.env.FCM_TTL_SECONDS ?? "86400");

  const uniqueTag = useCollapse
    ? payload.tag
    : `${payload.tag}-${sentAt.replace(/[^0-9]/g, "")}-${Math.random().toString(36).slice(2, 6)}`;

  const message: Omit<MulticastMessage, "tokens"> = {
    // top-level notification 제거 — 플랫폼별 개별 처리
    // (top-level notification이 있으면 Chrome이 auto-display + push 이벤트를
    //  동시에 발생시켜, 동일 제목의 다건 알림이 브라우저 레벨에서 병합/누락됨)
    data: {
      title: payload.title,
      body: payload.body,
      url: payload.url,
      tag: uniqueTag,
      icon: "/icons/hades_helper.png",
      sentAt,
    },
    // Android native: 시스템이 직접 표시 (서비스 워커 불필요)
    android: {
      priority: "high" as const,
      ttl: TTL_SECONDS * 1000,
      ...(useCollapse ? { collapseKey: androidCollapseKey } : {}),
      notification: {
        title: payload.title,
        body: payload.body,
        tag: uniqueTag,
        sound: "default",
        icon: "hades_helper",
      },
    },
    // Web Push (Chrome/Firefox/Edge): data-only → 서비스 워커가 전적으로 표시 담당
    // notification 필드 없음 → 브라우저 auto-display 방지 → 다건 알림 누락 해소
    webpush: {
      headers: {
        Urgency: "high",
        TTL: String(TTL_SECONDS),
      },
      fcmOptions: {
        link: payload.url,
      },
    },
    // iOS (APNs): alert으로 직접 표시
    apns: {
      headers: {
        "apns-priority": "10",
        "apns-expiration": String(
          Math.floor(Date.now() / 1000) + TTL_SECONDS
        ),
        ...(useCollapse ? { "apns-collapse-id": payload.tag } : {}),
      },
      payload: {
        aps: {
          alert: {
            title: payload.title,
            body: payload.body,
          },
          sound: "default",
        },
      },
    },
  };

  // 500개씩 배치 전송 + 병렬 처리 (대기시간 단축)
  const BATCH_SIZE = 500;
  const CONCURRENCY = 3;
  const batches: string[][] = [];
  const tokens = targets.map((t) => t.token);

  for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
    batches.push(tokens.slice(i, i + BATCH_SIZE));
  }

  async function sendBatchWithRetry(batch: string[]) {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const response = await messaging.sendEachForMulticast({
          tokens: batch,
          ...message,
        });

        const retryTokens: string[] = [];

        response.responses.forEach((resp, idx) => {
          if (resp.success) {
            result.sent += 1;
            return;
          }

          result.failed += 1;
          const code = resp.error?.code;

          if (code === "messaging/internal-error" || code === "messaging/server-unavailable") {
            retryTokens.push(batch[idx]);
            result.failed -= 1;
            return;
          }

          if (
            code === "messaging/invalid-registration-token" ||
            code === "messaging/registration-token-not-registered" ||
            code === "messaging/invalid-argument"
          ) {
            result.invalidTokens.push(batch[idx]);
          }
        });

        if (retryTokens.length === 0 || attempt === MAX_ATTEMPTS) {
          if (retryTokens.length > 0) {
            result.failed += retryTokens.length;
          }
          return;
        }

        const delayMs = 300 * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        batch = retryTokens;
      } catch (err) {
        if (attempt === MAX_ATTEMPTS) {
          console.error("[cron] FCM batch 발송 실패(재시도 종료):", err);
          result.failed += batch.length;
          return;
        }

        const delayMs = 300 * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const chunk = batches.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map((batch) => sendBatchWithRetry(batch)));
  }

  // Invalid 토큰 DB 정리
  if (result.invalidTokens.length > 0) {
    const { error } = await supabaseAdmin
      .from("push_tokens")
      .update({ enabled: false, updated_at: new Date().toISOString() })
      .in("token", result.invalidTokens);

    if (error) {
      console.error("[cron] invalid token 정리 실패:", error);
    }
  }

  return result;
}

// ─── 외부 API fetch helpers ───
function internalBaseUrl(req: Request) {
  const host = req.headers.get("host") || "localhost:3000";
  const proto = host.includes("localhost") ? "http" : "https";
  return `${proto}://${host}`;
}

async function fetchLive(base: string): Promise<MemberStatus[] | null> {
  try {
    const res = await fetch(`${base}/api/members/status`, {
      cache: "no-store",
      headers: {
        "x-internal-cron": "1",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as MemberStatus[];
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

async function fetchVote(base: string): Promise<VoteItem[] | null> {
  try {
    const res = await fetch(`${base}/api/votes`, {
      cache: "no-store",
      headers: {
        "x-internal-cron": "1",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as VoteItem[];
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

async function fetchYoutube(base: string): Promise<YouTubeVideo[] | null> {
  try {
    const res = await fetch(`${base}/api/youtube`, {
      cache: "no-store",
      headers: {
        "x-internal-cron": "1",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as YouTubeVideo[];
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

function isBootstrap(value?: string) {
  return !value || value.trim() === "";
}

function buildYoutubeStateId(videos: YouTubeVideo[]): string {
  return buildYoutubeStateIdFromIds(
    videos.map((video) => video.id)
  );
}

function parseYoutubeStateIds(value?: string): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

const MAX_YOUTUBE_STATE_IDS = 200;
const MAX_VOTE_STATE_IDS = 300;

function buildYoutubeStateIdFromIds(ids: string[]): string {
  const deduped = Array.from(
    new Set(ids.map((id) => id.trim()).filter(Boolean))
  ).slice(0, MAX_YOUTUBE_STATE_IDS);

  return deduped.join(",");
}

function parseVoteStateIds(value?: string): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function buildVoteStateIdFromIds(ids: string[]): string {
  const deduped = Array.from(
    new Set(ids.map((id) => id.trim()).filter(Boolean))
  ).slice(0, MAX_VOTE_STATE_IDS);

  return deduped.join(",");
}

function mergeVoteStateIds(currentIds: string[], prevIds: Set<string>): string {
  const merged: string[] = [];
  const used = new Set<string>();

  for (const id of currentIds) {
    const normalized = id.trim();
    if (!normalized || used.has(normalized)) continue;
    merged.push(normalized);
    used.add(normalized);
    if (merged.length >= MAX_VOTE_STATE_IDS) return merged.join(",");
  }

  for (const id of prevIds) {
    const normalized = id.trim();
    if (!normalized || used.has(normalized)) continue;
    merged.push(normalized);
    used.add(normalized);
    if (merged.length >= MAX_VOTE_STATE_IDS) break;
  }

  return merged.join(",");
}

function mergeYoutubeStateIds(currentIds: string[], previousIds: Set<string>): string {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const id of currentIds) {
    const normalized = id.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(normalized);
    if (merged.length >= MAX_YOUTUBE_STATE_IDS) {
      return merged.join(",");
    }
  }

  for (const id of previousIds) {
    const normalized = id.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(normalized);
    if (merged.length >= MAX_YOUTUBE_STATE_IDS) {
      break;
    }
  }

  return merged.join(",");
}

export async function GET(req: Request) {
  const log: string[] = [];
  const results: NotifyResult[] = [];

  try {
    // 1) 보안 검증
    const secret = req.headers.get("authorization") || "";
    const expected = `Bearer ${process.env.CRON_SECRET}`;

    if (!process.env.CRON_SECRET) {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET not set" },
        { status: 500 }
      );
    }

    if (secret !== expected) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2) 상태 로드
    const [liveState, voteState, youtubeState] = await Promise.all([
      loadAppState("live"),
      loadAppState("vote"),
      loadAppState("youtube"),
    ]);

    // 3) 데이터 fetch
    const base = internalBaseUrl(req);
    const [liveData, voteData, youtubeData] = await Promise.all([
      fetchLive(base),
      fetchVote(base),
      fetchYoutube(base),
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
          ...liveState,
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
          const guardFiltered = newLive.filter(
            (member) => !isRecentlyNotified(member.id, liveState.lastLiveNotifyByMember)
          );

          if (guardFiltered.length === 0) {
            log.push(
              `live: 중복 보호로 알림 SKIP (최근 ${LIVE_DUPLICATE_GUARD_MINUTES}분 내 동일 멤버 알림)`
            );
          } else {
            const targets = await getTargetTokens("liveEnabled");
            const androidCount = targets.filter((t) => t.platform === "android").length;
            log.push(
              `live: 신규 ${guardFiltered.length}명 (대상 ${targets.length}명 / android ${androidCount} 우선 발송) [priority=high, urgency=high]`
            );

            if (targets.length > 0) {
              const sentAt = new Date().toISOString();
              for (const target of guardFiltered) {
                const liveResult = await sendFCMMessages(
                  targets,
                  {
                    title: `${target.name} 방송 시작! 🔴`,
                    body: target.title || "지금 라이브 중이에요",
                    url: target.liveUrl || "/",
                    tag: `live-${target.id}`,
                  },
                  { collapse: false }
                );
                results.push(liveResult);
                if (guardFiltered.length > 1) {
                  await new Promise((resolve) => setTimeout(resolve, 1500));
                }
              }

              for (const target of guardFiltered) {
                liveState.lastLiveNotifyByMember = withLiveNotifyStamp(
                  liveState,
                  target.id,
                  sentAt
                );
              }
            }
          }
        } else {
          log.push("live: 멤버 조합 변경 (새 라이브 없음)");
        }

        // 성공 시 상태 업데이트
        await updateAppState("live", {
          ...liveState,
          lastNotifiedLiveId: currentLiveId,
          lastNotifiedAt: new Date().toISOString(),
        });
      }
    }

    // ════════════════════════════════════════
    // 5-B) VOTE 체크
    // ════════════════════════════════════════
    if (voteData === null || voteData.length === 0) {
      log.push("vote: SKIP (fetch 실패/빈 데이터)");
    } else {
      const nowIso = new Date().toISOString();
      const nowMs = Date.now();
      const prevVoteStateId = voteState.lastNotifiedVoteId;
      const prevVoteIds = parseVoteStateIds(prevVoteStateId);
      const currentVoteIds = voteData
        .map((vote) => vote.id)
        .filter((id) => Boolean(id?.trim()));

      // Bootstrap seed 체크
      if (isBootstrap(prevVoteStateId)) {
        const currentStateId = buildVoteStateIdFromIds(currentVoteIds);
        log.push(
          `vote: BOOTSTRAP SEED (상태 초기화, 알림 SKIP) → id=${currentStateId}`
        );
        await updateAppState("vote", {
          ...voteState,
          lastNotifiedVoteId: currentStateId,
          voteFirstSeenAtById: {},
          lastNotifiedAt: nowIso,
        });
      } else {
        const newCandidateVotes = voteData.filter((vote) => {
          if (prevVoteIds.has(vote.id)) return false;
          if (vote.legacyId && prevVoteIds.has(vote.legacyId)) return false;
          return true;
        });

        const prevFirstSeenMap = voteState.voteFirstSeenAtById ?? {};
        const nextFirstSeenMap: Record<string, string> = {};
        const readyVotes: VoteItem[] = [];
        const waitingVotes: VoteItem[] = [];

        for (const vote of newCandidateVotes) {
          const voteId = vote.id.trim();
          if (!voteId) continue;

          const firstSeenAt = prevFirstSeenMap[voteId] ?? nowIso;
          nextFirstSeenMap[voteId] = firstSeenAt;

          const firstSeenMs = new Date(firstSeenAt).getTime();
          const elapsedMs = Number.isNaN(firstSeenMs) ? VOTE_NOTIFY_STABLE_MS : nowMs - firstSeenMs;

          if (elapsedMs >= VOTE_NOTIFY_STABLE_MS) {
            readyVotes.push(vote);
          } else {
            waitingVotes.push(vote);
          }
        }

        const readyIds = new Set(readyVotes.map((vote) => vote.id));
        const notifyKnownCurrentIds = voteData
          .filter((vote) => {
            if (prevVoteIds.has(vote.id)) return true;
            if (vote.legacyId && prevVoteIds.has(vote.legacyId)) return true;
            return readyIds.has(vote.id);
          })
          .map((vote) => vote.id)
          .filter((id) => Boolean(id?.trim()));

        const nextVoteStateId = mergeVoteStateIds(notifyKnownCurrentIds, prevVoteIds);

        if (readyVotes.length === 0) {
          if (waitingVotes.length > 0) {
            log.push(
              `vote: 안정화 대기 ${waitingVotes.length}건 (${VOTE_NOTIFY_STABLE_MINUTES}분)`
            );
          } else {
            log.push(`vote: 변경 없음 (id=${prevVoteStateId})`);
          }

          await updateAppState("vote", {
            ...voteState,
            lastNotifiedVoteId: nextVoteStateId,
            voteFirstSeenAtById: nextFirstSeenMap,
            lastNotifiedAt: nowIso,
          });
        } else {
          const targets = await getTargetTokens("voteEnabled");
          const androidCount = targets.filter((t) => t.platform === "android").length;
          log.push(
            `vote: 안정화 완료 신규 ${readyVotes.length}건 (${readyVotes
              .map((vote) => vote.id)
              .join(", ")}) 대상: ${targets.length}명 / android ${androidCount} 우선 발송 [priority=high, urgency=high]`
          );

          if (targets.length > 0) {
            for (const vote of readyVotes) {
              const voteResult = await sendFCMMessages(
                targets,
                {
                  title: "새 투표가 등록되었어요! 🗳️",
                  body: vote.title,
                  url: `/votes?open=${vote.id}`,
                  tag: `vote-${vote.id}`,
                },
                { collapse: false }
              );
              results.push(voteResult);
              if (readyVotes.length > 1) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
              }
            }
          }

          // 이미 발송 완료된 항목은 firstSeen 맵에서 제거, 대기 항목만 유지
          for (const vote of readyVotes) {
            delete nextFirstSeenMap[vote.id];
          }

          await updateAppState("vote", {
            ...voteState,
            lastNotifiedVoteId: nextVoteStateId,
            voteFirstSeenAtById: nextFirstSeenMap,
            lastNotifiedAt: nowIso,
          });
        }
      }
    }

    // ════════════════════════════════════════
    // 5-C) YOUTUBE 체크
    // ═══════════════════════════════════════
    if (youtubeData === null || youtubeData.length === 0) {
      log.push("youtube: SKIP (fetch 실패/빈 데이터)");
    } else {
      const prevYoutubeStateId = youtubeState.lastNotifiedYoutubeId;
      const currentYoutubeStateId = buildYoutubeStateId(youtubeData);
      const prevYoutubeIds = parseYoutubeStateIds(prevYoutubeStateId);
      const currentYoutubeIds = youtubeData
        .map((video) => video.id)
        .filter((id) => Boolean(id?.trim()));

      // Bootstrap seed 체크
      if (isBootstrap(prevYoutubeStateId)) {
        log.push(
          `youtube: BOOTSTRAP SEED (상태 초기화, 알림 SKIP) → id=${currentYoutubeStateId}`
        );
        await updateAppState("youtube", {
          lastNotifiedYoutubeId: currentYoutubeStateId,
          lastNotifiedAt: new Date().toISOString(),
        });
      } else {
        const changedVideos = youtubeData.filter((video) => !prevYoutubeIds.has(video.id));
        const nextYoutubeStateId = mergeYoutubeStateIds(currentYoutubeIds, prevYoutubeIds);

        if (changedVideos.length === 0) {
          log.push(`youtube: 변경 없음 (id=${prevYoutubeStateId})`);
        } else {
          const targets = await getTargetTokens("youtubeEnabled");
          const androidCount = targets.filter((t) => t.platform === "android").length;
          log.push(
            `youtube: 신규 ${changedVideos.length}건 (${changedVideos
              .map((video) => `${video.type}:${video.id}`)
              .join(", ")}) 대상: ${targets.length}명 / android ${androidCount} 우선 발송 [priority=high, urgency=high]`
          );

          if (targets.length > 0) {
            for (const video of changedVideos) {
              const ytResult = await sendFCMMessages(
                targets,
                {
                  title: `새 ${video.type === "shorts" ? "Shorts" : "영상"}가 올라왔어요! ▶️`,
                  body: video.title,
                  url: video.url || "/",
                  tag: `yt-${video.id}`,
                },
                { collapse: false }
              );
              results.push(ytResult);
              if (changedVideos.length > 1) {
                await new Promise((resolve) => setTimeout(resolve, 1500));
              }
            }
          }
        }

        await updateAppState("youtube", {
          lastNotifiedYoutubeId: nextYoutubeStateId,
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
