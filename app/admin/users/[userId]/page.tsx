"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, updateDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
  adminAvatarUrl,
  countEngagement,
  formatDateTime,
  formatRelative,
  readDoc,
  writeAdminAuditLog,
  type AdminAuditLogDoc,
  type AdminOutfitDoc,
  type AdminPostDoc,
  type AdminUserDoc,
} from "@/lib/admin";
import { ArrowLeft, Ban, CheckCircle, Crown, FileClock, Heart, MessageCircle, Shield, Shirt, Sparkles, UserRound } from "lucide-react";

export default function AdminUserDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;

  const [user, setUser] = useState<AdminUserDoc | null>(null);
  const [posts, setPosts] = useState<AdminPostDoc[]>([]);
  const [outfits, setOutfits] = useState<AdminOutfitDoc[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserDetail() {
      setLoading(true);
      setMessage(null);
      try {
        const [userSnap, postsSnap, outfitsSnap, auditSnap] = await Promise.all([
          getDoc(doc(db, "users", userId)),
          getDocs(query(collection(db, "socialPosts"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(24))),
          getDocs(query(collection(db, "outfits"), where("userId", "==", userId), orderBy("createdAt", "desc"), limit(24))),
          getDocs(query(collection(db, "adminAuditLogs"), where("targetId", "==", userId), orderBy("createdAt", "desc"), limit(12))),
        ]);

        setUser(userSnap.exists() ? ({ id: userSnap.id, ...userSnap.data() } as AdminUserDoc) : null);
        setPosts(postsSnap.docs.map(docSnap => readDoc<AdminPostDoc>(docSnap)));
        setOutfits(outfitsSnap.docs.map(docSnap => readDoc<AdminOutfitDoc>(docSnap)));
        setAuditLogs(auditSnap.docs.map(docSnap => readDoc<AdminAuditLogDoc>(docSnap)));
      } catch (error) {
        console.error("User detail load failed", error);
        setMessage("Nutzerdaten konnten nicht vollständig geladen werden. Prüfe Firestore-Indizes und Admin-Rechte.");
      } finally {
        setLoading(false);
      }
    }

    if (userId) loadUserDetail();
  }, [userId]);

  const metrics = useMemo(() => {
    return {
      posts: posts.length,
      outfits: outfits.length,
      engagement: posts.reduce((sum, post) => sum + countEngagement(post), 0),
      reports: posts.reduce((sum, post) => sum + (post.reportCount ?? 0), 0),
    };
  }, [outfits.length, posts]);

  async function updateUserFlag(field: "isPremium" | "isBanned" | "isVerified", nextValue: boolean) {
    if (!user) return;
    setBusy(true);
    setMessage(null);
    try {
      await updateDoc(doc(db, "users", user.id), { [field]: nextValue });
      await writeAdminAuditLog(auth.currentUser, `user.${field}.${nextValue ? "enabled" : "disabled"}`, "user", user.id, {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
      });
      setUser({ ...user, [field]: nextValue });
      setMessage("Nutzerstatus gespeichert.");
    } catch (error) {
      console.error("User flag update failed", error);
      setMessage("Nutzerstatus konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-[#E0E0D6] bg-white p-8 text-sm text-gray-500">Nutzerdetails werden geladen...</div>;
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-bold text-[#666666] hover:text-[#111111]">
          <ArrowLeft className="h-4 w-4" /> Zurück
        </Link>
        <div className="rounded-2xl border border-[#E0E0D6] bg-white p-8 text-sm text-gray-500">Nutzer nicht gefunden.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm font-bold text-[#666666] hover:text-[#111111]">
        <ArrowLeft className="h-4 w-4" /> Zurück zur Nutzerliste
      </Link>

      <div className="rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="h-20 w-20 rounded-full border border-[#E0E0D6] bg-cover bg-center" style={{ backgroundImage: `url(${adminAvatarUrl(user)})` }} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-serif font-bold text-[#111111]">{user.displayName || "Unbekannt"}</h1>
                {user.isVerified && <StatusBadge icon={Shield} label="Verifiziert" tone="blue" />}
                {user.isPremium && <StatusBadge icon={Crown} label="Premium" tone="gold" />}
                {user.isBanned ? <StatusBadge icon={Ban} label="Gesperrt" tone="red" /> : <StatusBadge icon={CheckCircle} label="Aktiv" tone="green" />}
              </div>
              <p className="mt-1 text-sm text-[#666666]">{user.email || user.id}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#666666]">
                <span className="rounded-full bg-[#F5F5F0] px-3 py-1">Beitritt {formatDateTime(user.createdAt)}</span>
                <span className="rounded-full bg-[#F5F5F0] px-3 py-1">Aktiv {formatRelative(user.lastActiveAt)}</span>
                {user.appVersion && <span className="rounded-full bg-[#F5F5F0] px-3 py-1">App v{user.appVersion}</span>}
                {user.deviceModel && <span className="rounded-full bg-[#F5F5F0] px-3 py-1">{user.deviceModel}</span>}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => updateUserFlag("isPremium", !user.isPremium)} className="rounded-xl bg-[#111111] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#2a2a2a] disabled:opacity-50">
              {user.isPremium ? "Premium entziehen" : "Premium geben"}
            </button>
            <button disabled={busy} onClick={() => updateUserFlag("isVerified", !user.isVerified)} className="rounded-xl border border-[#E0E0D6] bg-white px-4 py-2.5 text-sm font-bold text-[#111111] transition hover:bg-[#F8F8F3] disabled:opacity-50">
              {user.isVerified ? "Verifizierung entfernen" : "Verifizieren"}
            </button>
            <button disabled={busy} onClick={() => updateUserFlag("isBanned", !user.isBanned)} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-50 ${user.isBanned ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}>
              {user.isBanned ? "Entsperren" : "Sperren"}
            </button>
          </div>
        </div>
      </div>

      {message && <div className="rounded-xl border border-[#E0E0D6] bg-white px-4 py-3 text-sm font-semibold text-[#666666]">{message}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <MetricCard icon={UserRound} label="Posts" value={metrics.posts} />
        <MetricCard icon={Shirt} label="Outfits" value={metrics.outfits} />
        <MetricCard icon={Heart} label="Engagement" value={metrics.engagement} />
        <MetricCard icon={Ban} label="Reports" value={metrics.reports} tone={metrics.reports > 0 ? "red" : "neutral"} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <section className="xl:col-span-2 rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-[#E0E0D6] pb-4">
            <h2 className="text-lg font-bold">Beiträge</h2>
            <MessageCircle className="h-5 w-5 text-[#D4A853]" />
          </div>
          {posts.length === 0 ? (
            <p className="text-sm text-gray-500">Noch keine Beiträge.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {posts.map(post => (
                <div key={post.id} className="overflow-hidden rounded-xl border border-[#E0E0D6] bg-[#F8F8F3]">
                  <div className="aspect-square bg-[#E0E0D6] bg-cover bg-center" style={post.imageURL ? { backgroundImage: `url(${post.imageURL})` } : undefined} />
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-xs font-semibold text-[#111111]">{post.caption || "Ohne Caption"}</p>
                    <p className="text-[11px] text-[#666666]">{post.likes ?? 0} Likes · {post.commentCount ?? 0} Kommentare</p>
                    {(post.reportCount ?? 0) > 0 && <p className="text-[11px] font-bold text-red-600">{post.reportCount} Reports</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-[#E0E0D6] pb-4">
            <h2 className="text-lg font-bold">Audit Log</h2>
            <FileClock className="h-5 w-5 text-[#D4A853]" />
          </div>
          {auditLogs.length === 0 ? (
            <p className="text-sm text-gray-500">Noch keine Admin-Aktionen für diesen Nutzer.</p>
          ) : (
            <div className="space-y-3">
              {auditLogs.map(log => (
                <div key={log.id} className="rounded-xl bg-[#F8F8F3] p-3">
                  <p className="text-sm font-bold text-[#111111]">{log.action || "Aktion"}</p>
                  <p className="mt-1 text-xs text-[#666666]">{log.actorEmail || log.actorId || "Admin"}</p>
                  <p className="mt-1 text-[11px] text-[#999999]">{formatDateTime(log.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-[#E0E0D6] pb-4">
          <h2 className="text-lg font-bold">Outfits</h2>
          <Sparkles className="h-5 w-5 text-[#D4A853]" />
        </div>
        {outfits.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine Outfits.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {outfits.map(outfit => (
              <div key={outfit.id} className="overflow-hidden rounded-xl border border-[#E0E0D6] bg-[#F8F8F3]">
                <div className="aspect-square bg-[#E0E0D6] bg-cover bg-center" style={outfit.imageURL ? { backgroundImage: `url(${outfit.imageURL})` } : undefined} />
                <div className="p-3">
                  <p className="truncate text-xs font-bold text-[#111111]">{outfit.name || "Outfit"}</p>
                  <p className="mt-1 text-[11px] text-[#666666]">{outfit.occasion || "Anlass"} · {outfit.season || "Saison"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, tone = "neutral" }: { icon: typeof UserRound; label: string; value: number; tone?: "neutral" | "red" }) {
  return (
    <div className="rounded-2xl border border-[#E0E0D6] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-[#111111]">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${tone === "red" ? "bg-red-50 text-red-600" : "bg-[#D4A853]/10 text-[#D4A853]"}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ icon: Icon, label, tone }: { icon: typeof Shield; label: string; tone: "blue" | "gold" | "red" | "green" }) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    gold: "bg-[#D4A853]/10 text-[#A97900]",
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-700",
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${colors}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
