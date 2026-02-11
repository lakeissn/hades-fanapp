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
    TAG?: string; // ✅ 추가
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

function normalizeTags(raw: string | undefined | null) {
  if (!raw) return [];
  // SOOP TAG는 보통 콤마로 오는데, 혹시 공백/슬래시 섞여도 대응
  return raw
    .split(/[,/]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
}

async function fetchStatus(bjid: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    // ✅ 1) Codex 코드의 POST 호출 유지 (bno/title/thumb 가져오기용)
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

    const postRes = await fetch("https://live.sooplive.co.kr/afreeca/player_live_api.php", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: controller.signal,
      cache: "no-store",
    });

    const postData = (await postRes.json()) as LiveApiResponse;
    const bnoValue = Number(postData.CHANNEL?.BNO ?? 0);

    if (bnoValue > 0) {
      const liveUrl = `https://play.sooplive.co.kr/${bjid}/${bnoValue}`;

      const apiTitle = pickFirstString(postData.CHANNEL?.TITLE, postData.title);
      const apiThumb = pickFirstString(
        postData.CHANNEL?.THUMBNAIL,
        postData.CHANNEL?.THUMB,
        postData.CHANNEL?.THUMB_URL,
        postData.thumbnail,
        postData.thumbUrl
      );

      // ✅ 2) 태그는 HTML 파싱 대신 GET(bj_id=)에서 CHANNEL.TAG를 “추가로” 확보
      // (POST 응답에 TAG가 안 오거나, 타입/필드가 빠지는 경우가 있어서 분리)
      let tags: string[] = [];
      try {
        const getRes = await fetch(
          `https://live.sooplive.co.kr/afreeca/player_live_api.php?bj_id=${encodeURIComponent(bjid)}`,
          { cache: "no-store" }
        );
        if (getRes.ok) {
          const getData = (await getRes.json()) as LiveApiResponse;
          tags = normalizeTags(getData.CHANNEL?.TAG) || [];
        }
      } catch {
        // 태그 GET 실패해도 라이브 자체는 표시되게
      }

      // 혹시 POST에 TAG가 들어오는 경우도 있으니 합쳐줌
      const merged = new Set<string>();
      normalizeTags(postData.CHANNEL?.TAG).forEach((t) => merged.add(t));
      tags.forEach((t) => merged.add(t));

      return {
        isLive: true,
        liveUrl,
        title: apiTitle ?? "방송 중",
        thumbUrl: apiThumb ?? null,
        tags: Array.from(merged).slice(0, 8),
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
