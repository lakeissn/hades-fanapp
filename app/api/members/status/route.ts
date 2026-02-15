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

type LiveApiResponse = {
  RESULT?: number | string;
  BNO?: number | string;
  broad_no?: number | string;
  broadNo?: number | string;
  nBroadNo?: number | string;
  CHANNEL_STATUS?: string;
  channel_status?: string;
  RMD?: {
    broad_no?: number | string;
    broadNo?: number | string;
    nBroadNo?: number | string;
    title?: string;
    thumb?: string;
    thumb_url?: string;
  };
  DATA?: {
    broad_no?: number | string;
    broadNo?: number | string;
    nBroadNo?: number | string;
    title?: string;
    thumb?: string;
    thumb_url?: string;
  };
  CHANNEL?: {
    BNO?: number | string;
    broad_no?: number | string;
    broadNo?: number | string;
    nBroadNo?: number | string;
    TITLE?: string;
    THUMBNAIL?: string;
    THUMB?: string;
    THUMB_URL?: string;
    CATE_NAME?: string;
    TAG?: string;
    HASH_TAGS?: string[];
    BROAD_CATE?: string;
  };
  title?: string;
  thumbnail?: string;
  thumbUrl?: string;
};

const COMMON_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

let cached: { data: MemberStatus[]; expiresAt: number } | null = null;

function pickFirstString(...values: Array<string | undefined | null>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0) ?? null;
}

function parseBroadcastNo(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return String(Math.trunc(raw));
  }

  if (typeof raw === "string") {
    const normalized = raw.trim();
    if (!normalized) return null;

    // 예: "291653116", "bno=291653116", "291653116/" 형태 대응
    const directDigits = normalized.match(/^\d+$/)?.[0];
    if (directDigits) return directDigits;

    const embeddedDigits = normalized.match(/(\d{6,})/);
    if (embeddedDigits?.[1]) return embeddedDigits[1];
  }

  return null;
}

