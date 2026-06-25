"use client";

import { useEffect, useRef, useState } from "react";
import { collection, getCountFromServer, getDocs, limit, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Activity, AlertTriangle, ArrowUpRight, Bot, Crown, Eye, Flag, Flame, LayoutDashboard, LineChart, ShieldCheck, Sparkles, Target, TrendingUp, Users, type LucideIcon } from "lucide-react";

type AdminStats = {
  users: number;
  posts: number;
  outfits: number;
  reported: number;
  dau: number;
};

type SocialPostDoc = {
  id: string;
  userId?: string;
  userName?: string;
  caption?: string;
  imageURL?: string;
  likes?: number;
  commentCount?: number;
  reportCount?: number;
  createdAt?: unknown;
};

type UserDoc = {
  id: string;
  displayName?: string;
  email?: string;
  avatarImageURL?: string;
  avatarURL?: string;
  isPremium?: boolean;
  createdAt?: unknown;
  lastActiveAt?: unknown;
};

type TrendTopic = {
  label: string;
  current: number;
  previous: number;
  longTerm: number;
  growth: number;
  signal: "emerging" | "growing" | "stable";
};

type MomentumPost = SocialPostDoc & {
  createdDate: Date | null;
  engagement: number;
  momentum: number;
};

type TrendData = {
  posts7: number;
  previousPosts7: number;
  posts30: number;
  previousPosts30: number;
  engagement7: number;
  previousEngagement7: number;
  activeCreators30: number;
  returningUsers30: number;
  topics: TrendTopic[];
  momentumPosts: MomentumPost[];
};

type HealthData = {
  premiumUsers: number;
  bannedUsers: number;
  staleUsers30: number;
  reportPressure: number;
  topAppVersions: { label: string; count: number }[];
  attentionItems: string[];
  newPremiumThisWeek: number;
  estimatedMRR: number;
  conversionRate: number;
};

const emptyTrendData: TrendData = {
  posts7: 0,
  previousPosts7: 0,
  posts30: 0,
  previousPosts30: 0,
  engagement7: 0,
  previousEngagement7: 0,
  activeCreators30: 0,
  returningUsers30: 0,
  topics: [],
  momentumPosts: []
};

const stopWords = new Set([
  "aber", "auch", "auf", "aus", "bei", "bin", "bitte", "das", "dass", "dein", "dem", "den", "der", "die", "dir", "ein", "eine", "einer", "eines", "für", "hat", "ich", "ist", "mit", "nicht", "noch", "oder", "und", "von", "war", "wie", "wir", "you", "the", "and", "for", "with", "this", "that", "look", "outfit"
]);

function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof value === "object" && value !== null && "seconds" in value && typeof (value as { seconds: number }).seconds === "number") {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  return null;
}

function daysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function isBetween(date: Date | null, start: Date, end: Date) {
  return !!date && date >= start && date < end;
}

function engagementOf(post: SocialPostDoc) {
  return (post.likes ?? 0) + (post.commentCount ?? 0) * 2;
}

