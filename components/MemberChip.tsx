"use client";

import { useState } from "react";

type MemberChipProps = {
  name: string;
  avatarUrl: string;
};

export default function MemberChip({ name, avatarUrl }: MemberChipProps) {
  const [avatarError, setAvatarError] = useState(false);
  const initials = name.slice(0, 2);

  return (
    <div className="member-chip">
      <div className="chip-avatar">
        {avatarError ? (
          <span>{initials}</span>
        ) : (
          <img src={avatarUrl} alt={`${name} 프로필`} onError={() => setAvatarError(true)} />
        )}
      </div>
      <div>
        <p className="chip-name">{name}</p>
        <p className="chip-status">오프라인</p>
      </div>
    </div>
  );
}
