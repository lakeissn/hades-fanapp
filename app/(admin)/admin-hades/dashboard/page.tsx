"use client";

import { useEffect, useState, useCallback } from "react";

const PLATFORMS = [
  { key: "idolchamp", label: "아이돌챔프" },
  { key: "mubeat", label: "뮤빗" },
  { key: "upick", label: "유픽" },
  { key: "fancast", label: "팬캐스트" },
  { key: "fanplus", label: "팬플러스" },
  { key: "podoal", label: "포도알" },
  { key: "whosfan", label: "후즈팬" },
  { key: "duckad", label: "덕애드" },
  { key: "10asia", label: "텐아시아" },
  { key: "muniverse", label: "뮤니버스" },
  { key: "my1pick", label: "마이원픽" },
  { key: "mnetplus", label: "엠넷플러스" },
  { key: "fannstar", label: "팬앤스타" },
  { key: "higher", label: "하이어" },
  { key: "ktopstar", label: "K탑스타" },
];

function parsePlatformKeys(str: string): string[] {
  return str.split(/[\s,|/]+/).map(s => s.trim().toLowerCase()).filter(Boolean);
}

function PlatformPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const selected = parsePlatformKeys(value);
  const toggle = (key: string) => {
    const next = selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key];
    onChange(next.join(" "));
  };
  return (
    <div className="admin-platform-grid">
      {PLATFORMS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          className={`admin-platform-chip ${selected.includes(key) ? "selected" : ""}`}
          onClick={() => toggle(key)}
        >
          <img src={`/icons/${key}.png`} alt="" className="admin-platform-chip-icon" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          {label}
        </button>
      ))}
    </div>
  );
}
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

type FormState = {
  title: string; platform: string; url: string;
  opens_at: string; closes_at: string; note: string;
  enabled: boolean; is_ongoing: boolean;
};

const EMPTY_FORM = { title: "", platform: "", url: "", opens_at: "", closes_at: "", note: "", enabled: true, is_ongoing: false };

const PLATFORM_MAP = Object.fromEntries(PLATFORMS.map(p => [p.key, p.label]));

function platformDisplay(platform: string) {
  const keys = parsePlatformKeys(platform);
  return keys.map(k => ({ key: k, label: PLATFORM_MAP[k] ?? k }));
}

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
  if (val.replace(/\s/g, "") === "진행중") return "진행중";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}

// "2026-02-21T18:00" ↔ "2026-02-21 18:00"
function toDatetimeLocal(val: string): string {
  if (!val || val.replace(/\s/g, "") === "진행중") return "";
  return val.trim().replace(" ", "T").slice(0, 16);
}
function fromDatetimeLocal(val: string): string {
  return val ? val.replace("T", " ") : "";
}