function extractTopics(post: SocialPostDoc) {
  const caption = (post.caption ?? "").toLowerCase();
  const hashtags = caption.match(/#[\p{L}\p{N}_-]+/gu)?.map(tag => tag.replace("#", "")) ?? [];
  const keywords = caption
    .replace(/#[\p{L}\p{N}_-]+/gu, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .map(word => word.trim())
    .filter(word => word.length >= 4 && !stopWords.has(word))
    .slice(0, 5);

  return Array.from(new Set([...hashtags, ...keywords])).slice(0, 8);
}

function countTopics(posts: SocialPostDoc[], start: Date, end: Date) {
  const counts = new Map<string, number>();
  posts.forEach(post => {
    const createdAt = toDate(post.createdAt);
    if (!isBetween(createdAt, start, end)) return;
    extractTopics(post).forEach(topic => counts.set(topic, (counts.get(topic) ?? 0) + 1));
  });
  return counts;
}

function buildTrendData(posts: SocialPostDoc[], users: UserDoc[]): TrendData {
  const now = new Date();
  const last7 = daysAgo(7);
  const previous7 = daysAgo(14);
  const last30 = daysAgo(30);
  const previous30 = daysAgo(60);
  const last90 = daysAgo(90);

  const posts7 = posts.filter(post => isBetween(toDate(post.createdAt), last7, now));
  const previousPosts7 = posts.filter(post => isBetween(toDate(post.createdAt), previous7, last7));
  const posts30 = posts.filter(post => isBetween(toDate(post.createdAt), last30, now));
  const previousPosts30 = posts.filter(post => isBetween(toDate(post.createdAt), previous30, last30));

  const currentTopics = countTopics(posts, last30, now);
  const previousTopics = countTopics(posts, previous30, last30);
  const longTermTopics = countTopics(posts, last90, now);

  const topics = Array.from(currentTopics.entries())
    .map(([label, current]) => {
      const previous = previousTopics.get(label) ?? 0;
      const longTerm = longTermTopics.get(label) ?? current;
      const growth = previous === 0 ? current : current / previous;
      const signal: TrendTopic["signal"] = previous === 0 && current > 0 ? "emerging" : growth >= 1.5 ? "growing" : "stable";
      return { label, current, previous, longTerm, growth, signal };
    })
    .filter(topic => topic.current > 0)
    .sort((a, b) => (b.growth * b.current) - (a.growth * a.current))
    .slice(0, 8);

  const momentumPosts = posts
    .map(post => {
      const createdDate = toDate(post.createdAt);
      const ageDays = createdDate ? Math.max(1, (Date.now() - createdDate.getTime()) / 86_400_000) : 30;
      const engagement = engagementOf(post);
      return { ...post, createdDate, engagement, momentum: engagement / ageDays };
    })
    .filter(post => post.createdDate && post.createdDate >= last30)
    .sort((a, b) => b.momentum - a.momentum)
    .slice(0, 5);

  const activeCreators30 = new Set(posts30.map(post => post.userId).filter(Boolean)).size;
  const returningUsers30 = users.filter(user => {
    const createdAt = toDate(user.createdAt);
    const lastActiveAt = toDate(user.lastActiveAt);
    return !!createdAt && !!lastActiveAt && createdAt < last30 && lastActiveAt >= last30;
  }).length;

  return {
    posts7: posts7.length,
    previousPosts7: previousPosts7.length,
    posts30: posts30.length,
    previousPosts30: previousPosts30.length,
    engagement7: posts7.reduce((sum, post) => sum + engagementOf(post), 0),
    previousEngagement7: previousPosts7.reduce((sum, post) => sum + engagementOf(post), 0),
    activeCreators30,
    returningUsers30,
    topics,
    momentumPosts
  };
}

function buildHealthData(posts: SocialPostDoc[], users: UserDoc[]): HealthData {
  const last30 = daysAgo(30);
  const premiumUsers = users.filter(user => user.isPremium).length;
  const bannedUsers = users.filter(user => (user as UserDoc & { isBanned?: boolean }).isBanned).length;
  const staleUsers30 = users.filter(user => {
    const lastActiveAt = toDate(user.lastActiveAt);
    return !lastActiveAt || lastActiveAt < last30;
  }).length;
  const reportedPosts = posts.filter(post => (post.reportCount ?? 0) > 0);
  const reportPressure = reportedPosts.reduce((sum, post) => sum + (post.reportCount ?? 0), 0);
  const appVersions = new Map<string, number>();
  const last7 = daysAgo(7);
  const newPremiumThisWeek = users.filter(user => {
    const createdAt = toDate(user.createdAt);
    return user.isPremium && createdAt && createdAt >= last7;
  }).length;
  const PREMIUM_PRICE_EUR = 4.99;
  const estimatedMRR = Math.round(premiumUsers * PREMIUM_PRICE_EUR);
  const conversionRate = users.length > 0 ? Math.round((premiumUsers / users.length) * 1000) / 10 : 0;
  users.forEach(user => {
    const version = (user as UserDoc & { appVersion?: string }).appVersion;
    if (version) appVersions.set(version, (appVersions.get(version) ?? 0) + 1);
  });

  const attentionItems = [
    reportPressure > 0 ? `${reportPressure} offene Report-Signale prüfen` : null,
    staleUsers30 > users.length * 0.35 && users.length > 10 ? "Viele Nutzer waren 30 Tage nicht aktiv" : null,
    premiumUsers === 0 && users.length > 0 ? "Noch keine Premium-Nutzer sichtbar" : null,
    reportedPosts.some(post => (post.reportCount ?? 0) >= 5) ? "Mindestens ein Post braucht hohe Moderationspriorität" : null,
  ].filter((item): item is string => Boolean(item));

  return {
    premiumUsers,
    bannedUsers,
    staleUsers30,
    reportPressure,
    topAppVersions: Array.from(appVersions.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 4),
    attentionItems,
    newPremiumThisWeek,
    estimatedMRR,
    conversionRate,
  };
}

function growthPercent(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "+neu" : "0%";
  const value = Math.round(((current - previous) / previous) * 100);
  return `${value >= 0 ? "+" : ""}${value}%`;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unbekannter Firestore-Fehler";
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    users: 0,
    posts: 0,
    outfits: 0,
    reported: 0,
    dau: 0
  });
  
  const [recentUsers, setRecentUsers] = useState<UserDoc[]>([]);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const [trendError, setTrendError] = useState<string | null>(null);
  const [liveFeed, setLiveFeed] = useState<SocialPostDoc[]>([]);
  const unsubscribeLiveFeedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    async function loadStats() {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const [usersCount, postsCount, outfitsCount, reportedCount, dauCount] = await Promise.allSettled([
        getCountFromServer(collection(db, "users")),
        getCountFromServer(collection(db, "socialPosts")),
        getCountFromServer(collection(db, "outfits")),
        getCountFromServer(query(collection(db, "socialPosts"), where("reportCount", ">", 0))),
        getCountFromServer(query(collection(db, "users"), where("lastActiveAt", ">=", yesterday)))
      ]);

      setStats({
        users: usersCount.status === "fulfilled" ? usersCount.value.data().count : 0,
        posts: postsCount.status === "fulfilled" ? postsCount.value.data().count : 0,
        outfits: outfitsCount.status === "fulfilled" ? outfitsCount.value.data().count : 0,
        reported: reportedCount.status === "fulfilled" ? reportedCount.value.data().count : 0,
        dau: dauCount.status === "fulfilled" ? dauCount.value.data().count : 0
      });

      const countErrors = [usersCount, postsCount, outfitsCount, reportedCount, dauCount]
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map(result => errorMessage(result.reason));
      if (countErrors.length > 0) {
        console.error("Error loading admin counts:", countErrors.join(" | "));
      }
    }

    async function loadRecentUsers() {
      try {
        const recentUsersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"), limit(5));
        const usersSnap = await getDocs(recentUsersQuery);
        setRecentUsers(usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDoc)));
      } catch (error) {
        console.error("Error loading recent users:", error);
      }
    }

    async function loadTrendData() {
      setTrendLoading(true);
      setTrendError(null);

      const trendPostsQuery = query(collection(db, "socialPosts"), orderBy("createdAt", "desc"), limit(240));
      const trendUsersQuery = query(collection(db, "users"), orderBy("lastActiveAt", "desc"), limit(240));
      const [trendPostsSnap, trendUsersSnap] = await Promise.allSettled([
        getDocs(trendPostsQuery),
        getDocs(trendUsersQuery)
      ]);

      const trendPosts = trendPostsSnap.status === "fulfilled"
        ? trendPostsSnap.value.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPostDoc))
        : [];
      const trendUsers = trendUsersSnap.status === "fulfilled"
        ? trendUsersSnap.value.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDoc))
        : [];

      const trendErrors = [trendPostsSnap, trendUsersSnap]
        .filter((result): result is PromiseRejectedResult => result.status === "rejected")
        .map(result => errorMessage(result.reason));

      if (trendErrors.length > 0) {
        const message = trendErrors.join(" | ");
        console.error("Error loading trend data:", message);
        setTrendError(message);
      }

      setTrendData(trendPosts.length > 0 || trendUsers.length > 0 ? buildTrendData(trendPosts, trendUsers) : emptyTrendData);
      setHealthData(buildHealthData(trendPosts, trendUsers));
      setTrendLoading(false);
    }

    loadStats();
    loadRecentUsers();
    loadTrendData();

    // Real-time feed listener
    const liveFeedQuery = query(collection(db, "socialPosts"), orderBy("createdAt", "desc"), limit(12));
    const unsubscribe = onSnapshot(liveFeedQuery, snapshot => {
      setLiveFeed(snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as SocialPostDoc)));
    });
    unsubscribeLiveFeedRef.current = unsubscribe;
    return () => { unsubscribe(); };
  }, []);

  return (
    <div className="space-y-8 animate-fade-in fade-in-0 duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#111111]">Dashboard Übersicht</h1>
        <p className="text-[#666666] mt-2">Herzlich Willkommen im FAYV Admin Bereich.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <StatCard title="Nutzer gesamt" value={stats.users} icon={Users} color="text-blue-600" bg="bg-blue-50" />
        <StatCard title="Aktive Nutzer (DAU)" value={stats.dau} icon={Users} color="text-purple-600" bg="bg-purple-50" />
        <StatCard title="Beiträge" value={stats.posts} icon={LayoutDashboard} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard title="Outfits erstellt" value={stats.outfits} icon={LayoutDashboard} color="text-[#D4A853]" bg="bg-[#D4A853]/10" />
        <StatCard title="Gemeldete Inhalte" value={stats.reported} icon={Flag} color="text-red-500" bg="bg-red-50" />
      </div>

      {/* Revenue Metrics */}
      {healthData && (
        <section className="rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E0E0D6] pb-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[#111111]">Revenue & Monetarisierung</h2>
              <p className="text-sm text-[#666666] mt-1">Premium-Entwicklung und geschätzte Umsatz-Kennzahlen.</p>
            </div>
            <Crown className="h-5 w-5 text-[#D4A853]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-xl bg-[#F8F8F3] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Premium-Nutzer</p>
              <p className="mt-2 text-3xl font-bold text-[#111111]">{healthData.premiumUsers}</p>
              <p className="mt-1 text-xs text-[#666666]">von {stats.users} gesamt</p>
            </div>
            <div className="rounded-xl bg-[#F8F8F3] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Conversion Rate</p>
              <p className="mt-2 text-3xl font-bold text-[#111111]">{healthData.conversionRate}%</p>
              <p className="mt-1 text-xs text-[#666666]">Free → Premium</p>
            </div>
            <div className="rounded-xl bg-[#F8F8F3] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Geschätztes MRR</p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">€{healthData.estimatedMRR}</p>
              <p className="mt-1 text-xs text-[#666666]">bei €4,99/Monat</p>
            </div>
            <div className="rounded-xl bg-[#F8F8F3] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Neu Premium (7T)</p>
              <p className="mt-2 text-3xl font-bold text-[#111111]">{healthData.newPremiumThisWeek}</p>
              <p className="mt-1 text-xs text-[#666666]">neue Abos diese Woche</p>
            </div>
          </div>
        </section>
      )}

      {healthData && (
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-[#E0E0D6] pb-4">
              <div>
                <h2 className="text-lg font-semibold text-[#111111]">Operations Health</h2>
                <p className="mt-1 text-sm text-[#666666]">Schneller Blick auf Nutzerqualität, Moderation und App-Zustand.</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-[#D4A853]" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <HealthCard title="Premium" value={healthData.premiumUsers} icon={Crown} />
              <HealthCard title="Gesperrt" value={healthData.bannedUsers} icon={Flag} danger={healthData.bannedUsers > 0} />
              <HealthCard title="Inaktiv 30T" value={healthData.staleUsers30} icon={Users} />
              <HealthCard title="Reports" value={healthData.reportPressure} icon={AlertTriangle} danger={healthData.reportPressure > 0} />
            </div>
            <div className="mt-5 rounded-xl bg-[#F8F8F3] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#666666]">App-Versionen</p>
              {healthData.topAppVersions.length === 0 ? (
                <p className="mt-2 text-sm text-gray-500">Noch keine App-Versionen auf Nutzerprofilen.</p>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {healthData.topAppVersions.map(version => (
                    <span key={version.label} className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#666666]">
                      v{version.label}: {version.count}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-[#E0E0D6] pb-4">
              <h2 className="text-lg font-semibold text-[#111111]">Aufmerksamkeit</h2>
              <Bot className="h-5 w-5 text-[#D4A853]" />
            </div>
            {healthData.attentionItems.length === 0 ? (
              <p className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">Keine kritischen Admin-Signale in den geladenen Daten.</p>
            ) : (
              <div className="space-y-3">
                {healthData.attentionItems.map(item => (
                  <div key={item} className="rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900">
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Trend Radar */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[#111111] flex items-center gap-2">
              Trend Radar
              <LineChart className="w-5 h-5 text-[#D4A853]" />
            </h2>
            <p className="text-sm text-[#666666] mt-1">Frühe Signale aus Posts, Aktivität und Engagement der letzten 7/30/90 Tage.</p>
          </div>
          <span className="hidden md:inline-flex items-center gap-2 rounded-full border border-[#E0E0D6] bg-white px-3 py-2 text-xs font-semibold text-[#666666]">
            <Eye className="h-4 w-4" /> Live aus Firestore
          </span>
        </div>

        {trendLoading ? (
          <div className="rounded-2xl border border-[#E0E0D6] bg-white p-6 text-sm text-gray-500">Trenddaten werden geladen...</div>
        ) : trendData ? (
          <>
            {trendError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Trenddaten konnten nicht vollständig geladen werden: {trendError}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <TrendMetricCard
                title="Post-Frequenz 7T"
                value={trendData.posts7}
                delta={growthPercent(trendData.posts7, trendData.previousPosts7)}
                icon={Activity}
              />
              <TrendMetricCard
                title="Engagement 7T"
                value={trendData.engagement7}
                delta={growthPercent(trendData.engagement7, trendData.previousEngagement7)}
                icon={Flame}
              />
              <TrendMetricCard
                title="Posts 30T"
                value={trendData.posts30}
                delta={growthPercent(trendData.posts30, trendData.previousPosts30)}
                icon={TrendingUp}
              />
              <TrendMetricCard
                title="Aktive Creator 30T"
                value={trendData.activeCreators30}
                delta={`${trendData.returningUsers30} Rückkehrer`}
                icon={Users}
              />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-[#E0E0D6] p-6">
                <div className="flex items-center justify-between border-b border-[#E0E0D6] pb-4 mb-4">
                  <h3 className="text-lg font-semibold">Frühe & langfristige Style-Signale</h3>
                  <Target className="w-5 h-5 text-[#D4A853]" />
                </div>

                {trendData.topics.length === 0 ? (
                  <p className="text-sm text-gray-500">Noch zu wenig Caption-/Hashtag-Daten für Trends.</p>
                ) : (
                  <div className="space-y-3">
                    {trendData.topics.map(topic => (
                      <div key={topic.label} className="rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-semibold text-[#111111]">#{topic.label}</span>
                              <TrendBadge signal={topic.signal} />
                            </div>
                            <p className="mt-1 text-xs text-[#666666]">
                              30T: {topic.current} Erwähnungen · vorher {topic.previous} · 90T gesamt {topic.longTerm}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#111111]">{topic.growth === 0 ? "0x" : `${topic.growth.toFixed(1)}x`}</p>
                            <p className="text-[11px] uppercase tracking-wide text-[#777]">Wachstum</p>
                          </div>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-white">
                          <div
                            className="h-2 rounded-full bg-[#D4A853]"
                            style={{ width: `${Math.min(100, Math.max(8, topic.current * 18))}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-[#E0E0D6] p-6">
                <div className="flex items-center justify-between border-b border-[#E0E0D6] pb-4 mb-4">
                  <h3 className="text-lg font-semibold">Momentum Posts</h3>
                  <Sparkles className="w-5 h-5 text-[#D4A853]" />
                </div>

                {trendData.momentumPosts.length === 0 ? (
                  <p className="text-sm text-gray-500">Noch keine Momentum-Daten.</p>
                ) : (
                  <div className="space-y-4">
                    {trendData.momentumPosts.map(post => (
                      <div key={post.id} className="flex gap-3 rounded-xl bg-[#F8F8F3] p-3">
                        <div
                          className="h-14 w-14 overflow-hidden rounded-lg bg-[#E0E0D6] bg-cover bg-center shrink-0"
                          style={post.imageURL ? { backgroundImage: `url(${post.imageURL})` } : undefined}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#111111]">{post.caption || "Ohne Caption"}</p>
                          <p className="mt-1 text-xs text-[#666666]">{post.userName || post.userId || "Unbekannt"}</p>
                          <p className="mt-2 text-xs font-semibold text-[#D4A853]">
                            {post.engagement} Engagement · {post.momentum.toFixed(1)} Momentum/Tag
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-[#E0E0D6] bg-white p-6 text-sm text-gray-500">Keine Trenddaten verfügbar.</div>
        )}
      </section>

      {/* Content Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-10">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-[#E0E0D6] p-6">
          <h2 className="text-lg font-semibold border-b border-[#E0E0D6] pb-4 mb-4">Letzte Neuanmeldungen</h2>
          {recentUsers.length === 0 ? (
            <p className="text-sm text-gray-500">Lade Nutzer...</p>
          ) : (
            <div className="space-y-4">
              {recentUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 bg-[#F5F5F0] rounded-xl hover:bg-[#ebebe2] transition-colors">
                  <div className="flex items-center space-x-4">
                    <div
                      className="w-10 h-10 rounded-full bg-gray-300 bg-cover bg-center flex items-center justify-center overflow-hidden"
                      style={user.avatarImageURL ? { backgroundImage: `url(${user.avatarImageURL})` } : undefined}
                    >
                      {!user.avatarImageURL && (
                        <span className="text-gray-600 text-xs font-bold">{user.displayName?.charAt(0) || user.email?.charAt(0) || "?"}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{user.displayName || "Kein Name"}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 bg-white rounded-md text-gray-600 border border-gray-200">
                    {user.isPremium ? "Premium" : "Free"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Feed */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E0E0D6] p-6">
          <div className="flex items-center justify-between border-b border-[#E0E0D6] pb-4 mb-4">
            <h2 className="text-lg font-semibold">Live-Feed</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
          {liveFeed.length === 0 ? (
            <p className="text-sm text-gray-500">Warte auf neue Posts...</p>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {liveFeed.map(post => (
                <div key={post.id} className="flex gap-3 rounded-xl bg-[#F8F8F3] p-3">
                  {post.imageURL && (
                    <div
                      className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#E0E0D6] bg-cover bg-center"
                      style={{ backgroundImage: `url(${post.imageURL})` }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#111111]">{post.caption || "Ohne Caption"}</p>
                    <p className="mt-0.5 text-xs text-[#666666]">{post.userName || post.userId || "Unbekannt"}</p>
                    <p className="mt-1 text-xs text-[#D4A853]">♥ {post.likes ?? 0} · 💬 {post.commentCount ?? 0}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: { title: string; value: number; icon: LucideIcon; color: string; bg: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#E0E0D6] hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-500">{title}</p>
          <p className="text-3xl font-bold mt-2 text-[#111]">{value}</p>
        </div>
        <div className={`p-4 rounded-full ${bg} ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function TrendMetricCard({ title, value, delta, icon: Icon }: { title: string; value: number; delta: string; icon: LucideIcon }) {
  const isPositive = delta.startsWith("+") || delta.includes("neu") || delta.includes("Rückkehrer");
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-[#E0E0D6]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#111111]">{value}</p>
        </div>
        <div className="rounded-full bg-[#D4A853]/10 p-3 text-[#D4A853]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className={`mt-4 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${isPositive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
        <ArrowUpRight className="h-3.5 w-3.5" />
        {delta}
      </div>
    </div>
  );
}

function HealthCard({ title, value, icon: Icon, danger = false }: { title: string; value: number; icon: LucideIcon; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-[#E0E0D6] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-[#111111]">{value}</p>
        </div>
        <div className={`rounded-full p-2.5 ${danger ? "bg-red-50 text-red-600" : "bg-[#D4A853]/10 text-[#D4A853]"}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function TrendBadge({ signal }: { signal: TrendTopic["signal"] }) {
  const label = signal === "emerging" ? "Früh" : signal === "growing" ? "Wachsend" : "Stabil";
  const cls = signal === "emerging"
    ? "bg-amber-100 text-amber-800"
    : signal === "growing"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-gray-100 text-gray-600";

  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${cls}`}>{label}</span>;
}