function extractMetaContent(html: string, property: string) {
  const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  const match = html.match(regex);
  if (match?.[1]) return match[1];

  // content가 property 앞에 올 수도 있음
  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`, "i");
  const match2 = html.match(regex2);
  return match2?.[1] ?? null;
}

function extractTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ?? null;
}

function decodeUnicode(str: string) {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseTagsFromHtml(html: string) {
  const values = new Set<string>();

  // 1) broad_tag JSON 배열
  const broadTagMatch = html.match(/"broad_tag"\s*:\s*\[(.*?)\]/i);
  if (broadTagMatch?.[1]) {
    const inner = broadTagMatch[1];
    const tagMatches = inner.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g) ?? [];
    tagMatches
      .map((item) => item.slice(1, -1))
      .map(decodeUnicode)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => values.add(item));
  }

  // 2) hash_tags 배열
  const hashTagsMatch = html.match(/"hash_tags"\s*:\s*\[(.*?)\]/i);
  if (hashTagsMatch?.[1]) {
    const inner = hashTagsMatch[1];
    const tagMatches = inner.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g) ?? [];
    tagMatches
      .map((item) => item.slice(1, -1))
      .map(decodeUnicode)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => values.add(item));
  }

  // 3) hashTags (camelCase)
  const hashTagsCamelMatch = html.match(/"hashTags"\s*:\s*\[(.*?)\]/i);
  if (hashTagsCamelMatch?.[1]) {
    const inner = hashTagsCamelMatch[1];
    const tagMatches = inner.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g) ?? [];
    tagMatches
      .map((item) => item.slice(1, -1))
      .map(decodeUnicode)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => values.add(item));
  }

  // 4) cate_name / category 키
  const catePatterns = [
    /"cate_name"\s*:\s*"([^"]+)"/i,
    /"category_name"\s*:\s*"([^"]+)"/i,
    /"broad_cate_name"\s*:\s*"([^"]+)"/i,
    /"category"\s*:\s*"([^"]+)"/i,
  ];
  for (const pattern of catePatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const decoded = decodeUnicode(match[1]).trim();
      if (decoded) values.add(decoded);
    }
  }

  // 5) og:description에서 태그 추출 시도 (# 으로 시작하는 해시태그)
  const ogDesc = extractMetaContent(html, "og:description");
  if (ogDesc) {
    const hashTagParts = ogDesc.match(/#([^\s#,]+)/g);
    if (hashTagParts) {
      hashTagParts
        .map((t) => t.replace(/^#/, "").trim())
        .filter(Boolean)
        .forEach((t) => values.add(t));
    }
  }

  // 6) data-tag 속성에서 태그 추출
  const dataTagMatches = html.match(/data-tag="([^"]+)"/g);
  if (dataTagMatches) {
    dataTagMatches.forEach((match) => {
      const value = match.replace(/data-tag="/, "").replace(/"$/, "").trim();
      if (value) {
        value.split(",").forEach((t) => {
          const trimmed = t.trim();
          if (trimmed) values.add(trimmed);
        });
      }
    });
  }

  // 7) 태그 클래스/영역에서 텍스트 추출 (태그 목록이 HTML에 있는 경우)
  const tagListMatch = html.match(/class="[^"]*tag[^"]*"[^>]*>([^<]+)</gi);
  if (tagListMatch) {
    tagListMatch.forEach((match) => {
      const textMatch = match.match(/>([^<]+)$/);
      if (textMatch?.[1]) {
        const text = textMatch[1].trim();
        if (text && text.length < 20 && !text.includes("{") && !text.includes("(")) {
          values.add(text);
        }
      }
    });
  }

  return Array.from(values).slice(0, 7);
}

function detectLiveFromHtml(html: string) {
  const patterns = [
    /"is_live"\s*:\s*"?Y"?/i,
    /"live_yn"\s*:\s*"?Y"?/i,
    /"onair"\s*:\s*true/i,
    /"broad_status"\s*:\s*"?on"?/i,
  ];

  return patterns.some((pattern) => pattern.test(html));
}

function extractLiveUrlFromHtml(html: string, bjid: string) {
  const patterns = [
    new RegExp(`https?:\\/\\/play\\.sooplive\\.co\\.kr\\/${bjid}\\/(\\d{6,})`, "i"),
    new RegExp(`https?:\\\\/\\\\/play\\.sooplive\\.co\\.kr\\\\/${bjid}\\\\/(\\d{6,})`, "i"),
    new RegExp(`\\/play\\.sooplive\\.co\\.kr\\/${bjid}\\/(\\d{6,})`, "i"),
    new RegExp(`\\\\/play\\.sooplive\\.co\\.kr\\\\/${bjid}\\\\/(\\d{6,})`, "i"),
    /"bno"\s*:\s*"?(\d{6,})"?/i,
    /"BNO"\s*:\s*"?(\d{6,})"?/i,
    /"broad_no"\s*:\s*"?(\d{6,})"?/i,
    /"broadNo"\s*:\s*"?(\d{6,})"?/i,
    /"nBroadNo"\s*:\s*"?(\d{6,})"?/i,
  ];

  for (const pattern of patterns) {
    const m = html.match(pattern);
    if (m?.[1]) {
      return `https://play.sooplive.co.kr/${bjid}/${m[1]}`;
    }
  }

  return null;
}

async function fetchLiveMeta(liveUrl: string) {
  try {
    const response = await fetch(liveUrl, { headers: COMMON_HEADERS, cache: "no-store" });
    const html = await response.text();
    const title = extractMetaContent(html, "og:title") ?? extractTitleTag(html);
    const thumbUrl = extractMetaContent(html, "og:image");
    const tags = parseTagsFromHtml(html);
    return { title, thumbUrl, tags };
  } catch {
    return { title: null, thumbUrl: null, tags: [] };
  }
}

