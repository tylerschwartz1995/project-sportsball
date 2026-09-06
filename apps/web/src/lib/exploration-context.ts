/** Only local application destinations may be used as return links. */
export function safeReturnPath(value: string | null): string | null {
  if (
    !value ||
    !/^\/(?:(?:players|teams|games|standings|playoffs|analytics|history|drafts|lines|search)(?:[/?#]|$)|[?#]|$)/.test(
      value,
    ) ||
    /[\\\r\n]/.test(value)
  )
    return null;
  return value;
}

export function explorationHref(
  href: string,
  pathname: string,
  search: string,
): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const target = new URL(href, "http://local");
  const current = new URLSearchParams(search);
  const entity = /^\/(players|teams|games)\/\d+$/.test(target.pathname);
  if (target.pathname === pathname) {
    const back = safeReturnPath(current.get("returnTo"));
    if (back) target.searchParams.set("returnTo", back);
  } else if (entity) {
    const game = pathname.match(/^\/games\/(\d{4})(\d{2})\d{4}$/);
    const phase =
      current.get("phase") ??
      (game ? (game[2] === "03" ? "playoffs" : "regular") : null);
    if (phase && !target.searchParams.has("phase"))
      target.searchParams.set("phase", phase);
    if (!target.searchParams.has("returnTo")) {
      current.delete("returnTo");
      const back = safeReturnPath(
        pathname + (current.size ? `?${current}` : ""),
      );
      if (back) target.searchParams.set("returnTo", back);
    }
    if (
      pathname === "/history" &&
      target.pathname.startsWith("/players/") &&
      !target.searchParams.has("season")
    )
      target.searchParams.set("view", "seasons");
  }
  return `${target.pathname}${target.search}${target.hash}`;
}
