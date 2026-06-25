import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { FirestoreDateValue } from "@/lib/admin";

export type AnalyticsEventDoc = {
  id: string;
  eventName?: string;
  eventType?: string;
  screen?: string;
  feature?: string;
  userId?: string | null;
  platform?: "ios" | "web" | "admin" | string;
  source?: string;
  sessionId?: string;
  appVersion?: string;
  deviceModel?: string;
  metadata?: Record<string, string | number | boolean | null>;
  createdAt?: FirestoreDateValue;
  createdAtClient?: FirestoreDateValue;
};

export type TrackEventInput = {
  eventName: string;
  eventType: string;
  screen?: string;
  feature?: string;
  platform?: "ios" | "web" | "admin";
  source?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

function compactMetadata(metadata: TrackEventInput["metadata"]) {
  if (!metadata) return undefined;
  return Object.fromEntries(Object.entries(metadata).filter((entry): entry is [string, string | number | boolean | null] => entry[1] !== undefined));
}

export async function trackEvent(user: User | null, input: TrackEventInput) {
  if (!user) return;

  await addDoc(collection(db, "analyticsEvents"), {
    eventName: input.eventName,
    eventType: input.eventType,
    screen: input.screen ?? null,
    feature: input.feature ?? null,
    userId: user.uid,
    platform: input.platform ?? "web",
    source: input.source ?? "web",
    metadata: compactMetadata(input.metadata) ?? null,
    createdAt: serverTimestamp(),
    createdAtClient: new Date(),
  });
}