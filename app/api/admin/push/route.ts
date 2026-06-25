import { NextRequest, NextResponse } from "next/server";
import type { App } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { firebaseAdminConfigError, getFirebaseAdminApp, verifyAdminRequest, writeServerAdminAuditLog } from "@/lib/firebase-admin";

export const runtime = "nodejs";

type PushTargetType = "topic" | "segment" | "user";
type PushRequestBody = {
  title?: string;
  body?: string;
  targetType?: PushTargetType;
  topic?: string;
  segment?: string;
  userId?: string;
  userEmail?: string;
  data?: Record<string, string | number | boolean | null>;
};

type TokenTarget = { userId: string; token: string };

function stringData(data: PushRequestBody["data"] = {}) {
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value ?? "")]));
}

async function findUserByEmail(app: App, email: string) {
  const db = getFirestore(app);
  const trimmed = email.trim();
  const lower = trimmed.toLowerCase();
  const queries = [
    db.collection("users").where("email", "==", trimmed).limit(1),
    db.collection("users").where("email", "==", lower).limit(1),
    db.collection("users").where("emailLowercase", "==", lower).limit(1),
  ];

  for (const userQuery of queries) {
    const snapshot = await userQuery.get();
    if (!snapshot.empty) return snapshot.docs[0];
  }
  return null;
}

async function tokenTargetsForRequest(app: App, body: PushRequestBody): Promise<TokenTarget[]> {
  const db = getFirestore(app);

  if (body.targetType === "user") {
    const directDoc = body.userId?.trim()
      ? await db.collection("users").doc(body.userId.trim()).get()
      : body.userEmail?.trim()
        ? await findUserByEmail(app, body.userEmail)
        : null;

    const token = directDoc?.data()?.fcmToken;
    return token ? [{ userId: directDoc.id, token }] : [];
  }

  if (body.targetType === "segment") {
    const snapshot = await db.collection("users").limit(500).get();
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return snapshot.docs.flatMap(docSnap => {
      const data = docSnap.data();
      const token = data.fcmToken;
      if (!token) return [];
      if (body.segment === "premium" && data.isPremium !== true) return [];
      if (body.segment === "free" && data.isPremium === true) return [];
      if (body.segment === "inactive_7d") {
        const lastActive = data.lastActiveAt?.toDate?.() as Date | undefined;
        if (lastActive && lastActive.getTime() > sevenDaysAgo) return [];
      }
      return [{ userId: docSnap.id, token }];
    });
  }

  return [];
}

export async function POST(req: NextRequest) {
  let app: App;
  try {
    app = getFirebaseAdminApp();
  } catch {
    return firebaseAdminConfigError();
  }

  const authResult = await verifyAdminRequest(req, app);
  if (authResult.error) return authResult.error;

  const body = await req.json() as PushRequestBody;
  const title = body.title?.trim();
  const messageBody = body.body?.trim();
  const targetType = body.targetType ?? "topic";

  if (!title || !messageBody) {
    return NextResponse.json({ error: "title and body are required." }, { status: 400 });
  }

  try {
    if (targetType === "topic") {
      const topic = body.topic?.trim() || "all";
      const result = await getMessaging(app).send({
        topic,
        notification: { title, body: messageBody },
        data: { ...stringData(body.data), type: "adminPush" },
        apns: { payload: { aps: { sound: "default" } } },
      });
      await writeServerAdminAuditLog(app, authResult.decoded, "push.send.topic", "push", topic, { title });
      return NextResponse.json({ success: true, sent: 1, failed: 0, result });
    }

    const targets = await tokenTargetsForRequest(app, { ...body, targetType });
    if (targets.length === 0) {
      return NextResponse.json({ error: "Kein FCM-Token fuer diese Zielgruppe gefunden." }, { status: 404 });
    }

    let sent = 0;
    let failed = 0;
    for (let index = 0; index < targets.length; index += 500) {
      const chunk = targets.slice(index, index + 500);
      const response = await getMessaging(app).sendEachForMulticast({
        tokens: chunk.map(target => target.token),
        notification: { title, body: messageBody },
        data: { ...stringData(body.data), type: "adminPush" },
        apns: { payload: { aps: { sound: "default" } } },
      });
      sent += response.successCount;
      failed += response.failureCount;

      await Promise.all(response.responses.map(async (result, responseIndex) => {
        const code = result.error?.code;
        if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
          await getFirestore(app).collection("users").doc(chunk[responseIndex].userId).update({ fcmToken: FieldValue.delete() });
        }
      }));
    }

    await writeServerAdminAuditLog(app, authResult.decoded, "push.send.tokens", "push", targetType, {
      targetId: targetType,
      title,
      targetType,
      userId: body.userId ?? null,
      userEmail: body.userEmail ?? null,
      segment: body.segment ?? null,
      sent,
      failed,
    });
    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FCM request failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
