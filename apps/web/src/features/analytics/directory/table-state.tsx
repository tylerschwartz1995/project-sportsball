"use client";
import { createContext } from "react";
export const LeaderboardState = createContext<{
  total: number;
  sort: string;
  direction: "asc" | "desc";
  onSortChange: (key: string, direction: "asc" | "desc") => void;
} | null>(null);
