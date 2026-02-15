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

type SearchBroadItem = {
  user_id?: string;
  broad_no?: number | string;
  broad_title?: string;
  broad_cate_name?: string;
  broad_category?: string;
  broad_tag?: string;
  hash_tags?: string[];
  thumb?: string;
  thumb_url?: string;
  mobile_thumb?: string;
  pc_thumb?: string;
  sn_thumb?: string;
};

type SearchApiResponse = {
  REAL_BROAD?: SearchBroadItem[];
  broad_list?: SearchBroadItem[];
  BROAD?: SearchBroadItem[];
};

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

let cached: { data: MemberStatus[]; expiresAt: number } | null = null;

function pickFirstString(...values: Array<string | undefined | null>) {
  return (
    values.find((value) => typeof value === "string" && value.trim().length > 0) ??
    null
  );
}

function parseBroadcastNo(raw: unknown): string | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return String(Math.trunc(raw));
  }

  if (typeof raw === "string") {
    const normalized = raw.trim();
    if (!normalized) return null;

    const directDigits = normalized.match(/^\d+$/)?.[0];
    if (directDigits) return directDigits;

    const embeddedDigits = normalized.match(/(\d{6,})/);
    if (embeddedDigits?.[1]) return embeddedDigits[1];
  }

  return null;
}

function extractMetaContent(html: string, property: string) {
  const regex = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(regex);
  if (match?.[1]) return match[1];

  const regex2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["'][^>]*>`,
    "i"
  );
  const match2 = html.match(regex2);
  return match2?.[1] ?? null;
}

function extractTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ?? null;
}

function decodeUnicode(str: string) {
  return str.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function safeJsonParse<T>(raw: string): T | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const candidates = [trimmed];
  if (trimmed.startsWith(")]}'")) {
    candidates.push(trimmed.replace(/^\)\]\}'\s*/, ""));
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // noop
    }
  }

  return null;
}

function extractBroadcastNoFromRaw(raw: string): string | null {
  const patterns = [
    /"BNO"\s*:\s*"?(\d{6,})"?/i,
    /"bno"\s*:\s*"?(\d{6,})"?/i,
    /"broad_no"\s*:\s*"?(\d{6,})"?/i,
    /"broadNo"\s*:\s*"?(\d{6,})"?/i,
    /"nBroadNo"\s*:\s*"?(\d{6,})"?/i,
    /\/play\.sooplive\.co\.kr\/[^\s"']+\/(\d{6,})/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

function extractTitleFromRaw(raw: string): string | null {
  const patterns = [
    /"TITLE"\s*:\s*"([^"]+)"/i,
    /"title"\s*:\s*"([^"]+)"/i,
    /<title[^>]*>([^<]+)<\/title>/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return decodeUnicode(match[1]).trim();
  }

  return null;
}

function extractThumbFromRaw(raw: string): string | null {
  const patterns = [
    /"THUMBNAIL"\s*:\s*"([^"]+)"/i,
    /"THUMB_URL"\s*:\s*"([^"]+)"/i,
    /"thumb_url"\s*:\s*"([^"]+)"/i,
    /"thumbUrl"\s*:\s*"([^"]+)"/i,
    /"og:image"\s+content=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return decodeUnicode(match[1]).trim();
  }

  return null;
}

function detectLiveFromRaw(raw: string) {
  const patterns = [
    /"is_live"\s*:\s*"?Y"?/i,
    /"live_yn"\s*:\s*"?Y"?/i,
    /"onair"\s*:\s*true/i,
    /"broad_status"\s*:\s*"?on"?/i,
    /"RESULT"\s*:\s*1/i,
    /"CHANNEL_STATUS"\s*:\s*"?1"?/i,
  ];

  return patterns.some((pattern) => pattern.test(raw));
}

function parseTagsFromHtml(html: string) {
  const values = new Set<string>();

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

  const ogUrl = extractMetaContent(html, "og:url");
  if (ogUrl) {
    const match = ogUrl.match(new RegExp(`play\\.sooplive\\.co\\.kr/${bjid}/(\\d{6,})`, "i"));
    if (match?.[1]) {
      return `https://play.sooplive.co.kr/${bjid}/${match[1]}`;
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
    const response = await fetch(stationUrl, {
      headers: {
        ...COMMON_HEADERS,
        referer: stationUrl,
      },
      cache: "no-store",
    });
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

async function callPlayerLiveApi(bjid: string, signal: AbortSignal) {
  const endpoint = "https://live.sooplive.co.kr/afreeca/player_live_api.php";

  const payloads = [
    {
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
    },
    {
      bid: bjid,
      bno: "",
      type: "live",
      pwd: "",
      player_type: "html5",
      stream_type: "common",
      quality: "HD",
      mode: "watch",
      from_api: "1",
      is_revive: "false",
    },
  ];

  for (const payload of payloads) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...COMMON_HEADERS,
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://play.sooplive.co.kr",
        referer: `https://play.sooplive.co.kr/${bjid}`,
      },
      body: new URLSearchParams(payload).toString(),
      signal,
      cache: "no-store",
    });

    const raw = await response.text();
    if (!raw.trim()) continue;

    return {
      raw,
      json: safeJsonParse<LiveApiResponse>(raw),
    };
  }

  return {
    raw: "",
    json: null,
  };
}

function parseTagsFromSearchItem(item: SearchBroadItem) {
  const tags: string[] = [];

  const category = pickFirstString(item.broad_cate_name, item.broad_category);
  if (category) tags.push(category);

  if (typeof item.broad_tag === "string") {
    item.broad_tag
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => tags.push(tag));
  }

  if (Array.isArray(item.hash_tags)) {
    item.hash_tags
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .forEach((tag) => tags.push(tag));
  }

  return Array.from(new Set(tags)).slice(0, 7);
}

