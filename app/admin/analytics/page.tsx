"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDateTime, formatRelative, numeric, readDoc, toDate } from "@/lib/admin";
import type { AnalyticsEventDoc } from "@/lib/analytics";
import { Activity, BarChart3, BellRing, Bot, CheckCircle2, Flame, Gauge, Heart, LineChart, MousePointerClick, Route, Search, ShieldAlert, Sparkles, Target, TrendingUp, Users, Zap } from "lucide-react";

type Period = "24h" | "7d" | "30d";
type RankedItem = { label: string; value: number; helper?: string };

const periodOptions: { value: Period; label: string; days: number }[] = [
  { value: "24h", label: "24 Std.", days: 1 },
  { value: "7d", label: "7 Tage", days: 7 },
  { value: "30d", label: "30 Tage", days: 30 },
];

const screenLabels: Record<string, string> = {
  today: "Heute",
  today_inspirations: "Inspirationen",
  wardrobe: "Garderobe",
  outfit_generator: "Outfits",
  camera: "Kamera",
  shop: "Shop",
  community: "Community",
  profile: "Profil",
  paywall: "Paywall",
  admin: "Admin",
};

const featureLabels: Record<string, string> = {
  today_outfit: "Today KI-Outfit",
  inspirations: "Inspirationen",
  wardrobe_item: "Kleidung hinzufügen",
  outfit_generator: "Outfit Generator",
  style_rating: "Style bewerten",
  wardrobe_analysis: "Garderobe-Check",
  outfit_recognition: "Look erkennen",
  color_analysis: "Farbtyp-Analyse",
  cost_per_wear: "Kosten pro Tragen",
  post: "Community Post",
  like: "Like",
  comment: "Kommentar",
  premium: "Premium",
  admin: "Admin",
};

const funnelSteps = [
  { label: "App geöffnet", events: ["app_opened", "app_foreground", "screen_view"] },
  { label: "Konto erstellt", events: ["sign_up_completed"] },
  { label: "Onboarding fertig", events: ["onboarding_completed"] },
  { label: "Kleidung hinzugefügt", events: ["wardrobe_item_added"] },
  { label: "KI-Outfit erstellt", events: ["ai_today_outfit_success", "outfit_generated", "outfit_saved"] },
  { label: "Community Aktion", events: ["post_created", "post_liked", "comment_created"] },
  { label: "Premium Interesse", events: ["paywall_shown", "premium_paywall_opened", "premium_purchase_started"] },
  { label: "Premium gekauft", events: ["premium_purchase_completed"] },
];

function eventDate(event: AnalyticsEventDoc) {
  return toDate(event.createdAt) ?? toDate(event.createdAtClient);
}

function selectedDays(period: Period) {
  return periodOptions.find(option => option.value === period)?.days ?? 7;
}

function startDateForPeriod(period: Period) {
  const date = new Date();
  date.setDate(date.getDate() - selectedDays(period));
  return date;
}

function inPeriod(event: AnalyticsEventDoc, period: Period) {
  const date = eventDate(event);
  return !!date && date >= startDateForPeriod(period);
}

function eventName(event: AnalyticsEventDoc) {
  return event.eventName ?? "unknown_event";
}

function eventLabel(value?: string | null) {
  if (!value) return "Unbekannt";
  return screenLabels[value] ?? featureLabels[value] ?? value.replaceAll("_", " ");
}

