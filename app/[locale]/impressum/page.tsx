import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Impressum und Anbieterkennzeichnung der FAYV App.",
  robots: { index: true, follow: true },
};

export function generateStaticParams() {
  return [{ locale: "de" }, { locale: "en" }];
}

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-neutral-200">
      <Link
        href="/de"
        className="text-sm text-neutral-400 hover:text-white transition-colors"
      >
        ← Zurück
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-white">Impressum</h1>

      <div className="mt-8 space-y-8 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white">
            Angaben gemäß § 5 DDG / § 18 MStV
          </h2>
          <p className="mt-2 rounded-lg bg-amber-500/10 p-3 text-amber-200">
            ⚠️ Bitte vor Launch ausfüllen:
            <br />
            [Firmenname / Name des Anbieters]
            <br />
            [Straße &amp; Hausnummer]
            <br />
            [PLZ Ort]
            <br />
            [Land]
            <br />
            {/* Bei juristischen Personen: Rechtsform, Vertretungsberechtigte, Register & Registernummer, USt-IdNr. */}
            [ggf. Rechtsform, vertreten durch …, Registergericht &amp;
            -nummer, USt-IdNr.]
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">Kontakt</h2>
          <p className="mt-2">
            E-Mail:{" "}
            <a href="mailto:hello@fayv.app" className="text-white underline">
              hello@fayv.app
            </a>
            <br />
            [Telefon optional]
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">
            Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
          </h2>
          <p className="mt-2 text-amber-200">
            ⚠️ [Name &amp; Anschrift der verantwortlichen Person]
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">
            EU-Streitschlichtung
          </h2>
          <p className="mt-2">
            Die Europäische Kommission stellt eine Plattform zur
            Online-Streitbeilegung (OS) bereit:{" "}
            <a
              href="https://ec.europa.eu/consumers/odr/"
              className="text-white underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://ec.europa.eu/consumers/odr/
            </a>
            . Wir sind nicht verpflichtet und nicht bereit, an
            Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
            teilzunehmen.
          </p>
        </section>

        <section>
          <p className="text-sm text-neutral-400">
            Siehe auch unsere{" "}
            <Link href="/de/datenschutz" className="text-white underline">
              Datenschutzerklärung
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
