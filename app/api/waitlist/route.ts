import { NextRequest, NextResponse } from "next/server";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getFirebaseAdminApp, firebaseAdminConfigError } from "@/lib/firebase-admin";

// Simple email regex — keep it permissive but reject obvious junk
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "throwaway.email",
  "yopmail.com",
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const email = String(body.email ?? "").trim().toLowerCase();
    const locale = String(body.locale ?? "en").slice(0, 5);
    const referrer = typeof body.referrer === "string" ? body.referrer.slice(0, 200) : null;
    const utmSource = typeof body.utm_source === "string" ? body.utm_source.slice(0, 50) : null;
    const utmMedium = typeof body.utm_medium === "string" ? body.utm_medium.slice(0, 50) : null;
    const utmCampaign = typeof body.utm_campaign === "string" ? body.utm_campaign.slice(0, 50) : null;

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const domain = email.split("@")[1];
    if (DISPOSABLE_DOMAINS.has(domain)) {
      return NextResponse.json({ error: "disposable_email" }, { status: 400 });
    }

    let app;
    try {
      app = getFirebaseAdminApp();
    } catch {
      return firebaseAdminConfigError();
    }

    const db = getFirestore(app);
    const docId = email.replace(/[^a-z0-9@._-]/g, "_");
    const ref = db.collection("waitlist").doc(docId);

    const existing = await ref.get();
    if (existing.exists) {
      return NextResponse.json({ status: "already_subscribed" }, { status: 200 });
    }

    // Capture light request fingerprint (NOT for tracking — for abuse prevention)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent")?.slice(0, 300) || null;

    await ref.set({
      email,
      locale,
      referrer,
      utmSource,
      utmMedium,
      utmCampaign,
      ip,
      userAgent,
      source: "website",
      createdAt: FieldValue.serverTimestamp(),
    });

    // Increment the global counter — used for the live "X people waiting" display
    await db.collection("waitlist_meta").doc("counter").set(
      { count: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );

    return NextResponse.json({ status: "subscribed" }, { status: 201 });
  } catch (error) {
    console.error("[waitlist] error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

/**
 * GET — returns the current waitlist count for the live counter on the marketing site.
 * No auth, no PII. Cached at the edge for 60s.
 */
export async function GET() {
  try {
    let app;
    try {
      app = getFirebaseAdminApp();
    } catch {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }

    const db = getFirestore(app);
    const snap = await db.collection("waitlist_meta").doc("counter").get();
    const count = (snap.exists ? (snap.data()?.count as number) : 0) || 0;

    return NextResponse.json(
      { count },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch {
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
