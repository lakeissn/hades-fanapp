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

  const backgroundStyle = thumbUrl
    ? {
        backgroundImage: `url(${thumbUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : coverStyle;

  return (
    <a className="live-card" href={soopUrl} target="_blank" rel="noreferrer">
      <div className="live-cover" style={backgroundStyle}>
        <span className="live-badge">
          <span className="live-dot" /> LIVE
        </span>
      </div>
      <div className="live-body">
        <div className="live-header">
          <div className="avatar">
            {avatarError ? (
              <span>{initials}</span>
            ) : (
              <img
                src={avatarUrl}
                alt={`${name} 프로필`}
                onError={() => setAvatarError(true)}
              />
            )}
          </div>
          <p className="live-name">{name}</p>
        </div>
        <p className="live-title">{title ?? "방송 준비 중"}</p>
        <div className="tag-row">
          {tags.slice(0, 4).map((tag) => (
            <span key={tag} className="tag-pill">
              {tag}
            </span>
          ))}
        </div>
      </div>
    </a>
  );
}