function countBy(events: AnalyticsEventDoc[], selector: (event: AnalyticsEventDoc) => string | null | undefined, limitCount = 8): RankedItem[] {
  const counts = new Map<string, number>();
  events.forEach(event => {
    const key = selector(event);
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label: eventLabel(label), value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limitCount);
}

function uniqueUsers(events: AnalyticsEventDoc[]) {
  return new Set(events.map(event => event.userId).filter(Boolean)).size;
}

function eventMatches(event: AnalyticsEventDoc, names: string[]) {
  return names.includes(eventName(event));
}

function rate(part: number, total: number) {
  if (total <= 0) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function buildDailySeries(events: AnalyticsEventDoc[], period: Period) {
  const days = selectedDays(period);
  const today = new Date();
  const buckets = Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    return { label: date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" }), value: 0 };
  });

  events.forEach(event => {
    const date = eventDate(event);
    if (!date) return;
    const diffDays = Math.floor((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) / 86_400_000);
    const index = days - diffDays - 1;
    if (index >= 0 && index < buckets.length) buckets[index].value += 1;
  });

  return buckets;
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const [events, setEvents] = useState<AnalyticsEventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const eventSnap = await getDocs(query(collection(db, "analyticsEvents"), orderBy("createdAt", "desc"), limit(2000)));
        setEvents(eventSnap.docs.map(docSnap => readDoc<AnalyticsEventDoc>(docSnap)));
      } catch (loadError) {
        console.error("Analytics load failed", loadError);
        setError(loadError instanceof Error ? loadError.message : "Analytics-Daten konnten nicht geladen werden.");
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, []);

  const filteredEvents = useMemo(() => events.filter(event => inPeriod(event, period)), [events, period]);
  const pageViews = useMemo(() => filteredEvents.filter(event => event.eventType === "page_view" || eventName(event) === "screen_view"), [filteredEvents]);
  const featureEvents = useMemo(() => filteredEvents.filter(event => event.eventType === "feature_used"), [filteredEvents]);
  const aiEvents = useMemo(() => filteredEvents.filter(event => event.eventType === "ai" || eventName(event).startsWith("ai_")), [filteredEvents]);
  const contentEvents = useMemo(() => filteredEvents.filter(event => ["post_created", "post_liked", "comment_created"].includes(eventName(event))), [filteredEvents]);
  const topScreens = useMemo(() => countBy(pageViews, event => event.screen, 10), [pageViews]);
  const topFeatures = useMemo(() => countBy(featureEvents, event => event.feature ?? event.eventName, 10), [featureEvents]);
  const dailySeries = useMemo(() => buildDailySeries(filteredEvents, period), [filteredEvents, period]);

  const aiSuccess = aiEvents.filter(event => eventName(event).includes("success") || eventName(event) === "ai_scan_used").length;
  const aiFailures = aiEvents.filter(event => eventName(event).includes("failed") || eventName(event).includes("error")).length;
  const aiFallbacks = aiEvents.filter(event => eventName(event).includes("fallback")).length;
  const premiumEvents = filteredEvents.filter(event => event.feature === "premium" || eventName(event).startsWith("premium_") || eventName(event) === "paywall_shown");
  const topUsers = useMemo(() => countBy(filteredEvents, event => event.userId, 6).map(item => ({ ...item, helper: "Events" })), [filteredEvents]);
  const recentEvents = useMemo(() => filteredEvents.slice(0, 12), [filteredEvents]);

  const funnel = funnelSteps.map((step, index) => {
    const users = new Set(filteredEvents.filter(event => eventMatches(event, step.events)).map(event => event.userId).filter(Boolean)).size;
    const previousUsers = index === 0 ? users : new Set(filteredEvents.filter(event => eventMatches(event, funnelSteps[index - 1].events)).map(event => event.userId).filter(Boolean)).size;
    return { ...step, users, conversion: index === 0 ? "100%" : rate(users, previousUsers) };
  });

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[#D4A853]">Growth & Nutzung</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-serif font-bold text-[#111111]">
            Analytics
            <BarChart3 className="h-6 w-6 text-[#D4A853]" />
          </h1>
          <p className="mt-1 text-sm text-[#666666]">Seiten, Features, KI-Qualität, Funnel und Kampagnen-Signale.</p>
        </div>

        <div className="inline-flex rounded-xl border border-[#E0E0D6] bg-white p-1 shadow-sm">
          {periodOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setPeriod(option.value)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${period === option.value ? "bg-[#111111] text-white" : "text-[#666666] hover:bg-[#F8F8F3]"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {error} Prüfe, ob `analyticsEvents` in Firestore Rules für Admins lesbar ist.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Activity} title="Events" value={loading ? "Lädt" : filteredEvents.length.toLocaleString("de-DE")} helper={`${events.length.toLocaleString("de-DE")} im Speicher`} tone="blue" />
        <MetricCard icon={Users} title="Aktive Nutzer" value={uniqueUsers(filteredEvents).toLocaleString("de-DE")} helper="Eindeutige User-IDs" tone="emerald" />
        <MetricCard icon={Route} title="Page Views" value={pageViews.length.toLocaleString("de-DE")} helper="Meistbesuchte Screens" tone="gold" />
        <MetricCard icon={MousePointerClick} title="Feature Uses" value={featureEvents.length.toLocaleString("de-DE")} helper="Getrackte Aktionen" tone="purple" />
      </div>

      <Section title="Nutzungstrend" icon={LineChart} action={<StatusPill label={`${selectedDays(period)} Tage`} />}>
        <DailyBars items={dailySeries} />
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Meistbesuchte Seiten" icon={Route}>
          <RankingList items={topScreens} empty="Noch keine Screen-Views." />
        </Section>

        <Section title="Meistgenutzte Features" icon={Zap}>
          <RankingList items={topFeatures} empty="Noch keine Feature-Events." />
        </Section>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Section title="AI Health" icon={Bot}>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Erfolg" value={aiSuccess} tone="emerald" />
            <MiniStat label="Fehler" value={aiFailures} tone="red" />
            <MiniStat label="Fallback" value={aiFallbacks} tone="amber" />
            <MiniStat label="Stabilität" value={rate(aiSuccess, aiSuccess + aiFailures + aiFallbacks)} tone="blue" />
          </div>
          <div className="mt-4 rounded-xl bg-[#F8F8F3] p-4 text-sm text-[#666666]">
            {aiFailures + aiFallbacks > 0 ? "KI braucht Aufmerksamkeit: Fehler oder Fallbacks sind im Zeitraum sichtbar." : "Keine KI-Fehler im aktuellen Zeitraum sichtbar."}
          </div>
        </Section>

        <Section title="Content Performance" icon={Heart}>
          <div className="space-y-3">
            <MiniStat label="Posts" value={contentEvents.filter(event => eventName(event) === "post_created").length} tone="blue" />
            <MiniStat label="Likes" value={contentEvents.filter(event => eventName(event) === "post_liked").length} tone="emerald" />
            <MiniStat label="Kommentare" value={contentEvents.filter(event => eventName(event) === "comment_created").length} tone="purple" />
          </div>
        </Section>

        <Section title="Premium Signal" icon={Sparkles}>
          <div className="space-y-3">
            <MiniStat label="Paywall" value={premiumEvents.filter(event => eventName(event) === "paywall_shown" || eventName(event) === "premium_paywall_opened").length} tone="gold" />
            <MiniStat label="Kauf gestartet" value={premiumEvents.filter(event => eventName(event) === "premium_purchase_started").length} tone="blue" />
            <MiniStat label="Kauf fertig" value={premiumEvents.filter(event => eventName(event) === "premium_purchase_completed").length} tone="emerald" />
          </div>
        </Section>
      </div>

      <Section title="Funnel" icon={Target}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {funnel.map(step => (
            <div key={step.label} className="rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] p-4">
              <p className="text-xs font-bold uppercase text-[#666666]">{step.label}</p>
              <p className="mt-2 text-2xl font-bold text-[#111111]">{step.users}</p>
              <p className="mt-1 text-xs font-semibold text-[#D4A853]">{step.conversion} Conversion</p>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Section title="User Intelligence" icon={Gauge}>
          <RankingList items={topUsers} empty="Noch keine User-Aktivität." />
        </Section>

        <Section title="Campaign Center" icon={BellRing} className="xl:col-span-2">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <CohortCard icon={ShieldAlert} title="KI-Probleme" value={uniqueUsers(aiEvents.filter(event => eventName(event).includes("failed") || eventName(event).includes("fallback")))} text="Nutzer mit Fehlern oder Fallbacks" />
            <CohortCard icon={Flame} title="Power User" value={topUsers.length} text="Nutzer mit hoher Aktivität" />
            <CohortCard icon={TrendingUp} title="Premium Intent" value={uniqueUsers(premiumEvents)} text="Paywall oder Kauf-Signale" />
          </div>
        </Section>
      </div>

      <Section title="Letzte Events" icon={Search}>
        {recentEvents.length === 0 ? (
          <p className="text-sm text-[#666666]">Noch keine Analytics-Events im Zeitraum.</p>
        ) : (
          <div className="divide-y divide-[#E0E0D6]">
            {recentEvents.map(event => (
              <div key={event.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-[#111111]">{eventLabel(event.eventName)}</p>
                  <p className="text-xs text-[#666666]">{event.platform || "web"} · {eventLabel(event.screen)} · {event.userId || "anonymous"}</p>
                </div>
                <p className="text-xs font-semibold text-[#999999]">{eventDate(event) ? formatRelative(event.createdAt ?? event.createdAtClient) : formatDateTime(event.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {!loading && events.length === 0 && !error && (
        <div className="rounded-2xl border border-[#E0E0D6] bg-white p-6 text-sm text-[#666666] shadow-sm">
          Tracking ist eingebaut. Die ersten Daten erscheinen, sobald die iOS-App oder das Admin-UI neue Events in `analyticsEvents` schreibt.
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children, action, className = "" }: { title: string; icon: typeof BarChart3; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#E0E0D6] pb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#111111]"><Icon className="h-5 w-5 text-[#D4A853]" /> {title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ icon: Icon, title, value, helper, tone }: { icon: typeof Activity; title: string; value: string; helper: string; tone: "blue" | "emerald" | "gold" | "purple" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    gold: "bg-[#D4A853]/10 text-[#9B7422]",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <div className="rounded-2xl border border-[#E0E0D6] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-[#666666]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#111111]">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#999999]">{helper}</p>
    </div>
  );
}

function RankingList({ items, empty }: { items: RankedItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-[#666666]">{empty}</p>;
  const max = Math.max(...items.map(item => item.value), 1);
  return (
    <div className="space-y-3">
      {items.map(item => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-bold text-[#111111]">{item.label}</span>
            <span className="text-xs font-bold text-[#666666]">{item.value.toLocaleString("de-DE")}</span>
          </div>
          <div className="h-2 rounded-full bg-[#F0F0E8]">
            <div className="h-2 rounded-full bg-[#111111]" style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }} />
          </div>
          {item.helper && <p className="mt-1 text-xs text-[#999999]">{item.helper}</p>}
        </div>
      ))}
    </div>
  );
}

function DailyBars({ items }: { items: { label: string; value: number }[] }) {
  const max = Math.max(...items.map(item => item.value), 1);
  return (
    <div className="flex h-44 items-end gap-2 overflow-x-auto rounded-xl bg-[#F8F8F3] p-4">
      {items.map(item => (
        <div key={item.label} className="flex min-w-10 flex-1 flex-col items-center gap-2">
          <div className="flex h-28 w-full items-end rounded-lg bg-white">
            <div className="w-full rounded-lg bg-[#D4A853]" style={{ height: `${Math.max(4, (item.value / max) * 100)}%` }} />
          </div>
          <span className="text-[10px] font-semibold text-[#777777]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number | string; tone: "blue" | "emerald" | "purple" | "gold" | "red" | "amber" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    purple: "bg-purple-50 text-purple-700",
    gold: "bg-[#D4A853]/10 text-[#9B7422]",
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <div className={`rounded-xl p-4 ${tones[tone]}`}>
      <p className="text-xs font-bold uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold">{typeof value === "number" ? numeric(value).toLocaleString("de-DE") : value}</p>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" /> {label}</span>;
}

function CohortCard({ icon: Icon, title, value, text }: { icon: typeof Flame; title: string; value: number; text: string }) {
  return (
    <div className="rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase text-[#666666]">{title}</p>
        <Icon className="h-4 w-4 text-[#D4A853]" />
      </div>
      <p className="text-3xl font-bold text-[#111111]">{value}</p>
      <p className="mt-2 text-xs leading-5 text-[#666666]">{text}</p>
    </div>
  );
}