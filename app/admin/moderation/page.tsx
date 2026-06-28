"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { formatDateTime, readDoc, writeAdminAuditLog, type AdminPostDoc, type AdminReportDoc } from "@/lib/admin";
import { AlertTriangle, CheckCircle, EyeOff, Flag, Image as ImageIcon, ShieldCheck, Trash2, User } from "lucide-react";

type ModerationItem = AdminPostDoc & {
  reports: AdminReportDoc[];
  severity: "high" | "medium" | "low";
};

export default function Moderation() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyPostId, setBusyPostId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadModerationQueue();
  }, []);

  async function loadModerationQueue() {
    setLoading(true);
    setMessage(null);
    try {
      const [postsSnap, reportsSnap] = await Promise.all([
        getDocs(query(collection(db, "socialPosts"), where("reportCount", ">", 0), orderBy("reportCount", "desc"), limit(80))),
        getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc"), limit(160))),
      ]);

      const reports = reportsSnap.docs.map(docSnap => readDoc<AdminReportDoc>(docSnap));
      const reportsByPost = new Map<string, AdminReportDoc[]>();
      reports.forEach(report => {
        if (!report.postId) return;
        reportsByPost.set(report.postId, [...(reportsByPost.get(report.postId) ?? []), report]);
      });

      // Posts that already carry a denormalised reportCount.
      const postById = new Map<string, AdminPostDoc>();
      postsSnap.docs.forEach(docSnap => {
        const post = readDoc<AdminPostDoc>(docSnap);
        postById.set(post.id, post);
      });

      // ALSO surface every post referenced by a report doc — even if reportCount was
      // never incremented. The app writes to `reports` but not to the post, so without
      // this the moderation queue stays empty despite real reports existing.
      const missingPostIds = [...reportsByPost.keys()].filter(id => !postById.has(id));
      const fetchedPosts = await Promise.all(
        missingPostIds.map(async id => {
          try {
            const snap = await getDoc(doc(db, "socialPosts", id));
            return snap.exists() ? readDoc<AdminPostDoc>(snap) : null;
          } catch {
            return null;
          }
        })
      );
      fetchedPosts.forEach(post => { if (post) postById.set(post.id, post); });

      const nextItems = [...postById.values()]
        .map(post => {
          const postReports = reportsByPost.get(post.id) ?? [];
          const reportCount = Math.max(post.reportCount ?? 0, postReports.length);
          const severity: ModerationItem["severity"] = reportCount >= 5 ? "high" : reportCount >= 2 ? "medium" : "low";
          return { ...post, reportCount, reports: postReports, severity };
        })
        // Most-reported first.
        .sort((a, b) => (b.reportCount ?? 0) - (a.reportCount ?? 0));

      setItems(nextItems);
    } catch (error) {
      console.error("Fehler beim Laden gemeldeter Posts", error);
      setMessage("Moderationsdaten konnten nicht geladen werden. Prüfe Admin-Rechte und Firestore-Indizes.");
    } finally {
      setLoading(false);
    }
  }

  const summary = useMemo(() => ({
    total: items.length,
    high: items.filter(item => item.severity === "high").length,
    reports: items.reduce((sum, item) => sum + (item.reportCount ?? item.reports.length), 0),
  }), [items]);

  async function approvePost(post: ModerationItem) {
    await moderatePost(post, "approve", async () => {
      await updateDoc(doc(db, "socialPosts", post.id), {
        reportCount: 0,
        moderationStatus: "reviewed",
        reportsResolvedAt: serverTimestamp(),
      });
    });
  }

  async function hidePost(post: ModerationItem) {
    await moderatePost(post, "hide", async () => {
      await updateDoc(doc(db, "socialPosts", post.id), {
        reportCount: 0,
        moderationStatus: "hidden",
        moderationReason: "Admin moderation",
        reportsResolvedAt: serverTimestamp(),
      });
    });
  }

  async function deletePost(post: ModerationItem) {
    if (!confirm("Diesen Post wirklich dauerhaft löschen?")) return;
    await moderatePost(post, "delete", async () => {
      await deleteDoc(doc(db, "socialPosts", post.id));
    });
  }

  async function moderatePost(post: ModerationItem, action: "approve" | "hide" | "delete", operation: () => Promise<void>) {
    setBusyPostId(post.id);
    setMessage(null);
    try {
      await operation();
      // Clear the underlying report docs so a resolved post doesn't resurface in the queue.
      const reportDocs = await getDocs(query(collection(db, "reports"), where("postId", "==", post.id)));
      await Promise.all(reportDocs.docs.map(reportDoc => deleteDoc(reportDoc.ref)));
      await writeAdminAuditLog(auth.currentUser, `moderation.post.${action}`, "post", post.id, {
        userId: post.userId ?? null,
        reportCount: post.reportCount ?? post.reports.length,
        caption: post.caption ?? null,
      });
      setItems(prev => prev.filter(item => item.id !== post.id));
      setMessage(action === "approve" ? "Post freigegeben." : action === "hide" ? "Post wurde versteckt." : "Post wurde gelöscht.");
    } catch (error) {
      console.error("Moderation action failed", error);
      setMessage("Moderationsaktion konnte nicht gespeichert werden.");
    } finally {
      setBusyPostId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4A853]">Trust & Safety</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-serif font-bold text-[#111111]">
            Moderation
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </h1>
          <p className="mt-1 text-sm text-[#666666]">Gemeldete Inhalte priorisieren, prüfen und nachvollziehbar bearbeiten.</p>
        </div>
        <button onClick={loadModerationQueue} className="rounded-xl border border-[#E0E0D6] bg-white px-4 py-2.5 text-sm font-bold text-[#111111] transition hover:bg-[#F8F8F3]">
          Neu laden
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SummaryCard icon={Flag} label="Offene Posts" value={summary.total} />
        <SummaryCard icon={AlertTriangle} label="Hohe Priorität" value={summary.high} tone="red" />
        <SummaryCard icon={ShieldCheck} label="Reports gesamt" value={summary.reports} tone="gold" />
      </div>

      {message && <div className="rounded-xl border border-[#E0E0D6] bg-white px-4 py-3 text-sm font-semibold text-[#666666]">{message}</div>}

      <div className="rounded-2xl border border-[#E0E0D6] bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Lade Meldungen...</div>
        ) : items.length === 0 ? (
          <div className="m-6 rounded-xl bg-emerald-50 p-8 text-center font-semibold text-emerald-700">
            Keine offenen Reports. Alles sauber.
          </div>
        ) : (
          <div className="divide-y divide-[#E0E0D6]">
            {items.map(post => (
              <article key={post.id} className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-xl border border-[#E0E0D6] bg-[#F5F5F0]">
                  {post.imageURL ? (
                    <div className="aspect-square w-full bg-cover bg-center" style={{ backgroundImage: `url(${post.imageURL})` }} aria-label="Gemeldeter Post" />
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center text-gray-400">
                      <ImageIcon className="h-12 w-12" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <SeverityBadge severity={post.severity} />
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">{post.reportCount ?? post.reports.length} Meldungen</span>
                        <span className="rounded-full bg-[#F5F5F0] px-2.5 py-1 text-xs font-bold text-[#666666]">{post.likes ?? 0} Likes · {post.commentCount ?? 0} Kommentare</span>
                      </div>
                      <h2 className="mt-3 text-lg font-bold text-[#111111]">{post.caption || "Keine Caption"}</h2>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#666666]">
                        <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" /> {post.userName || post.userId || "Unbekannt"}</span>
                        <span>{formatDateTime(post.createdAt)}</span>
                        {post.userId && <Link className="font-bold text-[#111111] hover:underline" href={`/admin/users/${post.userId}`}>Nutzer öffnen</Link>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button disabled={busyPostId === post.id} onClick={() => approvePost(post)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-200 disabled:opacity-50">
                        <CheckCircle className="h-4 w-4" /> Erlauben
                      </button>
                      <button disabled={busyPostId === post.id} onClick={() => hidePost(post)} className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-200 disabled:opacity-50">
                        <EyeOff className="h-4 w-4" /> Verstecken
                      </button>
                      <button disabled={busyPostId === post.id} onClick={() => deletePost(post)} className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-xs font-bold text-red-700 transition hover:bg-red-200 disabled:opacity-50">
                        <Trash2 className="h-4 w-4" /> Löschen
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl bg-[#F8F8F3] p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#666666]">Report-Gründe</p>
                    {post.reports.length === 0 ? (
                      <p className="mt-2 text-sm text-gray-500">Keine einzelnen Report-Dokumente gefunden, nur reportCount am Post.</p>
                    ) : (
                      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                        {post.reports.slice(0, 6).map(report => (
                          <div key={report.id} className="rounded-lg bg-white px-3 py-2 text-xs text-[#666666]">
                            <span className="font-bold text-[#111111]">{report.reason || "Ohne Grund"}</span>
                            <span className="block mt-1">{formatDateTime(report.createdAt)} · {report.reporterId || "Unbekannter Reporter"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone = "neutral" }: { icon: typeof Flag; label: string; value: number; tone?: "neutral" | "red" | "gold" }) {
  const colors = {
    neutral: "bg-blue-50 text-blue-600",
    red: "bg-red-50 text-red-600",
    gold: "bg-[#D4A853]/10 text-[#D4A853]",
  }[tone];

  return (
    <div className="rounded-2xl border border-[#E0E0D6] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-[#111111]">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${colors}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: ModerationItem["severity"] }) {
  const config = {
    high: "bg-red-100 text-red-700 Hohe Priorität",
    medium: "bg-amber-100 text-amber-800 Mittel",
    low: "bg-gray-100 text-gray-600 Niedrig",
  }[severity].split(" ");

  return <span className={`${config[0]} ${config[1]} rounded-full px-2.5 py-1 text-xs font-bold`}>{config.slice(2).join(" ")}</span>;
}
