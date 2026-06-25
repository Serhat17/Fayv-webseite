"use client";

import { useState } from "react";
import { Bell, CheckCircle, Loader2, Radio, Send, UserRound, Users } from "lucide-react";
import { auth } from "@/lib/firebase";

const TARGET_MODES = [
  { value: "topic", label: "Alle", icon: Radio },
  { value: "segment", label: "Segment", icon: Users },
  { value: "user", label: "Direkt", icon: UserRound },
] as const;

const SEGMENTS = [
  { value: "premium", label: "Nur Premium-Nutzer" },
  { value: "free", label: "Nur Free-Nutzer" },
  { value: "inactive_7d", label: "Inaktiv 7+ Tage" },
] as const;

type TargetType = (typeof TARGET_MODES)[number]["value"];
type SendResult = { success: boolean; message: string };
type AdminPushResponse = { ok: boolean; sent: number; failed: number };

function targetLabel(targetType: TargetType, segment: string, userId: string, userEmail: string) {
  if (targetType === "segment") return SEGMENTS.find(item => item.value === segment)?.label ?? "Segment";
  if (targetType === "user") return userEmail.trim() || userId.trim() || "Direkter Nutzer";
  return "Alle Nutzer";
}

export default function AdminPushPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<TargetType>("topic");
  const [segment, setSegment] = useState("premium");
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<SendResult | null>(null);

  const canSend = Boolean(title.trim() && body.trim() && (targetType !== "user" || userId.trim() || userEmail.trim()));

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend) return;
    setSending(true);
    setResult(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Bitte melde dich erneut als Admin an.");

      const response = await fetch("/api/admin/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          targetType,
          topic: "all",
          segment,
          userId: userId.trim() || undefined,
          userEmail: userEmail.trim() || undefined,
        }),
      });

      const data = await response.json() as Partial<AdminPushResponse> & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Fehler beim Senden.");

      const sent = data.sent ?? 0;
      const failed = data.failed ?? 0;
      const failedText = failed > 0 ? `, ${failed} fehlgeschlagen` : "";
      setResult({ success: true, message: `Notification an ${targetLabel(targetType, segment, userId, userEmail)} gesendet: ${sent} zugestellt${failedText}.` });
      setTitle("");
      setBody("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fehler beim Senden.";
      setResult({ success: false, message });
    } finally {
      setSending(false);
    }
  }

  const charLimit = 160;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4A853]">Kommunikation</p>
        <h1 className="mt-1 flex items-center gap-2 text-3xl font-serif font-bold text-[#111111]">
          Push-Notifications
          <Bell className="h-6 w-6 text-[#D4A853]" />
        </h1>
        <p className="mt-1 text-sm text-[#666666]">Sende Benachrichtigungen an alle, an Segmente oder direkt an einzelne Nutzer.</p>
      </div>

      <form onSubmit={handleSend} className="space-y-5 rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
        <div>
          <span className="mb-2 block text-sm font-bold text-[#111111]">Zielgruppe</span>
          <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] p-1">
            {TARGET_MODES.map(mode => {
              const Icon = mode.icon;
              const selected = targetType === mode.value;
              return (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setTargetType(mode.value)}
                  className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${selected ? "bg-white text-[#111111] shadow-sm" : "text-[#666666] hover:text-[#111111]"}`}
                >
                  <Icon className="h-4 w-4" />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>

        {targetType === "segment" && (
          <div>
            <label className="mb-2 block text-sm font-bold text-[#111111]" htmlFor="push-segment">
              Segment
            </label>
            <select
              id="push-segment"
              value={segment}
              onChange={e => setSegment(e.target.value)}
              className="w-full rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] px-4 py-3 text-sm font-medium text-[#111111] focus:border-[#D4A853] focus:outline-none focus:ring-2 focus:ring-[#D4A853]/20"
            >
              {SEGMENTS.map(item => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </div>
        )}

        {targetType === "user" && (
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-[#111111]" htmlFor="push-user-id">
                Nutzer-ID
              </label>
              <input
                id="push-user-id"
                type="text"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="Firebase UID"
                className="w-full rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] px-4 py-3 text-sm text-[#111111] placeholder:text-gray-400 focus:border-[#D4A853] focus:outline-none focus:ring-2 focus:ring-[#D4A853]/20"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-[#111111]" htmlFor="push-user-email">
                oder E-Mail
              </label>
              <input
                id="push-user-email"
                type="email"
                value={userEmail}
                onChange={e => setUserEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] px-4 py-3 text-sm text-[#111111] placeholder:text-gray-400 focus:border-[#D4A853] focus:outline-none focus:ring-2 focus:ring-[#D4A853]/20"
              />
            </div>
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-bold text-[#111111]" htmlFor="push-title">
            Titel <span className="font-normal text-[#666666]">(max 65 Zeichen)</span>
          </label>
          <input
            id="push-title"
            type="text"
            maxLength={65}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z.B. Dein täglicher Style-Tipp ist da"
            className="w-full rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] px-4 py-3 text-sm text-[#111111] placeholder:text-gray-400 focus:border-[#D4A853] focus:outline-none focus:ring-2 focus:ring-[#D4A853]/20"
            required
          />
          <p className="mt-1 text-right text-xs text-[#666666]">{title.length}/65</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-[#111111]" htmlFor="push-body">
            Nachricht <span className="font-normal text-[#666666]">(max {charLimit} Zeichen)</span>
          </label>
          <textarea
            id="push-body"
            maxLength={charLimit}
            rows={4}
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="z.B. Schau dir deine 3 neuen Outfit-Vorschläge für heute an."
            className="w-full resize-none rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] px-4 py-3 text-sm text-[#111111] placeholder:text-gray-400 focus:border-[#D4A853] focus:outline-none focus:ring-2 focus:ring-[#D4A853]/20"
            required
          />
          <p className="mt-1 text-right text-xs text-[#666666]">{body.length}/{charLimit}</p>
        </div>

        {/* Preview */}
        {(title || body) && (
          <div className="rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-[#666666]">Vorschau</p>
            <div className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
              <div className="mt-0.5 rounded-full bg-[#D4A853]/10 p-2 text-[#D4A853]">
                <Bell className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#111111]">{title || "Titel..."}</p>
                <p className="mt-0.5 text-xs text-[#666666]">{body || "Nachricht..."}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className={`flex items-start gap-3 rounded-xl p-4 text-sm font-semibold ${result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={sending || !canSend}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] py-3.5 text-sm font-bold text-white transition hover:bg-[#333333] disabled:opacity-50"
        >
          {sending ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sende...</>
          ) : (
            <><Send className="h-4 w-4" /> Notification senden</>
          )}
        </button>
      </form>

      <div className="rounded-2xl border border-[#E0E0D6] bg-white p-4 text-sm text-[#666666]">
        <p className="font-bold text-[#111111]">Versand über Firebase Admin</p>
        <p className="mt-1">Der Server braucht <code className="rounded bg-[#F8F8F3] px-1">FIREBASE_SERVICE_ACCOUNT_KEY</code> oder <code className="rounded bg-[#F8F8F3] px-1">FIREBASE_PROJECT_ID</code>, <code className="rounded bg-[#F8F8F3] px-1">FIREBASE_CLIENT_EMAIL</code> und <code className="rounded bg-[#F8F8F3] px-1">FIREBASE_PRIVATE_KEY</code>. Direkte Pushes funktionieren, sobald der Nutzer in der App einen FCM-Token gespeichert hat.</p>
      </div>
    </div>
  );
}
