"use client";

import { useState } from "react";

export function CopyViewLink({ label = "Copy chart link" }: { label?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setStatus("copied");
    } catch {
      const input = document.createElement("textarea");
      input.value = window.location.href;
      input.style.position = "fixed";
      input.style.opacity = "0";
      document.body.appendChild(input);
      input.select();
      const copied = document.execCommand("copy");
      input.remove();
      setStatus(copied ? "copied" : "failed");
    }
    window.setTimeout(() => setStatus("idle"), 1800);
  }

  return (
    <button type="button" className="workspace-copy-view-link" onClick={copyLink} aria-live="polite">
      {status === "copied" ? "Link copied" : status === "failed" ? "Copy failed" : label}
    </button>
  );
}
