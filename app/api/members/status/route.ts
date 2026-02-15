import { NextResponse } from "next/server";

const members = [
  {
    id: "whatcherry4",
    name: "연초록",
    soopUrl: "https://play.sooplive.co.kr/whatcherry4",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/wh/whatcherry4/whatcherry4.jpg",
  },
  {
    id: "singgyul",
    name: "띵귤",
    soopUrl: "https://play.sooplive.co.kr/singgyul",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/si/singgyul/singgyul.jpg",
  },
  {
    id: "ldrboo",
    name: "솜주먹",
    soopUrl: "https://play.sooplive.co.kr/ldrboo",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/ld/ldrboo/ldrboo.jpg",
  },
  {
    id: "chaenna02",
    name: "챈나",
    soopUrl: "https://play.sooplive.co.kr/chaenna02",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/ch/chaenna02/chaenna02.jpg",
  },
  {
    id: "kymakyma",
    name: "키마",
    soopUrl: "https://play.sooplive.co.kr/kymakyma",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/ky/kymakyma/kymakyma.jpg",
  },
  {
    id: "khm11903",
    name: "봉준",
    soopUrl: "https://play.sooplive.co.kr/khm11903",
    avatarUrl: "https://stimg.sooplive.co.kr/LOGO/kh/khm11903/khm11903.jpg",
  },
];

type MemberStatus = {
  id: string;
  name: string;
  soopUrl: string;
  avatarUrl: string;
  isLive: boolean;
  liveUrl: string | null;
  title: string | null;
  thumbUrl: string | null;
  tags: string[];
  fetchedAt: string;
};

type BroadListItem = {
  user_id?: string;
  broad_no?: number | string;
  broad_title?: string;
  broad_thumb?: string;
  broad_cate_no?: number | string;
  broad_start?: string;
  total_view_cnt?: number | string;
};

type BroadListResponse = {
  broad?: BroadListItem[];
};

type BroadListFetchOptions = {
  orderType: "view_cnt" | "broad_start";
  startPage: 0 | 1;
  selectKey?: "cate" | "lang";
  selectValue?: string;
};

const OPEN_API_ENDPOINT = "https://openapi.sooplive.co.kr/broad/list";
const MAX_PAGE = Number(process.env.SOOPLIVE_BROAD_LIST_MAX_PAGE ?? "12");
const CACHE_TTL_MS = 20_000;

let cached: { data: MemberStatus[]; expiresAt: number } | null = null;

function resolveClientId() {
  return process.env.SOOPLIVE_CLIENT_ID ?? process.env.SOOPlIVE_CLIENT_ID ?? "";
}

function normalizeThumbUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (!value) return null;

  if (value.startsWith("//")) return `https:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

function parseBroadNo(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return String(Math.trunc(raw));
  }

  if (typeof raw === "string") {
    const normalized = raw.trim();
    if (!normalized) return null;
    const digits = normalized.match(/\d+/)?.[0];
    return digits ?? null;
  }

  return null;
}

function buildLiveUrl(userId: string, broadNo: string | null) {
  if (!broadNo) return `https://play.sooplive.co.kr/${userId}`;
  return `https://play.sooplive.co.kr/${userId}/${broadNo}`;
}

function extractTags(item: BroadListItem): string[] {
  if (item.broad_cate_no === undefined || item.broad_cate_no === null) return [];

  const cate = String(item.broad_cate_no).trim();
  return cate ? [`cate:${cate}`] : [];
}

function buildOfflineStatuses(nowIso: string): MemberStatus[] {
  return members.map((member) => ({
    ...member,
    isLive: false,
    liveUrl: null,
    title: null,
    thumbUrl: null,
    tags: [],
    fetchedAt: nowIso,
  }));
}

