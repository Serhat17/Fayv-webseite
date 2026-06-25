import { redirect } from "next/navigation";
import { defaultLocale } from "@/lib/i18n-config";

// Middleware should already redirect, but this is a safety net for direct hits.
export default function RootRedirect() {
  redirect(`/${defaultLocale}`);
}
