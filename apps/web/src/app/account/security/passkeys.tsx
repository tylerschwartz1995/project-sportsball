"use client";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/auth/client";
export function Passkeys() {
  const { data: keys, refetch } = authClient.useListPasskeys();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function run(action: () => Promise<{ error?: unknown }>, success: string) {
    setBusy(true); setMessage("");
    try {
      const result = await action();
      if (result.error) { setMessage("Unable to complete that. Try again, or sign in with email to verify your identity."); return; }
      setMessage(success); await refetch();
    } catch { setMessage("Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="login-form">
    <p>Create a passkey to sign in with your face, fingerprint, or device PIN.</p>
    <button className="login-primary" type="button" disabled={busy} onClick={() => run(() => authClient.passkey.addPasskey({ name: "Sportsball" }), "Passkey saved. You can use it next time you need to sign in.")}>Create a Passkey</button>
    {keys?.map(key => <div className="passkey-row" key={key.id}><span>{key.name || "Passkey"} · {key.createdAt ? new Date(key.createdAt).toLocaleDateString() : "Saved"}</span><button type="button" disabled={busy} onClick={() => run(() => authClient.passkey.deletePasskey({ id: key.id }), "Passkey removed. Email recovery remains available.")}>Remove</button></div>)}
    <button type="button" disabled={busy} onClick={() => run(() => authClient.revokeOtherSessions(), "Signed out of other devices.")}>Sign Out Other Devices</button>
    <p role="status" aria-live="polite">{message}</p>
    <Link href="/">Continue to Sportsball</Link>
  </div>;
}
