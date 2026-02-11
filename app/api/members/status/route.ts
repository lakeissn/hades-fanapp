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
    name: "씽귤",
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
  CHANNEL?: {
    BNO?: number | string;
    TITLE?: string;
    THUMBNAIL?: string;
    THUMB?: string;
    THUMB_URL?: string;
  };
  title?: string;
  thumbnail?: string;
  thumbUrl?: string;
};

let cached:
  | {
      data: MemberStatus[];
      expiresAt: number;
    }
  | null = null;

function pickFirstString(...values: Array<string | undefined | null>) {
  return values.find((value) => typeof value === "string" && value.trim().length > 0) ?? null;
}

function extractMetaContent(html: string, property: string) {
  const regex = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i"
  );
  const match = html.match(regex);
  return match?.[1] ?? null;
}

function extractTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1] ?? null;
}

function parseTagsFromHtml(html: string) {
  const values = new Set<string>();

  // ✅ (추가) 네가 보여준 구조: <div id="hashtag" class="tag_wrap"> ... <a>태그</a> ... </div>
  // 이 블록 안의 a 텍스트를 직접 뽑는다.
  const hashtagBlockMatch =
    html.match(/<div[^>]+id=["']hashtag["'][^>]*>([\s\S]*?)<\/div>/i) ||
    html.match(/<div[^>]+class=["'][^"']*\btag_wrap\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

  if (hashtagBlockMatch?.[1]) {
    const block = hashtagBlockMatch[1];

    // <a ...>텍스트</a> 텍스트만 추출 (class 없어도 됨)
    const aMatches = block.match(/<a\b[^>]*>([\s\S]*?)<\/a>/gi) ?? [];
    aMatches
      .map((a) => a.replace(/<[^>]+>/g, "")) // 태그 제거
      .map((t) => t.replace(/&amp;/g, "&").trim()) // 기본 엔티티 처리
      .filter(Boolean)
      .forEach((t) => values.add(t));
  }

  // (기존 로직 유지) broad_tag JSON 파싱
  const broadTagMatch = html.match(/"broad_tag"\s*:\s*\[(.*?)\]/i);
  if (broadTagMatch?.[1]) {
    const inner = broadTagMatch[1];
    const tagMatches = inner.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g) ?? [];
    tagMatches
      .map((item) => item.slice(1, -1))
      .map((item) => item.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))))
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => values.add(item));
  }

  // (기존 로직 유지) class에 tag 포함하는 DOM 텍스트
  const domLikeMatches = html.match(/class=["'][^"']*tag[^"']*["'][^>]*>([^<]{1,40})</gi) ?? [];
  domLikeMatches
    .map((chunk) => chunk.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .forEach((item) => values.add(item));

  // ✅ 너무 많이 나오면 6개까지만
  return Array.from(values).slice(0, 6);
}

async function fetchLiveMeta(liveUrl: string) {
  // ✅ (추가) Vercel 서버에서 HTML이 “다르게” 내려오거나 최소화 되는 경우가 있어서
  // 브라우저처럼 헤더를 붙여줌
  const response = await fetch(liveUrl, {
    cache: "no-store",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
  });

  const html = await response.text();
  const title = extractMetaContent(html, "og:title") ?? extractTitleTag(html);
  const thumbUrl = extractMetaContent(html, "og:image");
  const tags = parseTagsFromHtml(html);
  return { title, thumbUrl, tags };
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
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: controller.signal,
      cache: "no-store",
    });

    const data = (await response.json()) as LiveApiResponse;
    const bnoValue = Number(data.CHANNEL?.BNO ?? 0);

    if (bnoValue > 0) {
      const liveUrl = `https://play.sooplive.co.kr/${bjid}/${bnoValue}`;
      const apiTitle = pickFirstString(data.CHANNEL?.TITLE, data.title);
      const apiThumb = pickFirstString(
        data.CHANNEL?.THUMBNAIL,
        data.CHANNEL?.THUMB,
        data.CHANNEL?.THUMB_URL,
        data.thumbnail,
        data.thumbUrl
      );

      try {
        const meta = await fetchLiveMeta(liveUrl);
        return {
          isLive: true,
          liveUrl,
          title: apiTitle ?? meta.title,
          thumbUrl: apiThumb ?? meta.thumbUrl,
          tags: meta.tags,
        };
      } catch (error) {
        console.error(`[members/status] tag parse failed for ${bjid}`, error);
        return {
          isLive: true,
          liveUrl,
          title: apiTitle,
          thumbUrl: apiThumb,
          tags: [],
        };
      }
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
