"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { useGetFormNavigation } from "@/app/_components/use-get-form-navigation";

type AutoSubmitSelectProps = {
  children: ReactNode;
  defaultValue: string | number;
  name: string;
  resetFields?: string[];
};

export function AutoSubmitSelect({
  children,
  defaultValue,
  name,
  resetFields = [],
}: AutoSubmitSelectProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const { isPending, navigate } = useGetFormNavigation();

  useEffect(() => {
    selectRef.current?.setAttribute("data-navigation-ready", "true");
  }, []);

  return (
    <select
      ref={selectRef}
      key={`${name}-${defaultValue}`}
      name={name}
      defaultValue={defaultValue}
      disabled={isPending}
      onChange={(event) => {
        const form = event.currentTarget.form;
        for (const fieldName of resetFields) {
          const field = form?.elements.namedItem(fieldName);
          if (
            field instanceof HTMLInputElement ||
            field instanceof HTMLSelectElement
          ) {
            field.value = "";
          }
        }
        if (form) navigate(form);
      }}
    >
      {children}
    </select>
  );
}
