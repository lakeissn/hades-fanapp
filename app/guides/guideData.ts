export type DeviceType = "pc" | "mobile";

export type GuideItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  tag: string;
  hasDeviceImages: boolean;
  images: string[];
  pcImages?: string[];
  mobileImages?: string[];
};

export type GuideCategory = {
  title: string;
  subtitle: string;
  items: GuideItem[];
};

export const GUIDE_IMAGE_BASE_URL =
  process.env.NEXT_PUBLIC_GUIDE_IMAGE_BASE_URL?.trim().replace(/\/$/, "") ?? "";

export const guideData: Record<string, GuideCategory> = {
  streaming: {
    title: "스트리밍 가이드",
    subtitle: "멜론/유튜브 스밍 설정법",
    items: [
           {
        id: "melon-setup",
        title: "멜론 스밍 설정",
        description: "멜론에서 음원 스트리밍 반영을 위한 필수 설정",
        icon: "🎵",
        tag: "MELON",
        hasDeviceImages: true,
        images: [],
        pcImages: ["/guides/images/streaming_guide_pc.jpg"],
        mobileImages: ["/guides/images/streaming_guide_m.jpg"],
      },
      {
        id: "youtube-setup",
        title: "유튜브 스밍 설정",
        description: "유튜브 뮤직비디오 조회수 반영 방법",
        icon: "▶️",
        tag: "YOUTUBE",
        hasDeviceImages: false,
        images: ["/guides/images/youtube_guide.jpg"],
      },
      {
        id: "streaming-tips",
        title: "스밍 꿀팁",
        description: "효율적인 스트리밍을 위한 팁 모음",
        icon: "💡",
        tag: "TIP",
        hasDeviceImages: false,
        images: ["/guides/images/sound_assi.jpg"],
      },
    ],
  },
  gift: {
    title: "선물하기 가이드",
    subtitle: "멜론 음원 선물하기 방법",
    items: [
      {
        id: "melon-gift",
        title: "멜론 선물하기 가이드",
        description: "멜론 음원 선물하는 방법",
        icon: "🎁",
        tag: "present",
        hasDeviceImages: true,
        images: [],
        pcImages: ["/guides/images/present_pc.jpg"],
        mobileImages: ["/guides/images/present_mobile.jpg"],
      },
    ],
  },
  download: {
    title: "다운로드 가이드",
    subtitle: "멜론 음원 다운로드 방법",
    items: [
      {
        id: "melon-download",
        title: "멜론 음원 다운로드",
        description: "멜론 음원 다운로드하는 방법",
        icon: "🎬",
        tag: "down",
        hasDeviceImages: true,
        images: [],
        pcImages: ["/guides/images/download_pc.jpg"],
        mobileImages: ["/guides/images/download_mobile.jpg"],
      },
    ],
  },
  vote: {
    title: "투표 가이드",
    subtitle: "투표 플랫폼별 투표 방법",
    items: [
      {
        id: "percent-musicpro",
        title: "음악방송 집계 반영비",
        description: "음악방송 집계 반영비",
        icon: "🏆",
        tag: "musicpro",
        hasDeviceImages: false,
        images: ["/guides/images/programv_guide_2.jpg"],
      },
      {
        id: "vote-muiscpro",
        title: "음악방송 투표 가이드",
        description: "음악방송에서 투표하는 방법",
        icon: "🎤",
        tag: "musicpro",
        hasDeviceImages: false,
        images: ["/guides/images/programv_guide.jpg"],
      },
      {
        id: "vote-mubeat",
        title: "뮤빗 투표 가이드",
        description: "뮤빗에서 투표하는 방법",
        icon: "📣",
        tag: "FANCAST",
        hasDeviceImages: false,
        images: ["/guides/images/mubeat_guide.jpg"],
      },
    ],
  },
};


export function normalizeGithubBlobUrl(url: string): string {
  const m = url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/);
  if (!m) return url;
  const [, owner, repo, branch, filePath] = m;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
}

export function buildImageCandidates(src: string): string[] {
  const next = new Set<string>();
  const normalized = normalizeGithubBlobUrl(src);

  next.add(src);
  next.add(normalized);

  if (GUIDE_IMAGE_BASE_URL && src.startsWith("/")) {
    next.add(`${GUIDE_IMAGE_BASE_URL}${src}`);
  }

  if (src.startsWith("/guides/images/")) {
    const noExt = src.replace(/\.[a-zA-Z0-9]+$/, "");
    [".png", ".jpg", ".jpeg", ".webp"].forEach((ext) => {
      next.add(`${noExt}${ext}`);
      if (GUIDE_IMAGE_BASE_URL) {
        next.add(`${GUIDE_IMAGE_BASE_URL}${noExt}${ext}`);
      }
    });
  }

  return Array.from(next)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => encodeURI(item));
}
