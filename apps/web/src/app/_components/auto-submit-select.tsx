"use client";

import type { ReactNode } from "react";

type AutoSubmitSelectProps = {
  children: ReactNode;
  defaultValue: string | number;
  name: string;
};

export function AutoSubmitSelect({
  children,
  defaultValue,
  name,
}: AutoSubmitSelectProps) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
    >
      {children}
    </select>
  );
}
