import { NextRequest, NextResponse } from "next/server";
import type { App } from "firebase-admin/app";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { firebaseAdminConfigError, getFirebaseAdminApp, verifyAdminRequest, writeServerAdminAuditLog } from "@/lib/firebase-admin";

export const runtime = "nodejs";

async function finalizeExpiredChallenges(app: App) {
  const db = getFirestore(app);
  const snapshot = await db.collection("dailyChallenges")
    .where("isActive", "==", true)
    .where("endDate", "<=", Timestamp.now())
    .limit(25)
    .get();

  let finalized = 0;
  let winners = 0;

  for (const challengeDoc of snapshot.docs) {
    const challenge = challengeDoc.data();
    const submissions = await db.collection("challengeSubmissions")
      .where("challengeId", "==", challengeDoc.id)
      .orderBy("votes", "desc")
      .limit(1)
      .get();

    const batch = db.batch();
    const update: Record<string, unknown> = {
      isActive: false,
      finalizedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const winnerDoc = submissions.docs[0];
    const winner = winnerDoc?.data();
    if (winnerDoc && winner && (winner.votes ?? 0) > 0 && winner.userId) {
      update.winnerId = winner.userId;
      update.winnerSubmissionId = winnerDoc.id;
      batch.update(winnerDoc.ref, { isWinner: true });
      batch.set(db.collection("users").doc(winner.userId), {
        challengeWins: FieldValue.increment(1),
        lastChallengeWinAt: FieldValue.serverTimestamp(),
        lastChallengeWinTitle: challenge.title ?? "Challenge",
      }, { merge: true });

      const notificationRef = db.collection("notifications").doc();
      batch.set(notificationRef, {
        id: notificationRef.id,
        recipientId: winner.userId,
        type: "challengeWinner",
        senderId: "system",
        senderName: "FAYV",
        senderAvatarURL: null,
        referenceId: challengeDoc.id,
        message: `Du hast die Challenge '${challenge.title ?? "Challenge"}' gewonnen! Dein Look ist jetzt im Spotlight.`,
        isRead: false,
        createdAt: FieldValue.serverTimestamp(),
      });
      winners += 1;
    }

    batch.update(challengeDoc.ref, update);
    await batch.commit();
    finalized += 1;
  }

  return { finalized, winners };
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

  try {
    const result = await finalizeExpiredChallenges(app);
    await writeServerAdminAuditLog(app, authResult.decoded, "challenge.finalizeExpired", "challenge", "batch", result);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Challenges konnten nicht finalisiert werden.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}