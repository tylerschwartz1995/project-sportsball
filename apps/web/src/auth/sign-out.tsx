"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
export function SignOut() {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  if (pathname === "/login") return null;
  return <span><button type="button" disabled={busy} onClick={async () => {
    setBusy(true); setError(false);
    try {
      const result = await fetch("/api/auth/sign-out", { method: "POST" });
      if (!result.ok) throw new Error();
      window.location.assign("/login");
    } catch { setError(true); setBusy(false); }
  }}>{busy ? "Signing Out…" : "Sign Out"}</button>{error && <span role="alert"> Unable to sign out. Please retry.</span>}</span>;
}
