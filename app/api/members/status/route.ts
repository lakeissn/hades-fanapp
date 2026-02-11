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

  const domLikeMatches = html.match(/class=["'][^"']*tag[^"']*["'][^>]*>([^<]{1,40})</gi) ?? [];
  domLikeMatches
    .map((chunk) => chunk.replace(/<[^>]+>/g, "").trim())
    .filter(Boolean)
    .forEach((item) => values.add(item));

  return Array.from(values).slice(0, 5);
}

async function fetchLiveMeta(liveUrl: string) {
  const response = await fetch(liveUrl, { cache: "no-store" });
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