async function fetchStationMeta(bjid: string) {
  try {
    const stationUrl = `https://play.sooplive.co.kr/${bjid}`;
    const response = await fetch(stationUrl, { headers: COMMON_HEADERS, cache: "no-store" });
    const html = await response.text();

    const title = extractMetaContent(html, "og:title") ?? extractTitleTag(html);
    const thumbUrl = extractMetaContent(html, "og:image");
    const tags = parseTagsFromHtml(html);
    const liveUrlFromHtml = extractLiveUrlFromHtml(html, bjid);
    const liveUrlFromRedirect =
      response.url && response.url.includes(`/play.sooplive.co.kr/${bjid}/`)
        ? response.url
        : null;
    const liveUrl = liveUrlFromHtml ?? liveUrlFromRedirect;
    const isLive = detectLiveFromHtml(html) || !!liveUrl;

    return { title, thumbUrl, tags, liveUrl, isLive };
  } catch {
    return { title: null, thumbUrl: null, tags: [], liveUrl: null, isLive: false };
  }
}

/**
 * [분석 대응] 19+ 또는 시네티 등 특수 방송의 경우 player_live_api가 실패하고
 * 스테이션 페이지도 로그인 게이트로 인해 파싱이 실패할 수 있음.
 * 이 경우 SOOP의 검색 API(누구나 접근 가능)를 통해 broad_no를 조회하여 복구함.
 */
