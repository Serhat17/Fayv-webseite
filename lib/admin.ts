import { addDoc, collection, serverTimestamp, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import type { IdTokenResult, User } from "firebase/auth";
import { db } from "@/lib/firebase";

export type FirestoreDateValue = Date | string | { seconds: number; nanoseconds?: number } | null | undefined;

export type AdminUserDoc = {
  id: string;
  displayName?: string;
  email?: string;
  avatarImageURL?: string;
  avatarURL?: string;
  isPremium?: boolean;
  isBanned?: boolean;
  isVerified?: boolean;
  createdAt?: FirestoreDateValue;
  lastActiveAt?: FirestoreDateValue;
  appVersion?: string;
  deviceModel?: string;
  gender?: string;
  outfitCount?: number;
  followers?: number;
  following?: number;
  stylePreferences?: string[];
};

export type AdminPostDoc = {
  id: string;
  userId?: string;
  userName?: string;
  userAvatarURL?: string;
  outfitId?: string;
  imageURL?: string;
  caption?: string;
  likes?: number;
  commentCount?: number;
  reportCount?: number;
  reportsResolvedAt?: FirestoreDateValue;
  moderationStatus?: "visible" | "hidden" | "deleted" | "reviewed";
  moderationReason?: string;
  commentsDisabled?: boolean;
  itemIds?: string[];
  createdAt?: FirestoreDateValue;
};

export type AdminOutfitDoc = {
  id: string;
  userId?: string;
  name?: string;
  imageURL?: string;
  itemIds?: string[];
  occasion?: string;
  season?: string;
  rating?: number;
  aiScore?: number;
  isPublic?: boolean;
  likes?: number;
  createdAt?: FirestoreDateValue;
};

export type AdminReportDoc = {
  id: string;
  postId?: string;
  reporterId?: string;
  reason?: string;
  createdAt?: FirestoreDateValue;
};

export type AdminChallengeDoc = {
  id: string;
  title?: string;
  description?: string;
  theme?: string;
  styleHint?: string;
  startDate?: FirestoreDateValue;
  endDate?: FirestoreDateValue;
  submissionCount?: number;
  isActive?: boolean;
  type?: "daily" | "weekly" | "community" | string;
  createdBy?: string;
  creatorName?: string;
  rules?: string;
  tags?: string[];
  winnerId?: string;
  winnerSubmissionId?: string;
  isPublic?: boolean;
};

export type AdminAuditLogDoc = {
  id: string;
  actorId?: string;
  actorEmail?: string | null;
  action?: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  createdAt?: FirestoreDateValue;
};

export function toDate(value: FirestoreDateValue | unknown): Date | null {
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

export function formatDateTime(value: FirestoreDateValue | unknown) {
  const date = toDate(value);
  if (!date) return "Unbekannt";
  return date.toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" });
}

export function formatDate(value: FirestoreDateValue | unknown) {
  const date = toDate(value);
  if (!date) return "Unbekannt";
  return date.toLocaleDateString("de-DE", { dateStyle: "medium" });
}

export function formatRelative(value: FirestoreDateValue | unknown) {
  const date = toDate(value);
  if (!date) return "Unbekannt";
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return "Gerade eben";
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.round(hours / 24);
  if (days < 30) return `vor ${days} T.`;
  return formatDate(date);
}

export function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

export function isInRange(value: FirestoreDateValue | unknown, start: Date, end: Date = new Date()) {
  const date = toDate(value);
  return !!date && date >= start && date < end;
}

export function readDoc<T extends { id: string }>(snapshot: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snapshot.id, ...snapshot.data() } as T;
}

export function countEngagement(post: Pick<AdminPostDoc, "likes" | "commentCount">) {
  return (post.likes ?? 0) + (post.commentCount ?? 0) * 2;
}

export function adminInitials(user?: Pick<AdminUserDoc, "displayName" | "email"> | null) {
  const source = user?.displayName || user?.email || "?";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function adminAvatarUrl(user?: Pick<AdminUserDoc, "avatarImageURL" | "avatarURL" | "displayName" | "email"> | null) {
  if (user?.avatarImageURL || user?.avatarURL) return user.avatarImageURL || user.avatarURL;
  const label = encodeURIComponent(user?.displayName || user?.email || "User");
  return `https://ui-avatars.com/api/?name=${label}&background=F5F5F0&color=111111&bold=true`;
}

export function numeric(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function adminAllowlistedEmails() {
  return (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowlisted(email?: string | null) {
  if (!email) return false;
  const emails = adminAllowlistedEmails();
  return emails.length > 0 && emails.includes(email.toLowerCase());
}

export function hasAdminClaim(token: IdTokenResult | null) {
  return token?.claims.admin === true || token?.claims.role === "admin";
}

export function hasClientAdminAccess(user: User | null, token: IdTokenResult | null) {
  return !!user && (hasAdminClaim(token) || isEmailAllowlisted(user.email));
}

export async function writeAdminAuditLog(
  actor: User | null,
  action: string,
  targetType: string,
  targetId: string,
  details: Record<string, unknown> = {}
) {
  await addDoc(collection(db, "adminAuditLogs"), {
    actorId: actor?.uid ?? null,
    actorEmail: actor?.email ?? null,
    action,
    targetType,
    targetId,
    details,
    createdAt: serverTimestamp()
  });
}