function buildStatusesFromLiveMap(liveMap: Map<string, BroadListItem>, nowIso: string): MemberStatus[] {
  return members.map((member) => {
    const live = liveMap.get(member.id);

    if (!live) {
      return {
        ...member,
        isLive: false,
        liveUrl: null,
        title: null,
        thumbUrl: null,
        tags: [],
        fetchedAt: nowIso,
      };
    }

    const broadNo = parseBroadNo(live.broad_no);

    return {
      ...member,
      isLive: true,
      liveUrl: buildLiveUrl(member.id, broadNo),
      title:
        typeof live.broad_title === "string" && live.broad_title.trim().length > 0
          ? live.broad_title.trim()
          : null,
      thumbUrl: normalizeThumbUrl(live.broad_thumb),
      tags: extractTags(live),
      fetchedAt: nowIso,
    };
  });
}

async function fetchBroadListPage(clientId: string, pageNo: number, options: BroadListFetchOptions) {
  const params = new URLSearchParams({
    client_id: clientId,
    page_no: String(pageNo),
    order_type: options.orderType,
  });

  if (options.selectKey && options.selectValue) {
    params.set("select_key", options.selectKey);
    params.set("select_value", options.selectValue);
  }

  const response = await fetch(`${OPEN_API_ENDPOINT}?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`broad/list request failed (${options.orderType}, page ${pageNo}): ${response.status}`);
  }

  const json = (await response.json()) as BroadListResponse;
  return Array.isArray(json.broad) ? json.broad : [];
}

async function collectLiveMap(
  clientId: string,
  options: BroadListFetchOptions,
  seedMap?: Map<string, BroadListItem>
) {
  const targetIds = new Set(members.map((member) => member.id));
  const liveMap = seedMap ? new Map(seedMap) : new Map<string, BroadListItem>();

  for (let offset = 0; offset < MAX_PAGE; offset += 1) {
    const pageNo = options.startPage + offset;
    const broadList = await fetchBroadListPage(clientId, pageNo, options);

    if (broadList.length === 0) break;

    for (const item of broadList) {
      const userId = typeof item.user_id === "string" ? item.user_id.trim() : "";
      if (!userId || !targetIds.has(userId)) continue;

      if (!liveMap.has(userId)) {
        liveMap.set(userId, item);
      }
    }

    if (liveMap.size === targetIds.size) break;
  }

  return liveMap;
}

async function fetchLiveMapFromOpenApi(clientId: string) {
  const selectKey =
    (process.env.SOOPLIVE_BROAD_LIST_SELECT_KEY as "cate" | "lang" | undefined) ?? undefined;
  const selectValue = process.env.SOOPLIVE_BROAD_LIST_SELECT_VALUE;
  const primaryOrder =
    (process.env.SOOPLIVE_BROAD_LIST_ORDER_TYPE as "view_cnt" | "broad_start" | undefined) ??
    "view_cnt";
  const secondaryOrder = primaryOrder === "view_cnt" ? "broad_start" : "view_cnt";

  const strategyOptions: BroadListFetchOptions[] = [
    { orderType: primaryOrder, startPage: 1, selectKey, selectValue },
    { orderType: primaryOrder, startPage: 0, selectKey, selectValue },
    { orderType: secondaryOrder, startPage: 1, selectKey, selectValue },
    { orderType: secondaryOrder, startPage: 0, selectKey, selectValue },
  ];

  let liveMap = new Map<string, BroadListItem>();

  for (const options of strategyOptions) {
    liveMap = await collectLiveMap(clientId, options, liveMap);
    if (liveMap.size === members.length) break;
  }

  return liveMap;
}

export async function GET() {
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data);
  }

  const nowIso = new Date().toISOString();
  const clientId = resolveClientId();

  if (!clientId) {
    console.warn("[members/status] SOOP OpenAPI client_id missing. Fallback to offline.");

    const fallbackData = cached?.data ?? buildOfflineStatuses(nowIso);
    cached = {
      data: fallbackData,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(fallbackData);
  }

  try {
    const liveMap = await fetchLiveMapFromOpenApi(clientId);
    const data = buildStatusesFromLiveMap(liveMap, nowIso);

    cached = {
      data,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error("[members/status] broad/list fetch failed:", error);

    const fallbackData = cached?.data ?? buildOfflineStatuses(nowIso);
    cached = {
      data: fallbackData,
      expiresAt: now + CACHE_TTL_MS,
    };

    return NextResponse.json(fallbackData);
  }
}
