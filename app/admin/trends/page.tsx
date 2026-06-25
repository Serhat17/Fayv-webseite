"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Palette, Shirt, Tag, TrendingUp, Database } from "lucide-react";

type TrendSignal = { type: string; value: string; month: string };
type RankedItem = { label: string; value: number; share: number };

function aggregate(signals: TrendSignal[], type: string, limitCount = 12): RankedItem[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const s of signals) {
    if (s.type !== type || !s.value) continue;
    counts.set(s.value, (counts.get(s.value) ?? 0) + 1);
    total += 1;
  }
  return Array.from(counts.entries())
    .map(([label, value]) => ({ label, value, share: total ? value / total : 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limitCount);
}

export default function AdminTrendsPage() {
  const [signals, setSignals] = useState<TrendSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<string>("all");

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(query(collection(db, "trendSignals"), limit(20000)));
        const rows: TrendSignal[] = snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            type: String(data.type ?? ""),
            value: String(data.value ?? ""),
            month: String(data.month ?? ""),
          };
        });
        setSignals(rows);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Fehler beim Laden");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const months = useMemo(() => {
    const set = new Set(signals.map((s) => s.month).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [signals]);

  const filtered = useMemo(
    () => (month === "all" ? signals : signals.filter((s) => s.month === month)),
    [signals, month]
  );

  const brands = useMemo(() => aggregate(filtered, "brand"), [filtered]);
  const colors = useMemo(() => aggregate(filtered, "color"), [filtered]);
  const categories = useMemo(() => aggregate(filtered, "category"), [filtered]);

  const totalSignals = filtered.length;
  const uniqueBrands = useMemo(() => new Set(filtered.filter((s) => s.type === "brand").map((s) => s.value)).size, [filtered]);

  function fmtMonth(m: string) {
    if (m === "all") return "Alle Monate";
    const [y, mo] = m.split("-");
    const names = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    return `${names[Number(mo) - 1] ?? mo} ${y}`;
  }

  return (
    <div className="space-y-7">
      {/* Header + month filter */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-[#D4A853]">Markt & Mode</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-serif font-bold text-[#111111]">
            <TrendingUp className="h-6 w-6 text-[#D4A853]" /> Trends
          </h1>
          <p className="mt-1 text-sm text-[#666666]">
            Anonymisierte, aggregierte Mode-Signale (Marken, Farben, Kategorien). Keine personenbezogenen Daten.
          </p>
        </div>
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[#E0E0D6] bg-white p-1 shadow-sm">
          <button
            onClick={() => setMonth("all")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition ${month === "all" ? "bg-[#111111] text-white" : "text-[#666666] hover:bg-[#F8F8F3]"}`}
          >
            Alle
          </button>
          {months.slice(0, 6).map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${month === m ? "bg-[#111111] text-white" : "text-[#666666] hover:bg-[#F8F8F3]"}`}
            >
              {fmtMonth(m)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          {error}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricCard icon={Database} title="Signale" value={totalSignals.toLocaleString("de-DE")} helper={fmtMonth(month)} />
        <MetricCard icon={Tag} title="Unterschiedliche Marken" value={uniqueBrands.toLocaleString("de-DE")} helper="im Zeitraum" />
        <MetricCard icon={Shirt} title="Top-Marke" value={brands[0]?.label ?? "—"} helper={brands[0] ? `${brands[0].value.toLocaleString("de-DE")} Signale` : "noch keine Daten"} />
      </div>

      {/* Ranked lists */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Section title="Top Marken" icon={Tag}>
          <RankingList items={brands} empty="Noch keine Marken-Signale." />
        </Section>
        <Section title="Top Farben" icon={Palette}>
          <RankingList items={colors} empty="Noch keine Farb-Signale." />
        </Section>
        <Section title="Top Kategorien" icon={Shirt}>
          <RankingList items={categories} empty="Noch keine Kategorie-Signale." />
        </Section>
      </div>

      {!loading && signals.length === 0 && !error && (
        <div className="rounded-2xl border border-[#E0E0D6] bg-white p-6 text-sm text-[#666666] shadow-sm">
          Noch keine Trend-Signale. Sie erscheinen, sobald Nutzer mit aktivierter Einwilligung „Anonyme Trend-Analyse" ihren Kleiderschrank laden.
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon: typeof Tag; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E0E0D6] bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#E0E0D6] pb-4">
        <h2 className="flex items-center gap-2 text-lg font-bold text-[#111111]">
          <Icon className="h-5 w-5 text-[#D4A853]" /> {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function MetricCard({ icon: Icon, title, value, helper }: { icon: typeof Tag; title: string; value: string; helper: string }) {
  return (
    <div className="rounded-2xl border border-[#E0E0D6] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase text-[#666666]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#111111] capitalize">{value}</p>
        </div>
        <div className="rounded-full bg-[#D4A853]/10 p-3 text-[#9B7422]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-[#999999]">{helper}</p>
    </div>
  );
}

function RankingList({ items, empty }: { items: RankedItem[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-[#666666]">{empty}</p>;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="font-bold capitalize text-[#111111]">{item.label}</span>
            <span className="text-xs font-bold text-[#666666]">
              {item.value.toLocaleString("de-DE")} · {(item.share * 100).toFixed(0)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-[#F0F0E8]">
            <div className="h-2 rounded-full bg-[#111111]" style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
