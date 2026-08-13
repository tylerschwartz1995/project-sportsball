import {
  SiteHeader,
  type SiteSection,
} from "@/app/_components/site-header";

export function RouteLoading({
  active,
  label,
  panels = 3,
  variant = "summary",
}: {
  active?: SiteSection;
  label: string;
  panels?: number;
  variant?: "summary" | "cards" | "table";
}) {
  return (
    <main
      className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 sm:px-8 lg:px-10"
      aria-busy="true"
    >
      <SiteHeader active={active} />
      <section className="workspace-loading-shell py-10">
        <p className="workspace-loading-status" role="status">
          Loading {label}…
        </p>
        <div className="workspace-loading-block mt-4 h-12 w-96 max-w-full" />
        {variant === "table" ? null : (
          <div
            className={
              variant === "cards"
                ? "mt-8 grid gap-4 lg:grid-cols-2"
                : "mt-8 grid gap-4 md:grid-cols-3"
            }
            aria-hidden="true"
          >
            {Array.from({ length: panels }, (_, index) => (
              <div
                key={index}
                className={`workspace-loading-panel ${variant === "cards" ? "h-56" : "h-32"}`}
              />
            ))}
          </div>
        )}
        {variant === "cards" ? null : (
          <div
            className="workspace-loading-panel mt-6 h-96"
            aria-hidden="true"
          />
        )}
      </section>
    </main>
  );
}
