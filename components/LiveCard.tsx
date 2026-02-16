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

  const allTags = (tags ?? []).filter(t => t !== "한국어");
  const visibleTags = allTags.slice(0, 3);

  return (
    <a className="live-card" href={soopUrl} target="_blank" rel="noreferrer">
      <div className="live-cover" style={thumbUrl ? undefined : coverStyle}>
        {thumbUrl ? (
          <img className="live-cover-img" src={thumbUrl} alt="" />
        ) : (
          <div className="live-cover-fallback" />
        )}
        <span className="live-badge"><span className="live-dot" /> LIVE</span>
        <div className="live-overlay">
          <div className="live-avatar">
            {avatarError ? <span>{initials}</span> : (
              <img src={avatarUrl} alt={`${name} 프로필`} onError={() => setAvatarError(true)} />
            )}
          </div>
          <div className="live-text">
            <p className="live-name">{name}</p>
            <p className="live-title">{title ?? "방송 준비 중"}</p>
            {visibleTags.length > 0 && (
              <div className="live-tags">
                {visibleTags.map(tag => (
                  <span key={tag} className="live-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </a>
  );
}
