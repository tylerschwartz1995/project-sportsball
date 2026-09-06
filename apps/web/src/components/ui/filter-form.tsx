"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useGetFormNavigation } from "@/components/ui/use-get-form-navigation";

export function FilterForm({
  action,
  className,
  children,
  ...props
}: {
  action?: string;
  className?: string;
  children: ReactNode;
  "data-type"?: string;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const initial = useRef("");
  const [dirty, setDirty] = useState(false);
  const { isPending, navigate } = useGetFormNavigation();
  useEffect(() => {
    if (ref.current) initial.current = formValues(ref.current);
  }, []);
  return (
    <form
      {...props}
      ref={ref}
      action={action}
      method="get"
      className={className}
      aria-busy={isPending || undefined}
      onChange={(event) => setDirty(formValues(event.currentTarget) !== initial.current)}
      onSubmit={(event) => {
        event.preventDefault();
        navigate(event.currentTarget);
      }}
    >
      {children}
      <p className="workspace-filter-status" role="status">
        {isPending ? "Updating results…" : dirty ? "Changes not applied. Select Apply Filters to update results." : ""}
      </p>
    </form>
  );
}

function formValues(form: HTMLFormElement) {
  return JSON.stringify(Array.from(new FormData(form)));
}