async function fetchSearchLive(bjid: string, signal: AbortSignal) {
  try {
    const params = new URLSearchParams({
      m: "search",
      v: "1.0",
      szOrder: "score",
      szKeyword: bjid,
      c: "UTF-8",
    });

    const response = await fetch(`https://sch.sooplive.co.kr/api.php?${params.toString()}`, {
      headers: {
        ...COMMON_HEADERS,
        referer: "https://www.sooplive.co.kr/",
      },
      signal,
      cache: "no-store",
    });

    const raw = await response.text();
    const json = safeJsonParse<SearchApiResponse>(raw);

    const candidates = [
      ...(json?.REAL_BROAD ?? []),
      ...(json?.broad_list ?? []),
      ...(json?.BROAD ?? []),
    ];

    const found = candidates.find((item) => item.user_id === bjid);
    if (!found) return null;

    const broadNo = parseBroadcastNo(found.broad_no);
    if (!broadNo) return null;

    return {
      broadNo,
      title: pickFirstString(found.broad_title),
      thumbUrl: pickFirstString(
        found.thumb,
        found.thumb_url,
        found.mobile_thumb,
        found.pc_thumb,
        found.sn_thumb
      ),
      tags: parseTagsFromSearchItem(found),
    };
  } catch {
    return null;
  }
}

async function fetchStatus(bjid: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const { raw, json } = await callPlayerLiveApi(bjid, controller.signal);

    const bnoCandidates = [
      json?.CHANNEL?.BNO,
      json?.CHANNEL?.broad_no,
      json?.CHANNEL?.broadNo,
      json?.CHANNEL?.nBroadNo,
      json?.BNO,
      json?.broad_no,
      json?.broadNo,
      json?.nBroadNo,
      json?.RMD?.broad_no,
      json?.RMD?.broadNo,
      json?.RMD?.nBroadNo,
      json?.DATA?.broad_no,
      json?.DATA?.broadNo,
      json?.DATA?.nBroadNo,
      extractBroadcastNoFromRaw(raw),
    ];

    let bno =
      bnoCandidates
        .map((candidate) => parseBroadcastNo(candidate))
        .find((candidate): candidate is string => !!candidate) ?? null;

    let apiTitle = pickFirstString(
      json?.CHANNEL?.TITLE,
      json?.RMD?.title,
      json?.DATA?.title,
      json?.title,
      extractTitleFromRaw(raw)
    );

    const apiThumb = pickFirstString(
      json?.CHANNEL?.THUMBNAIL,
      json?.CHANNEL?.THUMB,
      json?.CHANNEL?.THUMB_URL,
      json?.RMD?.thumb,
      json?.RMD?.thumb_url,
      json?.DATA?.thumb,
      json?.DATA?.thumb_url,
      json?.thumbnail,
      json?.thumbUrl,
      extractThumbFromRaw(raw)
    );

    const apiTags: string[] = [];
    if (json?.CHANNEL?.CATE_NAME) apiTags.push(json.CHANNEL.CATE_NAME);
    if (json?.CHANNEL?.BROAD_CATE) apiTags.push(json.CHANNEL.BROAD_CATE);
    if (json?.CHANNEL?.HASH_TAGS && Array.isArray(json.CHANNEL.HASH_TAGS)) {
      json.CHANNEL.HASH_TAGS.forEach((t) => apiTags.push(t));
    }
    if (json?.CHANNEL?.TAG) {
      json.CHANNEL.TAG.split(",").forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) apiTags.push(trimmed);
      });
    }

    if (!bno) {
      const searchLive = await fetchSearchLive(bjid, controller.signal);
      if (searchLive) {
        bno = searchLive.broadNo;
        apiTitle = apiTitle ?? searchLive.title;
        apiTags.push(...searchLive.tags);
      }
    }

    if (bno) {
      const liveUrl = `https://play.sooplive.co.kr/${bjid}/${bno}`;
      const [meta, stationMeta] = await Promise.all([
        fetchLiveMeta(liveUrl),
        apiTags.length < 4
          ? fetchStationMeta(bjid)
          : Promise.resolve({ title: null, thumbUrl: null, tags: [], liveUrl: null, isLive: false }),
      ]);

      const combinedTags = Array.from(
        new Set([...apiTags, ...meta.tags, ...stationMeta.tags])
      ).filter(Boolean);

      return {
        isLive: true,
        liveUrl,
        title: apiTitle ?? meta.title ?? stationMeta.title,
        thumbUrl: apiThumb ?? meta.thumbUrl ?? stationMeta.thumbUrl,
        tags: combinedTags.slice(0, 7),
      };
    }

    const stationMeta = await fetchStationMeta(bjid);
    if (stationMeta.liveUrl) {
      const liveMeta = await fetchLiveMeta(stationMeta.liveUrl);
      const combinedTags = Array.from(
        new Set([...apiTags, ...stationMeta.tags, ...liveMeta.tags])
      ).filter(Boolean);

      return {
        isLive: true,
        liveUrl: stationMeta.liveUrl,
        title: apiTitle ?? liveMeta.title ?? stationMeta.title,
        thumbUrl: apiThumb ?? liveMeta.thumbUrl ?? stationMeta.thumbUrl,
        tags: combinedTags.slice(0, 7),
      };
    }

    const apiSaysLive = detectLiveFromRaw(raw);
    if (apiSaysLive || stationMeta.isLive) {
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
