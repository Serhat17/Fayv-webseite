"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { AlertCircle, CalendarDays, CheckCircle, Loader2, Plus, Power, RefreshCw, Trash2, Trophy } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { formatDateTime, readDoc, toDate, writeAdminAuditLog, type AdminChallengeDoc } from "@/lib/admin";

type ChallengeFormState = {
  title: string;
  description: string;
  theme: string;
  styleHint: string;
  type: "daily" | "weekly" | "community";
  durationDays: string;
  rules: string;
  tags: string;
  isActive: boolean;
};

const INITIAL_FORM: ChallengeFormState = {
  title: "",
  description: "",
  theme: "Style Challenge",
  styleHint: "",
  type: "daily",
  durationDays: "1",
  rules: "",
  tags: "",
  isActive: true,
};

const TYPE_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  community: "Community",
};

const INPUT_CLASS = "w-full rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] px-4 py-3 text-sm text-[#111111] placeholder:text-gray-400 focus:border-[#D4A853] focus:outline-none focus:ring-2 focus:ring-[#D4A853]/20";

function parseTags(value: string) {
  return value
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
}

function buildEndDate(durationDays: string) {
  const days = Math.max(1, Math.min(30, Number.parseInt(durationDays, 10) || 1));
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 59, 999);
  return date;
}

