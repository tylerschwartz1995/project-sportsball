"use client";

export function LocalGameTime({ value }: { value: string }) {
  return (
    <time dateTime={value} suppressHydrationWarning>
      {new Intl.DateTimeFormat("en-CA", {
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(value))}
    </time>
  );
}
