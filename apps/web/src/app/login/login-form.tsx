"use client";
import { useState, type FormEvent } from "react";
export function LoginForm() {
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
      if (sent) { window.location.assign("/"); return; }
      setSent(true); setMessage("If your address is approved, a code is on its way. Check your inbox and junk folder.");
    } catch { setMessage("Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <form className="login-form" onSubmit={submit}>
    <label htmlFor="login-email">Email Address</label>
    <input id="login-email" type="email" autoComplete="email" maxLength={254} required readOnly={sent} value={email} onChange={event => setEmail(event.target.value)} />
    {sent && <><label htmlFor="login-code">Email Code</label><input id="login-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={otp} onChange={event => setOtp(event.target.value)} /></>}
    <button type="submit" disabled={busy}>{busy ? "Please Wait…" : sent ? "Sign In" : "Send Code"}</button>
    {sent && <button type="button" disabled={busy} onClick={() => { setSent(false); setOtp(""); setMessage(""); }}>Use Another Email or Request a New Code</button>}
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}
