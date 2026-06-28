"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, type User } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { hasAdminClaim, isEmailAllowlisted } from "@/lib/admin";
import { trackEvent } from "@/lib/analytics";
import { Activity, BarChart3, Bell, Flag, LayoutDashboard, LockKeyhole, LogOut, Mail, Shield, TrendingUp, Trophy, Users } from "lucide-react";

type AdminAccessState = "loading" | "signedOut" | "checking" | "allowed" | "denied";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [accessState, setAccessState] = useState<AdminAccessState>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [reportCount, setReportCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setAdminUser(null);
        setAccessState("signedOut");
        return;
      }

      setAdminUser(user);
      setAccessState("checking");

      verifyAdminAccess(user).then((allowed) => {
        setAccessState(allowed ? "allowed" : "denied");
      });
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (accessState !== "allowed" || !adminUser) return;
    trackEvent(adminUser, {
      eventName: "admin_page_view",
      eventType: "page_view",
      screen: pathname,
      feature: "admin",
      platform: "admin",
      source: "admin",
    }).catch(error => console.error("Admin page tracking failed", error));
  }, [accessState, adminUser, pathname]);

  // Live count of open reports → drives the "new report" badge on the Moderation nav.
  // Real-time: a new report from the app makes the badge appear without a reload.
  useEffect(() => {
    if (accessState !== "allowed") return;
    const unsub = onSnapshot(
      collection(db, "reports"),
      (snap) => setReportCount(snap.size),
      (error) => console.error("Reports-Listener fehlgeschlagen", error),
    );
    return unsub;
  }, [accessState]);

  async function verifyAdminAccess(user: User) {
    try {
      const token = await user.getIdTokenResult(true);
      if (hasAdminClaim(token) || isEmailAllowlisted(user.email)) return true;

      const adminDoc = await getDoc(doc(db, "adminUsers", user.uid));
      return adminDoc.exists() && adminDoc.data().active !== false;
    } catch (error) {
      console.error("Admin access check failed", error);
      return false;
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSigningIn(true);
    setLoginError(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
    } catch (error) {
      console.error("Admin login failed", error);
      setLoginError(authErrorMessage(error));
    } finally {
      setIsSigningIn(false);
    }
  }

  async function handleGoogleLogin() {
    setIsGoogleSigningIn(true);
    setLoginError(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Admin Google login failed", error);
      setLoginError(authErrorMessage(error));
    } finally {
      setIsGoogleSigningIn(false);
    }
  }

  async function handleLogout() {
    await signOut(auth);
  }

  async function retryAccessCheck() {
    if (!adminUser) return;
    setAccessState("checking");
    setAccessState((await verifyAdminAccess(adminUser)) ? "allowed" : "denied");
  }

  function authErrorMessage(error: unknown) {
    const code = typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

    switch (code) {
      case "auth/operation-not-allowed":
        return "Google ist in Firebase Authentication noch deaktiviert. Aktiviere Google unter Authentication > Sign-in method > Google.";
      case "auth/unauthorized-domain":
        return "Diese Domain ist in Firebase Auth nicht freigegeben. Füge localhost in Authentication > Settings > Authorized domains hinzu.";
      case "auth/popup-blocked":
        return "Der Google-Popup wurde vom Browser blockiert. Popups für localhost erlauben und erneut versuchen.";
      case "auth/popup-closed-by-user":
        return "Der Google-Login wurde geschlossen, bevor die Anmeldung fertig war.";
      case "auth/account-exists-with-different-credential":
        return "Für diese E-Mail existiert bereits ein anderer Login-Typ. Melde dich mit dem ursprünglichen Provider an.";
      case "auth/invalid-credential":
      case "auth/invalid-email":
      case "auth/user-not-found":
      case "auth/wrong-password":
        return "Login fehlgeschlagen. Prüfe E-Mail und Passwort.";
      default:
        return code ? `Login fehlgeschlagen (${code}).` : "Login fehlgeschlagen.";
    }
  }

  const navItems = [
    { name: "Übersicht", href: "/admin", icon: LayoutDashboard },
    { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    { name: "Trends", href: "/admin/trends", icon: TrendingUp },
    { name: "Nutzer", href: "/admin/users", icon: Users },
    { name: "Moderation", href: "/admin/moderation", icon: Flag },
    { name: "Challenges", href: "/admin/challenges", icon: Trophy },
    { name: "Push", href: "/admin/push", icon: Bell },
    { name: "System", href: "/admin/system", icon: Activity },
  ];

  if (accessState === "loading" || accessState === "checking") {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F5F0] text-[#111111]">
        <div className="rounded-2xl border border-[#E0E0D6] bg-white px-6 py-4 text-sm font-semibold shadow-sm">
          {accessState === "checking" ? "Admin-Rechte werden geprüft..." : "Admin-Session wird geprüft..."}
        </div>
      </div>
    );
  }

  if (accessState === "signedOut" || !adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F0] px-6 text-[#111111]">
        <div className="w-full max-w-md rounded-2xl border border-[#E0E0D6] bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-serif font-bold tracking-widest">FAYV</h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#D4A853]">Admin Panel</p>
            </div>
            <div className="rounded-full bg-[#111111] p-3 text-white">
              <LockKeyhole className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isGoogleSigningIn || isSigningIn}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E0E0D6] bg-white px-4 py-3 text-sm font-bold text-[#111111] transition hover:bg-[#F8F8F3] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Shield className="h-4 w-4" />
              {isGoogleSigningIn ? "Google Anmeldung läuft..." : "Mit Google einloggen"}
            </button>

            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-[#999999]">
              <div className="h-px flex-1 bg-[#E0E0D6]" />
              <span>oder</span>
              <div className="h-px flex-1 bg-[#E0E0D6]" />
            </div>
          </div>

          <form onSubmit={handleLogin} className="mt-4 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#666666]" htmlFor="admin-email">
                E-Mail
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] px-4 py-3 text-sm outline-none transition focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20"
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#666666]" htmlFor="admin-password">
                Passwort
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#E0E0D6] bg-[#F8F8F3] px-4 py-3 text-sm outline-none transition focus:border-[#D4A853] focus:ring-2 focus:ring-[#D4A853]/20"
                autoComplete="current-password"
                required
              />
            </div>

            {loginError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSigningIn}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Mail className="h-4 w-4" />
              {isSigningIn ? "Anmeldung läuft..." : "Einloggen"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (accessState === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F5F0] px-6 text-[#111111]">
        <div className="w-full max-w-lg rounded-2xl border border-[#E0E0D6] bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-start justify-between gap-6">
            <div>
              <h1 className="text-3xl font-serif font-bold tracking-widest">FAYV</h1>
              <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[#D4A853]">Admin Panel</p>
            </div>
            <div className="rounded-full bg-red-50 p-3 text-red-600">
              <LockKeyhole className="h-5 w-5" />
            </div>
          </div>
          <h2 className="text-xl font-bold">Kein Admin-Zugriff</h2>
          <p className="mt-2 text-sm leading-6 text-[#666666]">
            {adminUser.email} ist angemeldet, hat aber keine Admin-Berechtigung. Lege entweder einen Eintrag in <span className="font-mono text-xs">adminUsers/{adminUser.uid}</span> an oder setze den Firebase Custom Claim <span className="font-mono text-xs">admin: true</span>.
          </p>
          <div className="mt-6 flex gap-3">
            <button onClick={retryAccessCheck} className="rounded-xl bg-[#111111] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#2a2a2a]">
              Erneut prüfen
            </button>
            <button onClick={handleLogout} className="rounded-xl border border-[#E0E0D6] px-4 py-3 text-sm font-bold text-[#111111] transition hover:bg-[#F8F8F3]">
              Abmelden
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F5F0] text-[#111111]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E0E0D6] flex flex-col">
        <div className="p-6 border-b border-[#E0E0D6]">
          <h1 className="text-2xl font-serif font-bold tracking-widest">FAYV</h1>
          <p className="text-xs font-semibold text-[#D4A853] mt-1 uppercase tracking-widest">
            Admin Panel
          </p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-[#111111] text-white shadow-md shadow-black/10"
                    : "text-[#666666] hover:bg-[#F5F5F0] hover:text-[#111111]"
                }`}
              >
                <Icon size={20} className={isActive ? "opacity-100" : "opacity-70"} />
                <span className="font-semibold text-sm">{item.name}</span>
                {item.href === "/admin/moderation" && reportCount > 0 && (
                  <span className="ml-auto min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white">
                    {reportCount > 99 ? "99+" : reportCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-[#E0E0D6] space-y-3">
          <div className="px-4 text-xs text-[#666666] truncate">{adminUser.email}</div>
          <button onClick={handleLogout} className="flex items-center space-x-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-medium text-sm">
            <LogOut size={20} />
            <span>Abmelden</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-white/50 relative">
        <div className="p-10 max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
