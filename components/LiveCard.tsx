"use client";

import { useState } from "react";

type LiveCardProps = {
  name: string;
  soopUrl: string;
  avatarUrl: string;
  coverStyle: React.CSSProperties;
};

export default function LiveCard({ name, soopUrl, avatarUrl, coverStyle }: LiveCardProps) {
  const [avatarError, setAvatarError] = useState(false);
  const initials = name.slice(0, 2);

  return (
    <a className="live-card" href={soopUrl} target="_blank" rel="noreferrer">
      <div className="live-cover" style={coverStyle}>
        <span className="live-badge">
          <span className="live-dot" /> LIVE
        </span>
      </div>
      <div className="live-info">
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
        <div>
          <p className="live-name">{name}</p>
          <p className="live-status">방송중</p>
        </div>
      </div>
    </a>
  );
}
