"use client";

import type { ReactNode } from "react";

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
  return (
    <select
      key={`${name}-${defaultValue}`}
      name={name}
      defaultValue={defaultValue}
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
        form?.requestSubmit();
      }}
    >
      {children}
    </select>
  );
}
