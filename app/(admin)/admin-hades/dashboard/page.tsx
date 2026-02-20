"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type Vote = {
  id: string;
  title: string;
  platform: string;
  url: string;
  opens_at: string | null;
  closes_at: string | null;
  note: string | null;
  enabled: boolean;
  created_at: string;
};

const EMPTY_FORM = { title: "", platform: "", url: "", opens_at: "", closes_at: "", note: "", enabled: true };

function isExpired(vote: Vote) {
  if (!vote.closes_at) return false;
  return new Date(vote.closes_at).getTime() < Date.now();
}

function statusLabel(vote: Vote) {
  if (!vote.enabled) return { text: "비활성", cls: "vst-off" };
  if (isExpired(vote)) return { text: "만료", cls: "vst-expired" };
  return { text: "진행중", cls: "vst-on" };
}

function fmtDate(val: string | null) {
  if (!val) return "-";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function AdminDashboard() {
  const router = useRouter();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchVotes = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/votes");
    if (res.status === 401) { router.push("/admin-hades"); return; }
    const data = await res.json();
    setVotes(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [router]);

  useEffect(() => { fetchVotes(); }, [fetchVotes]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (vote: Vote) => {
    setEditingId(vote.id);
    setForm({
      title: vote.title,
      platform: vote.platform,
      url: vote.url ?? "",
      opens_at: vote.opens_at ?? "",
      closes_at: vote.closes_at ?? "",
      note: vote.note ?? "",
      enabled: vote.enabled,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError("");
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/admin/votes/${editingId}` : "/api/admin/votes";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error ?? "저장 실패"); return; }
      setModalOpen(false);
      fetchVotes();
    } catch {
      setFormError("네트워크 오류");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/votes/${id}`, { method: "DELETE" });
    if (res.ok) { setDeleteConfirmId(null); fetchVotes(); }
  };

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin-hades");
  };

  return (
    <div className="admin-wrap">
      <header className="admin-header">
        <div className="admin-header-inner">
          <span className="admin-header-title">
            <img src="/icons/hades_helper.png" alt="" width={24} height={24} />
            HADES 관리자
          </span>
          <button className="admin-btn-ghost" onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-section-head">
          <h2>투표 관리</h2>
          <button className="admin-btn-primary" onClick={openCreate}>+ 투표 추가</button>
        </div>

        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : votes.length === 0 ? (
          <div className="admin-empty">등록된 투표가 없습니다.</div>
        ) : (
          <div className="admin-vote-list">
            {votes.map((vote) => {
              const st = statusLabel(vote);
              return (
                <div key={vote.id} className="admin-vote-row">
                  <div className="admin-vote-main">
                    <div className="admin-vote-top">
                      <span className={`admin-status-badge ${st.cls}`}>{st.text}</span>
                      <span className="admin-vote-platform">{vote.platform}</span>
                    </div>
                    <p className="admin-vote-title">{vote.title}</p>
                    <div className="admin-vote-meta">
                      <span>오픈 {fmtDate(vote.opens_at)}</span>
                      <span>마감 {fmtDate(vote.closes_at)}</span>
                      {vote.note && <span>리워드 {vote.note}</span>}
                    </div>
                    {vote.url && (
                      <a className="admin-vote-url" href={vote.url} target="_blank" rel="noreferrer">
                        {vote.url}
                      </a>
                    )}
                  </div>
                  <div className="admin-vote-actions">
                    <button className="admin-btn-sm" onClick={() => openEdit(vote)}>수정</button>
                    <button className="admin-btn-sm danger" onClick={() => setDeleteConfirmId(vote.id)}>삭제</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 생성/수정 모달 */}
      {modalOpen && (
        <div className="admin-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-head">
              <h3>{editingId ? "투표 수정" : "투표 추가"}</h3>
              <button className="admin-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <form className="admin-form" onSubmit={handleSave}>
              <label className="admin-label">
                제목 <span className="admin-required">*</span>
                <input className="admin-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="투표 제목" required />
              </label>
              <label className="admin-label">
                플랫폼 <span className="admin-required">*</span>
                <input className="admin-input" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} placeholder="idolchamp, mubeat, ktopstar ..." required />
              </label>
              <label className="admin-label">
                URL
                <input className="admin-input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://... 또는 앱 링크" />
              </label>
              <div className="admin-form-row">
                <label className="admin-label">
                  시작 시간
                  <input className="admin-input" value={form.opens_at} onChange={(e) => setForm({ ...form, opens_at: e.target.value })} placeholder="2026-02-21 18:00 또는 진행중" />
                </label>
                <label className="admin-label">
                  마감 시간
                  <input className="admin-input" value={form.closes_at} onChange={(e) => setForm({ ...form, closes_at: e.target.value })} placeholder="2026-03-01 23:59" />
                </label>
              </div>
              <label className="admin-label">
                리워드
                <input className="admin-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="예) 포인트 적립" />
              </label>
              {editingId && (
                <label className="admin-label admin-toggle-label">
                  <span>활성화</span>
                  <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
                </label>
              )}
              {formError && <p className="admin-error">{formError}</p>}
              <div className="admin-form-actions">
                <button type="button" className="admin-btn-ghost" onClick={() => setModalOpen(false)}>취소</button>
                <button type="submit" className="admin-btn-primary" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 삭제 확인 */}
      {deleteConfirmId && (
        <div className="admin-modal-overlay" onClick={() => setDeleteConfirmId(null)}>
          <div className="admin-modal admin-modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>정말 삭제할까요?</h3>
            <p>삭제된 투표는 복구할 수 없습니다.</p>
            <div className="admin-form-actions">
              <button className="admin-btn-ghost" onClick={() => setDeleteConfirmId(null)}>취소</button>
              <button className="admin-btn-primary danger" onClick={() => handleDelete(deleteConfirmId)}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
