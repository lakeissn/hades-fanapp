"use client";

import { useState } from "react";

type LiveCardProps = {
  name: string;
  soopUrl: string;
  avatarUrl: string;
  coverStyle: React.CSSProperties;
  title: string | null;
  thumbUrl: string | null;
  tags: string[];
};

export default function LiveCard({
  name,
  soopUrl,
  avatarUrl,
  coverStyle,
  title,
  thumbUrl,
  tags,
}: LiveCardProps) {
  const [avatarError, setAvatarError] = useState(false);
  const initials = name.slice(0, 2);

  // (11) 태그 필터링: '한국어' 제외 → 첫 번째 = 카테고리, 나머지 = 태그
  // 카테고리 1개 + 모든 태그 순서로 표시 (최대 5개)
  const allTags = (tags ?? []).filter(t => t !== "한국어");
  const visibleTags = allTags.slice(0, 5);

  return (
    <a className="live-card" href={soopUrl} target="_blank" rel="noreferrer">
      <div className="live-cover" style={thumbUrl ? undefined : coverStyle}>
        {thumbUrl ? (
          <>
            <div className="live-cover-bg" style={{ backgroundImage: `url(${thumbUrl})` }} />
            <img className="live-cover-img" src={thumbUrl} alt="" />
          </>
        ) : (
          <div className="live-cover-fallback" />
        )}
        <span className="live-badge"><span className="live-dot" /> LIVE</span>
      </div>
      <div className="live-body">
        <div className="avatar">
          {avatarError ? <span>{initials}</span> : (
            <img src={avatarUrl} alt={`${name} 프로필`} onError={() => setAvatarError(true)} />
          )}
        </div>
        <div className="live-text">
          <p className="live-name">{name}</p>
          <p className="live-title">{title ?? "방송 준비 중"}</p>
          {visibleTags.length > 0 && (
            <div className="tag-row">
              {visibleTags.map((tag) => (
                <span key={tag} className="tag-pill">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}
