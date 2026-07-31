export default function Loading() {
  return (
    <main className="workspace-loading-shell mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10">
      <div className="workspace-loading-nav" />
      <div className="workspace-loading-block mt-10 h-5 w-40" />
      <div className="workspace-loading-block mt-4 h-12 w-96 max-w-full" />
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="workspace-loading-panel h-32" />
        ))}
      </div>
      <div className="workspace-loading-panel mt-8 h-96" />
    </main>
  );
}