async function fetchSearch(bjid: string) {
  try {
    const params = new URLSearchParams({
      m: "search",
      v: "1.0",
      szOrder: "score",
      szKeyword: bjid,
      c: "UTF-8",
    });
    // SOOP(구 아프리카) 검색 API
    const res = await fetch(`https://sch.sooplive.co.kr/api.php?${params.toString()}`, {
      headers: {
        ...COMMON_HEADERS,
        "Referer": "https://sooplive.co.kr/",
      },
      cache: "no-store",
    });
    
    if (!res.ok) return null;
    const json = await res.json();
    
    const realBroad = json?.REAL_BROAD;
    if (Array.isArray(realBroad)) {
      // 검색 결과 중 내 ID와 일치하는 방송 찾기
      const found = realBroad.find((item: any) => item.user_id === bjid);
      if (found && found.broad_no) {
        return {
          broadNo: String(found.broad_no),
          title: found.broad_title,
          thumb: found.sn_thumb || found.total_view_cnt, // fallback logic
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

async function fetchStatus(bjid: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const body = new URLSearchParams({
      bid: bjid,
      bno: "null",
      type: "live",
      pwd: "",
      player_type: "html5",
      stream_type: "common",
      quality: "HD",
      mode: "landing",
      from_api: "0",
      is_revive: "false",
    });

    const response = await fetch("https://live.sooplive.co.kr/afreeca/player_live_api.php", {
      method: "POST",
      headers: {
        ...COMMON_HEADERS,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: controller.signal,
      cache: "no-store",
    });

    const data = (await response.json()) as LiveApiResponse;

    const bnoCandidates = [
      data.CHANNEL?.BNO,
      data.CHANNEL?.broad_no,
      data.CHANNEL?.broadNo,
      data.CHANNEL?.nBroadNo,
      data.BNO,
      data.broad_no,
      data.broadNo,
      data.nBroadNo,
      data.RMD?.broad_no,
      data.RMD?.broadNo,
      data.RMD?.nBroadNo,
      data.DATA?.broad_no,
      data.DATA?.broadNo,
      data.DATA?.nBroadNo,
    ];

    let bno = bnoCandidates
      .map((candidate) => parseBroadcastNo(candidate))
      .find((candidate): candidate is string => !!candidate) ?? null;

    let apiTitle = pickFirstString(
      data.CHANNEL?.TITLE,
      data.RMD?.title,
      data.DATA?.title,
      data.title
    );
    let apiThumb = pickFirstString(
      data.CHANNEL?.THUMBNAIL,
      data.CHANNEL?.THUMB,
      data.CHANNEL?.THUMB_URL,
      data.RMD?.thumb,
      data.RMD?.thumb_url,
      data.DATA?.thumb,
      data.DATA?.thumb_url,
      data.thumbnail,
      data.thumbUrl
    );

    // [Fix] player_live_api가 실패했거나 bno가 없는 경우, 검색 API로 2차 시도 (시네티/19+ 대응)
    if (!bno) {
      const searchResult = await fetchSearch(bjid);
      if (searchResult) {
        bno = searchResult.broadNo;
        if (!apiTitle) apiTitle = searchResult.title;
        // 썸네일은 검색 API가 저해상도일 수 있으므로 메타데이터에서 다시 가져오도록 유도
      }
    }

    // API 응답에서 태그 추출
    const apiTags: string[] = [];
    if (data.CHANNEL?.CATE_NAME) apiTags.push(data.CHANNEL.CATE_NAME);
    if (data.CHANNEL?.BROAD_CATE) apiTags.push(data.CHANNEL.BROAD_CATE);
    if (data.CHANNEL?.HASH_TAGS && Array.isArray(data.CHANNEL.HASH_TAGS)) {
      data.CHANNEL.HASH_TAGS.forEach((t) => apiTags.push(t));
    }
    if (data.CHANNEL?.TAG) {
      data.CHANNEL.TAG.split(",").forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) apiTags.push(trimmed);
      });
    }

    if (bno) {
      const liveUrl = `https://play.sooplive.co.kr/${bjid}/${bno}`;

      try {
        // 라이브 페이지 + 방송국 페이지에서 태그 보강
        const [meta, stationMeta] = await Promise.all([
          fetchLiveMeta(liveUrl),
          apiTags.length < 4
            ? fetchStationMeta(bjid)
            : Promise.resolve({ title: null, thumbUrl: null, tags: [], liveUrl: null, isLive: false }),
        ]);

        const combinedTags = Array.from(new Set([...apiTags, ...meta.tags, ...stationMeta.tags])).filter(Boolean);

        return {
          isLive: true,
          liveUrl,
          title: apiTitle ?? meta.title ?? stationMeta.title,
          thumbUrl: apiThumb ?? meta.thumbUrl ?? stationMeta.thumbUrl,
          tags: combinedTags.slice(0, 7),
        };
      } catch {
        return {
          isLive: true,
          liveUrl,
          title: apiTitle,
          thumbUrl: apiThumb,
          tags: apiTags.slice(0, 7),
        };
      }
    }

    // [fallback] 일부 컨텐츠(예: 시네티)에서 player_live_api의 BNO가 비어있는 케이스 대응
    const stationMeta = await fetchStationMeta(bjid);
    if (stationMeta.liveUrl) {
      const liveMeta = await fetchLiveMeta(stationMeta.liveUrl);
      const combinedTags = Array.from(new Set([...apiTags, ...stationMeta.tags, ...liveMeta.tags])).filter(Boolean);

      return {
        isLive: true,
        liveUrl: stationMeta.liveUrl,
        title: apiTitle ?? liveMeta.title ?? stationMeta.title,
        thumbUrl: apiThumb ?? liveMeta.thumbUrl ?? stationMeta.thumbUrl,
        tags: combinedTags.slice(0, 7),
      };
    }

    if (stationMeta.isLive) {
      return {
        isLive: true,
        liveUrl: `https://play.sooplive.co.kr/${bjid}`,
        title: apiTitle ?? stationMeta.title,
        thumbUrl: apiThumb ?? stationMeta.thumbUrl,
        tags: Array.from(new Set([...apiTags, ...stationMeta.tags])).slice(0, 7),
      };
    }

    return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };
  } catch {
    return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET() {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return NextResponse.json(cached.data);
  }

  const results: MemberStatus[] = await Promise.all(
    members.map(async (member) => {
      const status = await fetchStatus(member.id);
      return {
        ...member,
        ...status,
        fetchedAt: new Date().toISOString(),
      };
    })
  );

  cached = {
    data: results,
    expiresAt: now + 20_000,
  };

  return NextResponse.json(results);
}