function isExpired(challenge: AdminChallengeDoc) {
  const endDate = toDate(challenge.endDate);
  return !!endDate && endDate < new Date();
}

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<AdminChallengeDoc[]>([]);
  const [form, setForm] = useState<ChallengeFormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function loadChallenges() {
    setLoading(true);
    setMessage(null);
    try {
      const snapshot = await getDocs(query(collection(db, "dailyChallenges"), orderBy("startDate", "desc"), limit(80)));
      setChallenges(snapshot.docs.map(docSnap => readDoc<AdminChallengeDoc>(docSnap)));
    } catch (error) {
      console.error("Challenge load failed", error);
      setMessage({ type: "error", text: "Challenges konnten nicht geladen werden. Prüfe Admin-Rechte und Firestore Rules." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadChallenges();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const activeCount = useMemo(() => challenges.filter(challenge => challenge.isActive && !isExpired(challenge)).length, [challenges]);
  const expiredCount = useMemo(() => challenges.filter(isExpired).length, [challenges]);
  const finalizableCount = useMemo(() => challenges.filter(challenge => challenge.isActive && isExpired(challenge)).length, [challenges]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.styleHint.trim()) return;

    setSaving(true);
    setMessage(null);
    const id = crypto.randomUUID();
    const currentUser = auth.currentUser;
    const tags = parseTags(form.tags);
    const payload = {
      id,
      title: form.title.trim(),
      description: form.description.trim(),
      theme: form.theme.trim() || "Style Challenge",
      styleHint: form.styleHint.trim(),
      startDate: new Date(),
      endDate: buildEndDate(form.durationDays),
      submissionCount: 0,
      isActive: form.isActive,
      type: form.type,
      createdBy: currentUser?.uid ?? "admin",
      creatorName: currentUser?.email ?? "FAYV Admin",
      rules: form.rules.trim() || null,
      tags: tags.length ? tags : null,
      isPublic: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, "dailyChallenges", id), payload);
      await writeAdminAuditLog(currentUser, "challenge.create", "challenge", id, {
        title: payload.title,
        type: payload.type,
        durationDays: form.durationDays,
        isActive: payload.isActive,
      });
      setForm(INITIAL_FORM);
      setMessage({ type: "success", text: "Challenge wurde veröffentlicht." });
      await loadChallenges();
    } catch (error) {
      console.error("Challenge create failed", error);
      setMessage({ type: "error", text: "Challenge konnte nicht veröffentlicht werden. Dein Account braucht Admin-Rechte in Firestore." });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(challenge: AdminChallengeDoc) {
    const nextActive = !challenge.isActive;
    try {
      await updateDoc(doc(db, "dailyChallenges", challenge.id), {
        isActive: nextActive,
        updatedAt: serverTimestamp(),
      });
      await writeAdminAuditLog(auth.currentUser, nextActive ? "challenge.activate" : "challenge.deactivate", "challenge", challenge.id, {
        title: challenge.title ?? null,
      });
      setChallenges(current => current.map(item => item.id === challenge.id ? { ...item, isActive: nextActive } : item));
    } catch (error) {
      console.error("Challenge toggle failed", error);
      setMessage({ type: "error", text: "Status konnte nicht geändert werden." });
    }
  }

  async function removeChallenge(challenge: AdminChallengeDoc) {
    const confirmed = window.confirm(`Challenge "${challenge.title ?? challenge.id}" wirklich löschen?`);
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "dailyChallenges", challenge.id));
      await writeAdminAuditLog(auth.currentUser, "challenge.delete", "challenge", challenge.id, {
        title: challenge.title ?? null,
      });
      setChallenges(current => current.filter(item => item.id !== challenge.id));
    } catch (error) {
      console.error("Challenge delete failed", error);
      setMessage({ type: "error", text: "Challenge konnte nicht gelöscht werden." });
    }
  }

  async function finalizeExpired() {
    setFinalizing(true);
    setMessage(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Bitte melde dich erneut als Admin an.");

      const response = await fetch("/api/admin/challenges/finalize-expired", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json() as { finalized?: number; winners?: number; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Finalisierung fehlgeschlagen.");

      setMessage({ type: "success", text: `${result.finalized ?? 0} abgelaufene Challenge(s) finalisiert, ${result.winners ?? 0} Gewinner markiert.` });
      await loadChallenges();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Finalisierung fehlgeschlagen." });
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4A853]">Community</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-serif font-bold text-[#111111]">
            Challenges
            <Trophy className="h-6 w-6 text-[#D4A853]" />
          </h1>
          <p className="mt-1 text-sm text-[#666666]">Veröffentliche Daily, Weekly oder Community Challenges direkt in der App.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={finalizeExpired}
            disabled={finalizing || finalizableCount === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111111] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#333333] disabled:opacity-50"
          >
            {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
            Gewinner finalisieren
          </button>
          <button
            type="button"
            onClick={loadChallenges}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E0E0D6] bg-white px-4 py-2.5 text-sm font-bold text-[#111111] shadow-sm transition hover:bg-[#F8F8F3]"
          >
            <RefreshCw className="h-4 w-4" /> Aktualisieren
          </button>
        </div>
      </div>

      {message && (
        <div className={`flex items-start gap-3 rounded-xl p-4 text-sm font-semibold ${message.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
          {message.type === "success" ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Aktiv" value={activeCount} />
        <StatCard label="Gesamt geladen" value={challenges.length} />
        <StatCard label="Abgelaufen" value={expiredCount} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={handleCreate} className="space-y-5 rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-[#111111]">Neue Challenge</h2>
            <p className="mt-1 text-sm text-[#666666]">Nach dem Speichern erscheint sie sofort in der iOS-App, wenn sie aktiv ist.</p>
          </div>

          <Field label="Titel" htmlFor="challenge-title">
            <input
              id="challenge-title"
              value={form.title}
              onChange={event => setForm({ ...form, title: event.target.value })}
              placeholder="z.B. Beige Layering Week"
              className={INPUT_CLASS}
              required
            />
          </Field>

          <Field label="Beschreibung" htmlFor="challenge-description">
            <textarea
              id="challenge-description"
              value={form.description}
              onChange={event => setForm({ ...form, description: event.target.value })}
              rows={3}
              placeholder="Was sollen Nutzer in dieser Challenge stylen?"
              className={`${INPUT_CLASS} resize-none`}
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Typ" htmlFor="challenge-type">
              <select
                id="challenge-type"
                value={form.type}
                onChange={event => setForm({ ...form, type: event.target.value as ChallengeFormState["type"], durationDays: event.target.value === "weekly" ? "7" : form.durationDays })}
                className={INPUT_CLASS}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="community">Community</option>
              </select>
            </Field>
            <Field label="Dauer (Tage)" htmlFor="challenge-duration">
              <input
                id="challenge-duration"
                type="number"
                min={1}
                max={30}
                value={form.durationDays}
                onChange={event => setForm({ ...form, durationDays: event.target.value })}
                className={INPUT_CLASS}
              />
            </Field>
          </div>

          <Field label="Theme" htmlFor="challenge-theme">
            <input
              id="challenge-theme"
              value={form.theme}
              onChange={event => setForm({ ...form, theme: event.target.value })}
              placeholder="z.B. Minimalismus, Streetwear, Office"
              className={INPUT_CLASS}
            />
          </Field>

          <Field label="Style Hint für KI/Matching" htmlFor="challenge-style-hint">
            <textarea
              id="challenge-style-hint"
              value={form.styleHint}
              onChange={event => setForm({ ...form, styleHint: event.target.value })}
              rows={3}
              placeholder="z.B. Ton-in-Ton, beige Akzente, keine lauten Farben"
              className={`${INPUT_CLASS} resize-none`}
              required
            />
          </Field>

          <Field label="Regeln (optional)" htmlFor="challenge-rules">
            <textarea
              id="challenge-rules"
              value={form.rules}
              onChange={event => setForm({ ...form, rules: event.target.value })}
              rows={2}
              placeholder="z.B. Mindestens ein Teil aus der Garderobe verwenden"
              className={`${INPUT_CLASS} resize-none`}
            />
          </Field>

          <Field label="Tags (optional, Komma-getrennt)" htmlFor="challenge-tags">
            <input
              id="challenge-tags"
              value={form.tags}
              onChange={event => setForm({ ...form, tags: event.target.value })}
              placeholder="beige, layering, winter"
              className={INPUT_CLASS}
            />
          </Field>

          <label className="flex items-center gap-3 rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] px-4 py-3 text-sm font-semibold text-[#111111]">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={event => setForm({ ...form, isActive: event.target.checked })}
              className="h-4 w-4 accent-[#111111]"
            />
            Direkt aktiv veröffentlichen
          </label>

          <button
            type="submit"
            disabled={saving || !form.title.trim() || !form.description.trim() || !form.styleHint.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] py-3.5 text-sm font-bold text-white transition hover:bg-[#333333] disabled:opacity-50"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Veröffentliche...</> : <><Plus className="h-4 w-4" /> Challenge veröffentlichen</>}
          </button>
        </form>

        <section className="rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-[#E0E0D6] pb-4">
            <h2 className="text-lg font-bold text-[#111111]">Veröffentlichte Challenges</h2>
            <CalendarDays className="h-5 w-5 text-[#D4A853]" />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm font-semibold text-[#666666]"><Loader2 className="h-4 w-4 animate-spin" /> Lade Challenges...</div>
          ) : challenges.length === 0 ? (
            <p className="rounded-xl bg-[#F8F8F3] p-4 text-sm text-[#666666]">Noch keine Challenges veröffentlicht.</p>
          ) : (
            <div className="space-y-3">
              {challenges.map(challenge => (
                <article key={challenge.id} className="rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-[#111111]">{challenge.title ?? "Unbenannte Challenge"}</h3>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#666666]">{TYPE_LABELS[challenge.type ?? "daily"] ?? challenge.type}</span>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${challenge.isActive && !isExpired(challenge) ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
                          {challenge.isActive && !isExpired(challenge) ? "Aktiv" : isExpired(challenge) ? "Abgelaufen" : "Inaktiv"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-[#666666]">{challenge.description}</p>
                      <div className="mt-3 grid gap-2 text-xs text-[#666666] md:grid-cols-2">
                        <p><span className="font-bold text-[#111111]">Theme:</span> {challenge.theme ?? "-"}</p>
                        <p><span className="font-bold text-[#111111]">Submissions:</span> {challenge.submissionCount ?? 0}</p>
                        <p><span className="font-bold text-[#111111]">Start:</span> {formatDateTime(challenge.startDate)}</p>
                        <p><span className="font-bold text-[#111111]">Ende:</span> {formatDateTime(challenge.endDate)}</p>
                      </div>
                      {challenge.tags && challenge.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {challenge.tags.map(tag => <span key={tag} className="rounded-full bg-white px-2 py-1 text-[11px] font-semibold text-[#666666]">#{tag}</span>)}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => toggleActive(challenge)}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E0E0D6] bg-white px-3 py-2 text-xs font-bold text-[#111111] transition hover:bg-[#F5F5F0]"
                      >
                        <Power className="h-3.5 w-3.5" /> {challenge.isActive ? "Deaktivieren" : "Aktivieren"}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeChallenge(challenge)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Löschen
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-[#111111]" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-[#E0E0D6] bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-[#666666]">{label}</p>
      <p className="mt-1 text-3xl font-serif font-bold text-[#111111]">{value}</p>
    </div>
  );
}
