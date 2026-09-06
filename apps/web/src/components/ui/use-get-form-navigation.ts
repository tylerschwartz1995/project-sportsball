"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { prepareScrollNavigation } from "@/components/shell/scroll-navigation";
import { preservePresentation } from "@/lib/filter-context";

export function useGetFormNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(form: HTMLFormElement) {
    const action = form.getAttribute("action");
    const target = new URL(action || pathname, window.location.origin);
    const search = new URLSearchParams();
    for (const [name, value] of new FormData(form)) {
      if (typeof value === "string" && value !== "") {
        search.append(name, value);
      }
    }
    if (target.pathname === pathname) {
      preservePresentation(search, new URLSearchParams(window.location.search));
    }
    target.search = search.toString();

    prepareScrollNavigation(`${target.pathname}${target.search}${target.hash}`, "preserve", form);
    startTransition(() => {
      router.push(`${target.pathname}${target.search}${target.hash}`, {
        scroll: false,
      });
    });
  }

  return { isPending, navigate };
}
