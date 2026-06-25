import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description:
    "Datenschutzerklärung der FAYV App — welche Daten wir verarbeiten, auf welcher Rechtsgrundlage und welche Rechte du hast.",
  robots: { index: true, follow: true },
};

export function generateStaticParams() {
  return [{ locale: "de" }, { locale: "en" }];
}

export default function DatenschutzPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-neutral-200">
      <Link
        href="/de"
        className="text-sm text-neutral-400 hover:text-white transition-colors"
      >
        ← Zurück
      </Link>

      <h1 className="mt-6 text-3xl font-bold text-white">Datenschutzerklärung</h1>
      <p className="mt-2 text-sm text-neutral-400">Stand: Juni 2026</p>

      <div className="prose-legal mt-8 space-y-8 text-[15px] leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-white">1. Verantwortlicher</h2>
          <p className="mt-2">
            Verantwortlich für die Datenverarbeitung im Sinne der DSGVO ist:
          </p>
          <p className="mt-2 rounded-lg bg-amber-500/10 p-3 text-amber-200">
            ⚠️ Bitte vor Launch ausfüllen: [Firmenname / Name], [Straße &
            Hausnummer], [PLZ Ort], [Land]. E-Mail: [datenschutz@fayv.app].
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">
            2. Welche Daten wir verarbeiten
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Kontodaten:</strong> E-Mail-Adresse, Anzeigename, Geschlecht
              (zur Stilberatung), Profilbild. Rechtsgrundlage: Vertragserfüllung
              (Art. 6 Abs. 1 lit. b DSGVO).
            </li>
            <li>
              <strong>Kleiderschrank- & Outfit-Daten:</strong> Fotos und Angaben zu
              deinen Kleidungsstücken, erstellte Outfits, Bewertungen, Kalender-,
              Wunschlisten- und Reiseeinträge. Rechtsgrundlage: Vertragserfüllung.
            </li>
            <li>
              <strong>Körperdaten (besondere Kategorie, Art. 9 DSGVO):</strong>{" "}
              Körpermaße (z. B. Größe, Gewicht, Brust-, Taillen-, Hüftumfang) und
              ein optionales Körperfoto für die virtuelle Anprobe und
              Größenempfehlungen. Diese Daten verarbeiten wir{" "}
              <strong>ausschließlich auf Basis deiner ausdrücklichen Einwilligung</strong>{" "}
              (Art. 9 Abs. 2 lit. a DSGVO), die du jederzeit widerrufen kannst.
            </li>
            <li>
              <strong>Community-Daten:</strong> Beiträge, Kommentare, Likes,
              Follower-Beziehungen, Nachrichten, Meldungen und Blockierungen.
            </li>
            <li>
              <strong>Nutzungs- & Diagnosedaten:</strong> pseudonyme Analyse zur
              Produktverbesserung sowie Absturz- und Fehlerberichte — nur im Rahmen
              deiner Einwilligungseinstellungen.
            </li>
            <li>
              <strong>Werbe-Identifier:</strong> bei Einwilligung über Apple App
              Tracking Transparency und das Google-Einwilligungsformular (UMP).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">
            3. KI-gestützte Verarbeitung
          </h2>
          <p className="mt-2">
            Zur Outfit-Analyse, Größenschätzung und Bildbearbeitung nutzen wir
            KI-Dienste (u. a. Google Gemini). Hochgeladene Fotos werden zur
            Verarbeitung an den jeweiligen Dienst übermittelt und dort gemäß dessen
            Bedingungen verarbeitet. Körperfotos werden nur zur jeweiligen Analyse
            verwendet und nicht dauerhaft beim KI-Anbieter gespeichert.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">
            4. Auftragsverarbeiter & Drittanbieter
          </h2>
          <ul className="mt-2 list-disc space-y-2 pl-5">
            <li>
              <strong>Google Firebase</strong> (Authentifizierung, Datenbank,
              Speicher, Push, Analytics, Crashlytics) — Google Ireland Ltd. /
              Google LLC.
            </li>
            <li>
              <strong>Google AdMob & UMP</strong> für Werbung und
              Einwilligungsverwaltung.
            </li>
            <li>
              <strong>Google Gemini</strong> für KI-Analysen.
            </li>
          </ul>
          <p className="mt-2">
            Mit diesen Anbietern bestehen Auftragsverarbeitungsverträge. Bei
            Übermittlungen in Drittländer (z. B. USA) stützen wir uns auf
            Standardvertragsklauseln bzw. das EU-US Data Privacy Framework.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">5. Speicherdauer</h2>
          <p className="mt-2">
            Wir speichern deine Daten, solange dein Konto besteht. Bei Löschung
            deines Kontos werden alle zugeordneten Daten (Profil, Kleidungsstücke,
            Outfits, Beiträge, Likes, Nachrichten, Körperdaten) unwiderruflich
            gelöscht.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">6. Deine Rechte</h2>
          <p className="mt-2">
            Du hast das Recht auf Auskunft (Art. 15), Berichtigung (Art. 16),
            Löschung (Art. 17), Einschränkung (Art. 18), Datenübertragbarkeit
            (Art. 20) und Widerspruch (Art. 21). Erteilte Einwilligungen kannst du
            jederzeit mit Wirkung für die Zukunft widerrufen.
          </p>
          <p className="mt-2">
            Direkt in der App kannst du unter{" "}
            <em>Einstellungen → Datenschutz &amp; Rechtliches</em> deine Daten
            exportieren und dein Konto vollständig löschen. Unter{" "}
            <em>Daten &amp; Einwilligungen</em> verwaltest du deine Einwilligungen.
          </p>
          <p className="mt-2">
            Außerdem hast du das Recht, dich bei einer Datenschutz-Aufsichtsbehörde
            zu beschweren.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-white">7. Kontakt</h2>
          <p className="mt-2">
            Bei Fragen zum Datenschutz erreichst du uns unter{" "}
            <a href="mailto:datenschutz@fayv.app" className="text-white underline">
              datenschutz@fayv.app
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
