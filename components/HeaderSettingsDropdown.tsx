"use client";

import { Moon, Sun } from "lucide-react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { activatePush, deactivatePush, syncPrefsToServer } from "./NotificationManager";

type Theme = "dark" | "light";
type NotificationSettings = {
  master: boolean;
  liveBroadcast: boolean;
  newVote: boolean;
  newYoutube: boolean;
};

const DEFAULT_NOTIF: NotificationSettings = {
  master: false,
  liveBroadcast: false,
  newVote: false,
  newYoutube: false,
};

function loadTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    const saved = localStorage.getItem("hades_theme");
    if (saved === "dark" || saved === "light") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

function loadNotifSettings(): NotificationSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIF;
  try {
    const raw = localStorage.getItem("hades_notif_settings");
    const merged = raw ? { ...DEFAULT_NOTIF, ...JSON.parse(raw) } : DEFAULT_NOTIF;
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return DEFAULT_NOTIF;
    }
    return merged;
  } catch {
    return DEFAULT_NOTIF;
  }
}

const Toggle = memo(function Toggle({
  active,
  onToggle,
  disabled,
}: {
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`toggle ${active ? "active" : ""}`}
      role="switch"
      aria-checked={active}
      onClick={disabled ? undefined : onToggle}
    />
  );
});

type Props = {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
};

export default function HeaderSettingsDropdown({ isOpen, onClose, anchorRef }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<Theme>("light");
  const [notif, setNotif] = useState<NotificationSettings>(DEFAULT_NOTIF);
  const [permissionState, setPermissionState] = useState<string>("default");
  const [isActivating, setIsActivating] = useState(false);

  useEffect(() => {
    setTheme(loadTheme());
    setNotif(loadNotifSettings());
    if ("Notification" in window) setPermissionState(Notification.permission);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      const anchor = anchorRef.current;
      const panel = panelRef.current;
      if (anchor?.contains(e.target as Node) || panel?.contains(e.target as Node)) return;
      onClose();
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose, anchorRef]);

  const changeTheme = useCallback((t: Theme) => {
    setTheme(t);
    localStorage.setItem("hades_theme", t);
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.style.backgroundColor = t === "dark" ? "#0a0a0a" : "#f5f5f5";
  }, []);

  const toggleMaster = useCallback(async () => {
    if (isActivating) return;
    if (!notif.master) {
      setIsActivating(true);
      try {
        const success = await activatePush();
        if (success) {
          const next = {
            ...notif,
            master: true,
            liveBroadcast: true,
            newVote: true,
            newYoutube: true,
          };
          setNotif(next);
          localStorage.setItem("hades_notif_settings", JSON.stringify(next));
          setPermissionState("granted");
          window.dispatchEvent(new Event("hades_prefs_changed"));
        } else if ("Notification" in window) {
          setPermissionState(Notification.permission);
        }
      } finally {
        setIsActivating(false);
      }
      return;
    }
    const next = { ...notif, master: false };
    setNotif(next);
    localStorage.setItem("hades_notif_settings", JSON.stringify(next));
    await deactivatePush();
    window.dispatchEvent(new Event("hades_prefs_changed"));
  }, [notif, isActivating]);

  const toggleSub = useCallback(
    async (key: keyof Omit<NotificationSettings, "master">) => {
      const next = { ...notif, [key]: !notif[key] };
      setNotif(next);
      localStorage.setItem("hades_notif_settings", JSON.stringify(next));
      await syncPrefsToServer();
      window.dispatchEvent(new Event("hades_prefs_changed"));
    },
    [notif]
  );

  if (!isOpen) return null;

  return (
    <div className="header-settings-panel" ref={panelRef}>
      <div className="header-settings-section">
        <span className="header-settings-label">화면 모드</span>
        <div className="theme-selector">
          <button
            className={`theme-option ${theme === "light" ? "active" : ""}`}
            onClick={() => changeTheme("light")}
          >
            <Sun size={15} strokeWidth={2.2} />
            라이트
          </button>
          <button
            className={`theme-option ${theme === "dark" ? "active" : ""}`}
            onClick={() => changeTheme("dark")}
          >
            <Moon size={15} strokeWidth={2.2} />
            다크
          </button>
        </div>
      </div>

      <div className="header-settings-section">
        <div className="header-settings-row">
          <span className="header-settings-label" style={{ marginBottom: 0 }}>푸시 알림</span>
          <Toggle
            active={notif.master}
            onToggle={toggleMaster}
            disabled={isActivating || permissionState === "denied"}
          />
        </div>
        {notif.master && (
          <div className="header-settings-subs">
            <div className="header-settings-row header-settings-sub">
              <span>라이브 알림</span>
              <Toggle active={notif.liveBroadcast} onToggle={() => void toggleSub("liveBroadcast")} />
            </div>
            <div className="header-settings-row header-settings-sub">
              <span>투표 알림</span>
              <Toggle active={notif.newVote} onToggle={() => void toggleSub("newVote")} />
            </div>
            <div className="header-settings-row header-settings-sub">
              <span>유튜브 알림</span>
              <Toggle active={notif.newYoutube} onToggle={() => void toggleSub("newYoutube")} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
