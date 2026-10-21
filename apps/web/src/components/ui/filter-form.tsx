"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useGetFormNavigation } from "@/components/ui/use-get-form-navigation";

export function FilterForm({
  action,
  className,
  children,
  autoApply = false,
  ...props
}: {
  action?: string;
  className?: string;
  children: ReactNode;
  autoApply?: boolean;
  "data-type"?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { isPending, navigate } = useGetFormNavigation();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <form
      {...props}
      ref={ref}
      action={action}
      method="get"
      className={className}
      aria-busy={isPending || undefined}
      onChange={(event) => {
        if (!autoApply) return;
        clearTimeout(timer.current);
        const target = event.target;
        const delay = target instanceof HTMLInputElement &&
          ["text", "search", "number"].includes(target.type) ? 350 : 0;
        timer.current = setTimeout(() => {
          if (ref.current) navigate(ref.current);
        }, delay);
      }}
      onSubmit={(event) => {
        event.preventDefault();
        clearTimeout(timer.current);
        navigate(event.currentTarget);
      }}
    >
      {children}
      <p className="sr-only" role="status">
        {isPending ? "Updating results…" : ""}
      </p>
    </form>
  );
}
