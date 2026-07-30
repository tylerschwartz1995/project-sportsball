export default function Loading() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl animate-pulse px-4 py-6 sm:px-8 lg:px-10">
      <div className="h-16 border-b border-white/10" />
      <div className="mt-10 h-5 w-40 rounded bg-white/10" />
      <div className="mt-4 h-12 w-96 max-w-full rounded bg-white/10" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-32 rounded-2xl bg-white/[0.06]" />
        ))}
      </div>
      <div className="mt-8 h-96 rounded-2xl bg-white/[0.06]" />
    </main>
  );
}
