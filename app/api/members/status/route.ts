import { NextResponse } from "next/server";

// 1. 기존 멤버 리스트 (100% 유지)
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

// 2. 타입 정의
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
    TAG?: string;
  };
  title?: string;
};

let cached: { data: MemberStatus[]; expiresAt: number } | null = null;

// ✅ (추가) fetch 타임아웃 유틸 (이게 핵심)
async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 6000
) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(input, {
      ...init,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// 3. 기존 유틸리티 함수들 (유지)
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
  const varPatterns = [
    /szBroadCategory\s*=\s*['"]([^'"]+)['"]/i,
    /szTags\s*=\s*['"]([^'"]+)['"]/i,
  ];

  varPatterns.forEach((pattern) => {
    const match = html.match(pattern);
    if (match?.[1]) {
      match[1]
        .split(/[,/]+/)
        .filter(Boolean)
        .forEach((p) => values.add(p.trim()));
    }
  });

  return Array.from(values);
}

// 4. HTML 메타데이터 추출 (실패해도 전체 로직에 영향 주지 않도록 설계)
async function fetchLiveMeta(liveUrl: string) {
  try {
    const response = await fetchWithTimeout(
      liveUrl,
      {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      },
      6000
    );

    if (!response.ok) return { tags: [], category: null };
    const html = await response.text();
    const categoryMatch = html.match(/szBroadCategory\s*=\s*['"]([^'"]+)['"]/i);
    return { tags: parseTagsFromHtml(html), category: categoryMatch?.[1] ?? null };
  } catch {
    return { tags: [], category: null };
  }
}

// 5. 핵심 상태 확인 함수 (정확히 함수로 감싸고 에러 전파 방지)
async function fetchStatus(bjid: string) {
  try {
    const apiUrl = `https://live.sooplive.co.kr/afreeca/player_live_api.php?bj_id=${bjid}`;

    // ✅ (수정) 여기에도 타임아웃 + 헤더 추가 (차단/무한대기 방지)
    const response = await fetchWithTimeout(
      apiUrl,
      {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json,text/plain,*/*",
          Referer: `https://play.sooplive.co.kr/${bjid}`,
        },
      },
      6000
    );

    if (!response.ok) return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };

    const data = (await response.json()) as LiveApiResponse;
    const bnoValue = Number(data.CHANNEL?.BNO ?? 0);

    // 방송 중인 경우
    if (bnoValue > 0) {
      const liveUrl = `https://play.sooplive.co.kr/${bjid}/${bnoValue}`;

      // ✅ 중요: HTML 파싱이 실패해도 방송 정보는 반환하도록 try-catch 분리
      let metaTags: string[] = [];
      let category: string | null = null;
      try {
        const meta = await fetchLiveMeta(liveUrl);
        metaTags = meta.tags;
        category = meta.category;
      } catch {
        // 여기서 throw 안 함
      }

      const apiTags = data.CHANNEL?.TAG ? data.CHANNEL.TAG.split(",").filter(Boolean) : [];
      const finalTags = new Set<string>();
      if (category) finalTags.add(category);
      metaTags.forEach((t) => finalTags.add(t));
      apiTags.forEach((t) => finalTags.add(t));

      return {
        isLive: true,
        liveUrl,
        title: pickFirstString(data.CHANNEL?.TITLE, data.title) ?? "방송 중",
        thumbUrl: pickFirstString(data.CHANNEL?.THUMBNAIL, data.CHANNEL?.THUMB, data.CHANNEL?.THUMB_URL),
        tags: Array.from(finalTags),
      };
    }

    return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };
  } catch {
    return { isLive: false, liveUrl: null, title: null, thumbUrl: null, tags: [] };
  }
}

// 6. GET 핸들러 (기존 로직 유지)
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
