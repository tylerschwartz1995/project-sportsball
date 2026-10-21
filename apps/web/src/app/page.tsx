import { redirect } from "next/navigation";
export default async function Home({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const incoming = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["season", "date"]) {
    const value = incoming[key];
    if (typeof value === "string") params.set(key, value);
  }
  redirect(`/games${params.size ? `?${params}` : ""}`);
}
