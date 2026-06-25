"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, doc, getDocs, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { adminAvatarUrl, formatRelative, readDoc, toDate, writeAdminAuditLog, type AdminUserDoc } from "@/lib/admin";
import { Ban, CheckCircle, Crown, Eye, Search, Shield, Star, UserRoundCheck, Users } from "lucide-react";

type UserFilter = "all" | "premium" | "banned" | "inactive" | "new";

export default function UsersManagement() {
  const [users, setUsers] = useState<AdminUserDoc[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [referenceNow, setReferenceNow] = useState(0);

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      setReferenceNow(Date.now());
      try {
        const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(120));
        const snap = await getDocs(usersQuery);
        setUsers(snap.docs.map(docSnap => readDoc<AdminUserDoc>(docSnap)));
      } catch (error) {
        console.error("Fehler beim Laden der Nutzer", error);
        setMessage("Nutzer konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

  const summary = useMemo(() => {
    const sevenDaysAgo = referenceNow - 7 * 86_400_000;
    return {
      total: users.length,
      premium: users.filter(user => user.isPremium).length,
      banned: users.filter(user => user.isBanned).length,
      newUsers: users.filter(user => {
        const createdAt = toDate(user.createdAt)?.getTime() ?? 0;
        return createdAt >= sevenDaysAgo;
      }).length,
    };
  }, [referenceNow, users]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    const thirtyDaysAgo = referenceNow - 30 * 86_400_000;

    return users.filter(user => {
      const matchesSearch = !term
        || (user.displayName || "").toLowerCase().includes(term)
        || (user.email || "").toLowerCase().includes(term)
        || user.id.toLowerCase().includes(term);
      if (!matchesSearch) return false;

      if (filter === "premium") return user.isPremium === true;
      if (filter === "banned") return user.isBanned === true;
      if (filter === "new") {
        const createdAt = toDate(user.createdAt)?.getTime() ?? 0;
        return createdAt >= referenceNow - 7 * 86_400_000;
      }
      if (filter === "inactive") {
        const lastActiveAt = toDate(user.lastActiveAt)?.getTime() ?? 0;
        return lastActiveAt === 0 || lastActiveAt < thirtyDaysAgo;
      }
      return true;
    });
  }, [filter, referenceNow, search, users]);

  async function updateUserFlag(user: AdminUserDoc, field: "isPremium" | "isBanned", nextValue: boolean) {
    setBusyUserId(user.id);
    setMessage(null);
    try {
      await updateDoc(doc(db, "users", user.id), { [field]: nextValue });
      await writeAdminAuditLog(auth.currentUser, `user.${field}.${nextValue ? "enabled" : "disabled"}`, "user", user.id, {
        email: user.email ?? null,
        displayName: user.displayName ?? null,
      });
      setUsers(prev => prev.map(item => item.id === user.id ? { ...item, [field]: nextValue } : item));
      setMessage(field === "isPremium" ? "Premium-Status aktualisiert." : "Nutzerstatus aktualisiert.");
    } catch (error) {
      console.error("User update failed", error);
      setMessage("Aktion konnte nicht gespeichert werden.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#D4A853]">Admin</p>
          <h1 className="mt-1 text-3xl font-serif font-bold text-[#111111]">Nutzerverwaltung</h1>
          <p className="mt-1 text-sm text-[#666666]">Accounts prüfen, Premium verwalten und problematische Nutzer sperren.</p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Name, E-Mail oder User-ID"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-xl border border-[#E0E0D6] bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard icon={Users} label="Geladen" value={summary.total} />
        <SummaryCard icon={Crown} label="Premium" value={summary.premium} tone="gold" />
        <SummaryCard icon={Ban} label="Gesperrt" value={summary.banned} tone="red" />
        <SummaryCard icon={UserRoundCheck} label="Neu 7T" value={summary.newUsers} tone="green" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          ["all", "Alle"],
          ["premium", "Premium"],
          ["banned", "Gesperrt"],
          ["inactive", "Inaktiv"],
          ["new", "Neu"],
        ].map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value as UserFilter)}
            className={`rounded-full border px-4 py-2 text-xs font-bold transition ${filter === value ? "border-[#111111] bg-[#111111] text-white" : "border-[#E0E0D6] bg-white text-[#666666] hover:text-[#111111]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {message && <div className="rounded-xl border border-[#E0E0D6] bg-white px-4 py-3 text-sm font-semibold text-[#666666]">{message}</div>}

      <div className="overflow-hidden rounded-2xl border border-[#E0E0D6] bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Lade Nutzer...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E0E0D6] bg-[#F5F5F0] text-xs uppercase tracking-wider text-gray-500">
                  <th className="p-4 font-semibold">Nutzer</th>
                  <th className="p-4 font-semibold">Aktivität</th>
                  <th className="p-4 font-semibold">App</th>
                  <th className="p-4 font-semibold">Segment</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">Keine Nutzer gefunden.</td>
                  </tr>
                ) : filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-[#E0E0D6]/50 transition-colors hover:bg-[#F5F5F0]/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 shrink-0 rounded-full border border-gray-200 bg-cover bg-center"
                          style={{ backgroundImage: `url(${adminAvatarUrl(user)})` }}
                        />
                        <div className="min-w-0">
                          <Link href={`/admin/users/${user.id}`} className="block truncate text-sm font-bold text-gray-900 hover:underline">
                            {user.displayName || "Unbekannt"}
                          </Link>
                          <p className="truncate text-xs text-gray-500">{user.email || user.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <div className="font-semibold text-gray-900">{formatRelative(user.lastActiveAt)}</div>
                      <div className="text-xs text-gray-500">Beitritt {formatRelative(user.createdAt)}</div>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      <div>{user.appVersion ? `v${user.appVersion}` : "Unbekannt"}</div>
                      <div className="max-w-[160px] truncate text-xs text-gray-400">{user.deviceModel || "Kein Gerät"}</div>
                    </td>
                    <td className="p-4">
                      {user.isPremium ? <Badge icon={Star} label="Premium" tone="gold" /> : <Badge label="Free" />}
                    </td>
                    <td className="p-4">
                      {user.isBanned ? <Badge icon={Ban} label="Gesperrt" tone="red" /> : <Badge icon={CheckCircle} label="Aktiv" tone="green" />}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/users/${user.id}`} className="rounded-lg bg-gray-100 p-2 text-gray-700 transition hover:bg-gray-200" aria-label="Nutzer ansehen">
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => updateUserFlag(user, "isPremium", !user.isPremium)}
                          disabled={busyUserId === user.id}
                          className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-50"
                        >
                          {user.isPremium ? "Premium aus" : "Premium an"}
                        </button>
                        <button
                          onClick={() => updateUserFlag(user, "isBanned", !user.isBanned)}
                          disabled={busyUserId === user.id}
                          className={`rounded-lg px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${user.isBanned ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200" : "bg-red-100 text-red-700 hover:bg-red-200"}`}
                        >
                          {user.isBanned ? "Entsperren" : "Sperren"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone = "neutral" }: { icon: typeof Shield; label: string; value: number; tone?: "neutral" | "gold" | "red" | "green" }) {
  const colors = {
    neutral: "bg-blue-50 text-blue-600",
    gold: "bg-[#D4A853]/10 text-[#D4A853]",
    red: "bg-red-50 text-red-600",
    green: "bg-emerald-50 text-emerald-700",
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

function Badge({ icon: Icon, label, tone = "neutral" }: { icon?: typeof Shield; label: string; tone?: "neutral" | "gold" | "red" | "green" }) {
  const colors = {
    neutral: "bg-gray-100 text-gray-600",
    gold: "bg-[#D4A853]/10 text-[#A97900]",
    red: "bg-red-100 text-red-700",
    green: "bg-emerald-100 text-emerald-700",
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${colors}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}
