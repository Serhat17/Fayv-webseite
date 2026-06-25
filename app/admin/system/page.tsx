"use client";

import { useEffect, useState } from "react";
import { collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { adminAllowlistedEmails, formatDateTime, hasAdminClaim, isEmailAllowlisted, readDoc, type AdminAuditLogDoc } from "@/lib/admin";
import { Activity, CheckCircle, Database, FileClock, KeyRound, ShieldCheck, TriangleAlert } from "lucide-react";

type SystemCounts = {
  users: number | null;
  posts: number | null;
  outfits: number | null;
  reports: number | null;
  auditLogs: number | null;
  analyticsEvents: number | null;
};

const BOOTSTRAP_ADMIN_UIDS = new Set(["DotvwRJ9IfXhiYLeUP9NBxiDoNf2"]);

export default function AdminSystemPage() {
  const [counts, setCounts] = useState<SystemCounts | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogDoc[]>([]);
  const [hasClaim, setHasClaim] = useState(false);
  const [hasBackendAdmin, setHasBackendAdmin] = useState(false);
  const [isAllowlisted, setIsAllowlisted] = useState(false);
  const [currentUid, setCurrentUid] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionWarnings, setPermissionWarnings] = useState<string[]>([]);

  useEffect(() => {
    async function loadSystem() {
      setLoading(true);
      setPermissionWarnings([]);
      try {
        const currentUser = auth.currentUser;
        const token = currentUser ? await currentUser.getIdTokenResult() : null;
        const claimActive = hasAdminClaim(token);
        let backendAdminActive = Boolean(claimActive || (currentUser?.uid && BOOTSTRAP_ADMIN_UIDS.has(currentUser.uid)));
        if (!backendAdminActive && currentUser?.uid) {
          try {
            const adminDoc = await getDoc(doc(db, "adminUsers", currentUser.uid));
            backendAdminActive = adminDoc.exists() && adminDoc.data()?.active !== false;
          } catch {
            backendAdminActive = false;
          }
        }
        setHasClaim(claimActive);
        setHasBackendAdmin(backendAdminActive);
        setIsAllowlisted(isEmailAllowlisted(currentUser?.email));
        setCurrentUid(currentUser?.uid ?? null);
        setCurrentEmail(currentUser?.email ?? null);

        const [usersCount, postsCount, outfitsCount, reportsCount, auditCount, analyticsCount, auditSnap] = await Promise.allSettled([
          getCountFromServer(collection(db, "users")),
          getCountFromServer(collection(db, "socialPosts")),
          getCountFromServer(collection(db, "outfits")),
          getCountFromServer(collection(db, "reports")),
          getCountFromServer(collection(db, "adminAuditLogs")),
          getCountFromServer(collection(db, "analyticsEvents")),
          getDocs(query(collection(db, "adminAuditLogs"), orderBy("createdAt", "desc"), limit(20))),
        ]);

        const warnings = [usersCount, postsCount, outfitsCount, reportsCount, auditCount, analyticsCount, auditSnap]
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map(result => result.reason instanceof Error ? result.reason.message : "Missing or insufficient permissions.");

        setCounts({
          users: usersCount.status === "fulfilled" ? usersCount.value.data().count : null,
          posts: postsCount.status === "fulfilled" ? postsCount.value.data().count : null,
          outfits: outfitsCount.status === "fulfilled" ? outfitsCount.value.data().count : null,
          reports: reportsCount.status === "fulfilled" ? reportsCount.value.data().count : null,
          auditLogs: auditCount.status === "fulfilled" ? auditCount.value.data().count : null,
          analyticsEvents: analyticsCount.status === "fulfilled" ? analyticsCount.value.data().count : null,
        });
        setAuditLogs(auditSnap.status === "fulfilled" ? auditSnap.value.docs.map(docSnap => readDoc<AdminAuditLogDoc>(docSnap)) : []);
        setPermissionWarnings(Array.from(new Set(warnings)));
      } catch (loadError) {
        console.error("System page load failed", loadError);
        setPermissionWarnings([loadError instanceof Error ? loadError.message : "Systemdaten konnten nicht geladen werden."]);
      } finally {
        setLoading(false);
      }
    }

    loadSystem();
  }, []);

  const allowlistedEmails = adminAllowlistedEmails();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4A853]">Admin</p>
        <h1 className="mt-1 text-3xl font-serif font-bold text-[#111111]">System</h1>
        <p className="mt-1 text-sm text-[#666666]">Admin-Zugriff, Firestore-Zustand und letzte Admin-Aktionen.</p>
      </div>

      {(isAllowlisted && !hasBackendAdmin) && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <div className="flex items-start gap-3">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide">Lokaler Zugang aktiv, Backend-Admin fehlt</h2>
              <p className="mt-2 text-sm leading-6">
                Die E-Mail-Whitelist erlaubt nur das Admin-UI. Firestore Rules kennen diese Whitelist nicht. Damit Reports, Audit-Logs und Admin-Aktionen funktionieren, braucht dieser Account echte Admin-Rechte.
              </p>
              <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-xl bg-white/70 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Firebase Console Doc</p>
                  <p className="mt-1 font-mono text-xs break-all">adminUsers/{currentUid ?? "DEINE_UID"}</p>
                  <p className="mt-2 font-mono text-xs">active: true</p>
                  <p className="font-mono text-xs">email: {currentEmail ?? "deine-mail"}</p>
                </div>
                <div className="rounded-xl bg-white/70 p-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Produktiv besser</p>
                  <p className="mt-1 text-sm">Firebase Custom Claim setzen:</p>
                  <p className="mt-2 font-mono text-xs">admin: true</p>
                  <p className="mt-2 text-xs text-amber-800">Danach abmelden/anmelden oder Token refreshen.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {permissionWarnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Einige Systemdaten sind durch Firestore Rules blockiert: {permissionWarnings.join(" | ")}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SetupCard
          icon={ShieldCheck}
          title="Admin Claim"
          value={hasBackendAdmin ? (hasClaim ? "Claim aktiv" : "Backend aktiv") : "Nicht gesetzt"}
          ok={hasBackendAdmin}
          description="Zugriff laeuft ueber Bootstrap UID, adminUsers Doc oder Firebase Custom Claim."
        />
        <SetupCard
          icon={KeyRound}
          title="E-Mail Whitelist"
          value={allowlistedEmails.length > 0 ? `${allowlistedEmails.length} Eintrag(e)` : "Leer"}
          ok={allowlistedEmails.length > 0}
          description="NEXT_PUBLIC_ADMIN_EMAILS kann lokal helfen, ersetzt aber keine Rules/Claims."
        />
        <SetupCard
          icon={Database}
          title="Audit Log"
          value={counts?.auditLogs != null ? `${counts.auditLogs} Eintraege` : "Blockiert"}
          ok={(counts?.auditLogs ?? 0) > 0}
          description="Admin-Aktionen werden in adminAuditLogs nachvollziehbar gespeichert."
        />
      </div>

      <section className="rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-[#E0E0D6] pb-4">
          <h2 className="text-lg font-bold text-[#111111]">Firestore Counts</h2>
          <Activity className="h-5 w-5 text-[#D4A853]" />
        </div>
        {loading || !counts ? (
          <p className="text-sm text-gray-500">Systemdaten werden geladen...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            <CountPill label="Users" value={counts.users} />
            <CountPill label="Posts" value={counts.posts} />
            <CountPill label="Outfits" value={counts.outfits} />
            <CountPill label="Reports" value={counts.reports} />
            <CountPill label="Audit" value={counts.auditLogs} />
            <CountPill label="Analytics" value={counts.analyticsEvents} />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-[#E0E0D6] pb-4">
          <h2 className="text-lg font-bold text-[#111111]">Letzte Admin-Aktionen</h2>
          <FileClock className="h-5 w-5 text-[#D4A853]" />
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">Noch keine Audit-Logs geladen.</p>
        ) : (
          <div className="divide-y divide-[#E0E0D6]">
            {auditLogs.map(log => (
              <div key={log.id} className="flex flex-col gap-1 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#111111]">{log.action || "Admin-Aktion"}</p>
                  <p className="text-xs text-[#666666]">{log.actorEmail || log.actorId || "Admin"} · {log.targetType || "target"}/{log.targetId || "unknown"}</p>
                </div>
                <p className="text-xs font-semibold text-[#999999]">{formatDateTime(log.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SetupCard({ icon: Icon, title, value, ok, description }: { icon: typeof ShieldCheck; title: string; value: string; ok: boolean; description: string }) {
  return (
    <div className="rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-[#111111]">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${ok ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {ok ? <CheckCircle className="h-5 w-5" /> : <TriangleAlert className="h-5 w-5" />}
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-[#666666]">{description}</p>
      <Icon className="mt-4 h-4 w-4 text-[#D4A853]" />
    </div>
  );
}

function CountPill({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-xl bg-[#F8F8F3] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#111111]">{value ?? "Blockiert"}</p>
    </div>
  );
}