export default function AdminDashboard() {
  const router = useRouter();
  const [votes, setVotes] = useState<Vote[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
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
    const rawOpen = vote.opens_at ?? "";
    const isOngoing = rawOpen.replace(/\s/g, "") === "진행중";
    setForm({
      title: vote.title,
      platform: vote.platform,
      url: vote.url ?? "",
      opens_at: isOngoing ? "" : toDatetimeLocal(rawOpen),
      is_ongoing: isOngoing,
      closes_at: toDatetimeLocal(vote.closes_at ?? ""),
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
        body: JSON.stringify({
          ...form,
          opens_at: form.is_ongoing ? "진행중" : fromDatetimeLocal(form.opens_at),
          closes_at: fromDatetimeLocal(form.closes_at),
        }),
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

  const sorted = [...votes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const countOn = votes.filter(v => v.enabled && !isExpired(v)).length;
  const countExpired = votes.filter(v => isExpired(v)).length;
  const countOff = votes.filter(v => !v.enabled).length;

  return (
    <div className="admin-wrap">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-topbar-brand">
            <img src="/icons/hades_helper.png" alt="" width={20} height={20} />
            <span>HADES Admin</span>
          </div>
          <button className="admin-topbar-logout" onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-page-head">
          <div>
            <h1 className="admin-page-title">투표 관리</h1>
            <div className="admin-stats-row">
              <span className="admin-stat on"><span className="admin-stat-dot" />진행중 {countOn}</span>
              <span className="admin-stat expired"><span className="admin-stat-dot" />만료 {countExpired}</span>
              <span className="admin-stat off"><span className="admin-stat-dot" />비활성 {countOff}</span>
            </div>
          </div>
          <button className="admin-add-btn" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            투표 추가
          </button>
        </div>

        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : votes.length === 0 ? (
          <div className="admin-empty">등록된 투표가 없습니다.</div>
        ) : (
          <div className="admin-vote-list">
            {sorted.map((vote) => {
              const st = statusLabel(vote);
              const platforms = platformDisplay(vote.platform);
              return (
                <div key={vote.id} className={`admin-vote-card avs-${st.cls.replace("vst-", "")}`}>
                  <div className="admin-vote-card-body">
                    <div className="admin-vote-card-top">
                      <h3 className="admin-vote-card-title">{vote.title}</h3>
                      <div className="admin-vote-card-actions">
                        <button className="admin-action-btn" onClick={() => openEdit(vote)}>수정</button>
                        <button className="admin-action-btn danger" onClick={() => setDeleteConfirmId(vote.id)}>삭제</button>
                      </div>
                    </div>
                    <div className="admin-vote-card-chips">
                      {platforms.map(p => (
                        <span key={p.key} className="admin-platform-tag">
                          <img src={`/icons/${p.key}.png`} alt="" width={13} height={13} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          {p.label}
                        </span>
                      ))}
                      <span className={`admin-vote-status ${st.cls}`}>{st.text}</span>
                    </div>
                    <div className="admin-vote-card-meta">
                      <span>오픈 {fmtDate(vote.opens_at)}</span>
                      <span className="admin-meta-sep">·</span>
                      <span>마감 {fmtDate(vote.closes_at)}</span>
                      {vote.note && <><span className="admin-meta-sep">·</span><span>{vote.note}</span></>}
                    </div>
                    {vote.url && (
                      <a className="admin-vote-card-url" href={vote.url} target="_blank" rel="noreferrer">{vote.url}</a>
                    )}
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
              <div className="admin-label">
                <span className="admin-label-text">제목 <span className="admin-required">*</span></span>
                <input className="admin-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="투표 제목" required />
              </div>
              <div className="admin-label">
                <span className="admin-label-text">플랫폼 <span className="admin-required">*</span></span>
                <PlatformPicker value={form.platform} onChange={(v) => setForm({ ...form, platform: v })} />
              </div>
              <div className="admin-label">
                <span className="admin-label-text">URL</span>
                <input className="admin-input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://... 또는 앱 링크" />
              </div>
              <div className="admin-label">
                <span className="admin-label-text">시작 시간</span>
                <label className="admin-ongoing-row">
                  <input type="checkbox" checked={form.is_ongoing} onChange={(e) => setForm({ ...form, is_ongoing: e.target.checked, opens_at: "" })} />
                  <span>이미 진행중 (날짜 없음)</span>
                </label>
                {!form.is_ongoing && (
                  <input
                    type="datetime-local"
                    className="admin-input admin-input-dt"
                    value={form.opens_at}
                    onChange={(e) => setForm({ ...form, opens_at: e.target.value })}
                  />
                )}
              </div>
              <div className="admin-label">
                <span className="admin-label-text">마감 시간</span>
                <input
                  type="datetime-local"
                  className="admin-input admin-input-dt"
                  value={form.closes_at}
                  onChange={(e) => setForm({ ...form, closes_at: e.target.value })}
                />
              </div>
              <div className="admin-label">
                <span className="admin-label-text">리워드</span>
                <input className="admin-input" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="예) 포인트 적립" />
              </div>
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
