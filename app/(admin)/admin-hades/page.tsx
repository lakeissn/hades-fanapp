"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ password }),
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
        <div className="al-top">
          <img src="/icons/hades_helper.png" alt="" className="al-img" />
          <div className="al-top-text">
            <h1 className="al-title">관리자 로그인</h1>
          </div>
        </div>
        <form className="al-form" onSubmit={handleSubmit}>
          <input
            className="admin-input"
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            required
          />
          {error && <p className="admin-error">{error}</p>}
          <button className="admin-btn-primary al-submit" type="submit" disabled={loading}>
            {loading ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </div>
  );
}
