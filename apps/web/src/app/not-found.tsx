import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-20">
      <section className="workspace-system-state">
        <p className="workspace-eyebrow">404 · Page not found</p>
        <h1>This page is off the ice.</h1>
        <p>
          The address may be outdated, or the record you requested may not be
          available in the NHL archive.
        </p>
        <div className="workspace-system-actions">
          <Link href="/">Return Home</Link>
          <Link href="/players">Browse Players</Link>
        </div>
      </section>
    </main>
  );
}
