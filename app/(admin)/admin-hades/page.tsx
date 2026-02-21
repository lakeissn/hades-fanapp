"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      if (res.ok) {
        router.push("/admin-hades/dashboard");
      } else {
        const data = await res.json();
        setError(data.error ?? "로그인 실패");
      }
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="al-root">
      <div className="al-card">
        <div className="al-header">
          <div className="al-logo-wrap">
            <img src="/icons/hades_helper.png" alt="" className="al-logo" />
          </div>
          <h1 className="al-title">관리자 로그인</h1>
        </div>

        <form className="al-form" onSubmit={handleSubmit}>
          <div className="al-field">
            <label className="al-field-label">이메일</label>
            <input
              className="al-input"
              type="email"
              placeholder="이메일을 입력해주세요"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
              required
            />
          </div>
          <div className="al-field">
            <label className="al-field-label">비밀번호</label>
            <input
              className="al-input"
              type="password"
              placeholder="비밀번호를 입력해주세요"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <label className="al-remember">
            <span className="al-remember-toggle" data-on={remember}>
              <span className="al-remember-dot" />
            </span>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ display: "none" }}
            />
            로그인 정보 저장
          </label>

          {error && (
            <div className="al-error">
              <span className="al-error-icon">!</span>
              {error}
            </div>
          )}

          <button className="al-submit" type="submit" disabled={loading}>
            {loading ? (
              <span className="al-spinner" />
            ) : (
              "로그인"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
