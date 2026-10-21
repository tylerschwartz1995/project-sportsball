"use client";
import { useState, type FormEvent } from "react";
import { authClient } from "@/auth/client";
export function LoginForm({ passkeys = false }: { passkeys?: boolean }) {
  const [useEmail, setUseEmail] = useState(!passkeys);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/auth/${sent ? "verify-code" : "send-code"}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, otp }),
      });
      const result = await response.json();
      if (!response.ok) { setMessage(result.message ?? "Unable to sign in. Please retry."); return; }
      if (sent) {
        // A full navigation clears authenticated data from the client router cache.
        window.location.assign(passkeys ? "/account/security?setup=1" : "/"); return;
      }
      setSent(true); setMessage("If your address is approved, a code is on its way. Check your inbox and junk folder.");
    } catch { setMessage("Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }
  if (!useEmail) return <div className="login-form">
    <button className="login-primary" type="button" disabled={busy} onClick={async () => {
      setBusy(true); setMessage("");
      try {
        const result = await authClient.signIn.passkey();
        if (result.error) { setMessage("Unable to use a passkey. Try again or use email."); return; }
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/");
      } catch { setMessage("Unable to use a passkey. Try again or use email."); }
      finally { setBusy(false); }
    }}>{busy ? "Signing In…" : "Sign In with a Passkey"}</button>
    <button type="button" disabled={busy} onClick={() => { setUseEmail(true); setMessage(""); }}>First Visit or Use Email</button>
    <p role="status" aria-live="polite">{message}</p>
  </div>;
  return <form className="login-form" onSubmit={submit}>
    {passkeys && <button type="button" onClick={() => { setUseEmail(false); setMessage(""); }}>Back to Passkey Sign-In</button>}
    <label htmlFor="login-email">Email Address</label>
    <input id="login-email" type="email" autoComplete="email" maxLength={254} required readOnly={sent} value={email} onChange={event => setEmail(event.target.value)} />
    {sent && <><label htmlFor="login-code">Email Code</label><input id="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={event => setOtp(event.target.value)} /></>}
    <button type="submit" disabled={busy}>{busy ? "Please Wait…" : sent ? "Sign In" : "Send Code"}</button>
    {sent && <button type="button" disabled={busy} onClick={() => { setSent(false); setOtp(""); setMessage(""); }}>Use Another Email or Request a New Code</button>}
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
