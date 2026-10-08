"use client";

import { createContext, useContext } from "react";
import type { Post, UserProfile } from "@/lib/types";

export interface AppContext {
  me: UserProfile;
  users: Map<string, UserProfile>;
  openUser: (uid: string) => void;
  openComments: (post: Post) => void;
  toast: (message: string) => void;
}

export const AppCtx = createContext<AppContext | null>(null);

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp outside provider");
  return ctx;
}
