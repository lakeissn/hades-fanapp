"use client";

type Props = {
  variant: "default" | "denied";
  message: string;
  onAllow?: () => void;
  onDismiss: () => void;
  isLoading?: boolean;
};

export default function NotificationBanner({ variant, message, onAllow, onDismiss, isLoading }: Props) {
  return (
    <div className="notice" role="status" aria-live="polite">
      <div className="notice-body">
        <span className="notice-icon" aria-hidden>
          {variant === "denied" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9z"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          )}
        </span>
        <span className="notice-msg">{message}</span>
      </div>
      <div className="notice-btns">
        {variant === "default" && (
          <button type="button" className="notice-btn notice-btn--ok" onClick={onAllow} disabled={isLoading}>
            허용
          </button>
        )}
        <button type="button" className="notice-btn notice-btn--no" onClick={onDismiss} disabled={isLoading}>
          {variant === "denied" ? "닫기" : "거절"}
        </button>
      </div>
    </div>
  );
}
