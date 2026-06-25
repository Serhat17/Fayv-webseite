import { NextRequest, NextResponse } from "next/server";
import { applicationDefault, cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const BOOTSTRAP_ADMIN_UIDS = new Set(["DotvwRJ9IfXhiYLeUP9NBxiDoNf2"]);

function parseServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY ?? process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const value = raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const parsed = JSON.parse(value) as ServiceAccount & { project_id?: string; client_email?: string; private_key?: string };
    return {
      projectId: parsed.projectId ?? parsed.project_id ?? process.env.FIREBASE_PROJECT_ID,
      clientEmail: parsed.clientEmail ?? parsed.client_email,
      privateKey: (parsed.privateKey ?? parsed.private_key)?.replace(/\\n/g, "\n"),
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

export function getFirebaseAdminApp(): App {
  const existing = getApps()[0];
  if (existing) return existing;

  const serviceAccount = parseServiceAccount();
  return initializeApp({
    credential: serviceAccount ? cert(serviceAccount) : applicationDefault(),
    projectId: serviceAccount?.projectId ?? process.env.FIREBASE_PROJECT_ID ?? "outfitinspo-5bf9e",
  });
}

export function firebaseAdminConfigError() {
  return NextResponse.json({ error: "Firebase Admin ist nicht konfiguriert. Setze FIREBASE_SERVICE_ACCOUNT_KEY oder FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY." }, { status: 500 });
}

export async function assertFirebaseAdmin(app: App, token: DecodedIdToken) {
  if (BOOTSTRAP_ADMIN_UIDS.has(token.uid) || token.admin === true || token.role === "admin") {
    return;
  }

  const adminDoc = await getFirestore(app).collection("adminUsers").doc(token.uid).get();
  if (adminDoc.exists && adminDoc.data()?.active !== false) return;

  throw new Error("Admin privileges required.");
}

export async function verifyAdminRequest(req: NextRequest, app: App) {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer (.+)$/i);
  if (!match) {
    return { error: NextResponse.json({ error: "Admin authentication required." }, { status: 401 }) };
  }

  try {
    const decoded = await getAuth(app).verifyIdToken(match[1]);
    await assertFirebaseAdmin(app, decoded);
    return { decoded };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin authentication failed.";
    return { error: NextResponse.json({ error: message }, { status: 403 }) };
  }
}

export async function writeServerAdminAuditLog(app: App, actor: DecodedIdToken, action: string, targetType: string, targetId: string | null, details: Record<string, unknown>) {
  await getFirestore(app).collection("adminAuditLogs").add({
    actorId: actor.uid,
    actorEmail: actor.email ?? null,
    action,
    targetType,
    targetId,
    details,
    createdAt: FieldValue.serverTimestamp(),
  });
}