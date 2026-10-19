import { redirect } from "next/navigation";
export default async function RetiredPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const incoming = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["season", "phase"]) {
    const value = incoming[key];
    if (typeof value === "string") params.set(key, value);
  }
  params.set("type", "teams");
  redirect(`/analytics${params.size ? `?${params}` : ""}`);
}
